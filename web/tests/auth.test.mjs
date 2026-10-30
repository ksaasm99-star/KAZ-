import assert from "node:assert/strict";
import { createServer } from "vite";

const ownerToken = "p2-2-owner-token-012345678901234567890123456789";
process.env.KAZ_OWNER_TOKEN = ownerToken;

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  server: { port: 5175, host: "127.0.0.1", hmr: false },
});
await vite.listen();
const address = vite.httpServer.address();
const port = typeof address === "object" && address ? address.port : 0;
const baseUrl = `http://127.0.0.1:${port}`;

async function call(path, init) {
  return fetch(`${baseUrl}${path}`, init);
}

const jsonHeaders = { "content-type": "application/json" };
const withToken = (headers = {}) => ({ ...headers, Authorization: `Bearer ${ownerToken}` });

try {
  const protectedRequests = [
    ["project-edit", "/api/project-edit", { method: "POST", headers: jsonHeaders, body: "{}" }],
    ["factory-build", "/api/factory/build", { method: "POST", headers: jsonHeaders, body: "{}" }],
    ["factory-payload", "/api/factory/payload?projectId=missing", { method: "GET" }],
    ["models-write", "/api/models", { method: "POST", headers: jsonHeaders, body: "{}" }],
    ["ollama-active", "/api/ollama/active", { method: "POST", headers: jsonHeaders, body: "{}" }],
    ["ollama-pull", "/api/ollama/pull", { method: "POST", headers: jsonHeaders, body: "{}" }],
    ["emergency-stop", "/api/emergency-stop", { method: "POST", headers: jsonHeaders, body: "{" }],
    ["memory-write", "/api/memory/projects", { method: "POST", headers: jsonHeaders, body: "{}" }],
    ["identity-write", "/api/identity", { method: "PUT", headers: jsonHeaders, body: "{}" }],
  ];

  const traceIds = [];
  for (const [name, path, init] of protectedRequests) {
    const response = await call(path, init);
    assert.equal(response.status, 401, `${name} must reject missing token`);
    const body = await response.json();
    assert.equal(body.error, "KAZ-AUTH-001", `${name} must return the unified auth error code`);
    assert.match(body.traceId, /^auth-/);
    traceIds.push(body.traceId);
  }

  const publicResponses = await Promise.all([
    call("/api/memory/projects"),
    call("/api/memory/health"),
    call("/api/ollama/models"),
    call("/api/models"),
  ]);
  for (const response of publicResponses) assert.notEqual(response.status, 401, "public GET must not require token");

  const identityResponse = await call("/api/identity");
  assert.equal(identityResponse.status, 200);
  const currentIdentity = await identityResponse.json();
  const validRequests = [
    ["project-edit", "/api/project-edit", { method: "POST", headers: withToken(jsonHeaders), body: "{}" }],
    ["factory-build", "/api/factory/build", { method: "POST", headers: withToken(jsonHeaders), body: "{}" }],
    ["factory-payload", "/api/factory/payload?projectId=missing", { method: "GET", headers: withToken() }],
    ["models-write", "/api/models", { method: "POST", headers: withToken(jsonHeaders), body: "{}" }],
    ["ollama-active", "/api/ollama/active", { method: "POST", headers: withToken(jsonHeaders), body: "{}" }],
    ["ollama-pull", "/api/ollama/pull", { method: "POST", headers: withToken(jsonHeaders), body: "{}" }],
    ["emergency-stop", "/api/emergency-stop", { method: "POST", headers: withToken(jsonHeaders), body: "{" }],
    ["memory-write", "/api/memory/projects", { method: "POST", headers: withToken(jsonHeaders), body: "{}" }],
    ["identity-write", "/api/identity", { method: "PUT", headers: withToken(jsonHeaders), body: JSON.stringify(currentIdentity.identity) }],
  ];
  const validStatuses = [];
  for (const [name, path, init] of validRequests) {
    const response = await call(path, init);
    validStatuses.push(response.status);
    assert.notEqual(response.status, 401, `${name} must pass authentication with a valid token`);
  }
  assert.ok(validStatuses.includes(200) || validStatuses.includes(201), "valid token must reach a successful protected response");

  const ledgerResponse = await call("/api/memory/projects/__kaz_security__/ledger");
  assert.equal(ledgerResponse.status, 200);
  const ledgerBody = await ledgerResponse.json();
  const authEvents = (ledgerBody.ledger ?? []).filter((event) => event.eventType === "authentication_failed");
  assert.ok(authEvents.length >= traceIds.length, "every rejected request must be recorded in Evidence Ledger");
  for (const traceId of traceIds) assert.ok(authEvents.some((event) => event.payload?.traceId === traceId), `missing ledger trace ${traceId}`);

  console.log(`API Auth Runtime: PASS (401=${traceIds.length}, valid-token=accepted, ledger-traces=${traceIds.length})`);
} finally {
  await vite.close();
}
