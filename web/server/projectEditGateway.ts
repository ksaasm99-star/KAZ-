import { randomUUID } from "node:crypto";
import { mkdir, readFile as readSnapshotFile, writeFile as writeSnapshotFile } from "node:fs/promises";
import path from "node:path";
import {
  createWorkspacePolicy,
  readWorkspaceFile,
  removeWorkspaceFile,
  resolveWorkspacePath,
  type WorkspacePolicy,
  writeWorkspaceFile,
} from "./workspacePolicy";
import { validateTypedFactoryRequest, verifyFactoryInputDigest, type TypedFactoryRequest } from "../src/agent/factoryRequest";

export type ProjectEditInputMode = "text" | "voice";
export type ProjectEditFileInput = { path: string; content: string; reason?: string };
export type ProjectEditChange = ProjectEditFileInput & { previousContent: string; previousSha256?: string; diff: string; created: boolean };
export type ProjectEditDraft = {
  id: string;
  projectId: string;
  inputMode: ProjectEditInputMode;
  instruction: string;
  createdAt: string;
  expiresAt: string;
  approvalToken: string;
  inputDigest?: string;
  snapshotId?: string;
  changes: ProjectEditChange[];
};

type ProjectEditApproval = {
  token: string;
  draftId: string;
  projectId: string;
  expiresAt: string;
  expectedSha256: Record<string, string | null>;
  inputDigest?: string;
};

export type ProjectEditSnapshot = {
  id: string;
  directory: string;
  entries: Array<{ path: string; existed: boolean; sha256: string | null; contentFile?: string }>;
};

export type RecoveryJournalState = "CREATED" | "APPLYING" | "APPLIED" | "FAILED" | "ROLLED_BACK" | "REVIEW_REQUIRED";
export type RecoveryJournal = { snapshotId: string; projectId: string; draftId?: string; state: RecoveryJournalState; appliedPaths: string[]; restoredPaths: string[]; reason?: string; updatedAt: string };

function resolveSnapshotDirectory(policy: WorkspacePolicy, snapshotId: string): string {
  if (!/^snapshot-[a-f0-9-]+$/.test(snapshotId)) throw new Error("INVALID_SNAPSHOT_ID");
  return path.join(policy.workspaceRoot, SNAPSHOT_DIRECTORY, snapshotId);
}

function resolveRecoveryJournalPath(policy: WorkspacePolicy, snapshotId: string): string {
  return path.join(resolveSnapshotDirectory(policy, snapshotId), "recovery.json");
}

export async function readProjectEditRecoveryJournal(project: ProjectLike, snapshotId: string): Promise<RecoveryJournal | null> {
  const policy = buildPolicy(project);
  try {
    return JSON.parse(await readSnapshotFile(resolveRecoveryJournalPath(policy, snapshotId), "utf8")) as RecoveryJournal;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function writeProjectEditRecoveryJournal(policy: WorkspacePolicy, journal: RecoveryJournal): Promise<void> {
  await writeSnapshotFile(resolveRecoveryJournalPath(policy, journal.snapshotId), `${JSON.stringify(journal, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
}

const drafts = new Map<string, ProjectEditDraft>();
const approvals = new Map<string, ProjectEditApproval>();
const consumedApprovalTokens = new Set<string>();
const DRAFT_TTL_MS = 15 * 60 * 1000;
const MAX_FILES_PER_DRAFT = 12;
const MAX_INSTRUCTION_LENGTH = 2000;
const SERVER_ALLOWED_PREFIXES = ["app", "src", "web", "android"] as const;
const SNAPSHOT_DIRECTORY = ".kaz-snapshots";

declare const Buffer: { byteLength(value: string, encoding: string): number };

export type ProjectLike = { id: string; manifest?: { workspace?: { root?: string; allowedWritePrefixes?: string[] } } };

function buildPolicy(project: ProjectLike): WorkspacePolicy {
  const workspace = project.manifest?.workspace;
  const root = workspace?.root;
  if (!root || !path.isAbsolute(root)) throw new Error("WORKSPACE_NOT_CONFIGURED");
  const requestedPrefixes = workspace?.allowedWritePrefixes ?? [];
  const allowedWritePrefixes = requestedPrefixes.length > 0
    ? requestedPrefixes.filter((prefix) => SERVER_ALLOWED_PREFIXES.some((allowed) => prefix === allowed || prefix.startsWith(`${allowed}/`)))
    : SERVER_ALLOWED_PREFIXES;
  if (allowedWritePrefixes.length === 0) throw new Error("WRITE_SCOPE_NOT_CONFIGURED");
  return createWorkspacePolicy({ projectId: project.id, workspaceRoot: root, allowedWritePrefixes });
}

export function getProjectWorkspacePolicy(project: ProjectLike): WorkspacePolicy {
  return buildPolicy(project);
}

function makeDiff(previous: string, next: string): string {
  const before = previous.split(/\r?\n/);
  const after = next.split(/\r?\n/);
  const lines: string[] = ["--- قبل", "+++ بعد"];
  const size = Math.max(before.length, after.length);
  for (let index = 0; index < size; index += 1) {
    const oldLine = before[index];
    const newLine = after[index];
    if (oldLine === newLine && oldLine !== undefined) lines.push(`  ${oldLine}`);
    else {
      if (oldLine !== undefined) lines.push(`- ${oldLine}`);
      if (newLine !== undefined) lines.push(`+ ${newLine}`);
    }
    if (lines.length >= 520) { lines.push("… تم اختصار العرض لحماية واجهة المعاينة"); break; }
  }
  return lines.join("\n");
}

async function readExisting(policy: WorkspacePolicy, requestedPath: string): Promise<{ content: string; sha256: string } | null> {
  try {
    const result = await readWorkspaceFile(policy, requestedPath);
    return { content: result.content, sha256: result.sha256 };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function pruneDrafts(now = Date.now()): void {
  for (const [id, draft] of drafts) {
    if (Date.parse(draft.expiresAt) <= now) drafts.delete(id);
  }
}

export async function proposeProjectEdit(input: {
  project: ProjectLike;
  instruction: string;
  inputMode: ProjectEditInputMode;
  files: ProjectEditFileInput[];
  expiresInMs?: number;
  factoryRequest?: TypedFactoryRequest;
}): Promise<ProjectEditDraft> {
  pruneDrafts();
  const instruction = input.instruction.trim();
  if (!instruction || instruction.length > MAX_INSTRUCTION_LENGTH) throw new Error("INVALID_EDIT_INSTRUCTION");
  if (!Array.isArray(input.files) || input.files.length === 0 || input.files.length > MAX_FILES_PER_DRAFT) throw new Error("INVALID_EDIT_FILE_COUNT");
  if (input.factoryRequest) {
    const validation = validateTypedFactoryRequest(input.factoryRequest);
    if (!validation.valid || !(await verifyFactoryInputDigest(input.factoryRequest))) throw new Error("INVALID_FACTORY_INPUT_DIGEST");
  }
  const policy = buildPolicy(input.project);
  const changes: ProjectEditChange[] = [];
  for (const file of input.files) {
    if (!file || typeof file.path !== "string" || typeof file.content !== "string") throw new Error("INVALID_EDIT_FILE");
    // Validate the write boundary during proposal, before a human can approve anything.
    resolveWorkspacePath(policy, file.path, "write");
    if (Buffer.byteLength(file.content, "utf8") > policy.maxFileBytes) throw new Error("EDIT_FILE_TOO_LARGE");
    const previous = await readExisting(policy, file.path);
    changes.push({ path: file.path, content: file.content, reason: file.reason?.trim(), previousContent: previous?.content ?? "", previousSha256: previous?.sha256, diff: makeDiff(previous?.content ?? "", file.content), created: !previous });
  }
  const now = new Date();
  const expiresInMs = input.expiresInMs === undefined ? DRAFT_TTL_MS : Math.max(1, Math.min(DRAFT_TTL_MS, Math.floor(input.expiresInMs)));
  const draftId = `edit-${randomUUID()}`;
  const approvalToken = `approval-${randomUUID()}`;
  const expiresAt = new Date(now.getTime() + expiresInMs).toISOString();
  const draft: ProjectEditDraft = { id: draftId, projectId: input.project.id, inputMode: input.inputMode, instruction, createdAt: now.toISOString(), expiresAt, approvalToken, inputDigest: input.factoryRequest?.inputDigest, changes };
  approvals.set(approvalToken, { token: approvalToken, draftId, projectId: input.project.id, expiresAt, expectedSha256: Object.fromEntries(changes.map((change) => [change.path, change.previousSha256 ?? null])), inputDigest: input.factoryRequest?.inputDigest });
  drafts.set(draft.id, draft);
  return draft;
}

async function assertApprovalSha(policy: WorkspacePolicy, draft: ProjectEditDraft, approval: ProjectEditApproval): Promise<void> {
  for (const change of draft.changes) {
    const current = await readExisting(policy, change.path);
    const expected = approval.expectedSha256[change.path] ?? null;
    if ((current?.sha256 ?? null) !== expected) throw new Error("APPROVAL_SHA_MISMATCH");
  }
}

async function assertApprovalInputDigest(approval: ProjectEditApproval, factoryRequest?: TypedFactoryRequest): Promise<void> {
  if (!approval.inputDigest) return;
  if (!factoryRequest || factoryRequest.inputDigest !== approval.inputDigest) throw new Error("APPROVAL_INPUT_DIGEST_MISMATCH");
  const validation = validateTypedFactoryRequest(factoryRequest);
  if (!validation.valid || !(await verifyFactoryInputDigest(factoryRequest))) throw new Error("APPROVAL_INPUT_DIGEST_MISMATCH");
}

async function createProjectEditSnapshot(policy: WorkspacePolicy, draft: ProjectEditDraft): Promise<ProjectEditSnapshot> {
  const id = `snapshot-${randomUUID()}`;
  const directory = resolveSnapshotDirectory(policy, id);
  await mkdir(directory, { recursive: true });
  const entries: ProjectEditSnapshot["entries"] = [];
  for (const [index, change] of draft.changes.entries()) {
    const current = await readExisting(policy, change.path);
    const entry: ProjectEditSnapshot["entries"][number] = { path: change.path, existed: Boolean(current), sha256: current?.sha256 ?? null };
    if (current) {
      const contentFile = `${index}.content`;
      await writeSnapshotFile(path.join(directory, contentFile), current.content, { encoding: "utf8", flag: "wx", mode: 0o600 });
      entry.contentFile = contentFile;
    }
    entries.push(entry);
  }
  await writeSnapshotFile(path.join(directory, "manifest.json"), JSON.stringify({ id, projectId: policy.projectId, entries }), { encoding: "utf8", flag: "wx", mode: 0o600 });
  await writeProjectEditRecoveryJournal(policy, { snapshotId: id, projectId: policy.projectId, state: "CREATED", appliedPaths: [], restoredPaths: [], updatedAt: new Date().toISOString() });
  return { id, directory, entries };
}

export async function loadProjectEditSnapshot(project: ProjectLike, snapshotId: string): Promise<ProjectEditSnapshot> {
  const policy = buildPolicy(project);
  const directory = resolveSnapshotDirectory(policy, snapshotId);
  const manifest = JSON.parse(await readSnapshotFile(path.join(directory, "manifest.json"), "utf8")) as { id?: string; projectId?: string; entries?: ProjectEditSnapshot["entries"] };
  if (manifest.id !== snapshotId || manifest.projectId !== project.id || !Array.isArray(manifest.entries)) throw new Error("INVALID_SNAPSHOT_MANIFEST");
  for (const entry of manifest.entries) {
    if (typeof entry.path !== "string" || typeof entry.existed !== "boolean" || (entry.contentFile !== undefined && !/^\d+\.content$/.test(entry.contentFile))) throw new Error("INVALID_SNAPSHOT_MANIFEST");
  }
  return { id: snapshotId, directory, entries: manifest.entries };
}

export async function rollbackProjectEditSnapshot(policy: WorkspacePolicy, snapshot: ProjectEditSnapshot): Promise<string[]> {
  const failures: string[] = [];
  const restoredPaths: string[] = [];
  for (const entry of [...snapshot.entries].reverse()) {
    try {
      if (!entry.existed) {
        const current = await readExisting(policy, entry.path);
        if (current) await removeWorkspaceFile(policy, entry.path, current.sha256);
        restoredPaths.push(entry.path);
        continue;
      }
      const content = await readSnapshotFile(path.join(snapshot.directory, entry.contentFile as string), "utf8");
      await writeWorkspaceFile(policy, entry.path, content);
      restoredPaths.push(entry.path);
    } catch (error) {
      failures.push(`${entry.path}:${error instanceof Error ? error.message : "unknown"}`);
    }
  }
  if (failures.length > 0) throw new Error(`ATOMIC_APPLY_ROLLBACK_FAILED:${failures.join(",")}`);
  return restoredPaths;
}

export async function authorizeProjectEditApproval(project: ProjectLike, approvalToken: string, factoryRequest?: TypedFactoryRequest): Promise<ProjectEditDraft> {
  pruneDrafts();
  const approval = approvals.get(approvalToken);
  if (!approval) throw new Error(consumedApprovalTokens.has(approvalToken) ? "APPROVAL_TOKEN_ALREADY_USED" : "EDIT_APPROVAL_NOT_FOUND");
  approvals.delete(approvalToken);
  consumedApprovalTokens.add(approvalToken);
  if (Date.parse(approval.expiresAt) <= Date.now()) {
    drafts.delete(approval.draftId);
    throw new Error("APPROVAL_EXPIRED");
  }
  const draft = drafts.get(approval.draftId);
  if (!draft || draft.projectId !== project.id || approval.projectId !== project.id) throw new Error("EDIT_DRAFT_NOT_FOUND");
  const policy = buildPolicy(project);
  await assertApprovalInputDigest(approval, factoryRequest);
  await assertApprovalSha(policy, draft, approval);
  return draft;
}

export async function applyAuthorizedProjectEdit(project: ProjectLike, draft: ProjectEditDraft): Promise<ProjectEditDraft> {
  if (draft.projectId !== project.id) throw new Error("EDIT_DRAFT_NOT_FOUND");
  const policy = buildPolicy(project);
  const snapshot = await createProjectEditSnapshot(policy, draft);
  draft.snapshotId = snapshot.id;
  const appliedPaths: string[] = [];
  await writeProjectEditRecoveryJournal(policy, { snapshotId: snapshot.id, projectId: project.id, draftId: draft.id, state: "APPLYING", appliedPaths, restoredPaths: [], updatedAt: new Date().toISOString() });
  try {
    for (const change of draft.changes) {
      await writeWorkspaceFile(policy, change.path, change.content, change.previousSha256);
      appliedPaths.push(change.path);
      await writeProjectEditRecoveryJournal(policy, { snapshotId: snapshot.id, projectId: project.id, draftId: draft.id, state: "APPLYING", appliedPaths: [...appliedPaths], restoredPaths: [], updatedAt: new Date().toISOString() });
    }
    await writeProjectEditRecoveryJournal(policy, { snapshotId: snapshot.id, projectId: project.id, draftId: draft.id, state: "APPLIED", appliedPaths: [...appliedPaths], restoredPaths: [], updatedAt: new Date().toISOString() });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "UNKNOWN_APPLY_FAILURE";
    await writeProjectEditRecoveryJournal(policy, { snapshotId: snapshot.id, projectId: project.id, draftId: draft.id, state: "FAILED", appliedPaths: [...appliedPaths], restoredPaths: [], reason, updatedAt: new Date().toISOString() });
    try {
      const restoredPaths = await rollbackProjectEditSnapshot(policy, snapshot);
      await writeProjectEditRecoveryJournal(policy, { snapshotId: snapshot.id, projectId: project.id, draftId: draft.id, state: "ROLLED_BACK", appliedPaths: [...appliedPaths], restoredPaths, reason, updatedAt: new Date().toISOString() });
    } catch (rollbackError) {
      await writeProjectEditRecoveryJournal(policy, { snapshotId: snapshot.id, projectId: project.id, draftId: draft.id, state: "REVIEW_REQUIRED", appliedPaths: [...appliedPaths], restoredPaths: [], reason: rollbackError instanceof Error ? rollbackError.message : "ATOMIC_APPLY_ROLLBACK_FAILED", updatedAt: new Date().toISOString() });
      throw rollbackError;
    }
    throw error;
  }
  drafts.delete(draft.id);
  return draft;
}

export async function approveProjectEdit(project: ProjectLike, approvalToken: string, factoryRequest?: TypedFactoryRequest): Promise<ProjectEditDraft> {
  const draft = await authorizeProjectEditApproval(project, approvalToken, factoryRequest);
  return applyAuthorizedProjectEdit(project, draft);
}

export function rejectProjectEdit(projectId: string, draftId: string): boolean {
  const draft = drafts.get(draftId);
  if (!draft || draft.projectId !== projectId) return false;
  drafts.delete(draftId);
  approvals.delete(draft.approvalToken);
  return true;
}

export function inspectProjectEditDraft(draftId: string): ProjectEditDraft | null {
  pruneDrafts();
  return drafts.get(draftId) ?? null;
}
