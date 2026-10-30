import {
  getProjectWorkspacePolicy,
  loadProjectEditSnapshot,
  readProjectEditRecoveryJournal,
  rollbackProjectEditSnapshot,
  writeProjectEditRecoveryJournal,
  type ProjectLike,
  type RecoveryJournal,
} from "./projectEditGateway";
import type { PersistentMemory } from "./persistentMemory";

export type RecoveryManagerResult = RecoveryJournal & { recovered: boolean };

type LedgerWriter = Pick<PersistentMemory, "appendEvidenceLedgerEvent">;

const RECOVERABLE_STATES = new Set(["APPLYING", "FAILED"]);

export async function recoverProjectEditSnapshot(input: {
  project: ProjectLike;
  snapshotId: string;
  requestId: string;
  memory: LedgerWriter;
  reason?: string;
}): Promise<RecoveryManagerResult> {
  const journal = await readProjectEditRecoveryJournal(input.project, input.snapshotId);
  if (!journal) throw new Error("RECOVERY_JOURNAL_NOT_FOUND");
  if (!RECOVERABLE_STATES.has(journal.state)) {
    return { ...journal, recovered: false };
  }

  const policy = getProjectWorkspacePolicy(input.project);
  const snapshot = await loadProjectEditSnapshot(input.project, input.snapshotId);
  const recoveryReason = input.reason ?? journal.reason ?? "UNEXPECTED_INTERRUPTION";
  try {
    const restoredPaths = await rollbackProjectEditSnapshot(policy, snapshot);
    const recovered: RecoveryJournal = {
      ...journal,
      state: "ROLLED_BACK",
      restoredPaths,
      reason: recoveryReason,
      updatedAt: new Date().toISOString(),
    };
    await writeProjectEditRecoveryJournal(policy, recovered);
    input.memory.appendEvidenceLedgerEvent({
      projectId: input.project.id,
      requestId: input.requestId,
      executionId: journal.draftId ? `execution:${journal.draftId}` : undefined,
      eventType: "project_edit_rollback",
      actor: "kaz.recovery-manager",
      payload: {
        snapshotId: input.snapshotId,
        previousState: journal.state,
        state: recovered.state,
        reason: recoveryReason,
        appliedPaths: journal.appliedPaths,
        restoredPaths,
      },
    });
    return { ...recovered, recovered: true };
  } catch (error) {
    const failed: RecoveryJournal = {
      ...journal,
      state: "REVIEW_REQUIRED",
      reason: error instanceof Error ? error.message : "RECOVERY_FAILED",
      updatedAt: new Date().toISOString(),
    };
    await writeProjectEditRecoveryJournal(policy, failed);
    input.memory.appendEvidenceLedgerEvent({
      projectId: input.project.id,
      requestId: input.requestId,
      executionId: journal.draftId ? `execution:${journal.draftId}` : undefined,
      eventType: "project_edit_rollback_failed",
      actor: "kaz.recovery-manager",
      payload: { snapshotId: input.snapshotId, previousState: journal.state, state: failed.state, reason: failed.reason, appliedPaths: journal.appliedPaths },
    });
    throw error;
  }
}
