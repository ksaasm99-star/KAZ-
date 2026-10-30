import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({ root: process.cwd(), appType: "custom", server: { middlewareMode: true, hmr: false } });

try {
  const [{ createTypedFactoryRequest, validateTypedFactoryRequest, verifyFactoryInputDigest }, connector] = await Promise.all([
    vite.ssrLoadModule("/src/agent/factoryRequest.ts"),
    vite.ssrLoadModule("/src/agent/unifiedConnector.ts"),
  ]);

  assert.equal(connector.UNIFIED_CONNECTOR_CONTRACT_VERSION, 1);
  assert.equal(connector.DEFAULT_FACTORY_CONNECTOR.id, "kaz.unified-factory");
  assert.deepEqual([...connector.DEFAULT_FACTORY_CONNECTOR.capabilities], ["analyze", "plan", "preview", "apply", "build", "artifact"]);
  const availableConnectors = connector.listFactoryConnectors();
  assert.deepEqual(availableConnectors.map((item) => item.id), ["github", "kaz-workspace"]);
  assert.equal(availableConnectors.find((item) => item.id === "github").ownerApprovalRequired, true);
  assert.equal(availableConnectors.find((item) => item.id === "kaz-workspace").connectionState, "connected");

  const request = await createTypedFactoryRequest({
    projectId: "connector-contract-test",
    requestId: "connector-contract-request-001",
    userIntent: "إنشاء تطبيق Web لإدارة المهام",
    requirements: ["إضافة مهمة"],
    constraints: ["RTL"],
    targetPlatform: "web",
    acceptanceCriteria: ["يمكن إنشاء مهمة"],
    buildCommands: ["pnpm run build"],
    testCommands: ["pnpm run check"],
  }, "2026-10-30T00:00:00.000Z");

  assert.equal(request.connector.id, "kaz.unified-factory");
  assert.equal(validateTypedFactoryRequest(request).valid, true);
  assert.equal(await verifyFactoryInputDigest(request), true);

  const tamperedConnector = {
    ...request,
    connector: { ...request.connector, id: "unapproved.connector" },
  };
  assert.equal(await verifyFactoryInputDigest(tamperedConnector), false, "تغيير الموصل يجب أن يكسر inputDigest");

  const invalidConnector = validateTypedFactoryRequest({
    ...request,
    connector: { id: "unsafe", version: "v1", capabilities: ["shell"] },
  });
  assert.equal(invalidConnector.valid, false);
  assert.ok(invalidConnector.errors.some((error) => error.includes("connector")));

  console.log("Unified Connector Contract Runtime: PASS (contract, default binding, digest binding, tamper rejection)");
} finally {
  await vite.close();
}
