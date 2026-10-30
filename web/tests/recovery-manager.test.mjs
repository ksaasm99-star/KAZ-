import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createServer } from "vite";

const root = await mkdtemp(path.join(tmpdir(), "kaz-recovery-manager-"));
const vite = await createServer({ root: process.cwd(), appType: "custom", server: { middlewareMode: true, hmr: false } });
const project = { id: `recovery-project-${randomUUID()}`, manifest: { workspace: { root, allowedWritePrefixes: ["src"] } } };
const target = path.join(root, "src", "App.kt");

try {
  const gateway = await vite.ssrLoadModule("/server/projectEditGateway.ts");
  const { recoverProjectEditSnapshot } = await vite.ssrLoadModule("/server/recoveryManager.ts");
  const { PersistentMemory } = await vite.ssrLoadModule("/server/persistentMemory.ts");
  const memory = new PersistentMemory();
  memory.saveProject({ id: project.id, title: "Recovery Test", summary: "Runtime recovery test", updatedAt: new Date().toISOString(), sources: [], knowledge: [], messages: [], manifest: project.manifest });
  const original = "class App { val version = 1 }\n";
  const generated = "class App { val version = 2 }\n";
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, original, "utf8");

  const draft = await gateway.proposeProjectEdit({
    project,
    instruction: "تطبيق تغيير آمن",
    inputMode: "text",
    files: [{ path: "src/App.kt", content: generated }],
  });
  const applied = await gateway.approveProjectEdit(project, draft.approvalToken);
  assert.match(applied.snapshotId ?? "", /^snapshot-[a-f0-9-]+$/);

  const policy = gateway.getProjectWorkspacePolicy(project);
  const journal = await gateway.readProjectEditRecoveryJournal(project, applied.snapshotId);
  assert.equal(journal?.state, "APPLIED");

  // محاكاة قطع مفاجئ بعد تثبيت Journal APPLYING: الحالة والملف كلاهما حقيقيان على القرص.
  await gateway.writeProjectEditRecoveryJournal(policy, {
    ...journal,
    state: "APPLYING",
    appliedPaths: ["src/App.kt"],
    restoredPaths: [],
    reason: "PROCESS_INTERRUPTED_DURING_APPLY",
    updatedAt: new Date().toISOString(),
  });
  await writeFile(target, "partial-write-corruption\n", "utf8");

  const result = await recoverProjectEditSnapshot({
    project,
    snapshotId: applied.snapshotId,
    requestId: `recovery-request-${randomUUID()}`,
    memory,
    reason: "PROCESS_INTERRUPTED_DURING_APPLY",
  });

  assert.equal(result.recovered, true);
  assert.equal(result.state, "ROLLED_BACK");
  assert.deepEqual(result.restoredPaths, ["src/App.kt"]);
  assert.equal(await readFile(target, "utf8"), original);

  const ledger = memory.listEvidenceLedger(project.id);
  const rollback = ledger.find((event) => event.eventType === "project_edit_rollback");
  assert.ok(rollback, "rollback must be recorded in Evidence Ledger");
  assert.equal(rollback.payload.snapshotId, applied.snapshotId);
  assert.deepEqual(rollback.payload.restoredPaths, ["src/App.kt"]);
  console.log("Recovery Manager Runtime: PASS (real interrupted journal restored file and recorded rollback)");
} finally {
  await vite.close();
  await rm(root, { recursive: true, force: true });
}
