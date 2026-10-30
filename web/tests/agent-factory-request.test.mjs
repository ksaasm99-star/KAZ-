import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({ root: process.cwd(), appType: "custom", server: { middlewareMode: true, hmr: false } });

try {
  const [{ createAgentTask }, { runReadOnlyAgentTask }, { createFactoryRequestFromAgentTask }, { createProjectManifest }] = await Promise.all([
    vite.ssrLoadModule("/src/agent/agentTask.ts"),
    vite.ssrLoadModule("/src/agent/executionLoop.ts"),
    vite.ssrLoadModule("/src/agent/factoryRequestAdapter.ts"),
    vite.ssrLoadModule("/src/agent/projectManifest.ts"),
  ]);

  const task = createAgentTask({
    projectId: "agent-factory-test-project",
    request: "إنشاء تطبيق Android لإدارة المصروفات",
    maxSteps: 2,
    timeoutMs: 5000,
  });
  const plan = {
    requirements: ["إضافة مصروف", "عرض ملخص شهري"],
    constraints: ["لا كتابة ملفات قبل الموافقة", "لا إرسال بيانات خارج الجهاز"],
    targetPlatform: "android",
    acceptanceCriteria: ["يُحفظ المصروف بعد إعادة التشغيل"],
    buildCommands: ["./gradlew assembleDebug"],
    testCommands: ["./gradlew test"],
  };

  const request = await createFactoryRequestFromAgentTask(task, plan, "2026-10-30T00:00:00.000Z");
  assert.equal(request.projectId, task.projectId);
  assert.equal(request.requestId, task.id);
  assert.equal(request.userIntent, task.request);
  assert.match(request.inputDigest, /^sha256:[a-f0-9]{64}$/);

  const projectManifest = createProjectManifest({ id: task.projectId, title: "اختبار محول المصنع", summary: "fixture" });
  const manifest = { project: { id: task.projectId, title: "اختبار محول المصنع", summary: "fixture", updatedAt: new Date().toISOString(), sources: [], knowledge: [], messages: [], manifest: projectManifest }, manifest: projectManifest };
  const state = await runReadOnlyAgentTask(task, {
    read_project_manifest: async () => manifest,
    search_project_memory: async () => [{
      entityType: "knowledge",
      entityId: "agent-factory-test-source",
      projectId: task.projectId,
      title: "دليل اختبار محول المصنع",
      content: "مصدر اصطناعي لإثبات اكتمال دورة القراءة فقط.",
      createdAt: new Date().toISOString(),
    }],
  }, { factoryRequest: plan });

  assert.equal(state.status, "completed");
  assert.equal(state.factoryRequest?.projectId, task.projectId);
  assert.equal(state.factoryRequest?.requestId, task.id);
  assert.equal(state.factoryRequest?.targetPlatform, "android");
  assert.equal(state.factoryRequest?.inputDigest, request.inputDigest);
  assert.equal(state.evidence.length, 2);

  await assert.rejects(
    () => createFactoryRequestFromAgentTask(task, { ...plan, acceptanceCriteria: [] }),
    /Typed Factory Request غير صالح/,
  );

  console.log("AgentTask Factory Request Runtime: PASS (read-only adapter, task scope, digest, validation)");
} finally {
  await vite.close();
}
