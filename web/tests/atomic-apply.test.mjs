import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "vite";

const root = await mkdtemp(path.join(tmpdir(), "kaz-atomic-apply-"));
const vite = await createServer({ root: process.cwd(), appType: "custom", server: { middlewareMode: true, hmr: false } });
const project = { id: "atomic-apply-project", manifest: { workspace: { root, allowedWritePrefixes: ["src"] } } };
const okPath = path.join(root, "src", "ok.ts");
const lockedDirectory = path.join(root, "src", "locked");
const blockedPath = path.join("src", "locked", "blocked.ts");

try {
  await mkdir(lockedDirectory, { recursive: true });
  await writeFile(okPath, "export const ok = 1;\n", "utf8");
  await writeFile(path.join(lockedDirectory, "blocked.ts"), "export const blocked = 1;\n", "utf8");
  const { proposeProjectEdit, approveProjectEdit } = await vite.ssrLoadModule("/server/projectEditGateway.ts");

  const draft = await proposeProjectEdit({
    project,
    instruction: "تطبيق ملفين ذرّيًا",
    inputMode: "text",
    files: [
      { path: "src/ok.ts", content: "export const ok = 2;\n" },
      { path: blockedPath, content: "export const blocked = 2;\n" },
    ],
  });

  // عطل حقيقي في نظام الملفات بعد إنشاء المسودة وقبل التطبيق: الملف الثاني داخل مجلد غير قابل للكتابة.
  await chmod(lockedDirectory, 0o555);
  await assert.rejects(() => approveProjectEdit(project, draft.approvalToken), /EACCES|permission denied|ATOMIC_APPLY_ROLLBACK_FAILED/i);
  await chmod(lockedDirectory, 0o755);

  assert.equal(await readFile(okPath, "utf8"), "export const ok = 1;\n");
  assert.equal(await readFile(path.join(lockedDirectory, "blocked.ts"), "utf8"), "export const blocked = 1;\n");
  console.log("Atomic Apply Runtime: PASS (real mid-apply filesystem failure restored all files)");
} finally {
  await chmod(lockedDirectory, 0o755).catch(() => undefined);
  await vite.close();
  await rm(root, { recursive: true, force: true });
}
