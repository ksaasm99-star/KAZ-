import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  server: { middlewareMode: true, hmr: false },
});

try {
  const [{ createAgentTask }, { runReadOnlyAgentTask }] = await Promise.all([
    vite.ssrLoadModule("/src/agent/agentTask.ts"),
    vite.ssrLoadModule("/src/agent/executionLoop.ts"),
  ]);

  const manifest = {
    project: {
      id: "runtime-test-project",
      title: "اختبار Runtime",
      summary: "fixture",
      updatedAt: new Date().toISOString(),
      sources: [],
      knowledge: [],
      messages: [],
      manifest: { id: "runtime-test-project", title: "اختبار Runtime" },
    },
    manifest: { id: "runtime-test-project", title: "اختبار Runtime" },
  };

  const makeTask = (overrides = {}) => createAgentTask({
    projectId: "runtime-test-project",
    request: "اختبار حلقة القراءة والبحث",
    maxSteps: 2,
    timeoutMs: 5000,
    ...overrides,
  });

  const success = await runReadOnlyAgentTask(makeTask(), {
    read_project_manifest: async () => manifest,
    search_project_memory: async () => [{
      entityType: "knowledge",
      entityId: "runtime-test-knowledge",
      projectId: "runtime-test-project",
      title: "نتيجة الاختبار",
      content: "معلومة اختبارية",
      createdAt: new Date().toISOString(),
    }],
  });
  assert.equal(success.status, "completed");
  assert.equal(success.stepCount, 2);
  assert.equal(success.evidence.length, 2);
  assert.ok(success.evidence.every((item) => item.ok));
  assert.equal(success.searchResults.length, 1);

  const controller = new AbortController();
  controller.abort();
  const cancelled = await runReadOnlyAgentTask(makeTask(), {
    read_project_manifest: async () => manifest,
    search_project_memory: async () => [],
  }, { signal: controller.signal });
  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.stepCount, 0);

  let clock = 0;
  const timedOut = await runReadOnlyAgentTask(makeTask({ timeoutMs: 1000 }), {
    read_project_manifest: async () => {
      clock = 2001;
      return manifest;
    },
    search_project_memory: async () => [],
  }, { now: () => clock });
  assert.equal(timedOut.status, "blocked");
  assert.equal(timedOut.stepCount, 1);
  assert.equal(timedOut.evidence.length, 1);

  const failed = await runReadOnlyAgentTask(makeTask(), {
    read_project_manifest: async () => manifest,
    search_project_memory: async () => {
      throw new Error("اختبار فشل أداة البحث");
    },
  });
  assert.equal(failed.status, "failed");
  assert.equal(failed.stepCount, 2);
  assert.equal(failed.evidence.length, 2);
  assert.equal(failed.evidence[1].ok, false);

  console.log("AgentTask Runtime tests: PASS (success, cancellation, timeout, tool failure)");
} finally {
  await vite.close();
}
