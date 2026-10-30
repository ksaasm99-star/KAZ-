import { randomUUID } from "node:crypto";
import type { PersistentMemory, TaskRecoveryRecord } from "./persistentMemory";

export type TaskStep = (context: { taskId: string; projectId: string; stepIndex: number }) => Promise<Record<string, unknown> | void>;

export type TaskRecoveryResult = {
  record: TaskRecoveryRecord;
  replayed: boolean;
  resumed: boolean;
};

type TaskMemory = Pick<PersistentMemory, "createOrGetTask" | "updateTaskCheckpoint" | "listInProgressTasks" | "appendEvidenceLedgerEvent">;

function recordEvent(memory: TaskMemory, record: TaskRecoveryRecord, eventType: string, payload: Record<string, unknown>): void {
  memory.appendEvidenceLedgerEvent({
    projectId: record.projectId,
    requestId: record.idempotencyKey,
    executionId: record.taskId,
    eventType,
    actor: "kaz.task-recovery",
    payload,
  });
}

export async function runIdempotentTask(input: {
  memory: TaskMemory;
  projectId: string;
  idempotencyKey: string;
  steps: readonly TaskStep[];
  taskId?: string;
}): Promise<TaskRecoveryResult> {
  if (!input.projectId.trim() || !input.idempotencyKey.trim()) throw new Error("TASK_SCOPE_REQUIRED");
  if (input.steps.length === 0) throw new Error("TASK_STEPS_REQUIRED");

  const created = input.memory.createOrGetTask({
    taskId: input.taskId ?? `task-${randomUUID()}`,
    projectId: input.projectId,
    idempotencyKey: input.idempotencyKey,
    totalSteps: input.steps.length,
  });
  let record = created.record;
  if (!created.created && (record.status === "COMPLETED" || record.status === "FAILED")) {
    return { record, replayed: true, resumed: false };
  }
  if (record.totalSteps !== input.steps.length) throw new Error("TASK_STEP_PLAN_MISMATCH");

  const resumed = !created.created && record.status === "IN_PROGRESS";
  if (record.status === "QUEUED") {
    record = input.memory.updateTaskCheckpoint({ taskId: record.taskId, status: "IN_PROGRESS", stepIndex: record.stepIndex, totalSteps: record.totalSteps });
    recordEvent(input.memory, record, "task_started", { idempotencyKey: record.idempotencyKey, stepIndex: record.stepIndex, totalSteps: record.totalSteps });
  }

  try {
    for (let index = record.stepIndex; index < input.steps.length; index += 1) {
      const result = await input.steps[index]({ taskId: record.taskId, projectId: record.projectId, stepIndex: index });
      const nextIndex = index + 1;
      const completed = nextIndex === input.steps.length;
      record = input.memory.updateTaskCheckpoint({
        taskId: record.taskId,
        status: completed ? "COMPLETED" : "IN_PROGRESS",
        stepIndex: nextIndex,
        totalSteps: record.totalSteps,
        result: completed ? { completedSteps: nextIndex, lastStepResult: result ?? null } : { completedSteps: nextIndex },
      });
      recordEvent(input.memory, record, completed ? "task_completed" : "task_checkpoint", { stepIndex: nextIndex, totalSteps: record.totalSteps });
    }
    return { record, replayed: false, resumed };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "TASK_STEP_FAILED";
    record = input.memory.updateTaskCheckpoint({ taskId: record.taskId, status: "FAILED", stepIndex: record.stepIndex, totalSteps: record.totalSteps, errorMessage });
    recordEvent(input.memory, record, "task_failed", { stepIndex: record.stepIndex, totalSteps: record.totalSteps, errorMessage });
    throw error;
  }
}

export async function resumeInProgressTasks(input: {
  memory: TaskMemory;
  resolveSteps: (record: TaskRecoveryRecord) => readonly TaskStep[] | undefined;
}): Promise<TaskRecoveryRecord[]> {
  const recovered: TaskRecoveryRecord[] = [];
  for (const record of input.memory.listInProgressTasks()) {
    const steps = input.resolveSteps(record);
    if (!steps || steps.length !== record.totalSteps) {
      const failed = input.memory.updateTaskCheckpoint({ taskId: record.taskId, status: "FAILED", stepIndex: record.stepIndex, totalSteps: record.totalSteps, errorMessage: "TASK_RESUME_PLAN_UNAVAILABLE" });
      recordEvent(input.memory, failed, "task_resume_failed", { stepIndex: failed.stepIndex, totalSteps: failed.totalSteps, reason: failed.errorMessage });
      recovered.push(failed);
      continue;
    }
    const result = await runIdempotentTask({ memory: input.memory, projectId: record.projectId, idempotencyKey: record.idempotencyKey, steps, taskId: record.taskId });
    recovered.push(result.record);
  }
  return recovered;
}
