import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { createServer } from "vite";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true },
});

const workspaceRoot = path.join(process.cwd(), ".data", `verification-runtime-${Date.now()}`);
await mkdir(workspaceRoot, { recursive: true });

try {
  const [{ PersistentMemory }, { createVerificationJson }, { createProjectManifest }] = await Promise.all([
    vite.ssrLoadModule("/server/persistentMemory.ts"),
    vite.ssrLoadModule("/server/verificationArtifact.ts"),
    vite.ssrLoadModule("/src/agent/projectManifest.ts"),
  ]);
  const memory = new PersistentMemory();
  const projectId = `verification-runtime-${Date.now()}`;
  const requestId = `request-${projectId}`;
  const inputDigest = "a".repeat(64);
  memory.saveProject({
    id: projectId,
    title: "اختبار verification.json",
    summary: "اختبار مولّد التحقق الموحد",
    updatedAt: new Date().toISOString(),
    sources: [],
    knowledge: [],
    messages: [],
    manifest: createProjectManifest({ id: projectId, title: "اختبار verification.json", summary: "fixture" }),
  });

  await writeFile(path.join(workspaceRoot, "app.apk"), "REAL-APK-BYTES", "utf8");
  const approval = memory.appendEvidenceLedgerEvent({
    projectId,
    requestId,
    approvalId: "approval-verification-1",
    executionId: "execution-verification-1",
    eventType: "request_approved",
    actor: "kaz.test",
    payload: { inputDigest, stage: "approval" },
  });
  const execution = memory.appendEvidenceLedgerEvent({
    projectId,
    requestId,
    approvalId: "approval-verification-1",
    executionId: "execution-verification-1",
    eventType: "execution_completed",
    actor: "kaz.test",
    payload: { inputDigest, stage: "execution" },
  });

  const result = await createVerificationJson(memory, {
    projectId,
    requestId,
    workspaceRoot,
    inputDigest,
    testResults: [{ name: "compile", status: "passed" }, { name: "build", status: "passed" }],
    artifactPath: "app.apk",
    commitSha: "b".repeat(40),
    approvalId: "approval-verification-1",
    executionId: "execution-verification-1",
  });
  const document = JSON.parse(await readFile(result.filePath, "utf8"));
  const expectedSha = createHash("sha256").update("REAL-APK-BYTES").digest("hex");
  assert.equal(document.projectId, projectId);
  assert.equal(document.requestId, requestId);
  assert.equal(document.commitSha, "b".repeat(40));
  assert.equal(document.inputDigest, inputDigest);
  assert.equal(document.artifactPath, "app.apk");
  assert.equal(document.artifactSha256, expectedSha);
  assert.deepEqual(document.testResults.map((item) => item.status), ["passed", "passed"]);
  assert.equal(document.ledger.approvalEventId, approval.eventId);
  assert.equal(document.ledger.executionEventId, execution.eventId);
  assert.match(document.ledger.approvalHash, /^[a-f0-9]{64}$/);
  assert.match(document.ledger.executionHash, /^[a-f0-9]{64}$/);
  assert.equal(result.filePath, path.join(workspaceRoot, ".kaz-verification", requestId, "verification.json"));

  const missingApprovalRequest = `${requestId}-missing-approval`;
  memory.appendEvidenceLedgerEvent({ projectId, requestId: missingApprovalRequest, executionId: "execution-missing-approval", eventType: "execution_completed", actor: "kaz.test", payload: { inputDigest } });
  await assert.rejects(() => createVerificationJson(memory, { projectId, requestId: missingApprovalRequest, workspaceRoot, inputDigest, testResults: [{ name: "build", status: "passed" }], artifactPath: "app.apk" }), /VERIFICATION_APPROVAL_EVIDENCE_REQUIRED/);

  const missingExecutionRequest = `${requestId}-missing-execution`;
  memory.appendEvidenceLedgerEvent({ projectId, requestId: missingExecutionRequest, approvalId: "approval-missing-execution", eventType: "request_approved", actor: "kaz.test", payload: { inputDigest } });
  await assert.rejects(() => createVerificationJson(memory, { projectId, requestId: missingExecutionRequest, workspaceRoot, inputDigest, testResults: [{ name: "build", status: "passed" }], artifactPath: "app.apk" }), /VERIFICATION_EXECUTION_EVIDENCE_REQUIRED/);

  const missingDigestRequest = `${requestId}-missing-digest`;
  memory.appendEvidenceLedgerEvent({ projectId, requestId: missingDigestRequest, approvalId: "approval-missing-digest", executionId: "execution-missing-digest", eventType: "request_approved", actor: "kaz.test", payload: { inputDigest: "c".repeat(64) } });
  memory.appendEvidenceLedgerEvent({ projectId, requestId: missingDigestRequest, approvalId: "approval-missing-digest", executionId: "execution-missing-digest", eventType: "execution_completed", actor: "kaz.test", payload: { inputDigest: "c".repeat(64) } });
  await assert.rejects(() => createVerificationJson(memory, { projectId, requestId: missingDigestRequest, workspaceRoot, inputDigest, testResults: [{ name: "build", status: "passed" }], artifactPath: "app.apk" }), /VERIFICATION_INPUT_DIGEST_NOT_IN_LEDGER/);

  console.log("Verification Artifact Runtime: PASS (real SHA-256, ledger correlation, missing approval/execution/digest rejection)");
} finally {
  await rm(workspaceRoot, { recursive: true, force: true });
  await vite.close();
}
