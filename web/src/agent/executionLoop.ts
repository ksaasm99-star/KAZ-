import type { AgentEvidence, AgentSearchResult, AgentTask, AgentTaskState } from "./agentTask";
import type { ReadOnlyAgentTools } from "./readOnlyTools";

export type AgentRunOptions = {
  signal?: AbortSignal;
  now?: () => number;
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
      state.evidence.push({ step, tool, startedAt: toolStartedAt, finishedAt, ok: true, summary: result.summary, sourceIds: result.sourceIds });
      return result.value;
    } catch (error) {
      const finishedAt = new Date(now()).toISOString();
      state.evidence.push({ step, tool, startedAt: toolStartedAt, finishedAt, ok: false, summary: error instanceof Error ? error.message : "فشل غير معروف.", sourceIds: [] });
      throw error;
    }
  };

  try {
    const manifestResult = await runTool("read_project_manifest", async () => {
      const result = await tools.read_project_manifest(task.projectId);
      return { value: result, sourceIds: [task.projectId], summary: "تمت قراءة ملف تعريف المشروع وحفظه كسياق للمهمة." };
    });
    state.manifest = manifestResult.manifest;

    const query = task.request.slice(0, 240);
    const results = await runTool("search_project_memory", async () => {
      const value = await tools.search_project_memory(task.projectId, query);
      return { value, sourceIds: value.map((item) => item.entityId), summary: summarizeSearch(value) };
    });
    state.searchResults = results;
    state.status = "completed";
    state.message = results.length > 0 ? "اكتملت القراءة والبحث مع أدلة من ذاكرة المشروع." : "اكتملت القراءة والبحث، ولم توجد نتائج مطابقة.";
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
    return state;
  }
}
