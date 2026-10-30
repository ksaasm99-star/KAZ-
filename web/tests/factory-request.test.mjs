import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({ root: process.cwd(), appType: "custom", server: { middlewareMode: true, hmr: false } });

try {
  const { createTypedFactoryRequest, validateTypedFactoryRequest, verifyFactoryInputDigest } = await vite.ssrLoadModule("/src/agent/factoryRequest.ts");
  const input = {
    projectId: "typed-request-test-project",
    requestId: "typed-request-test-001",
    userIntent: "إنشاء تطبيق Android لإدارة قائمة المهام",
    requirements: ["إضافة مهمة", "تحديد المهمة كمكتملة"],
    constraints: ["يعمل دون اتصال", "لا يرسل بيانات خارج الجهاز"],
    targetPlatform: "android",
    acceptanceCriteria: ["يمكن إنشاء مهمة", "تُحفظ المهمة بعد إعادة التشغيل"],
    buildCommands: ["./gradlew assembleDebug"],
    testCommands: ["./gradlew test"],
  };

  const request = await createTypedFactoryRequest(input, "2026-10-30T00:00:00.000Z");
  assert.equal(request.schemaVersion, 1);
  assert.match(request.inputDigest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(validateTypedFactoryRequest(request).valid, true);
  assert.equal(await verifyFactoryInputDigest(request), true);

  const changed = { ...request, userIntent: `${request.userIntent} مع بحث` };
  assert.equal(await verifyFactoryInputDigest(changed), false);

  const missing = validateTypedFactoryRequest({ ...request, acceptanceCriteria: [] });
  assert.equal(missing.valid, false);
  assert.ok(missing.errors.some((error) => error.includes("acceptanceCriteria")));

  const unsupported = validateTypedFactoryRequest({ ...request, targetPlatform: "ios" });
  assert.equal(unsupported.valid, false);
  assert.ok(unsupported.errors.some((error) => error.includes("targetPlatform")));

  console.log("Typed Factory Request Runtime: PASS (schema, SHA-256 digest, tamper detection, validation)");
} finally {
  await vite.close();
}
