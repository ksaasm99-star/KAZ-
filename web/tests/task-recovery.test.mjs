import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { createServer } from "vite";

const fixtureRoot = path.join(process.cwd(), `.kaz-task-recovery-test-${randomUUID()}`);
const projectId = `task-recovery-project-${randomUUID()}`;
const idempotencyKey = `task-request-${randomUUID()}`;
const unavailableKey = `task-unavailable-${randomUUID()}`;
let vite;

function stepsFor(root, executionCounter) {
  return [0, 1, 2].map((step) => async () => {
    executionCounter.count += 1;
    await writeFile(path.join(root, `step-${step}.txt`), `completed-${step}\n`, "utf8");
    return { step };
  });
}

try {
  await mkdir(fixtureRoot, { recursive: true });
  vite = await createServer({ root: process.cwd(), appType: "custom", server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true } });
  const [{ PersistentMemory }, { createProjectManifest }, taskRecovery] = await Promise.all([
    vite.ssrLoadModule("/server/persistentMemory.ts"),
    vite.ssrLoadModule("/src/agent/projectManifest.ts"),
    vite.ssrLoadModule("/server/taskRecovery.ts"),
  ]);
  const memory = new PersistentMemory();
  memory.saveProject({ id: projectId, title: "اختبار Task Recovery", summary: "مهمة اختبار حقيقية", updatedAt: new Date().toISOString(), sources: [], knowledge: [], messages: [], manifest: createProjectManifest({ id: projectId, title: "اختبار Task Recovery", summary: "fixture" }) });

  const task = memory.createOrGetTask({ taskId: `task-${randomUUID()}`, projectId, idempotencyKey, totalSteps: 3 });
  assert.equal(task.created, true);
  await writeFile(path.join(fixtureRoot, "step-0.txt"), "completed-0\n", "utf8");
  const checkpointed = memory.updateTaskCheckpoint({ taskId: task.record.taskId, status: "IN_PROGRESS", stepIndex: 1, totalSteps: 3, result: { completedSteps: 1 } });
  assert.equal(checkpointed.status, "IN_PROGRESS");
  assert.equal(checkpointed.stepIndex, 1);

  await vite.close();
  vite = await createServer({ root: process.cwd(), appType: "custom", server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true } });
  const [{ PersistentMemory: RestartedMemory }, restartedRecovery] = await Promise.all([
    vite.ssrLoadModule("/server/persistentMemory.ts"),
    vite.ssrLoadModule("/server/taskRecovery.ts"),
  ]);
  const restartedMemory = new RestartedMemory();
  const executionCounter = { count: 0 };
  const resumed = await restartedRecovery.resumeInProgressTasks({ memory: restartedMemory, resolveSteps: () => stepsFor(fixtureRoot, executionCounter) });
  assert.equal(resumed.length, 1);
  assert.equal(resumed[0].status, "COMPLETED");
  assert.equal(resumed[0].stepIndex, 3);
  assert.equal(executionCounter.count, 2);
  assert.equal(await readFile(path.join(fixtureRoot, "step-1.txt"), "utf8"), "completed-1\n");
  assert.equal(await readFile(path.join(fixtureRoot, "step-2.txt"), "utf8"), "completed-2\n");

  const duplicateCounter = { count: 0 };
  const duplicate = await restartedRecovery.runIdempotentTask({ memory: restartedMemory, projectId, idempotencyKey, steps: stepsFor(fixtureRoot, duplicateCounter) });
  assert.equal(duplicate.replayed, true);
  assert.equal(duplicate.record.status, "COMPLETED");
  assert.equal(duplicateCounter.count, 0);

  const unavailable = restartedMemory.createOrGetTask({ taskId: `task-${randomUUID()}`, projectId, idempotencyKey: unavailableKey, totalSteps: 2 });
  restartedMemory.updateTaskCheckpoint({ taskId: unavailable.record.taskId, status: "IN_PROGRESS", stepIndex: 1, totalSteps: 2 });
  const failedResume = await restartedRecovery.resumeInProgressTasks({ memory: restartedMemory, resolveSteps: () => undefined });
  const failedRecord = failedResume.find((record) => record.idempotencyKey === unavailableKey);
  assert.equal(failedRecord?.status, "FAILED");
  assert.equal(failedRecord?.errorMessage, "TASK_RESUME_PLAN_UNAVAILABLE");
  console.log("Task Recovery Runtime: PASS (idempotency, checkpoint resume after restart, unavailable-plan failure)");
} finally {
  await vite?.close();
  await rm(fixtureRoot, { recursive: true, force: true });
}
