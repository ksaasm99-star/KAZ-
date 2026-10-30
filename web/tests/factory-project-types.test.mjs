import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({ root: process.cwd(), appType: "custom", server: { middlewareMode: true, hmr: false } });

try {
  const [{ createTypedFactoryRequest, validateTypedFactoryRequest }, { getFactoryProjectTypes, validateFactoryFilePlan }] = await Promise.all([
    vite.ssrLoadModule("/src/agent/factoryRequest.ts"),
    vite.ssrLoadModule("/src/agent/factoryProjectTypes.ts"),
  ]);
  const config = JSON.stringify([{
    id: "python-cli",
    displayName: "Python CLI",
    targetPlatform: "python-cli",
    defaultBuildCommands: ["python -m build"],
    defaultTestCommands: ["python -m pytest"],
    allowedWritePrefixes: ["cli/"],
  }]);
  const types = getFactoryProjectTypes(config);
  assert.ok(types.some((item) => item.targetPlatform === "android"));
  assert.ok(types.some((item) => item.targetPlatform === "python-cli"));

  const request = await createTypedFactoryRequest({
    projectId: "factory-types-test",
    requestId: "factory-types-request",
    traceId: "trace-factory-types-request",
    userIntent: "إنشاء أداة سطر أوامر لإدارة المهام",
    appName: "مدير المهام CLI",
    description: "أداة محلية لإدارة المهام من الطرفية",
    audience: "المطورون",
    screens: ["terminal"],
    coreFeatures: ["إضافة مهمة", "عرض المهام"],
    dataModels: ["Task"],
    storage: "ملف JSON محلي",
    dependencies: ["Python standard library"],
    securityPrivacy: ["لا شبكة افتراضيًا"],
    requirements: ["إضافة مهمة", "عرض المهام"],
    constraints: ["لا شبكة افتراضيًا"],
    targetPlatform: "python-cli",
    acceptanceCriteria: ["يضيف المهمة ويعرضها"],
    buildCommands: ["python -m build"],
    testCommands: ["python -m pytest"],
  }, "2026-10-30T00:00:00.000Z", config);

  assert.equal(request.traceId, "trace-factory-types-request");
  assert.equal(request.appName, "مدير المهام CLI");
  assert.deepEqual(request.dataModels, ["Task"]);
  assert.equal(validateTypedFactoryRequest(request, config).valid, true);
  assert.equal(validateTypedFactoryRequest({ ...request, targetPlatform: "ios" }, config).valid, false);
  assert.ok(validateTypedFactoryRequest({ ...request, targetPlatform: "ios" }, config).errors.some((error) => error.includes("Registry")));

  const safePlan = {
    schemaVersion: 1,
    targetPlatform: "python-cli",
    entries: [{ path: "cli/tasks.py", action: "create", purpose: "تنفيذ أوامر المهام", reason: "مطلوب لتحقيق هدف الطلب." }],
  };
  assert.equal(validateFactoryFilePlan(safePlan, config).valid, true);
  assert.equal(validateFactoryFilePlan({ ...safePlan, targetPlatform: "ios" }, config).valid, false);
  assert.equal(validateFactoryFilePlan({ ...safePlan, entries: [{ ...safePlan.entries[0], path: "../secrets.txt" }] }, config).valid, false);
  assert.equal(validateFactoryFilePlan({ ...safePlan, entries: [{ ...safePlan.entries[0], path: "web/unsafe.ts" }] }, config).valid, false);

  console.log("P3.1 Factory Types Runtime: PASS (typed fields, digest validation, config extension, unknown platform and unsafe plan rejection)");
} finally {
  await vite.close();
}
