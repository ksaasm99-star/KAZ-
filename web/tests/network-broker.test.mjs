import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "vite";

const vite = await createServer({ root: process.cwd(), appType: "custom", server: { middlewareMode: true, hmr: false } });
const projectId = `test-network-broker-${Date.now()}`;
const requestId = `${projectId}-request`;
const approvalId = `${projectId}-owner-approval`;

try {
  const [{ PersistentMemory }, { createProjectManifest }, { fetchUrl, searchWeb }] = await Promise.all([
    vite.ssrLoadModule("/server/persistentMemory.ts"),
    vite.ssrLoadModule("/src/agent/projectManifest.ts"),
    vite.ssrLoadModule("/server/networkBroker.ts"),
  ]);
  const memory = new PersistentMemory();
  const now = new Date().toISOString();
  memory.saveProject({ id: projectId, title: "Network Broker Runtime", summary: "اختبار شبكة حقيقي", updatedAt: now, sources: [], knowledge: [], messages: [], manifest: createProjectManifest({ id: projectId, title: "Network Broker Runtime", summary: "اختبار شبكة حقيقي", updatedAt: now }) });
  const approval = { ownerApproved: true, projectId, requestId, approvalId, ledger: memory };

  const allowed = await fetchUrl("https://example.com", approval);
  assert.equal(allowed.ok, true);
  if (!allowed.ok) throw new Error(allowed.reason);
  assert.equal(allowed.status, 200);
  assert.equal(allowed.contentType, "text/html");
  assert.equal(allowed.sha256, createHash("sha256").update(allowed.body, "utf8").digest("hex"));
  assert.ok(allowed.body.length > 0);

  const httpsRejected = await fetchUrl("http://example.com", approval);
  assert.equal(httpsRejected.ok, false);
  const localhostRejected = await fetchUrl("http://localhost:11434", approval);
  assert.equal(localhostRejected.ok, false);
  const privateRejected = await fetchUrl("http://192.168.1.1", approval);
  assert.equal(privateRejected.ok, false);
  const protocolRejected = await fetchUrl("file:///etc/passwd", approval);
  assert.equal(protocolRejected.ok, false);

  const noApproval = await fetchUrl("https://example.com");
  assert.equal(noApproval.ok, false);
  assert.equal(noApproval.reason, "NETWORK_OWNER_APPROVAL_REQUIRED");

  const search = await searchWeb("React hooks", approval);
  assert.equal(search.ok, true);
  if (!search.ok) throw new Error(search.reason);
  assert.ok(search.results.length >= 5, `Expected at least 5 results, received ${search.results.length}`);
  assert.ok(search.results.every((result) => result.title && result.url && result.snippet));

  const ledger = memory.listEvidenceLedger(projectId, requestId);
  assert.ok(ledger.length >= 6);
  assert.ok(ledger.some((event) => event.eventType === "network_fetch_succeeded" && event.payload.sha256 === allowed.sha256));
  assert.ok(ledger.some((event) => event.eventType === "network_fetch_failed" && event.payload.reason === "HTTPS_ONLY"));
  assert.ok(ledger.some((event) => event.eventType === "network_fetch_failed" && event.payload.url === "http://localhost:11434"));
  assert.ok(ledger.some((event) => event.eventType === "network_fetch_failed" && event.payload.url === "http://192.168.1.1"));
  assert.ok(ledger.every((event) => event.payload.url && event.payload.reason !== undefined || event.eventType === "network_fetch_succeeded"));
  console.log(`NetworkBroker Runtime: PASS (exampleSha256=${allowed.sha256}, searchResults=${search.results.length}, ledgerEvents=${ledger.length})`);
  memory.archiveProject(projectId);
} finally {
  await vite.close();
}
