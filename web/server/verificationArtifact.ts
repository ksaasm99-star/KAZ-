import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { EvidenceLedgerRecord, PersistentMemory } from "./persistentMemory";

export type VerificationTestResult = {
  name: string;
  status: "passed" | "failed" | "skipped";
  details?: string;
};

export type VerificationArtifactInput = {
  projectId: string;
  requestId: string;
  workspaceRoot: string;
  inputDigest: string;
  testResults: VerificationTestResult[];
  artifactPath: string;
  commitSha?: string;
  approvalId?: string;
  executionId?: string;
};

export type VerificationArtifact = {
  schemaVersion: 1;
  projectId: string;
  requestId: string;
  commitSha: string | null;
  inputDigest: string;
  testResults: VerificationTestResult[];
  artifactPath: string;
  artifactSha256: string;
  ledger: {
    approvalEventId: string;
    executionEventId: string;
    approvalHash: string;
    executionHash: string;
  };
  generatedAt: string;
};

const APPROVAL_EVENTS = new Set(["project_edit_approved", "request_approved", "execution_approved"]);
const EXECUTION_EVENTS = new Set(["project_edit_applied", "execution_completed", "factory_build_verified"]);

function assertContained(root: string, candidate: string): void {
  const relative = path.relative(root, candidate);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error("VERIFICATION_PATH_OUTSIDE_WORKSPACE");
}

function selectEvidence(ledger: EvidenceLedgerRecord[], input: VerificationArtifactInput): { approval: EvidenceLedgerRecord; execution: EvidenceLedgerRecord } {
  const approval = ledger.find((event) => APPROVAL_EVENTS.has(event.eventType) && (!input.approvalId || event.approvalId === input.approvalId));
  const execution = ledger.find((event) => EXECUTION_EVENTS.has(event.eventType) && (!input.executionId || event.executionId === input.executionId));
  if (!approval) throw new Error("VERIFICATION_APPROVAL_EVIDENCE_REQUIRED");
  if (!execution) throw new Error("VERIFICATION_EXECUTION_EVIDENCE_REQUIRED");
  if (approval.approvalId && execution.approvalId && approval.approvalId !== execution.approvalId) throw new Error("VERIFICATION_APPROVAL_EXECUTION_MISMATCH");
  if (approval.executionId && execution.executionId && approval.executionId !== execution.executionId) throw new Error("VERIFICATION_EXECUTION_MISMATCH");
  return { approval, execution };
}

export async function createVerificationJson(memory: PersistentMemory, input: VerificationArtifactInput): Promise<{ filePath: string; artifact: VerificationArtifact }> {
  if (!input.projectId.trim() || !input.requestId.trim()) throw new Error("VERIFICATION_SCOPE_REQUIRED");
  if (!input.inputDigest.trim()) throw new Error("VERIFICATION_INPUT_DIGEST_REQUIRED");
  if (!Array.isArray(input.testResults) || input.testResults.length === 0) throw new Error("VERIFICATION_TEST_RESULTS_REQUIRED");
  if (input.testResults.some((result) => !result.name.trim() || !["passed", "failed", "skipped"].includes(result.status))) throw new Error("VERIFICATION_TEST_RESULT_INVALID");
  if (input.testResults.some((result) => result.status === "failed")) throw new Error("VERIFICATION_FAILED_TESTS");
  if (!path.isAbsolute(input.workspaceRoot)) throw new Error("VERIFICATION_WORKSPACE_REQUIRED");
  if (!input.artifactPath.trim() || path.isAbsolute(input.artifactPath) || input.artifactPath.includes("\0")) throw new Error("VERIFICATION_ARTIFACT_PATH_INVALID");

  const ledger = memory.listEvidenceLedger(input.projectId, input.requestId);
  const { approval, execution } = selectEvidence(ledger, input);
  const inputEvidence = ledger.find((event) => event.payload.inputDigest === input.inputDigest);
  if (!inputEvidence) throw new Error("VERIFICATION_INPUT_DIGEST_NOT_IN_LEDGER");

  const workspaceRoot = path.resolve(input.workspaceRoot);
  const artifactAbsolutePath = path.resolve(workspaceRoot, input.artifactPath);
  assertContained(workspaceRoot, artifactAbsolutePath);
  const artifactBytes = await readFile(artifactAbsolutePath);
  const artifactSha256 = createHash("sha256").update(artifactBytes).digest("hex");
  const generatedAt = new Date().toISOString();
  const artifact: VerificationArtifact = {
    schemaVersion: 1,
    projectId: input.projectId,
    requestId: input.requestId,
    commitSha: input.commitSha ?? null,
    inputDigest: input.inputDigest,
    testResults: input.testResults,
    artifactPath: input.artifactPath.replaceAll("\\", "/"),
    artifactSha256,
    ledger: {
      approvalEventId: approval.eventId,
      executionEventId: execution.eventId,
      approvalHash: approval.eventHash,
      executionHash: execution.eventHash,
    },
    generatedAt,
  };
  const directory = path.resolve(workspaceRoot, ".kaz-verification", input.requestId);
  assertContained(workspaceRoot, directory);
  await mkdir(directory, { recursive: true });
  const filePath = path.join(directory, "verification.json");
  await writeFile(filePath, `${JSON.stringify(artifact, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  memory.appendEvidenceLedgerEvent({ projectId: input.projectId, requestId: input.requestId, approvalId: approval.approvalId, executionId: execution.executionId, artifactId: input.artifactPath, eventType: "verification_artifact_created", actor: "kaz.verification", payload: { filePath, artifactSha256 } });
  return { filePath, artifact };
}
