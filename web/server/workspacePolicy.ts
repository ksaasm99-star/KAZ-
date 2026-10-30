import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, realpath, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export type WorkspacePolicy = {
  projectId: string;
  workspaceRoot: string;
  allowedWritePrefixes: readonly string[];
  maxFileBytes: number;
};

type WorkspaceOperation = "read" | "write";

type FileResult = {
  projectId: string;
  relativePath: string;
  absolutePath: string;
  content: string;
  sha256: string;
};

export class WorkspacePolicyError extends Error {
  constructor(public readonly code: "INVALID_PATH" | "OUTSIDE_WORKSPACE" | "WRITE_NOT_ALLOWED" | "SYMLINK_NOT_ALLOWED" | "FILE_TOO_LARGE" | "CONFLICT", message: string) {
    super(message);
    this.name = "WorkspacePolicyError";
  }
}

function normalizeRelativePath(input: string): string {
  if (typeof input !== "string" || input.trim().length === 0 || input.includes("\0")) {
    throw new WorkspacePolicyError("INVALID_PATH", "مسار الملف مطلوب ولا يمكن أن يحتوي محارف غير صالحة.");
  }

  const portable = input.replaceAll("\\", "/");
  if (path.posix.isAbsolute(portable) || path.win32.isAbsolute(portable) || portable.startsWith("//")) {
    throw new WorkspacePolicyError("INVALID_PATH", "المسار المطلق غير مسموح داخل مساحة المشروع.");
  }

  const normalized = path.posix.normalize(portable);
  if (normalized === "." || normalized === ".." || normalized.startsWith("../") || normalized.startsWith("/")) {
    throw new WorkspacePolicyError("OUTSIDE_WORKSPACE", "المسار يحاول الخروج من مساحة المشروع.");
  }
  return normalized;
}

function assertContained(root: string, candidate: string): void {
  const relative = path.relative(root, candidate);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new WorkspacePolicyError("OUTSIDE_WORKSPACE", "العملية خارج مساحة المشروع المحددة.");
  }
}

function isWriteAllowed(relativePath: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => {
    const normalizedPrefix = normalizeRelativePath(prefix).replace(/\/$/, "");
    return relativePath === normalizedPrefix || relativePath.startsWith(`${normalizedPrefix}/`);
  });
}

function sha256(content: string | Uint8Array): string {
  return createHash("sha256").update(content).digest("hex");
}

export function createWorkspacePolicy(input: {
  projectId: string;
  workspaceRoot: string;
  allowedWritePrefixes: readonly string[];
  maxFileBytes?: number;
}): WorkspacePolicy {
  if (!input.projectId.trim()) throw new WorkspacePolicyError("INVALID_PATH", "معرّف المشروع مطلوب.");
  if (!path.isAbsolute(input.workspaceRoot)) throw new WorkspacePolicyError("INVALID_PATH", "جذر مساحة المشروع يجب أن يكون مسارًا مطلقًا.");
  if (!input.allowedWritePrefixes.length) throw new WorkspacePolicyError("WRITE_NOT_ALLOWED", "لم تُحدد أي مسارات كتابة مسموحة.");

  return Object.freeze({
    projectId: input.projectId,
    workspaceRoot: path.resolve(input.workspaceRoot),
    allowedWritePrefixes: Object.freeze([...input.allowedWritePrefixes]),
    maxFileBytes: input.maxFileBytes ?? 2 * 1024 * 1024,
  });
}

export function resolveWorkspacePath(policy: WorkspacePolicy, requestedPath: string, operation: WorkspaceOperation): { relativePath: string; absolutePath: string } {
  const relativePath = normalizeRelativePath(requestedPath);
  if (operation === "write" && !isWriteAllowed(relativePath, policy.allowedWritePrefixes)) {
    throw new WorkspacePolicyError("WRITE_NOT_ALLOWED", `الكتابة غير مسموحة للمسار: ${relativePath}`);
  }
  const absolutePath = path.resolve(policy.workspaceRoot, relativePath);
  assertContained(policy.workspaceRoot, absolutePath);
  return { relativePath, absolutePath };
}

async function resolveExistingPath(policy: WorkspacePolicy, requestedPath: string, operation: WorkspaceOperation): Promise<{ relativePath: string; absolutePath: string }> {
  const resolved = resolveWorkspacePath(policy, requestedPath, operation);
  const rootReal = await realpath(policy.workspaceRoot);
  const targetReal = await realpath(resolved.absolutePath);
  assertContained(rootReal, targetReal);
  const metadata = await lstat(resolved.absolutePath);
  if (metadata.isSymbolicLink()) throw new WorkspacePolicyError("SYMLINK_NOT_ALLOWED", "لا يُسمح بالعمل على رابط رمزي داخل مساحة المشروع.");
  return { ...resolved, absolutePath: targetReal };
}

export async function readWorkspaceFile(policy: WorkspacePolicy, requestedPath: string): Promise<FileResult> {
  const resolved = await resolveExistingPath(policy, requestedPath, "read");
  const content = await readFile(resolved.absolutePath, "utf8");
  if (Buffer.byteLength(content, "utf8") > policy.maxFileBytes) throw new WorkspacePolicyError("FILE_TOO_LARGE", "حجم الملف يتجاوز الحد المسموح.");
  return { projectId: policy.projectId, ...resolved, content, sha256: sha256(content) };
}

export async function writeWorkspaceFile(policy: WorkspacePolicy, requestedPath: string, content: string, expectedSha256?: string): Promise<Omit<FileResult, "content">> {
  const resolved = resolveWorkspacePath(policy, requestedPath, "write");
  if (Buffer.byteLength(content, "utf8") > policy.maxFileBytes) throw new WorkspacePolicyError("FILE_TOO_LARGE", "حجم الملف يتجاوز الحد المسموح.");

  await mkdir(path.dirname(resolved.absolutePath), { recursive: true });
  const rootReal = await realpath(policy.workspaceRoot);
  const parentReal = await realpath(path.dirname(resolved.absolutePath));
  assertContained(rootReal, parentReal);

  let existingMode: number | undefined;
  try {
    const metadata = await lstat(resolved.absolutePath);
    if (metadata.isSymbolicLink()) throw new WorkspacePolicyError("SYMLINK_NOT_ALLOWED", "لا يُسمح باستبدال رابط رمزي.");
    if (!metadata.isFile()) throw new WorkspacePolicyError("INVALID_PATH", "المسار المستهدف ليس ملفًا عاديًا.");
    existingMode = metadata.mode & 0o777;
    if (expectedSha256) {
      const previous = await readFile(resolved.absolutePath);
      if (sha256(previous) !== expectedSha256) throw new WorkspacePolicyError("CONFLICT", "تغير الملف منذ آخر قراءة؛ أُوقفت الكتابة لحماية تعديل المستخدم.");
    }
  } catch (error) {
    if (error instanceof WorkspacePolicyError) throw error;
    if (!expectedSha256 && (error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    if (expectedSha256) throw new WorkspacePolicyError("CONFLICT", "الملف المتوقع لم يعد موجودًا؛ أُوقفت الكتابة.");
  }

  const temporaryPath = path.join(path.dirname(resolved.absolutePath), `.kaz-write-${randomUUID()}.tmp`);
  try {
    await writeFile(temporaryPath, content, { encoding: "utf8", flag: "wx", mode: existingMode ?? 0o600 });
    await rename(temporaryPath, resolved.absolutePath);
  } finally {
    await unlink(temporaryPath).catch(() => undefined);
  }

  return { projectId: policy.projectId, ...resolved, sha256: sha256(content) };
}

export async function removeWorkspaceFile(policy: WorkspacePolicy, requestedPath: string, expectedSha256?: string): Promise<void> {
  const resolved = await resolveExistingPath(policy, requestedPath, "write");
  if (expectedSha256) {
    const current = await readFile(resolved.absolutePath);
    if (sha256(current) !== expectedSha256) throw new WorkspacePolicyError("CONFLICT", "تغير الملف قبل التراجع؛ أُوقف التراجع لحماية تعديل المستخدم.");
  }
  await unlink(resolved.absolutePath);
}
