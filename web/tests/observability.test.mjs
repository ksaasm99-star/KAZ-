import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";

const port = 5199;
const env = { ...process.env, KAZ_OWNER_TOKEN: process.env.KAZ_OWNER_TOKEN || "observability-test-owner-token-32-chars", KAZ_API_ENABLED: "false" };
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(port)], { env, stdio: ["ignore", "pipe", "pipe"] });

try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("VITE_START_TIMEOUT")), 10000);
    server.stdout.on("data", (chunk) => { if (String(chunk).includes("Local")) { clearTimeout(timer); resolve(); } });
    server.stderr.on("data", (chunk) => { if (String(chunk).includes("error")) console.error(String(chunk)); });
    server.on("error", reject);
  });
  const health = await fetch(`http://127.0.0.1:${port}/api/health`);
  assert.equal(health.status, 200);
  const healthBody = await health.json();
  assert.ok(["healthy", "degraded", "unhealthy"].includes(healthBody.status));
  assert.ok(healthBody.checks.database);
  assert.ok(healthBody.checks.auth);

  const unauthorized = await fetch(`http://127.0.0.1:${port}/api/factory/build`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  assert.equal(unauthorized.status, 401);
  const errorBody = await unauthorized.json();
  for (const key of ["error", "message", "traceId", "hint", "timestamp"]) assert.equal(typeof errorBody[key], "string");

  const catalog = await readFile(new URL("../../docs/ERROR_CATALOG.md", import.meta.url), "utf8");
  for (const code of ["KAZ-AUTH-001", "KAZ-PROVIDER-001", "KAZ-PROVIDER-002", "KAZ-FACTORY-001", "KAZ-NETWORK-001", "KAZ-SANDBOX-001", "KAZ-DB-001", "KAZ-EMERGENCY-001"]) assert.match(catalog, new RegExp(code));
  const screen = await readFile(new URL("../src/screens/DiagnosticsScreen.tsx", import.meta.url), "utf8");
  assert.match(screen, /\/api\/health|loadHealth/);
  console.log("OBSERVABILITY_TEST=PASS");
} finally {
  server.kill("SIGTERM");
}
