import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "vite";

const root = await mkdtemp(path.join(tmpdir(), "kaz-emergency-stop-"));
const viteRoot = await mkdtemp(path.join(tmpdir(), "kaz-emergency-stop-vite-"));
const projectId = `emergency-stop-project-${Date.now()}`;
const vite = await createServer({ root: viteRoot, configFile: false, optimizeDeps: { disabled: true }, appType: "custom", server: { middlewareMode: true, hmr: false } });
let stop;

try {
  await mkdir(path.join(root, "src"), { recursive: true });
  const filePath = path.join(root, "src/App.tsx");
  await writeFile(filePath, "export const value = 1;\n", "utf8");
  const [pipeline, sandbox, stopModule, memoryModule, manifestModule] = await Promise.all([
    vite.ssrLoadModule(path.resolve(process.cwd(), "server/executionPipeline.ts")),
    vite.ssrLoadModule(path.resolve(process.cwd(), "server/executionSandbox.ts")),
    vite.ssrLoadModule(path.resolve(process.cwd(), "server/emergencyStop.ts")),
    vite.ssrLoadModule(path.resolve(process.cwd(), "server/persistentMemory.ts")),
    vite.ssrLoadModule(path.resolve(process.cwd(), "src/agent/projectManifest.ts")),
  ]);
  stop = stopModule;
  const project = { id: projectId, manifest: { workspace: { root, allowedWritePrefixes: ["src"] } } };
  const proposal = pipeline.createPlannerProposal({ projectId, instruction: "تحديث القيمة فقط", inputMode: "text", files: [{ path: "src/App.tsx", content: "export const value = 2;\n" }] });
  const pending = await pipeline.requestProjectEditApproval({ project, proposal });
  const approval = await pipeline.approvePlannerProposal({ project, proposal, draft: pending.draft });

  const memory = new memoryModule.PersistentMemory();
  memory.saveProject({ id: projectId, title: "Emergency Stop Test", summary: "fixture", updatedAt: new Date().toISOString(), sources: [], knowledge: [], messages: [], manifest: manifestModule.createProjectManifest({ id: projectId, title: "Emergency Stop Test", summary: "fixture" }) });
  const task = memory.createOrGetTask({ taskId: `task-${Date.now()}`, projectId, idempotencyKey: `stop-${Date.now()}`, totalSteps: 2 });
  memory.updateTaskCheckpoint({ taskId: task.record.taskId, status: "IN_PROGRESS", stepIndex: 1, totalSteps: 2 });

  const state = stop.activateEmergencyStop("اختبار إيقاف الطوارئ");
  assert.equal(state.stopped, true);
  const paused = memory.pauseInProgressTasks(state.reason);
  assert.equal(paused.length, 1);
  assert.equal(paused[0].status, "PAUSED");
  await assert.rejects(() => pipeline.executeApprovedProjectEdit({ project, approval }), /EMERGENCY_STOPPED/);
  assert.equal(await readFile(filePath, "utf8"), "export const value = 1;\n");

  const sandboxResult = await sandbox.runInExecutionSandbox({ workspaceRoot: root, command: "printf SHOULD_NOT_RUN" });
  assert.equal(sandboxResult.status, "blocked");
  assert.equal(sandboxResult.reason, "EMERGENCY_STOPPED");
  assert.equal(sandboxResult.stdout, "");
  console.log("Emergency Stop Runtime: PASS (valid approval rejected, sandbox blocked, in-progress task paused)");
} finally {
  stop.resetEmergencyStopForTests();
  await vite.close();
  await rm(root, { recursive: true, force: true });
  await rm(viteRoot, { recursive: true, force: true });
}
