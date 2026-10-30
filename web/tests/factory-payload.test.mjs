import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";

const ownerToken = "p2-1-owner-token";
const projectId = `test-factory-payload-${Date.now()}`;
process.env.KAZ_OWNER_TOKEN = ownerToken;

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  server: { port: 5174, host: "127.0.0.1", hmr: false },
});

await vite.listen();
const address = vite.httpServer.address();
const port = typeof address === "object" && address ? address.port : 0;
const baseUrl = `http://127.0.0.1:${port}`;

try {
  const project = {
    id: projectId,
    title: "P2.1 payload test",
    summary: "اختبار جلب محتوى المشروع من endpoint داخلي محمي.",
    updatedAt: new Date().toISOString(),
    manifest: {
      schemaVersion: 1,
      projectId,
      title: "P2.1 payload test",
      summary: "اختبار جلب محتوى المشروع من endpoint داخلي محمي.",
      appType: "unknown",
      targetPlatforms: [],
      stack: {},
      capabilities: [],
      constraints: { offlineFirst: true, localModelAllowed: true, cloudFallbackAllowed: false, networkRequired: false },
      workspace: { entryPoints: [], buildCommands: [], testCommands: [] },
      knowledgePolicy: { useProjectSourcesOnly: true, citeSourceIds: true, includeConversationHistory: true },
      quality: { acceptanceCriteria: [], openRisks: [] },
      execution: { status: "planned", currentStage: "test", nextAction: "none", updatedAt: new Date().toISOString() },
    },
    sources: [{ id: "source-1", name: "README.md", kind: "file", value: "مصدر اختبار" }],
    knowledge: [{ id: "knowledge-1", title: "قاعدة اختبار", content: "محتوى اختبار" }],
    messages: [{ id: "message-1", role: "user", text: "رسالة اختبار" }],
  };

  const createResponse = await fetch(`${baseUrl}/api/memory/projects`, {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify(project),
  });
  if (createResponse.status !== 201) {
    throw new Error(`PROJECT_CREATE_FAILED_${createResponse.status}: ${await createResponse.text()}`);
  }
  assert.equal(createResponse.status, 201);

  const unauthorized = await fetch(`${baseUrl}/api/factory/payload?projectId=${encodeURIComponent(projectId)}`);
  assert.equal(unauthorized.status, 401);

  const authorized = await fetch(`${baseUrl}/api/factory/payload?projectId=${encodeURIComponent(projectId)}`, { headers: { Authorization: `Bearer ${ownerToken}` } });
  assert.equal(authorized.status, 200);
  const payload = await authorized.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.projectId, projectId);
  assert.match(payload.inputDigest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(typeof payload.project_json_b64, "string");
  const decoded = JSON.parse(Buffer.from(payload.project_json_b64, "base64").toString("utf8"));
  assert.equal(decoded.id, projectId);
  assert.equal(decoded.sources[0].value, "مصدر اختبار");

  const configSource = await readFile(new URL("../vite.config.ts", import.meta.url), "utf8");
  assert.match(configSource, /client_payload: \{ projectId: project\.id, requestId, inputDigest, artifactName \}/);
  assert.doesNotMatch(configSource, /client_payload: \{[^}]*project_json_b64/s);

  console.log("Factory Payload Runtime: PASS (unauthorized=401, payload=API, dispatch=metadata-only)");
} finally {
  await fetch(`${baseUrl}/api/memory/projects/${encodeURIComponent(projectId)}`, { method: "DELETE", headers: { Authorization: `Bearer ${ownerToken}` } });
  await vite.close();
}
