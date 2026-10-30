import assert from "node:assert/strict";
import { createServer } from "vite";

const baseUrl = process.env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434";
const tagsResponse = await fetch(`${baseUrl.replace(/\/$/, "")}/api/tags`).catch(() => null);
if (!tagsResponse?.ok) {
  console.log(`P2.6 Runtime: BLOCKED (Ollama unavailable at ${baseUrl}; no fallback or Mock used)`);
  process.exit(0);
}

const vite = await createServer({ root: process.cwd(), appType: "custom", server: { middlewareMode: true, hmr: false } });
const projectId = `test-llm-network-${Date.now()}`;
const requestId = `${projectId}-request`;
const approvalId = `${projectId}-owner-approval`;
try {
  const [{ PersistentMemory }, { createProjectManifest }, { runLLMWithNetwork }] = await Promise.all([
    vite.ssrLoadModule("/server/persistentMemory.ts"),
    vite.ssrLoadModule("/src/agent/projectManifest.ts"),
    vite.ssrLoadModule("/server/localIntelligence.ts"),
  ]);
  const memory = new PersistentMemory();
  const now = new Date().toISOString();
  memory.saveProject({ id: projectId, title: "LLM Network Broker Runtime", summary: "اختبار ربط Ollama الحقيقي", updatedAt: now, sources: [], knowledge: [], messages: [], manifest: createProjectManifest({ id: projectId, title: "LLM Network Broker Runtime", summary: "اختبار ربط Ollama الحقيقي", updatedAt: now }) });
  const approval = { ownerApproved: true, projectId, requestId, approvalId, ledger: memory };
  const result = await runLLMWithNetwork(
    "ابحث عن أحدث إصدار من React عبر NetworkBroker، ثم اقترح خطة دقيقة لإضافة React للمشروع. يجب أن تطلب البحث أولاً بصيغة network_request ثم تكمل بخطة نهائية.",
    { projectId, target: "web", rule: "قراءة وتحليل فقط" },
    approval,
  );
  assert.ok(result.networkRequests >= 1, "The local model did not request a network operation");
  assert.ok(result.networkRequests <= 3, "Network request limit was exceeded");
  assert.ok(result.finalResponse.length > 0);
  assert.equal(result.finalResponse.includes('"type":"network_request"'), false);
  const ledger = memory.listEvidenceLedger(projectId, requestId);
  assert.ok(ledger.some((event) => event.eventType === "network_fetch_succeeded" || event.eventType === "network_fetch_failed"));
  console.log(`P2.6 Runtime: PASS (model=${result.model}, networkRequests=${result.networkRequests}, ledgerEvents=${ledger.length})`);
  console.log(`FINAL_RESPONSE=${result.finalResponse}`);
  memory.archiveProject(projectId);
} finally {
  await vite.close();
}
