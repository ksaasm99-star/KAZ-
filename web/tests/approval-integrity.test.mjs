import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "vite";

const root = await mkdtemp(path.join(tmpdir(), "kaz-approval-integrity-"));
const vite = await createServer({ root: process.cwd(), appType: "custom", server: { middlewareMode: true, hmr: false } });
const project = { id: "approval-integrity-project", manifest: { workspace: { root, allowedWritePrefixes: ["src"] } } };

try {
  await mkdir(path.join(root, "src"), { recursive: true });
  await writeFile(path.join(root, "src.txt"), "not-in-scope\n", "utf8");
  await writeFile(path.join(root, "src", "App.tsx"), "export const value = 1;\n", "utf8");
  const { proposeProjectEdit, approveProjectEdit } = await vite.ssrLoadModule("/server/projectEditGateway.ts");
  const { createTypedFactoryRequest } = await vite.ssrLoadModule("/src/agent/factoryRequest.ts");

  const shaDraft = await proposeProjectEdit({ project, instruction: "تحديث القيمة", inputMode: "text", files: [{ path: "src/App.tsx", content: "export const value = 2;\n" }] });
  await writeFile(path.join(root, "src", "App.tsx"), "export const value = 99;\n", "utf8");
  await assert.rejects(() => approveProjectEdit(project, shaDraft.approvalToken), /APPROVAL_SHA_MISMATCH/);
  assert.equal(await readFile(path.join(root, "src", "App.tsx"), "utf8"), "export const value = 99;\n");

  const factoryRequestInput = { projectId: project.id, requestId: "request-approval", userIntent: "تحديث ملف التطبيق", requirements: ["تعديل القيمة"], constraints: ["لا تعدل خارج src"], targetPlatform: "web", acceptanceCriteria: ["القيمة الجديدة موجودة"], buildCommands: ["pnpm run build"], testCommands: ["pnpm run check"] };
  const factoryRequest = await createTypedFactoryRequest(factoryRequestInput);
  const digestDraft = await proposeProjectEdit({ project, instruction: "تعديل مرتبط بالمصنع", inputMode: "text", factoryRequest, files: [{ path: "src/App.tsx", content: "export const value = 5;\n" }] });
  const changedFactoryRequest = await createTypedFactoryRequest({ ...factoryRequestInput, userIntent: "تعديل مختلف بعد المعاينة" });
  await assert.rejects(() => approveProjectEdit(project, digestDraft.approvalToken, changedFactoryRequest), /APPROVAL_INPUT_DIGEST_MISMATCH/);
  assert.equal(await readFile(path.join(root, "src", "App.tsx"), "utf8"), "export const value = 99;\n");

  const singleUseDraft = await proposeProjectEdit({ project, instruction: "تحديث القيمة الصحيح", inputMode: "text", files: [{ path: "src/App.tsx", content: "export const value = 3;\n" }] });
  const applied = await approveProjectEdit(project, singleUseDraft.approvalToken);
  assert.equal(applied.id, singleUseDraft.id);
  assert.equal(await readFile(path.join(root, "src", "App.tsx"), "utf8"), "export const value = 3;\n");
  await assert.rejects(() => approveProjectEdit(project, singleUseDraft.approvalToken), /APPROVAL_TOKEN_ALREADY_USED/);

  const expiryDraft = await proposeProjectEdit({ project, instruction: "تعديل منتهي", inputMode: "text", expiresInMs: 1, files: [{ path: "src/App.tsx", content: "export const value = 4;\n" }] });
  await new Promise((resolve) => setTimeout(resolve, 15));
  await assert.rejects(() => approveProjectEdit(project, expiryDraft.approvalToken), /APPROVAL_EXPIRED/);
  assert.equal(await readFile(path.join(root, "src", "App.tsx"), "utf8"), "export const value = 3;\n");

  console.log("Approval Integrity Runtime: PASS (real SHA conflict, single-use rejection, expiry rejection)");
} finally {
  await vite.close();
  await rm(root, { recursive: true, force: true });
}
