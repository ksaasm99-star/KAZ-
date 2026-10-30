/// <reference path="./server/node-shims.d.ts" />
import { defineConfig, loadEnv, type Plugin } from "vite";
import { createHash, randomUUID } from "node:crypto";
import react from "@vitejs/plugin-react";
import { PersistentMemory, type StoredProject } from "./server/persistentMemory";
import { appendEvidenceToReply, formatProjectEvidence, retrieveProjectEvidence } from "./server/projectRag";
import type { ModelRegistryEntry } from "./src/agent/modelRegistry";
import { createProjectExpertContext } from "./src/agent/projectExpert";
import { inspectUntrustedData, protectUntrustedData } from "./src/agent/promptDefense";
import { identityInstruction, type KazIdentity } from "./src/agent/identity";
import { identityGuardInstruction, inspectIdentityRequest, validateIdentityResponse } from "./src/agent/identityGuard";
import { approveProjectEdit, proposeProjectEdit, rejectProjectEdit, type ProjectEditFileInput, type ProjectEditInputMode } from "./server/projectEditGateway";
import { recoverProjectEditSnapshot } from "./server/recoveryManager";
import { activateEmergencyStop, getEmergencyStopState } from "./server/emergencyStop";
import type { TypedFactoryRequest } from "./src/agent/factoryRequest";
import { createFactoryIntelligencePlan, createProjectWorkspacePolicy, inspectProjectWorkspace } from "./server/projectIntelligence";
import { getActiveOllamaModel, listOllamaModels, pullModel, setActiveOllamaModel } from "./server/ollamaGateway";
import { requireOwnerToken } from "./server/authMiddleware";
import { getModelProvider } from "./src/agent/modelRegistry";
import { getProvider } from "./server/providerRegistry";
import type { LLMGenerateOptions } from "./server/llmProvider";
import { formatError } from "./server/errorHandler";
import { buildHealthReport } from "./server/health";

declare const process: { env: Record<string, string | undefined>; cwd(): string; getBuiltinModule?: (name: string) => unknown };
declare const Buffer: { from(value: string, encoding: string): { toString(encoding: string): string } };
declare function fetch(input: string, init?: { method?: string; headers?: Record<string, string>; body?: string }): Promise<{ ok: boolean; status: number; json(): Promise<any>; text(): Promise<string>; headers: { get(name: string): string | null } }>;

const loadedEnv = loadEnv("development", process.cwd(), "");
for (const [key, value] of Object.entries(loadedEnv)) if (process.env[key] === undefined) process.env[key] = value;

const model = "gemini-2.5-flash";
const apiEnabled = process.env.KAZ_API_ENABLED === "true";
const persistentMemory = new PersistentMemory();

async function generateWithConfiguredProvider(prompt: string, options: LLMGenerateOptions = {}, audit: { projectId?: string; requestId: string }) {
  const modelId = options.model?.trim() || model;
  const providerName = getModelProvider(modelId);
  const provider = getProvider(providerName);
  if (!provider) throw new Error(`LLM_PROVIDER_NOT_CONFIGURED:${providerName}`);
  try {
    if (!(await provider.isAvailable())) throw new Error(`LLM_PROVIDER_UNAVAILABLE:${providerName}`);
    return { text: await provider.generate(prompt, options), provider: provider.name, model: modelId };
  } catch (error) {
    try {
      persistentMemory.recordProviderFailure({ projectId: audit.projectId, requestId: audit.requestId, provider: provider.name, reason: error instanceof Error ? error.message : "UNKNOWN_PROVIDER_FAILURE" });
    } catch {
      // Provider failure remains fail-closed if the audit store is unavailable.
    }
    throw error;
  }
}

function rejectUnauthorized(request: any, response: any, path: string): boolean {
  if (requireOwnerToken(request)) return false;
  const traceId = `auth-${randomUUID()}`;
  const parsed = parseMemoryUrl(request.url ?? "/");
  try {
    persistentMemory.recordAuthenticationFailure({ traceId, method: String(request.method ?? "GET"), path, projectId: parsed.searchParams.get("projectId") ?? undefined, reason: "AUTH_REQUIRED" });
  } catch {
    // Authentication must remain fail-closed even if the audit store is unavailable.
  }
  response.statusCode = 401;
  response.__kazRequest = { method: String(request.method ?? "GET"), path };
  sendJson(response, { error: "AUTH_REQUIRED", message: "يلزم Authorization: Bearer <KAZ_OWNER_TOKEN> لهذه العملية.", traceId });
  return true;
}

function registerEmergencyStopRoute(server: any) {
  server.middlewares.use("/api/emergency-stop", async (request: any, response: any) => {
    if (request.method === "GET") {
      sendJson(response, { ok: true, state: getEmergencyStopState() });
      return;
    }
    if (request.method !== "POST") {
      response.statusCode = 405;
      sendJson(response, { error: "METHOD_NOT_ALLOWED", message: "استخدم POST أو GET فقط." });
      return;
    }
    if (rejectUnauthorized(request, response, "/api/emergency-stop")) return;
    try {
      const body = JSON.parse(await readBody(request, 4000)) as { reason?: string };
      const state = activateEmergencyStop(body.reason);
      const pausedTasks = persistentMemory.pauseInProgressTasks(state.reason ?? "EMERGENCY_STOPPED");
      sendJson(response, { ok: true, state, pausedTaskIds: pausedTasks.map((task) => task.taskId) });
    } catch (error) {
      response.statusCode = error instanceof SyntaxError ? 400 : 500;
      sendJson(response, { error: "EMERGENCY_STOP_FAILURE", message: error instanceof Error ? error.message : "تعذر تفعيل إيقاف الطوارئ." });
    }
  });
}

function sendIdentityGuardBlock(response: any, result: { code: string; message?: string }) {
  response.statusCode = 403;
  sendJson(response, { error: "IDENTITY_POLICY_BLOCKED", guardCode: result.code, message: result.message ?? "حُجب الطلب بواسطة حارس هوية KAZ.", identityApplied: true });
}

function isFactoryBuildCommand(message: string): boolean {
  const normalized = message.trim().toLocaleLowerCase("ar");
  if (/(كيف|اشرح|ما هو|ما معنى|وش يعني|هل يمكن)/u.test(normalized)) return false;
  const buildIntent = /(ابن|ابني|بناء|شغّل|شغل|جهّز|جهز|build|assemble|compile)/u.test(normalized);
  const appTarget = /(تطبيق|apk|أندرويد|اندرويد|android|مصنع)/u.test(normalized);
  return buildIntent && appTarget;
}

function registerIdentityRoute(server: any) {
  server.middlewares.use("/api/identity", async (request: any, response: any) => {
    if (request.method === "GET") {
      sendJson(response, { identity: persistentMemory.getIdentity(), persistent: true });
      return;
    }
    if (request.method !== "PUT") {
      response.statusCode = 405;
      sendJson(response, { error: "METHOD_NOT_ALLOWED", message: "استخدم GET أو PUT فقط." });
      return;
    }
    if (rejectUnauthorized(request, response, "/api/identity")) return;
    try {
      const rawBody = await readBody(request, 24000);
      const body = JSON.parse(rawBody) as Partial<KazIdentity>;
      if (typeof body.name !== "string" || body.name.trim().length < 2 || typeof body.mission !== "string" || body.mission.trim().length < 5) {
        response.statusCode = 400;
        sendJson(response, { error: "INVALID_IDENTITY", message: "اسم الهوية ومهمتها مطلوبان." });
        return;
      }
      const identity = persistentMemory.saveIdentity(body);
      sendJson(response, { identity, persistent: true });
    } catch (error) {
      response.statusCode = error instanceof SyntaxError ? 400 : 500;
      sendJson(response, { error: "IDENTITY_FAILURE", message: error instanceof Error ? error.message : "تعذر حفظ الهوية." });
    }
  });
}

function registerDiagnosticsRoutes(server: any) {
  server.middlewares.use("/api/health", async (request: any, response: any) => {
    if (request.method !== "GET") {
      response.statusCode = 405;
      sendJson(response, { error: "METHOD_NOT_ALLOWED", message: "استخدم GET فقط." });
      return;
    }
    try {
      sendJson(response, await buildHealthReport(persistentMemory));
    } catch (error) {
      response.statusCode = 500;
      sendJson(response, { error: "KAZ-DB-001", message: error instanceof Error ? error.message : "تعذر إنشاء تقرير الصحة." });
    }
  });
  server.middlewares.use("/api/diagnostics/errors", (request: any, response: any) => {
    if (request.method !== "GET") {
      response.statusCode = 405;
      sendJson(response, { error: "METHOD_NOT_ALLOWED", message: "استخدم GET فقط." });
      return;
    }
    try {
      sendJson(response, { ok: true, errors: persistentMemory.listRecentEvidenceLedger(20) });
    } catch (error) {
      response.statusCode = 500;
      sendJson(response, { error: "KAZ-DB-001", message: error instanceof Error ? error.message : "تعذر قراءة سجل الأخطاء." });
    }
  });
}

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

          const identity = persistentMemory.getIdentity();
          const guard = inspectIdentityRequest(identity, `${projectName}\n${description}`);
          if (!guard.allowed) {
            sendIdentityGuardBlock(response, guard);
            return;
          }
          const prompt = `حلّل مسودة تطبيق KAZ التالية وأعد خطة تنفيذ أولية دقيقة باللغة العربية. لا تكتب كودًا كاملًا ولا تدّعِ أن التطبيق بُني.\nاسم المشروع: ${projectName}\nالوصف: ${description}\nالمحرك المختار: ${engine}\nأعد JSON صالحًا فقط بهذه المفاتيح: summary كنص، engine كواحد من auto أو html_js أو kotlin، features كمصفوفة من 3 إلى 6 نصوص، screens كمصفوفة من 2 إلى 5 نصوص، files كمصفوفة من 2 إلى 6 مسارات مقترحة، nextSteps كمصفوفة من 2 إلى 4 خطوات.`;
          const systemInstruction = `${identityInstruction(identity)}\n${identityGuardInstruction(identity)}\nأنت محرك KAZ لتحليل مواصفات التطبيقات. كن دقيقًا وصريحًا. لا تزعم تنفيذ التوليد أو إنشاء ملفات فعلية. أعد JSON فقط وبالعربية.`;
          const generated = await generateWithConfiguredProvider(prompt, {
            model,
            systemInstruction,
            temperature: 0.4,
            topP: 0.95,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
          }, { requestId: `build:${projectName}:${Date.now()}` });
          const generatedText = generated.text;
          const responseGuard = validateIdentityResponse(identity, generatedText);
          if (!responseGuard.allowed) {
            sendIdentityGuardBlock(response, responseGuard);
            return;
          }

          sendJson(response, { ok: true, provider: generated.provider, model: generated.model, projectName, generatedAt: new Date().toISOString(), plan: parsePlan(generatedText) });
        } catch (error) {
          response.statusCode = error instanceof SyntaxError ? 400 : 500;
          sendJson(response, { error: "KAZ_API_FAILURE", message: error instanceof Error ? error.message : "تعذر معالجة طلب البناء." });
        }
  });
}

function registerFactoryIntelligenceRoute(server: any) {
  server.middlewares.use("/api/factory-intelligence/plan", async (request: any, response: any) => {
    if (request.method !== "POST") {
      response.statusCode = 405;
      sendJson(response, { error: "METHOD_NOT_ALLOWED", message: "استخدم POST فقط." });
      return;
    }
    try {
      const body = JSON.parse(await readBody(request, 24000)) as { projectId?: string; request?: string; requestId?: string };
      const projectId = body.projectId?.trim() ?? "";
      const userRequest = body.request?.trim() ?? "";
      const requestId = body.requestId?.trim() || `factory-plan-${Date.now()}`;
      if (projectId.length < 2 || userRequest.length < 2) {
        response.statusCode = 400;
        sendJson(response, { error: "INVALID_FACTORY_PLAN_INPUT", message: "projectId والطلب مطلوبان." });
        return;
      }
      if (inspectUntrustedData(userRequest).blocked) {
        response.statusCode = 403;
        sendJson(response, { error: "PROMPT_INJECTION_BLOCKED", message: "حُجب الطلب قبل إرسال أي بيانات إلى النموذج." });
        return;
      }
      const project = persistentMemory.getProject(projectId);
      if (!project) {
        response.statusCode = 404;
        sendJson(response, { error: "PROJECT_NOT_FOUND", message: "المشروع المطلوب غير موجود." });
        return;
      }
      const policy = createProjectWorkspacePolicy(project.manifest);
      const inspectedFiles = await inspectProjectWorkspace(policy);
      const plan = await createFactoryIntelligencePlan({ projectId, requestId, request: userRequest, manifest: project.manifest, inspectedFiles });
      sendJson(response, { ok: true, plan, execution: "not_started", writes: 0 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر بناء خطة المصنع.";
      response.statusCode = message === "KAZ_API_DISABLED" || message === "AI_NOT_CONFIGURED" ? 503 : message === "PROJECT_NOT_FOUND" ? 404 : 502;
      sendJson(response, { error: "FACTORY_INTELLIGENCE_FAILURE", code: message, message: "تعذر بناء خطة typed من النموذج وسياق الملفات." });
    }
  });
}

function registerProjectChatRoute(server: any) {
  server.middlewares.use("/api/project-chat", async (request: any, response: any) => {
    if (request.method !== "POST") {
      response.statusCode = 405;
      sendJson(response, { error: "METHOD_NOT_ALLOWED", message: "استخدم POST فقط." });
      return;
    }
    try {
      const rawBody = await readBody(request, 30000);
      const body = JSON.parse(rawBody) as { projectId?: string; message?: string; inputMode?: "text" | "voice" };
      const projectId = body.projectId?.trim() ?? "";
      const message = body.message?.trim() ?? "";
      const inputMode = body.inputMode === "voice" ? "voice" : "text";
      if (!projectId || message.length < 2) {
        response.statusCode = 400;
        sendJson(response, { error: "INVALID_MESSAGE", message: "معرّف المشروع والرسالة مطلوبان." });
        return;
      }
      const project = persistentMemory.getProject(projectId);
      if (!project) {
        response.statusCode = 404;
        sendJson(response, { error: "PROJECT_NOT_FOUND", message: "المشروع غير موجود أو مؤرشف." });
        return;
      }
      const identity = persistentMemory.getIdentity();
      const identityApplied = identity.applyToProjectChat;
      if (identityApplied) {
        const guard = inspectIdentityRequest(identity, message);
        if (!guard.allowed) {
          sendIdentityGuardBlock(response, guard);
          return;
        }
      }
      if (isFactoryBuildCommand(message)) {
        const requestId = `factory-${project.id}-${Date.now()}`;
        try {
          await dispatchFactoryBuild(project, requestId);
          persistentMemory.recordFactoryPreparation(project.id, requestId, "kotlin");
        } catch (error) {
          response.statusCode = error instanceof Error && error.message === "GITHUB_NOT_CONFIGURED" ? 503 : 502;
          sendJson(response, { error: "FACTORY_BUILD_FAILURE", message: error instanceof Error && error.message === "GITHUB_NOT_CONFIGURED" ? "لم يتم ضبط KAZ_GITHUB_TOKEN على الخادم بعد." : "تعذر إرسال أمر البناء إلى مصنع GitHub Actions." });
          return;
        }
        const reply = `تم فهم أمر البناء من محادثة المشروع وإرساله إلى مصنع التطبيقات. رقم التشغيل: ${requestId}. ستظهر حالة compile وbuild ورابط APK هنا بعد اكتمال GitHub Actions.`;
        const updatedProject: StoredProject = {
          ...project,
          messages: [...project.messages, { id: `message-${Date.now()}`, role: "user", text: message }, { id: `message-${Date.now()}-factory`, role: "assistant", text: reply }],
          updatedAt: new Date().toISOString(),
        };
        sendJson(response, { ok: true, provider: "factory", model: "github-actions", project: persistentMemory.saveProject(updatedProject), reply, expertContextLoaded: true, identityApplied, factory: { requestId, status: "queued", apkStatus: "not_started", workflowUrl: factoryWorkflowUrl() } });
        return;
      }
      if (!apiEnabled) {
        response.statusCode = 503;
        sendJson(response, { error: "KAZ_API_DISABLED", message: "محرك KAZ غير مفعّل حاليًا؛ لم تُرسل الرسالة خارج الجهاز." });
        return;
      }
      const expertContext = createProjectExpertContext(project.manifest);
      const ragEvidence = retrieveProjectEvidence(persistentMemory, projectId, message);
      const ragContext = formatProjectEvidence(ragEvidence);
      const recentMessages = protectUntrustedData("recent-project-messages", project.messages.slice(-12).map((item) => `${item.role}: ${item.text}`).join("\n"), 12000);
      const sourceContext = protectUntrustedData("project-sources", project.sources.map((item) => `${item.name}: ${item.value}`).join("\n"), 12000);
      const knowledgeContext = protectUntrustedData("project-knowledge", project.knowledge.map((item) => `${item.title}: ${item.content}`).join("\n"), 12000);
      const protectedRagContext = protectUntrustedData("retrieved-memory-evidence", ragContext, 12000);
      const systemInstruction = [
        ...(identityApplied ? [identityInstruction(identity), identityGuardInstruction(identity)] : []),
        "أنت خبير KAZ المتخصص في بناء تطبيقات هذا المشروع فقط.",
        "أجب بالعربية بوضوح، وافصل بين الحقيقة والاستنتاج والاقتراح.",
        "استخدم سياق الخبير وقواعد التشخيص التالية، ولا تدّع تنفيذ تعديل أو بناء أو اختبار لم يحدث.",
        JSON.stringify(expertContext),
      ].join("\n");
      const prompt = [
        `المشروع: ${project.title}\nالوصف: ${project.summary}`,
        `مصادر المشروع:\n${sourceContext || "لا توجد مصادر."}`,
        `معرفة المشروع:\n${knowledgeContext || "لا توجد معرفة إضافية."}`,
        `أدلة الذاكرة المسترجعة لهذا السؤال:\n${protectedRagContext}`,
        `آخر المحادثة:\n${recentMessages || "لا توجد رسائل سابقة."}`,
        `رسالة المستخدم الحالية (${inputMode === "voice" ? "محوّلة من صوت" : "كتابية"}):\n${message}`,
        "استخدم الأدلة المسترجعة فقط عندما تكون مرتبطة بالسؤال. احترم حالة الثقة المرفقة بكل دليل: المؤكد قاعدة، والاستنتاج ليس حقيقة نهائية، والاقتراح خيار قابل للنقاش، وغير المعروف لا يُستخدم لإثبات ادعاء. اذكر بوضوح إذا لم توجد أدلة كافية. قدّم جوابًا عمليًا يحدد الحالة، الأدلة المطلوبة، وأقرب خطوة آمنة. إذا طلب المستخدم إصلاحًا، اقترح خطة دقيقة ولا تزعم تنفيذها قبل وجود أداة تنفيذ واختبار.",
      ].join("\n\n");
      const generated = await generateWithConfiguredProvider(prompt, {
        model,
        systemInstruction,
        temperature: 0.3,
        topP: 0.9,
        maxOutputTokens: 2048,
      }, { projectId, requestId: `project-chat:${projectId}:${Date.now()}` });
      const modelReply = generated.text;
      const reply = appendEvidenceToReply(modelReply, ragEvidence);
      if (identityApplied) {
        const responseGuard = validateIdentityResponse(identity, reply);
        if (!responseGuard.allowed) {
          sendIdentityGuardBlock(response, responseGuard);
          return;
        }
      }
      const updatedProject: StoredProject = {
        ...project,
        messages: [...project.messages, { id: `message-${Date.now()}`, role: "user", text: message }, { id: `message-${Date.now()}-assistant`, role: "assistant", text: reply }],
        updatedAt: new Date().toISOString(),
      };
      const savedProject = persistentMemory.saveProject(updatedProject);
      sendJson(response, { ok: true, provider: generated.provider, model: generated.model, project: savedProject, reply, expertContextLoaded: true, identityApplied, ragUsed: ragEvidence.length > 0, evidence: ragEvidence });
    } catch (error) {
      response.statusCode = error instanceof SyntaxError ? 400 : 500;
      sendJson(response, { error: "PROJECT_CHAT_FAILURE", message: error instanceof Error ? error.message : "تعذر معالجة محادثة المشروع." });
    }
  });
}

function registerGlobalChatRoute(server: any) {
  server.middlewares.use("/api/global-chat", async (request: any, response: any) => {
    if (request.method !== "POST") { response.statusCode = 405; sendJson(response, { error: "METHOD_NOT_ALLOWED", message: "استخدم POST فقط." }); return; }
    const identity = persistentMemory.getIdentity();
    const identityApplied = identity.applyToGlobalChat;
    if (!apiEnabled) { response.statusCode = 503; sendJson(response, { error: "KAZ_API_DISABLED", message: "محرك KAZ غير مفعّل؛ لم تُرسل الرسالة خارج الجهاز.", identityApplied }); return; }
    try {
      const body = JSON.parse(await readBody(request, 24000)) as { message?: string; inputMode?: "text" | "voice" };
      const message = body.message?.trim() ?? "";
      if (message.length < 2) { response.statusCode = 400; sendJson(response, { error: "INVALID_MESSAGE", message: "الرسالة مطلوبة." }); return; }
      const inputMode = body.inputMode ?? "text";
      if (inputMode !== "text" && inputMode !== "voice") { response.statusCode = 400; sendJson(response, { error: "INVALID_INPUT_MODE", message: "مصدر الإدخال غير معروف." }); return; }
      if (identityApplied) {
        const guard = inspectIdentityRequest(identity, message);
        if (!guard.allowed) { sendIdentityGuardBlock(response, guard); return; }
      }
      const generated = await generateWithConfiguredProvider(message, {
        model,
        systemInstruction: `${identityApplied ? `${identityInstruction(identity)}\n${identityGuardInstruction(identity)}\n` : ""}أنت الآن في المحادثة العامة. لا تنسب إلى نفسك تنفيذًا لم يحدث، ولا تخرج عن الهوية والسياسات المحفوظة.`,
        temperature: 0.3,
        topP: 0.9,
        maxOutputTokens: 2048,
      }, { requestId: `global-chat:${Date.now()}` });
      const reply = generated.text;
      if (identityApplied) {
        const responseGuard = validateIdentityResponse(identity, reply);
        if (!responseGuard.allowed) { sendIdentityGuardBlock(response, responseGuard); return; }
      }
      sendJson(response, { ok: true, reply, provider: generated.provider, model: generated.model, identityApplied, inputMode });
    } catch (error) { response.statusCode = error instanceof SyntaxError ? 400 : 500; sendJson(response, { error: "GLOBAL_CHAT_FAILURE", message: error instanceof Error ? error.message : "تعذر معالجة المحادثة العامة." }); }
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

function factoryProjectPayload(project: StoredProject): string {
  return JSON.stringify({
    id: project.id,
    title: project.title,
    summary: project.summary,
    sources: project.sources,
    knowledge: project.knowledge,
    messages: project.messages,
  });
}

function factoryInputDigest(project: StoredProject): string {
  return `sha256:${createHash("sha256").update(factoryProjectPayload(project)).digest("hex")}`;
}

function factoryArtifactName(requestId: string): string {
  const safeRequestId = requestId.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96) || "request";
  return `kaz-${safeRequestId}.apk`;
}

async function dispatchFactoryBuild(project: StoredProject, requestId: string) {
  const inputDigest = factoryInputDigest(project);
  const artifactName = factoryArtifactName(requestId);
  const result = await githubApi(`/repos/${githubRepository()}/dispatches`, {
    method: "POST",
    body: JSON.stringify({ event_type: "kaz-build", client_payload: { projectId: project.id, requestId, inputDigest, artifactName } }),
  });
  if (!result.ok) throw new Error(`GITHUB_DISPATCH_FAILED_${result.status}`);
}

async function readFactoryDiagnostics(jobs: Array<{ id: number; name?: string; steps?: Array<{ name?: string; conclusion?: string }> }>) {
  const diagnostics: Array<{ jobName: string; stepName: string; level: "error" | "warning" | "info"; message: string; excerpt?: string }> = [];
  for (const job of jobs) {
    for (const step of job.steps || []) {
      const stepName = step.name || "خطوة غير مسماة";
      const conclusion = step.conclusion || "pending";
      if (conclusion === "failure") {
        let excerpt: string | undefined;
        try {
          const logsResponse = await githubApi(`/repos/${githubRepository()}/actions/jobs/${job.id}/logs`);
          if (logsResponse.ok) {
            const logText = await logsResponse.text();
            const lines = logText.split(/\r?\n/).map((line) => line.trim()).filter((line) => /error|exception|failure|failed|what went wrong|> Task .* FAILED/i.test(line));
            excerpt = lines.slice(-8).join("\n").slice(-1800) || logText.split(/\r?\n/).slice(-12).join("\n").slice(-1800);
          }
        } catch {
          excerpt = undefined;
        }
        diagnostics.push({ jobName: job.name || "GitHub Actions", stepName, level: "error", message: `فشلت خطوة ${stepName}.`, excerpt });
      } else if (["queued", "in_progress", "pending"].includes(conclusion) && /compile|build|gradle|apk/i.test(stepName)) {
        diagnostics.push({ jobName: job.name || "GitHub Actions", stepName, level: "info", message: `الخطوة ${stepName} قيد التنفيذ.` });
      }
    }
  }
  return diagnostics.slice(-12);
}

async function readFactoryVerification(runId: number, requestId: string, projectId: string, run: { head_sha?: string; status?: string; conclusion?: string }) {
  const jobsResponse = await githubApi(`/repos/${githubRepository()}/actions/runs/${runId}/jobs?per_page=100`);
  if (!jobsResponse.ok) return undefined;
  const jobsBody = await jobsResponse.json() as { jobs?: Array<{ id: number; name?: string; steps?: Array<{ name?: string; conclusion?: string; completed_at?: string }> }> };
  const steps = (jobsBody.jobs || []).flatMap((job) => job.steps || []);
  const compileStep = steps.find((step) => step.name === "Compile Java sources");
  const buildStep = steps.find((step) => step.name === "Build debug APK");
  const evidence = {
    runId: String(runId),
    sourceCommit: run.head_sha || "unknown",
    compile: compileStep?.conclusion || "pending",
    build: buildStep?.conclusion || "pending",
    workflowConclusion: run.conclusion || "pending",
    recordedAt: buildStep?.completed_at || compileStep?.completed_at || new Date().toISOString(),
  };
  if (run.status === "completed" || evidence.compile === "failure" || evidence.build === "failure") {
    persistentMemory.recordFactoryVerification(projectId, requestId, evidence);
  }
  return { verification: evidence, diagnostics: await readFactoryDiagnostics(jobsBody.jobs || []) };
}

async function readFactoryStatus(requestId: string, projectId: string) {
  const runsResponse = await githubApi(`/repos/${githubRepository()}/actions/workflows/build-apk.yml/runs?event=repository_dispatch&per_page=30`);
  if (!runsResponse.ok) throw new Error(`GITHUB_RUNS_FAILED_${runsResponse.status}`);
  const runsBody = await runsResponse.json() as { workflow_runs?: Array<{ id: number; name?: string; status?: string; conclusion?: string; html_url?: string; head_sha?: string }> };
  const run = (runsBody.workflow_runs || []).find((item) => item.name?.includes(requestId));
  if (!run) return { status: "queued", apkStatus: "not_started", message: "تم إرسال المسودة إلى GitHub Actions، وننتظر بدء البناء." };
  const factoryEvidence = await readFactoryVerification(run.id, requestId, projectId, run);
  const verification = factoryEvidence?.verification;
  const diagnostics = factoryEvidence?.diagnostics;
  if (run.status !== "completed") return { status: "building", apkStatus: "building", message: "جاري بناء APK من مسودة المشروع…", workflowUrl: run.html_url || factoryWorkflowUrl(), verification, diagnostics };
  if (run.conclusion !== "success") return { status: "failed", apkStatus: "failed", message: "فشل بناء APK. راجع دليل compile/build وسجل GitHub Actions لمعرفة الخطأ.", workflowUrl: run.html_url || factoryWorkflowUrl(), verification, diagnostics };

  const releaseResponse = await githubApi(`/repos/${githubRepository()}/releases/tags/kaz-build-${run.id}`);
  if (!releaseResponse.ok) return { status: "packaging", apkStatus: "building", message: "اكتمل البناء، ويجري تجهيز رابط تنزيل APK…", workflowUrl: run.html_url || factoryWorkflowUrl(), verification, diagnostics };
  const release = await releaseResponse.json() as { assets?: Array<{ name: string; browser_download_url: string }> };
  const apk = (release.assets || []).find((asset) => asset.name.endsWith(".apk"));
  if (!apk) return { status: "packaging", apkStatus: "building", message: "اكتمل البناء، ويجري تجهيز ملف APK للتنزيل…", workflowUrl: run.html_url || factoryWorkflowUrl(), verification, diagnostics };
  return { status: "ready", apkStatus: "ready", message: "اكتمل بناء APK وأصبح جاهزًا للتنزيل.", directUrl: apk.browser_download_url, workflowUrl: run.html_url || factoryWorkflowUrl(), verification, diagnostics };
}

function registerFactoryRoute(server: any) {
  server.middlewares.use("/api/factory", async (request: any, response: any) => {
    const requestPath = request.url?.split("?", 1)[0] || "/";
    if (["/payload", "/status", "/build"].includes(requestPath) && rejectUnauthorized(request, response, `/api/factory${requestPath}`)) return;
    if (requestPath === "/payload" && request.method === "GET") {
      const parsed = parseMemoryUrl(request.url ?? "/");
      const projectId = parsed.searchParams.get("projectId")?.trim() ?? "";
      if (!projectId) {
        response.statusCode = 400;
        sendJson(response, { error: "PROJECT_ID_REQUIRED", message: "معرّف المشروع مطلوب لجلب payload." });
        return;
      }
      const project = persistentMemory.getProject(projectId);
      if (!project) {
        response.statusCode = 404;
        sendJson(response, { error: "PROJECT_NOT_FOUND", message: "المشروع المطلوب غير موجود أو مؤرشف." });
        return;
      }
      const projectJson = factoryProjectPayload(project);
      sendJson(response, {
        ok: true,
        projectId: project.id,
        inputDigest: factoryInputDigest(project),
        project_json_b64: Buffer.from(projectJson, "utf8").toString("base64"),
      });
      return;
    }
    if (requestPath === "/status" && request.method === "GET") {
      try {
        const requestId = parseMemoryUrl(request.url ?? "/").searchParams.get("requestId") ?? "";
        if (!requestId) {
          response.statusCode = 400;
          sendJson(response, { error: "REQUEST_ID_REQUIRED", message: "رقم طلب البناء مطلوب." });
          return;
        }
        const projectId = requestId.startsWith("factory-") ? requestId.slice("factory-".length).replace(/-\d+$/, "") : "";
        sendJson(response, { ok: true, requestId, projectId, ...(await readFactoryStatus(requestId, projectId)) });
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

function registerModelRoute(server: any) {
  server.middlewares.use("/api/models", async (request: any, response: any) => {
    const requestPath = request.url?.split("?", 1)[0] || "/";
    const path = requestPath.replace(/^\/api\/models/, "") || "/";
    const protectedOperation = request.method !== "GET";
    if (protectedOperation && rejectUnauthorized(request, response, `/api/models${path}`)) return;
    try {
      if (request.method === "GET" && path === "/") {
        sendJson(response, { ok: true, persistent: true, models: persistentMemory.listModels() });
        return;
      }
      if (request.method === "POST" && path === "/") {
        const model = JSON.parse(await readBody(request, 50000)) as ModelRegistryEntry;
        if (!model.id || !model.displayName || !model.execution || !model.format || !model.runtime) {
          response.statusCode = 400;
          sendJson(response, { error: "INVALID_MODEL", message: "بيانات النموذج الأساسية ناقصة." });
          return;
        }
        if (persistentMemory.getModelRecord(model.id)) {
          response.statusCode = 409;
          sendJson(response, { error: "MODEL_EXISTS", message: "النموذج مسجل مسبقًا." });
          return;
        }
        response.statusCode = 201;
        sendJson(response, { ok: true, persistent: true, model: persistentMemory.saveModel(model) });
        return;
      }
      const verifyMatch = path.match(/^\/([^/]+)\/verify$/);
      if (verifyMatch && request.method === "POST") {
        const result = await persistentMemory.verifyModelFile(decodeURIComponent(verifyMatch[1]));
        if (!result) response.statusCode = 404;
        sendJson(response, { ok: Boolean(result), persistent: true, result });
        return;
      }
      const planMatch = path.match(/^\/([^/]+)\/download-plan$/);
      if (planMatch && request.method === "POST") {
        const modelId = decodeURIComponent(planMatch[1]);
        const model = persistentMemory.getModelRecord(modelId);
        if (!model) {
          response.statusCode = 404;
          sendJson(response, { error: "MODEL_NOT_FOUND", message: "النموذج غير موجود." });
          return;
        }
        if (model.execution !== "local" || !model.sourceUrl) {
          response.statusCode = 400;
          sendJson(response, { error: "MODEL_SOURCE_REQUIRED", message: "المعاينة تحتاج نموذجًا محليًا مع رابط مصدر." });
          return;
        }
        const sourceUrl = model.sourceUrl.trim();
        if (!/^https:\/\//i.test(sourceUrl)) {
          response.statusCode = 400;
          sendJson(response, { error: "HTTPS_SOURCE_REQUIRED", message: "لا تُقبل معاينة تنزيل من رابط غير HTTPS." });
          return;
        }
        let remoteCheck: "ok" | "unavailable" = "unavailable";
        let remoteSizeBytes: number | undefined;
        try {
          const upstream = await fetch(sourceUrl, { method: "HEAD" });
          if (upstream.ok) {
            remoteCheck = "ok";
            const contentLength = upstream.headers.get("content-length");
            if (contentLength && /^\d+$/.test(contentLength)) remoteSizeBytes = Number(contentLength);
          }
        } catch {
          remoteCheck = "unavailable";
        }
        const requiredStorageBytes = model.artifact?.sizeBytes ?? model.requirements.storageRequiredMb ? (model.artifact?.sizeBytes ?? Number(model.requirements.storageRequiredMb) * 1024 * 1024) : undefined;
        sendJson(response, { ok: true, persistent: true, plan: { modelId, sourceUrl, remoteSizeBytes, requiredStorageBytes, storageAvailable: true, remoteCheck, downloadStarted: false } });
        return;
      }
      const modelMatch = path.match(/^\/([^/]+)$/);
      if (modelMatch && request.method === "GET") {
        const model = persistentMemory.getModelRecord(decodeURIComponent(modelMatch[1]));
        if (!model) response.statusCode = 404;
        sendJson(response, { ok: Boolean(model), persistent: true, model });
        return;
      }
      if (modelMatch && request.method === "PATCH") {
        const patch = JSON.parse(await readBody(request, 50000)) as Partial<ModelRegistryEntry>;
        const model = persistentMemory.updateModelRecord(decodeURIComponent(modelMatch[1]), patch);
        if (!model) response.statusCode = 404;
        sendJson(response, { ok: Boolean(model), persistent: true, model });
        return;
      }
      if (modelMatch && request.method === "DELETE") {
        const model = persistentMemory.updateModelRecord(decodeURIComponent(modelMatch[1]), { status: "deleted" });
        if (!model) response.statusCode = 404;
        sendJson(response, { ok: Boolean(model), persistent: true, deleted: Boolean(model) });
        return;
      }
      response.statusCode = 404;
      sendJson(response, { error: "MODEL_ROUTE_NOT_FOUND", message: "مسار النموذج غير موجود." });
    } catch (error) {
      response.statusCode = error instanceof SyntaxError ? 400 : 500;
      sendJson(response, { error: "MODEL_STORAGE_FAILURE", message: error instanceof Error ? error.message : "تعذر معالجة سجل النموذج." });
    }
  });
}

function registerOllamaRoutes(server: any) {
  server.middlewares.use("/api/ollama", async (request: any, response: any) => {
    const requestPath = request.url?.split("?", 1)[0] || "/";
    const path = requestPath.replace(/^\/api\/ollama/, "") || "/";
    if (request.method === "POST" && rejectUnauthorized(request, response, `/api/ollama${path}`)) return;
    try {
      if (request.method === "GET" && path === "/models") {
        const result = await listOllamaModels();
        if (!result.ok) response.statusCode = 503;
        sendJson(response, result);
        return;
      }
      if (request.method === "GET" && path === "/active") {
        const result = await getActiveOllamaModel(persistentMemory);
        if (!result.ok) response.statusCode = 503;
        sendJson(response, result);
        return;
      }
      if (request.method === "POST" && path === "/active") {
        const body = JSON.parse(await readBody(request, 8000)) as { model?: string };
        const result = await setActiveOllamaModel(persistentMemory, body.model ?? "", { ownerApproved: true });
        if (!result.ok) response.statusCode = result.reason === "OLLAMA_MODEL_NOT_INSTALLED" ? 404 : 503;
        sendJson(response, result);
        return;
      }
      if (request.method === "POST" && path === "/pull") {
        const body = JSON.parse(await readBody(request, 8000)) as { model?: string };
        const result = await pullModel(body.model ?? "", { ownerApproved: true });
        if (!result.ok) response.statusCode = result.reason === "Q4_K_M_MODEL_TAG_REQUIRED" ? 400 : 503;
        sendJson(response, result);
        return;
      }
      response.statusCode = 404;
      sendJson(response, { ok: false, status: "BLOCKED", reason: "OLLAMA_ROUTE_NOT_FOUND" });
    } catch (error) {
      response.statusCode = error instanceof SyntaxError ? 400 : 503;
      sendJson(response, { ok: false, status: "BLOCKED", reason: error instanceof Error ? error.message : "OLLAMA_REQUEST_FAILURE" });
    }
  });
}

function registerMemoryRoute(server: any) {
  server.middlewares.use("/api/memory", async (request: any, response: any) => {
    const parsed = parseMemoryUrl(request.url ?? "/");
    const path = parsed.pathname.replace(/^\/api\/memory/, "") || "/";
    const projectMutation = request.method !== "GET" && (/^\/projects(?:\/[^/]+)?(?:\/restore)?$/.test(path));
    if (projectMutation && rejectUnauthorized(request, response, `/api/memory${path}`)) return;
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
      const ledgerMatch = path.match(/^\/projects\/([^/]+)\/ledger$/);
      if (ledgerMatch && request.method === "GET") {
        const projectId = decodeURIComponent(ledgerMatch[1]);
        sendJson(response, { ok: true, persistent: true, ledger: persistentMemory.listEvidenceLedger(projectId, parsed.searchParams.get("requestId") ?? undefined) });
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

function registerProjectEditRoute(server: any) {
  server.middlewares.use("/api/project-edit", async (request: any, response: any) => {
    if (request.method !== "POST") {
      response.statusCode = 405;
      sendJson(response, { error: "METHOD_NOT_ALLOWED", message: "استخدم POST فقط." });
      return;
    }
    if (rejectUnauthorized(request, response, "/api/project-edit")) return;
    try {
      const body = JSON.parse(await readBody(request, 120000)) as { action?: string; projectId?: string; draftId?: string; approvalToken?: string; snapshotId?: string; requestId?: string; reason?: string; instruction?: string; inputMode?: ProjectEditInputMode; files?: ProjectEditFileInput[]; factoryRequest?: TypedFactoryRequest };
      const projectId = body.projectId?.trim() ?? "";
      const project = projectId ? persistentMemory.getProject(projectId) : null;
      if (!project) {
        response.statusCode = 404;
        sendJson(response, { error: "PROJECT_NOT_FOUND", message: "المشروع غير موجود أو مؤرشف." });
        return;
      }
      if (body.action === "recover") {
        if (!body.snapshotId || !body.requestId) {
          response.statusCode = 400;
          sendJson(response, { error: "RECOVERY_INPUT_REQUIRED", message: "snapshotId وrequestId مطلوبان للاستعادة." });
          return;
        }
        const recovery = await recoverProjectEditSnapshot({ project, snapshotId: body.snapshotId, requestId: body.requestId, memory: persistentMemory, reason: body.reason });
        sendJson(response, { ok: true, recovery });
        return;
      }
      if (body.action === "propose") {
        const draft = await proposeProjectEdit({ project, instruction: body.instruction ?? "", inputMode: body.inputMode === "voice" ? "voice" : "text", files: body.files ?? [], factoryRequest: body.factoryRequest });
        persistentMemory.recordProjectEditEvent(project.id, draft.id, "proposed", { inputDigest: body.factoryRequest?.inputDigest, inputMode: draft.inputMode, instruction: draft.instruction, paths: draft.changes.map((change) => change.path), previousSha256: draft.changes.map((change) => change.previousSha256 ?? null) });
        sendJson(response, { ok: true, draft: { ...draft, changes: draft.changes.map(({ content: _content, previousContent: _previousContent, ...change }) => change) } });
        return;
      }
      if (!body.draftId) {
        response.statusCode = 400;
        sendJson(response, { error: "DRAFT_ID_REQUIRED", message: "معرّف مسودة التعديل مطلوب." });
        return;
      }
      if (body.action === "reject") {
        const rejected = rejectProjectEdit(project.id, body.draftId);
        if (rejected) persistentMemory.recordProjectEditEvent(project.id, body.draftId, "rejected", {});
        sendJson(response, { ok: rejected, rejected });
        return;
      }
      if (body.action === "approve") {
        if (!body.approvalToken) {
          response.statusCode = 400;
          sendJson(response, { error: "APPROVAL_TOKEN_REQUIRED", message: "رمز الموافقة الأحادي مطلوب." });
          return;
        }
        const draft = await approveProjectEdit(project, body.approvalToken, body.factoryRequest);
        persistentMemory.recordProjectEditEvent(project.id, draft.id, "approved", { inputDigest: body.factoryRequest?.inputDigest, inputMode: draft.inputMode, paths: draft.changes.map((change) => change.path) });
        persistentMemory.recordProjectEditEvent(project.id, draft.id, "applied", { inputDigest: body.factoryRequest?.inputDigest, paths: draft.changes.map((change) => change.path) });
        sendJson(response, { ok: true, applied: true, draftId: draft.id, snapshotId: draft.snapshotId, paths: draft.changes.map((change) => change.path) });
        return;
      }
      response.statusCode = 400;
      sendJson(response, { error: "UNKNOWN_EDIT_ACTION", message: "الإجراء المدعوم هو propose أو approve أو reject." });
    } catch (error) {
      const code = error instanceof Error ? error.message : "PROJECT_EDIT_FAILURE";
      response.statusCode = ["CONFLICT", "EDIT_DRAFT_NOT_FOUND", "EDIT_APPROVAL_NOT_FOUND", "APPROVAL_TOKEN_ALREADY_USED", "APPROVAL_SHA_MISMATCH", "APPROVAL_INPUT_DIGEST_MISMATCH"].some((value) => code.includes(value)) ? 409 : code === "WORKSPACE_NOT_CONFIGURED" || code === "WRITE_SCOPE_NOT_CONFIGURED" ? 422 : 400;
      sendJson(response, { error: code, message: code === "WORKSPACE_NOT_CONFIGURED" ? "لم تُحدد مساحة ملفات هذا المشروع بعد؛ لن يُسمح بالتعديل قبل ربطها." : error instanceof Error ? error.message : "تعذر إنشاء أو تطبيق تعديل المشروع." });
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
        registerDiagnosticsRoutes(server);
        registerEmergencyStopRoute(server);
        registerIdentityRoute(server);
        registerGlobalChatRoute(server);
        registerKazBuildRoute(server);
        registerFactoryIntelligenceRoute(server);
        registerProjectChatRoute(server);
        registerProjectEditRoute(server);
        registerKazStatusRoute(server);
      registerFactoryRoute(server);
      registerModelRoute(server);
      registerOllamaRoutes(server);
      registerMemoryRoute(server);
    },
      configurePreviewServer(server) {
        registerDiagnosticsRoutes(server);
        registerEmergencyStopRoute(server);
        registerIdentityRoute(server);
        registerGlobalChatRoute(server);
        registerKazBuildRoute(server);
        registerFactoryIntelligenceRoute(server);
        registerProjectChatRoute(server);
        registerProjectEditRoute(server);
        registerKazStatusRoute(server);
      registerFactoryRoute(server);
      registerModelRoute(server);
      registerOllamaRoutes(server);
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
  const statusCode = Number(response.statusCode ?? 200);
  let output = payload;
  if ([401, 500, 503].includes(statusCode) && typeof payload === "object" && payload !== null && "error" in payload) {
    const details = payload as Record<string, unknown>;
    const rawCode = typeof details.error === "string" ? details.error : "KAZ-UNKNOWN-001";
    const code = rawCode === "AUTH_REQUIRED" ? "KAZ-AUTH-001" : rawCode;
    const traceId = typeof details.traceId === "string" ? details.traceId : `api-${randomUUID()}`;
    output = formatError(code, traceId, { message: typeof details.message === "string" ? details.message : undefined });
    try {
      persistentMemory.recordApiError({ traceId, code, status: statusCode, method: response.__kazRequest?.method, path: response.__kazRequest?.path, message: typeof details.message === "string" ? details.message : undefined });
    } catch {
      // The original API error remains fail-closed if the ledger is unavailable.
    }
  }
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(output));
}

export default defineConfig({
  plugins: [react(), kazApiPlugin()],
  server: {
    port: 3000,
    strictPort: true,
    allowedHosts: [".manus.computer", "localhost", "127.0.0.1"],
  },
});
