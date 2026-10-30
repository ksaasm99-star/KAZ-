import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({ root: process.cwd(), appType: "custom", server: { middlewareMode: true, hmr: false } });

try {
  const [{ createTypedFactoryRequest }, { generateAndroidProjectFilePlan }] = await Promise.all([
    vite.ssrLoadModule("/src/agent/factoryRequest.ts"),
    vite.ssrLoadModule("/server/multiFileGenerator.ts"),
  ]);

  const request = await createTypedFactoryRequest({
    projectId: "multi-file-generator-test-project",
    requestId: "multi-file-generator-test-001",
    userIntent: "إنشاء تطبيق متابعة المصروفات",
    requirements: ["إضافة مصروف", "عرض ملخص"],
    constraints: ["يعمل دون اتصال"],
    targetPlatform: "android",
    acceptanceCriteria: ["يفتح التطبيق نقطة الدخول الرئيسية"],
    buildCommands: ["./gradlew assembleDebug"],
    testCommands: ["./gradlew test"],
  }, "2026-10-30T00:00:00.000Z");

  const plan = await generateAndroidProjectFilePlan(request);
  assert.equal(plan.schemaVersion, 1);
  assert.equal(plan.projectId, request.projectId);
  assert.equal(plan.requestId, request.requestId);
  assert.match(plan.planDigest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(plan.files.length, 6);
  assert.equal(new Set(plan.files.map((file) => file.path)).size, plan.files.length);
  assert.ok(plan.files.every((file) => file.action === "create" && file.content.length > 0));
  assert.ok(plan.files.some((file) => file.path.endsWith("AndroidManifest.xml")));
  assert.ok(plan.files.some((file) => file.path.endsWith("MainActivity.kt")));

  const gradle = plan.files.find((file) => file.path === "android/app/build.gradle.kts");
  const manifest = plan.files.find((file) => file.path.endsWith("AndroidManifest.xml"));
  const activity = plan.files.find((file) => file.path.endsWith("MainActivity.kt"));
  const packageMatch = gradle?.content.match(/namespace = \"([^\"]+)\"/);
  assert.ok(packageMatch?.[1]);
  assert.ok(gradle?.content.includes(`applicationId = "${packageMatch[1]}"`));
  assert.ok(manifest?.content.includes("android:name=\".MainActivity\""));
  assert.ok(activity?.content.includes(`package ${packageMatch?.[1]}`));
  assert.ok(activity?.content.includes("class MainActivity : Activity()"));

  const tampered = { ...request, userIntent: "تغيير خارج البصمة" };
  await assert.rejects(() => generateAndroidProjectFilePlan(tampered), /FACTORY_REQUEST_DIGEST_MISMATCH/);

  console.log("Multi-file Generator Runtime: PASS (6 real Android files, linked entry point, digest guard, no disk apply)");
} finally {
  await vite.close();
}
