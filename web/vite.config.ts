import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { PersistentMemory, type StoredProject } from "./server/persistentMemory";

declare const process: { env: Record<string, string | undefined>; cwd(): string; getBuiltinModule?: (name: string) => unknown };
declare const Buffer: { from(value: string, encoding: string): { toString(encoding: string): string } };
declare function fetch(input: string, init?: { method?: string; headers?: Record<string, string>; body?: string }): Promise<{ ok: boolean; status: number; json(): Promise<any> }>;

const model = "gemini-2.5-flash";
const apiEnabled = process.env.KAZ_API_ENABLED === "true";
const persistentMemory = new PersistentMemory();

function registerKazBuildRoute(server: any) {
  server.middlewares.use("/api/build", async (request: any, response: any) => {
        if (request.method !== "POST") {
          response.statusCode = 405;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ error: "METHOD_NOT_ALLOWED", message: "استخدم POST فقط." }));
          return;
        }

        if (!apiEnabled) {
          response.statusCode = 503;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ error: "KAZ_API_DISABLED", message: "محرك KAZ غير مفعّل حاليًا." }));
          return;
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          response.statusCode = 503;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ error: "AI_NOT_CONFIGURED", message: "مفتاح محرك KAZ غير مضبوط في الخادم." }));
          return;
        }

        try {
          const rawBody = await readBody(request, 24000);
          const body = JSON.parse(rawBody) as { projectName?: string; description?: string; engine?: string };
          const projectName = body.projectName?.trim() ?? "";
          const description = body.description?.trim() ?? "";
          const engine = body.engine?.trim() || "auto";

          if (projectName.length < 2 || description.length < 5) {
            response.statusCode = 400;
            sendJson(response, { error: "INVALID_DRAFT", message: "اسم المشروع والوصف مطلوبان قبل تشغيل محرك KAZ." });
            return;
          }

          if (!["auto", "html_js", "kotlin"].includes(engine)) {
            response.statusCode = 400;
            sendJson(response, { error: "INVALID_ENGINE", message: "محرك البناء المختار غير معروف." });
            return;
          }

          const prompt = `حلّل مسودة تطبيق KAZ التالية وأعد خطة تنفيذ أولية دقيقة باللغة العربية. لا تكتب كودًا كاملًا ولا تدّعِ أن التطبيق بُني.\nاسم المشروع: ${projectName}\nالوصف: ${description}\nالمحرك المختار: ${engine}\nأعد JSON صالحًا فقط بهذه المفاتيح: summary كنص، engine كواحد من auto أو html_js أو kotlin، features كمصفوفة من 3 إلى 6 نصوص، screens كمصفوفة من 2 إلى 5 نصوص، files كمصفوفة من 2 إلى 6 مسارات مقترحة، nextSteps كمصفوفة من 2 إلى 4 خطوات.`;
          const systemInstruction = "أنت محرك KAZ لتحليل مواصفات التطبيقات. كن دقيقًا وصريحًا. لا تزعم تنفيذ التوليد أو إنشاء ملفات فعلية. أعد JSON فقط وبالعربية.";
          const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemInstruction }] },
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.4, topP: 0.95, maxOutputTokens: 2048, responseMimeType: "application/json" },
            }),
          });
          const upstreamBody = await upstream.json() as any;
          if (!upstream.ok) {
            response.statusCode = 502;
            sendJson(response, { error: "GEMINI_API_ERROR", message: upstreamBody?.error?.message ?? "تعذر الاتصال بمحرك Gemini." });
            return;
          }

          const generatedText = upstreamBody?.candidates?.[0]?.content?.parts?.map((part: any) => part.text ?? "").join("").trim();
          if (!generatedText) {
            response.statusCode = 502;
            sendJson(response, { error: "EMPTY_AI_RESPONSE", message: "وصل رد فارغ من محرك KAZ." });
            return;
          }

          sendJson(response, { ok: true, model, projectName, generatedAt: new Date().toISOString(), plan: parsePlan(generatedText) });
        } catch (error) {
          response.statusCode = error instanceof SyntaxError ? 400 : 500;
          sendJson(response, { error: "KAZ_API_FAILURE", message: error instanceof Error ? error.message : "تعذر معالجة طلب البناء." });
        }
  });
}

function registerKazStatusRoute(server: any) {
  server.middlewares.use("/api/status", (request: any, response: any) => {
    if (request.method !== "GET") {
      response.statusCode = 405;
      sendJson(response, { error: "METHOD_NOT_ALLOWED", message: "استخدم GET فقط." });
      return;
    }
    sendJson(response, { enabled: apiEnabled, provider: "cloud", model });
  });
}

function githubRepository() {
  return process.env.KAZ_GITHUB_REPOSITORY || "ksaasm99-star/KAZ-";
}

function githubToken() {
  return process.env.KAZ_GITHUB_TOKEN;
}

async function githubApi(path: string, init: { method?: string; body?: string } = {}) {
  const token = githubToken();
  if (!token) throw new Error("GITHUB_NOT_CONFIGURED");
  return fetch(`https://api.github.com${path}`, {
    method: init.method || "GET",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body,
  });
}

function factoryWorkflowUrl() {
  return `https://github.com/${githubRepository()}/actions/workflows/build-apk.yml`;
}

async function dispatchFactoryBuild(project: StoredProject, requestId: string) {
  const projectJsonB64 = Buffer.from(JSON.stringify({
    id: project.id,
    title: project.title,
    summary: project.summary,
    sources: project.sources,
    knowledge: project.knowledge,
    messages: project.messages,
  }), "utf8").toString("base64");
  const result = await githubApi(`/repos/${githubRepository()}/dispatches`, {
    method: "POST",
    body: JSON.stringify({ event_type: "kaz-build", client_payload: { request_id: requestId, project_json_b64: projectJsonB64 } }),
  });
  if (!result.ok) throw new Error(`GITHUB_DISPATCH_FAILED_${result.status}`);
}

async function readFactoryStatus(requestId: string) {
  const runsResponse = await githubApi(`/repos/${githubRepository()}/actions/workflows/build-apk.yml/runs?event=repository_dispatch&per_page=30`);
  if (!runsResponse.ok) throw new Error(`GITHUB_RUNS_FAILED_${runsResponse.status}`);
  const runsBody = await runsResponse.json() as { workflow_runs?: Array<{ id: number; name?: string; status?: string; conclusion?: string; html_url?: string }> };
  const run = (runsBody.workflow_runs || []).find((item) => item.name?.includes(requestId));
  if (!run) return { status: "queued", apkStatus: "not_started", message: "تم إرسال المسودة إلى GitHub Actions، وننتظر بدء البناء." };
  if (run.status !== "completed") return { status: "building", apkStatus: "building", message: "جاري بناء APK من مسودة المشروع…", workflowUrl: run.html_url || factoryWorkflowUrl() };
  if (run.conclusion !== "success") return { status: "failed", apkStatus: "failed", message: "فشل بناء APK. افتح سجل GitHub Actions لمعرفة الخطأ.", workflowUrl: run.html_url || factoryWorkflowUrl() };

  const releaseResponse = await githubApi(`/repos/${githubRepository()}/releases/tags/kaz-build-${run.id}`);
  if (!releaseResponse.ok) return { status: "packaging", apkStatus: "building", message: "اكتمل البناء، ويجري تجهيز رابط تنزيل APK…", workflowUrl: run.html_url || factoryWorkflowUrl() };
  const release = await releaseResponse.json() as { assets?: Array<{ name: string; browser_download_url: string }> };
  const apk = (release.assets || []).find((asset) => asset.name.endsWith(".apk"));
  if (!apk) return { status: "packaging", apkStatus: "building", message: "اكتمل البناء، ويجري تجهيز ملف APK للتنزيل…", workflowUrl: run.html_url || factoryWorkflowUrl() };
  return { status: "ready", apkStatus: "ready", message: "اكتمل بناء APK وأصبح جاهزًا للتنزيل.", directUrl: apk.browser_download_url, workflowUrl: run.html_url || factoryWorkflowUrl() };
}

function registerFactoryRoute(server: any) {
  server.middlewares.use("/api/factory", async (request: any, response: any) => {
    const requestPath = request.url?.split("?", 1)[0] || "/";
    if (requestPath === "/status" && request.method === "GET") {
      try {
        const requestId = parseMemoryUrl(request.url ?? "/").searchParams.get("requestId") ?? "";
        if (!requestId) {
          response.statusCode = 400;
          sendJson(response, { error: "REQUEST_ID_REQUIRED", message: "رقم طلب البناء مطلوب." });
          return;
        }
        sendJson(response, { ok: true, requestId, projectId: requestId.split("-").slice(1, -1).join("-"), ...(await readFactoryStatus(requestId)) });
      } catch (error) {
        response.statusCode = error instanceof Error && error.message === "GITHUB_NOT_CONFIGURED" ? 503 : 502;
        sendJson(response, { error: "FACTORY_STATUS_FAILURE", message: "تعذر قراءة حالة GitHub Actions. اضبط KAZ_GITHUB_TOKEN على الخادم." });
      }
      return;
    }
    if (requestPath === "/build" && request.method === "POST") {
      try {
        const body = JSON.parse(await readBody(request, 12000)) as { projectId?: string; engine?: string };
        const projectId = body.projectId?.trim() ?? "";
        const engine = body.engine?.trim() || "kotlin";
        if (!projectId) {
          response.statusCode = 400;
          sendJson(response, { error: "PROJECT_ID_REQUIRED", message: "معرّف المشروع مطلوب لبدء بناء APK." });
          return;
        }
        if (!["auto", "html_js", "kotlin"].includes(engine)) {
          response.statusCode = 400;
          sendJson(response, { error: "INVALID_ENGINE", message: "محرك المصنع المختار غير معروف." });
          return;
        }
        const project = persistentMemory.getProject(projectId);
        if (!project) {
          response.statusCode = 404;
          sendJson(response, { error: "PROJECT_NOT_FOUND", message: "المشروع غير موجود أو مؤرشف." });
          return;
        }
        const requestId = `factory-${project.id}-${Date.now()}`;
        await dispatchFactoryBuild(project, requestId);
        persistentMemory.recordFactoryPreparation(project.id, requestId, engine);
        sendJson(response, { ok: true, requestId, projectId: project.id, status: "queued", apkStatus: "not_started", message: "تم إرسال مسودة المشروع إلى GitHub Actions. ستظهر وصلة APK داخل المحادثة بعد اكتمال البناء.", workflowUrl: factoryWorkflowUrl() });
      } catch (error) {
        response.statusCode = error instanceof Error && error.message === "GITHUB_NOT_CONFIGURED" ? 503 : 502;
        sendJson(response, { error: "FACTORY_BUILD_FAILURE", message: error instanceof Error && error.message === "GITHUB_NOT_CONFIGURED" ? "لم يتم ضبط KAZ_GITHUB_TOKEN على الخادم بعد." : "تعذر إرسال مسودة المشروع إلى GitHub Actions." });
      }
      return;
    }
    if (requestPath !== "/" || request.method !== "POST") {
      response.statusCode = 405;
      sendJson(response, { error: "METHOD_NOT_ALLOWED", message: "استخدم POST على /api/factory/build لبدء بناء APK." });
      return;
    }
    response.statusCode = 410;
    sendJson(response, { error: "FACTORY_PREPARE_REMOVED", message: "تم توحيد المصنع: استخدم /api/factory/build لبدء بناء APK." });
  });
}

function registerMemoryRoute(server: any) {
  server.middlewares.use("/api/memory", async (request: any, response: any) => {
    const parsed = parseMemoryUrl(request.url ?? "/");
    const path = parsed.pathname.replace(/^\/api\/memory/, "") || "/";
    try {
      if (request.method === "GET" && path === "/projects") {
        sendJson(response, { ok: true, persistent: true, projects: persistentMemory.listProjects() });
        return;
      }
      if (request.method === "GET" && path === "/projects/archived") {
        sendJson(response, { ok: true, persistent: true, projects: persistentMemory.listArchivedProjects() });
        return;
      }
      if (request.method === "GET" && path === "/search") {
        sendJson(response, { ok: true, persistent: true, results: persistentMemory.search(parsed.searchParams.get("q") ?? "", parsed.searchParams.get("projectId") ?? undefined) });
        return;
      }
      if (request.method === "POST" && path === "/search") {
        const body = JSON.parse(await readBody(request, 10000)) as { q?: string; projectId?: string };
        sendJson(response, { ok: true, persistent: true, results: persistentMemory.search(body.q ?? "", body.projectId) });
        return;
      }
      if (request.method === "GET" && path === "/health") {
        sendJson(response, { ok: true, persistent: true, archive: true, ...persistentMemory.health() });
        return;
      }
      if (request.method === "POST" && path === "/projects") {
        const project = JSON.parse(await readBody(request, 100000)) as StoredProject;
        if (!project.id || !project.title || !project.summary || !Array.isArray(project.sources) || !Array.isArray(project.knowledge) || !Array.isArray(project.messages)) {
          response.statusCode = 400;
          sendJson(response, { error: "INVALID_PROJECT", message: "بيانات المشروع غير مكتملة." });
          return;
        }
        response.statusCode = 201;
        sendJson(response, { ok: true, persistent: true, project: persistentMemory.saveProject(project) });
        return;
      }
      const projectMatch = path.match(/^\/projects\/([^/]+)$/);
      if (projectMatch && request.method === "GET") {
        const project = persistentMemory.getProject(decodeURIComponent(projectMatch[1]));
        if (!project) response.statusCode = 404;
        sendJson(response, { ok: Boolean(project), persistent: true, project });
        return;
      }
      if (projectMatch && request.method === "PUT") {
        const project = JSON.parse(await readBody(request, 100000)) as StoredProject;
        if (project.id !== decodeURIComponent(projectMatch[1])) {
          response.statusCode = 400;
          sendJson(response, { error: "PROJECT_ID_MISMATCH", message: "معرّف المشروع لا يطابق المسار." });
          return;
        }
        sendJson(response, { ok: true, persistent: true, project: persistentMemory.saveProject(project) });
        return;
      }
      if (projectMatch && request.method === "DELETE") {
        const archived = persistentMemory.archiveProject(decodeURIComponent(projectMatch[1]));
        if (!archived) response.statusCode = 404;
        sendJson(response, { ok: archived, persistent: true, archived });
        return;
      }
      const restoreMatch = path.match(/^\/projects\/([^/]+)\/restore$/);
      if (restoreMatch && request.method === "POST") {
        const restored = persistentMemory.restoreProject(decodeURIComponent(restoreMatch[1]));
        if (!restored) response.statusCode = 404;
        sendJson(response, { ok: restored, persistent: true, restored });
        return;
      }
      response.statusCode = 404;
      sendJson(response, { error: "MEMORY_ROUTE_NOT_FOUND", message: "مسار الذاكرة غير موجود." });
    } catch (error) {
      response.statusCode = error instanceof SyntaxError ? 400 : 500;
      sendJson(response, { error: "MEMORY_STORAGE_FAILURE", message: error instanceof Error ? error.message : "تعذر حفظ الذاكرة الدائمة." });
    }
  });
}

function parseMemoryUrl(rawUrl: string) {
  const [pathname, rawQuery = ""] = rawUrl.split("?", 2);
  const values = new Map<string, string>();
  for (const pair of rawQuery.split("&")) {
    if (!pair) continue;
    const [rawKey, rawValue = ""] = pair.split("=", 2);
    const decode = (value: string) => {
      try { return decodeURIComponent(value.replace(/\+/g, " ")); } catch { return value; }
    };
    values.set(decode(rawKey), decode(rawValue));
  }
  return { pathname, searchParams: { get: (name: string) => values.get(name) ?? null } };
}

function kazApiPlugin(): Plugin {
  return {
    name: "kaz-api",
    configureServer(server) {
      registerKazBuildRoute(server);
      registerKazStatusRoute(server);
      registerFactoryRoute(server);
      registerMemoryRoute(server);
    },
    configurePreviewServer(server) {
      registerKazBuildRoute(server);
      registerKazStatusRoute(server);
      registerFactoryRoute(server);
      registerMemoryRoute(server);
    },
  };
}

function readBody(request: any, limit: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      body += chunk;
      if (body.length > limit) {
        reject(new Error("حجم الطلب أكبر من الحد المسموح."));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function parsePlan(text: string) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    const plan = JSON.parse(cleaned) as Record<string, unknown>;
    return {
      summary: typeof plan.summary === "string" ? plan.summary : "تم تحليل المسودة بنجاح.",
      engine: typeof plan.engine === "string" ? plan.engine : "auto",
      features: asTextArray(plan.features),
      screens: asTextArray(plan.screens),
      files: asTextArray(plan.files),
      nextSteps: asTextArray(plan.nextSteps),
    };
  } catch {
    return { summary: text, engine: "auto", features: [], screens: [], files: [], nextSteps: [] };
  }
}

function asTextArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 8) : [];
}

function sendJson(response: any, payload: unknown) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

export default defineConfig({
  plugins: [react(), kazApiPlugin()],
  server: {
    port: 3000,
    strictPort: true,
    allowedHosts: [".manus.computer", "localhost", "127.0.0.1"],
  },
});
