import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "vite";

const root = await mkdtemp(path.join(tmpdir(), "kaz-execution-pipeline-"));
const viteRoot = await mkdtemp(path.join(tmpdir(), "kaz-execution-pipeline-vite-"));
const vite = await createServer({ root: viteRoot, configFile: false, optimizeDeps: { disabled: true }, appType: "custom", server: { middlewareMode: true, hmr: false } });
const project = { id: "pipeline-project", manifest: { workspace: { root, allowedWritePrefixes: ["src"] } } };

try {
  await mkdir(path.join(root, "src"), { recursive: true });
  const filePath = path.join(root, "src", "App.tsx");
  await writeFile(filePath, "export const value = 1;\n", "utf8");

  const pipeline = await vite.ssrLoadModule(path.resolve(process.cwd(), "server/executionPipeline.ts"));
  const initial = await readFile(filePath, "utf8");

  const proposal = pipeline.createPlannerProposal({
    projectId: project.id,
    instruction: "تحديث القيمة فقط",
    inputMode: "text",
    files: [{ path: "src/App.tsx", content: "export const value = 2;\n" }],
  });
  assert.equal(await readFile(filePath, "utf8"), initial, "Planner must not write files");

  const allowed = pipeline.evaluatePolicy(project, proposal);
  assert.equal(allowed.allowed, true);
  const rejectedPath = pipeline.createPlannerProposal({
    projectId: project.id,
    instruction: "محاولة خارج النطاق",
    inputMode: "text",
    files: [{ path: "../etc/passwd", content: "bad\n" }],
  });
  const denied = pipeline.evaluatePolicy(project, rejectedPath);
  assert.equal(denied.allowed, false);
  assert.match(denied.reasons.join("|"), /خارج|الخروج|OUTSIDE|غير مسموح|WRITE_NOT_ALLOWED/);
  await assert.rejects(() => pipeline.requestProjectEditApproval({ project, proposal: rejectedPath }), /POLICY_REJECTED/);
  assert.equal(await readFile(filePath, "utf8"), initial, "Policy rejection must not write files");

  const pending = await pipeline.requestProjectEditApproval({ project, proposal });
  assert.equal(await readFile(filePath, "utf8"), initial, "Approval preview must not write files");
  await assert.rejects(
    () => pipeline.executeApprovedProjectEdit({ project, approval: { authorizationId: "forged", requestId: proposal.requestId, projectId: project.id, draftId: pending.draft.id } }),
    /APPROVAL_REQUIRED/,
  );
  assert.equal(await readFile(filePath, "utf8"), initial, "Forged approval must not reach Executor");

  const approval = await pipeline.approvePlannerProposal({ project, proposal, draft: pending.draft });
  const applied = await pipeline.executeApprovedProjectEdit({ project, approval });
  assert.equal(applied.id, pending.draft.id);
  assert.equal(await readFile(filePath, "utf8"), "export const value = 2;\n");
  await assert.rejects(() => pipeline.executeApprovedProjectEdit({ project, approval }), /APPROVAL_REQUIRED/);

  console.log("Execution Pipeline Runtime: PASS (planner no-write, policy reject, forged approval reject, approved executor apply, single-use witness)");
} finally {
  await vite.close();
  await rm(root, { recursive: true, force: true });
  await rm(viteRoot, { recursive: true, force: true });
}
