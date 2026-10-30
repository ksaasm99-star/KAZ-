import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createServer } from "vite";

if (process.env.KAZ_API_ENABLED !== "true" || !process.env.GEMINI_API_KEY) {
  throw new Error("REAL_LLM_TEST_BLOCKED: شغّل الاختبار مع KAZ_API_ENABLED=true ومفتاح Gemini صالح.");
}

const vite = await createServer({ root: process.cwd(), appType: "custom", server: { middlewareMode: true, hmr: false } });
const workspace = await mkdtemp(path.join(os.tmpdir(), "kaz-p2-intelligence-"));

try {
  await mkdir(path.join(workspace, "src"), { recursive: true });
  await writeFile(path.join(workspace, "README.md"), "Todo Android app. Offline first. Main screen lists tasks.\n", "utf8");
  await writeFile(path.join(workspace, "src", "MainActivity.kt"), "class MainActivity { /* existing entry point */ }\n", "utf8");

  const [{ inspectProjectWorkspace, createProjectWorkspacePolicy, createFactoryIntelligencePlan }] = await Promise.all([
    vite.ssrLoadModule("/server/projectIntelligence.ts"),
  ]);
  const manifest = {
    schemaVersion: 1,
    projectId: "p2-real-intelligence-test",
    title: "Todo KAZ",
    summary: "تطبيق مهام Android يعمل دون اتصال",
    appType: "android",
    targetPlatforms: ["android"],
    stack: { language: "Kotlin", framework: "Android", buildSystem: "Gradle", minSdk: 24, targetSdk: 35 },
    capabilities: ["إضافة مهمة", "تغيير حالة المهمة", "عرض قائمة المهام"],
    constraints: { offlineFirst: true, localModelAllowed: true, cloudFallbackAllowed: true, networkRequired: false },
    workspace: { root: workspace, allowedWritePrefixes: ["android"], entryPoints: ["src/MainActivity.kt"], buildCommands: ["./gradlew assembleDebug"], testCommands: ["./gradlew test"] },
    knowledgePolicy: { useProjectSourcesOnly: true, citeSourceIds: true, includeConversationHistory: true },
    quality: { acceptanceCriteria: ["يمكن إضافة مهمة وعرضها"], openRisks: [] },
    execution: { status: "planned", currentStage: "planning", nextAction: "تحليل الطلب", updatedAt: new Date().toISOString() },
  };
  const policy = createProjectWorkspacePolicy(manifest);
  const inspectedFiles = await inspectProjectWorkspace(policy);
  assert.equal(inspectedFiles.length, 2);
  assert.ok(inspectedFiles.some((file) => file.path === "README.md"));

  const result = await createFactoryIntelligencePlan({
    projectId: manifest.projectId,
    requestId: "p2-real-intelligence-request-001",
    request: "اصنع تطبيق مهام Android يعمل دون اتصال مع شاشة لإضافة المهام وتغيير حالتها.",
    manifest,
    inspectedFiles,
  });

  assert.match(result.model, /gemini/i);
  assert.equal(result.typedRequest.projectId, manifest.projectId);
  assert.match(result.typedRequest.inputDigest, /^sha256:[a-f0-9]{64}$/);
  assert.ok(result.typedRequest.requirements.length > 0);
  assert.ok(result.filePlan.length > 0);
  assert.ok(result.filePlan.every((file) => !file.path.startsWith("/") && !file.path.includes("..")));
  assert.equal(result.inspectedFiles.length, inspectedFiles.length);
  console.log(`Factory Intelligence Runtime: PASS (real model=${result.model}, files=${result.inspectedFiles.length}, plan=${result.filePlan.length}, digest=${result.typedRequest.inputDigest})`);
} finally {
  await rm(workspace, { recursive: true, force: true });
  await vite.close();
}
