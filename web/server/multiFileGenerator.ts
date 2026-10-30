import { createHash } from "node:crypto";
import type { TypedFactoryRequest } from "../src/agent/factoryRequest";
import { validateTypedFactoryRequest, verifyFactoryInputDigest } from "../src/agent/factoryRequest";

export type GeneratedFilePlanEntry = {
  path: string;
  action: "create";
  language: "kotlin" | "kotlin-dsl" | "xml" | "properties";
  purpose: string;
  content: string;
};

export type MultiFilePlan = {
  schemaVersion: 1;
  projectId: string;
  requestId: string;
  targetPlatform: "android";
  files: GeneratedFilePlanEntry[];
  planDigest: string;
};

function packageSegment(projectId: string): string {
  const normalized = projectId.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24) || "app";
  return /^[a-z]/.test(normalized) ? normalized : `p${normalized}`;
}

function xmlEscape(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function kotlinEscape(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", "\\n");
}

function digestPlan(files: GeneratedFilePlanEntry[]): string {
  const canonical = JSON.stringify(files.map(({ path, action, language, purpose, content }) => ({ path, action, language, purpose, content })));
  return `sha256:${createHash("sha256").update(canonical, "utf8").digest("hex")}`;
}

export async function generateAndroidProjectFilePlan(request: TypedFactoryRequest): Promise<MultiFilePlan> {
  const validation = validateTypedFactoryRequest(request);
  if (!validation.valid) throw new Error(`INVALID_TYPED_FACTORY_REQUEST: ${validation.errors.join(" ")}`);
  if (request.targetPlatform !== "android" && request.targetPlatform !== "hybrid") throw new Error("UNSUPPORTED_GENERATOR_PLATFORM");
  if (!(await verifyFactoryInputDigest(request))) throw new Error("FACTORY_REQUEST_DIGEST_MISMATCH");

  const packageName = `com.kaz.generated.${packageSegment(request.projectId)}`;
  const label = xmlEscape(request.userIntent.trim().slice(0, 48));
  const kotlinLabel = kotlinEscape(request.userIntent.trim().slice(0, 48));
  const files: GeneratedFilePlanEntry[] = [
    {
      path: "android/settings.gradle.kts",
      action: "create",
      language: "kotlin-dsl",
      purpose: "تعريف مشروع Gradle ووحدة التطبيق",
      content: `import org.gradle.api.initialization.resolve.RepositoriesMode\n\npluginManagement {\n    repositories { google(); mavenCentral(); gradlePluginPortal() }\n}\ndependencyResolutionManagement {\n    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)\n    repositories { google(); mavenCentral() }\n}\nrootProject.name = "KAZGeneratedApp"\ninclude(":app")\n`,
    },
    {
      path: "android/build.gradle.kts",
      action: "create",
      language: "kotlin-dsl",
      purpose: "تثبيت إضافة Android Gradle للمشروع المولّد",
      content: `plugins {\n    id("com.android.application") version "8.8.2" apply false\n}\n`,
    },
    {
      path: "android/gradle.properties",
      action: "create",
      language: "properties",
      purpose: "إعدادات Gradle وAndroidX",
      content: `org.gradle.jvmargs=-Xmx2g -Dfile.encoding=UTF-8\nandroid.useAndroidX=true\nandroid.nonTransitiveRClass=true\n`,
    },
    {
      path: "android/app/build.gradle.kts",
      action: "create",
      language: "kotlin-dsl",
      purpose: "إعداد وحدة Android application",
      content: `plugins {\n    id("com.android.application")\n}\n\nandroid {\n    namespace = "${packageName}"\n    compileSdk = 35\n    defaultConfig {\n        applicationId = "${packageName}"\n        minSdk = 21\n        targetSdk = 35\n        versionCode = 1\n        versionName = "1.0"\n    }\n}\n`,
    },
    {
      path: "android/app/src/main/AndroidManifest.xml",
      action: "create",
      language: "xml",
      purpose: "تعريف التطبيق ونقطة الدخول الفعلية",
      content: `<?xml version="1.0" encoding="utf-8"?>\n<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n    <application android:theme="@android:style/Theme.Material.Light.NoActionBar" android:label="${label}" android:allowBackup="false" android:supportsRtl="true">\n        <activity android:name=".MainActivity" android:exported="true">\n            <intent-filter>\n                <action android:name="android.intent.action.MAIN" />\n                <category android:name="android.intent.category.LAUNCHER" />\n            </intent-filter>\n        </activity>\n    </application>\n</manifest>\n`,
    },
    {
      path: `android/app/src/main/kotlin/${packageName.replaceAll(".", "/")}/MainActivity.kt`,
      action: "create",
      language: "kotlin",
      purpose: "نقطة تشغيل Android حقيقية تعرض نية المستخدم الممررة للطلب",
      content: `package ${packageName}\n\nimport android.app.Activity\nimport android.os.Bundle\nimport android.widget.TextView\n\nclass MainActivity : Activity() {\n    override fun onCreate(savedInstanceState: Bundle?) {\n        super.onCreate(savedInstanceState)\n        setContentView(TextView(this).apply {\n            text = "${kotlinLabel}"\n            textSize = 20f\n        })\n    }\n}\n`,
    },
  ];

  const paths = new Set<string>();
  for (const file of files) {
    if (paths.has(file.path)) throw new Error(`DUPLICATE_GENERATED_PATH: ${file.path}`);
    paths.add(file.path);
  }

  return { schemaVersion: 1, projectId: request.projectId, requestId: request.requestId, targetPlatform: "android", files, planDigest: digestPlan(files) };
}
