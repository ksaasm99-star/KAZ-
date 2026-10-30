import type { AgentEvidence, AgentSearchResult, AgentTask, AgentTaskState } from "./agentTask";
import type { ReadOnlyAgentTools } from "./readOnlyTools";
import { createProjectExpertContext } from "./projectExpert";
import { evaluateCompletionGate } from "./completionGate";
import { verifyGeneratedCode, type GeneratedCodeFile } from "./selfVerification";
import { createFactoryRequestFromAgentTask, type AgentFactoryRequestPlan } from "./factoryRequestAdapter";
import { inspectUntrustedData } from "./promptDefense";

export type AgentRunOptions = {
  signal?: AbortSignal;
  now?: () => number;
  onEvidence?: (task: AgentTask, evidence: AgentEvidence) => void | Promise<void>;
  generatedFiles?: readonly GeneratedCodeFile[];
  factoryRequest?: AgentFactoryRequestPlan;
};

function summarizeSearch(results: AgentSearchResult[]): string {
  if (results.length === 0) return "لم يعثر البحث على نتائج داخل ذاكرة المشروع.";
  return `عثر البحث على ${results.length} نتيجة داخل ذاكرة المشروع.`;
}

function ensureNotCancelled(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("تم إلغاء المهمة.", "AbortError");
}

export async function runReadOnlyAgentTask(task: AgentTask, tools: ReadOnlyAgentTools, options: AgentRunOptions = {}): Promise<AgentTaskState> {
  const now = options.now ?? Date.now;
  const startedAt = new Date(now()).toISOString();
  const state: AgentTaskState = {
    taskId: task.id,
    status: "running",
    stepCount: 0,
    searchResults: [],
    evidence: [],
    message: "بدأت قراءة سياق المشروع قبل البحث.",
    startedAt,
  };
  const requestInspection = inspectUntrustedData(task.request);
  if (requestInspection.blocked) {
    state.status = "blocked";
    state.message = "حُجبت المهمة لأن الطلب يحتوي نمط حقن تعليمات غير موثوق.";
    state.finishedAt = new Date(now()).toISOString();
    return state;
  }
  const deadline = now() + task.timeoutMs;

  const runTool = async <T>(tool: AgentEvidence["tool"], operation: () => Promise<{ value: T; sourceIds: string[]; summary: string }>): Promise<T> => {
    ensureNotCancelled(options.signal);
    if (now() > deadline) throw new Error("انتهت مهلة حلقة تنفيذ المهمة.");
    if (state.stepCount >= task.maxSteps) throw new Error("تجاوزت المهمة الحد الأقصى للخطوات.");
    state.stepCount += 1;
    const step = state.stepCount;
    const toolStartedAt = new Date(now()).toISOString();
    try {
      const result = await operation();
      const finishedAt = new Date(now()).toISOString();
      const evidence = { step, tool, startedAt: toolStartedAt, finishedAt, ok: true, summary: result.summary, sourceIds: result.sourceIds } satisfies AgentEvidence;
      state.evidence.push(evidence);
      await options.onEvidence?.(task, evidence);
      return result.value;
    } catch (error) {
      const finishedAt = new Date(now()).toISOString();
      const evidence = { step, tool, startedAt: toolStartedAt, finishedAt, ok: false, summary: error instanceof Error ? error.message : "فشل غير معروف.", sourceIds: [] } satisfies AgentEvidence;
      state.evidence.push(evidence);
      await options.onEvidence?.(task, evidence);
      throw error;
    }
  };

  try {
    const manifestResult = await runTool("read_project_manifest", async () => {
      const result = await tools.read_project_manifest(task.projectId);
      return { value: result, sourceIds: [task.projectId], summary: "تمت قراءة ملف تعريف المشروع وحفظه كسياق للمهمة." };
    });
    state.manifest = manifestResult.manifest;
    state.expertContext = createProjectExpertContext(manifestResult.manifest);
    state.message = "تم تحميل ملف تعريف المشروع وبناء سياق الخبير المتخصص قبل البحث.";

    const query = task.request.slice(0, 240);
    const results = await runTool("search_project_memory", async () => {
      const value = await tools.search_project_memory(task.projectId, query);
      return { value, sourceIds: value.map((item) => item.entityId), summary: summarizeSearch(value) };
    });
    state.searchResults = results.map((result) => ({ ...result, content: inspectUntrustedData(result.content).sanitized }));
    if (options.factoryRequest) {
      state.factoryRequest = await createFactoryRequestFromAgentTask(task, options.factoryRequest);
      state.message = "تم بناء طلب المصنع typed والتحقق منه داخل الذاكرة دون تنفيذ أو كتابة ملفات.";
    }
    if (task.requiresSelfVerification) {
      state.selfVerification = verifyGeneratedCode(options.generatedFiles ?? [], { expertContext: state.expertContext, now: new Date(now()) });
    }
    state.status = "completed";
    state.completionGate = evaluateCompletionGate({ ...state, requiresSelfVerification: task.requiresSelfVerification }, new Date(now()));
    if (!state.completionGate.allowed) {
      state.status = "blocked";
      state.message = state.completionGate.reason;
    } else {
      state.message = results.length > 0 ? "اكتملت القراءة والبحث مع أدلة من ذاكرة المشروع." : "اكتملت القراءة والبحث، ولم توجد نتائج مطابقة.";
    }
    state.finishedAt = new Date(now()).toISOString();
    return state;
  } catch (error) {
    state.finishedAt = new Date(now()).toISOString();
    if (error instanceof DOMException && error.name === "AbortError") {
      state.status = "cancelled";
      state.message = "أُلغيت المهمة قبل تنفيذ إجراء إضافي.";
      return state;
    }
    state.status = error instanceof Error && error.message.includes("مهلة") ? "blocked" : "failed";
    state.message = error instanceof Error ? error.message : "تعذر تنفيذ مهمة KAZ.";
    state.completionGate = evaluateCompletionGate({ ...state, requiresSelfVerification: task.requiresSelfVerification }, new Date(now()));
    return state;
  }
}
