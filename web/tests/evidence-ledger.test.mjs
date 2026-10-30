import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true },
});

try {
  const [{ PersistentMemory }, { createProjectManifest }] = await Promise.all([
    vite.ssrLoadModule("/server/persistentMemory.ts"),
    vite.ssrLoadModule("/src/agent/projectManifest.ts"),
  ]);

  const memory = new PersistentMemory();
  const projectId = `ledger-runtime-${Date.now()}`;
  memory.saveProject({
    id: projectId,
    title: "اختبار Ledger",
    summary: "مشروع اختبار سجل الأدلة",
    updatedAt: new Date().toISOString(),
    sources: [],
    knowledge: [],
    messages: [],
    manifest: createProjectManifest({ id: projectId, title: "اختبار Ledger", summary: "fixture" }),
  });

  const requestId = `request-${projectId}`;
  const first = memory.appendEvidenceLedgerEvent({
    projectId,
    requestId,
    approvalId: "approval-1",
    executionId: "execution-1",
    buildId: "build-1",
    artifactId: "artifact-1",
    eventType: "request_approved",
    actor: "kaz.test",
    payload: { stage: "approval" },
  });
  const second = memory.appendEvidenceLedgerEvent({
    projectId,
    requestId,
    approvalId: "approval-1",
    executionId: "execution-1",
    buildId: "build-1",
    artifactId: "artifact-1",
    eventType: "artifact_recorded",
    actor: "kaz.test",
    payload: { stage: "artifact" },
  });

  assert.ok(first.previousHash === null || /^[a-f0-9]{64}$/.test(first.previousHash));
  assert.equal(second.previousHash, first.eventHash);
  assert.equal(first.requestId, requestId);
  assert.equal(first.approvalId, "approval-1");
  assert.equal(first.executionId, "execution-1");
  assert.equal(first.buildId, "build-1");
  assert.equal(first.artifactId, "artifact-1");
  assert.notEqual(first.eventHash, second.eventHash);

  const ledger = memory.listEvidenceLedger(projectId, requestId);
  assert.equal(ledger.length, 2);
  assert.deepEqual(ledger.map((event) => event.eventType), ["request_approved", "artifact_recorded"]);

  const sqlite = process.getBuiltinModule("node:sqlite");
  const db = new sqlite.DatabaseSync(`${process.cwd()}/.data/kaz-memory.sqlite`);
  assert.throws(() => {
    db.prepare("UPDATE evidence_ledger SET payload_json = ? WHERE event_id = ?").run('{"tampered":true}', first.eventId);
  }, /EVIDENCE_LEDGER_APPEND_ONLY/);
  assert.throws(() => {
    db.prepare("DELETE FROM evidence_ledger WHERE event_id = ?").run(first.eventId);
  }, /EVIDENCE_LEDGER_APPEND_ONLY/);

  const afterAttack = memory.listEvidenceLedger(projectId, requestId);
  assert.equal(afterAttack.length, 2);
  assert.equal(afterAttack[0].eventHash, first.eventHash);
  assert.equal(afterAttack[0].payload.stage, "approval");
  db.close();
  console.log("Evidence Ledger Runtime: PASS (correlation, hash-chain, UPDATE rejection, DELETE rejection)");
} finally {
  await vite.close();
}
