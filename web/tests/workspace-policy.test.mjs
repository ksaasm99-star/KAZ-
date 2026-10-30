import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "vite";

const root = await mkdtemp(path.join(tmpdir(), "kaz-workspace-policy-"));
const outside = await mkdtemp(path.join(tmpdir(), "kaz-workspace-outside-"));
const vite = await createServer({ root: process.cwd(), appType: "custom", server: { middlewareMode: true, hmr: false } });

try {
  await mkdir(path.join(root, "src"), { recursive: true });
  await writeFile(path.join(root, "src", "App.tsx"), "export const app = true;\n", "utf8");
  await writeFile(path.join(outside, "secret.txt"), "outside\n", "utf8");
  await symlink(path.join(outside, "secret.txt"), path.join(root, "src", "link.txt"));

  const { createWorkspacePolicy, readWorkspaceFile, resolveWorkspacePath, writeWorkspaceFile, WorkspacePolicyError } = await vite.ssrLoadModule("/server/workspacePolicy.ts");
  const policy = createWorkspacePolicy({ projectId: "project-runtime", workspaceRoot: root, allowedWritePrefixes: ["src"] });

  const original = await readWorkspaceFile(policy, "src/App.tsx");
  assert.equal(original.content, "export const app = true;\n");
  assert.throws(() => resolveWorkspacePath(policy, "../outside.txt", "read"), (error) => error instanceof WorkspacePolicyError && error.code === "OUTSIDE_WORKSPACE");
  assert.throws(() => resolveWorkspacePath(policy, "/tmp/outside.txt", "read"), (error) => error instanceof WorkspacePolicyError && error.code === "INVALID_PATH");
  assert.throws(() => resolveWorkspacePath(policy, "README.md", "write"), (error) => error instanceof WorkspacePolicyError && error.code === "WRITE_NOT_ALLOWED");
  await assert.rejects(() => readWorkspaceFile(policy, "src/link.txt"), (error) => error instanceof WorkspacePolicyError && ["OUTSIDE_WORKSPACE", "SYMLINK_NOT_ALLOWED"].includes(error.code));

  const updated = await writeWorkspaceFile(policy, "src/App.tsx", "export const app = false;\n", original.sha256);
  assert.equal(updated.relativePath, "src/App.tsx");
  assert.equal(await readFile(path.join(root, "src", "App.tsx"), "utf8"), "export const app = false;\n");
  await assert.rejects(() => writeWorkspaceFile(policy, "src/App.tsx", "conflict\n", original.sha256), (error) => error instanceof WorkspacePolicyError && error.code === "CONFLICT");

  console.log("Workspace policy Runtime tests: PASS (containment, allowlist, symlink, atomic write, optimistic conflict)");
} finally {
  await vite.close();
  await rm(root, { recursive: true, force: true });
  await rm(outside, { recursive: true, force: true });
}
