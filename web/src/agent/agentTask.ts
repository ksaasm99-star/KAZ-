import type { ProjectManifest } from "./projectManifest";

export type AgentTaskStatus = "queued" | "running" | "completed" | "blocked" | "failed" | "cancelled";
export type AgentToolId = "read_project_manifest" | "search_project_memory";

export type AgentTask = {
  id: string;
  projectId: string;
  request: string;
  allowedTools: readonly AgentToolId[];
  maxSteps: number;
  timeoutMs: number;
  createdAt: string;
};

export type AgentEvidence = {
  step: number;
  tool: AgentToolId;
  startedAt: string;
  finishedAt: string;
  ok: boolean;
  summary: string;
  sourceIds: string[];
};

export type AgentSearchResult = {
  entityType: string;
  entityId: string;
  projectId: string;
  title: string;
  content: string;
  createdAt: string;
};

export type AgentTaskState = {
  taskId: string;
  status: AgentTaskStatus;
  stepCount: number;
  manifest?: ProjectManifest;
  searchResults: AgentSearchResult[];
  evidence: AgentEvidence[];
  message: string;
  startedAt?: string;
  finishedAt?: string;
};

export function createAgentTask(input: { projectId: string; request: string; maxSteps?: number; timeoutMs?: number }): AgentTask {
  const request = input.request.trim();
  if (!input.projectId.trim()) throw new Error("معرّف المشروع مطلوب للمهمة.");
  if (request.length < 2) throw new Error("وصف المهمة مطلوب.");

  return {
    id: `agent-task-${Date.now()}`,
    projectId: input.projectId,
    request,
    allowedTools: ["read_project_manifest", "search_project_memory"],
    maxSteps: Math.min(Math.max(input.maxSteps ?? 4, 1), 8),
    timeoutMs: Math.min(Math.max(input.timeoutMs ?? 15000, 1000), 60000),
    createdAt: new Date().toISOString(),
  };
}
