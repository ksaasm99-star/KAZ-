import type { Project } from "./project";
import type { ModelDownloadPlan, ModelRegistryEntry } from "./agent/modelRegistry";
import type { KazIdentity } from "./agent/identity";
import type { TypedFactoryRequest } from "./agent/factoryRequest";

export const OWNER_TOKEN_STORAGE_KEY = "kaz-owner-token";

export function getOwnerToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(OWNER_TOKEN_STORAGE_KEY)?.trim() ?? "";
}

export function setOwnerToken(token: string): void {
  if (typeof window === "undefined") return;
  const normalized = token.trim();
  if (normalized) window.localStorage.setItem(OWNER_TOKEN_STORAGE_KEY, normalized);
  else window.localStorage.removeItem(OWNER_TOKEN_STORAGE_KEY);
}

function requestPath(input: RequestInfo | URL): string {
  if (input instanceof URL) return input.pathname;
  if (typeof input === "string") return new URL(input, window.location.origin).pathname;
  return new URL(input.url, window.location.origin).pathname;
}

function needsOwnerToken(input: RequestInfo | URL, init?: RequestInit): boolean {
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  const path = requestPath(input);
  if (path === "/api/project-edit" || path.startsWith("/api/factory/")) return true;
  if (path === "/api/identity") return method === "PUT";
  if (path.startsWith("/api/models")) return method !== "GET";
  if (path.startsWith("/api/ollama/")) return method === "POST";
  if (path === "/api/emergency-stop") return method === "POST";
  if (path.startsWith("/api/memory/projects")) return method !== "GET";
  return false;
}

export class KazApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "KazApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const ownerToken = getOwnerToken();
  if (ownerToken && needsOwnerToken(input, init)) headers.set("Authorization", `Bearer ${ownerToken}`);
  const response = await fetch(input, { ...init, headers });
  const body = await response.json() as T & { message?: string; error?: string; reason?: string };
  if (!response.ok) throw new KazApiError(body.message ?? body.reason ?? "تعذر الوصول إلى ذاكرة KAZ الدائمة.", response.status, body.error ?? body.reason);
  return body;
}

export type HealthCheck = { status: "healthy" | "degraded" | "unhealthy"; latencyMs?: number; [key: string]: unknown };
export type HealthReport = { status: "healthy" | "degraded" | "unhealthy"; checks: Record<string, HealthCheck>; timestamp: string };
export type DiagnosticsError = { eventId: string; eventType: string; occurredAt: string; payload: Record<string, unknown> };

export async function loadHealth(): Promise<HealthReport> {
  return request<HealthReport>("/api/health");
}

export async function loadDiagnosticsErrors(): Promise<{ errors: DiagnosticsError[] }> {
  return request<{ errors: DiagnosticsError[] }>("/api/diagnostics/errors");
}

export async function loadIdentity(): Promise<{ identity: KazIdentity; persistent: boolean }> {
  return request<{ identity: KazIdentity; persistent: boolean }>("/api/identity");
}

export async function saveIdentity(identity: KazIdentity): Promise<{ identity: KazIdentity; persistent: boolean }> {
  return request<{ identity: KazIdentity; persistent: boolean }>("/api/identity", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(identity),
  });
}

export async function loadProjects(): Promise<{ projects: Project[]; persistent: boolean }> {
  return request<{ projects: Project[]; persistent: boolean }>("/api/memory/projects");
}

export async function loadProject(id: string): Promise<Project> {
  const result = await request<{ project: Project }>(`/api/memory/projects/${encodeURIComponent(id)}`);
  if (!result.project) throw new Error("المشروع غير موجود.");
  return result.project;
}

export type MemorySearchResult = {
  entityType: string;
  entityId: string;
  projectId: string;
  title: string;
  content: string;
  createdAt: string;
};

export async function searchProjectMemory(query: string, projectId: string): Promise<{ results: MemorySearchResult[]; persistent: boolean }> {
  return request<{ results: MemorySearchResult[]; persistent: boolean }>("/api/memory/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, projectId }),
  });
}

export type ProjectChatFactoryRequest = { requestId: string; status: "queued"; apkStatus: "not_started"; workflowUrl: string };

export type ProjectEditInputMode = "text" | "voice";
export type ProjectEditFileInput = { path: string; content: string; reason?: string };
export type ProjectEditChange = { path: string; reason?: string; previousSha256?: string; diff: string; created: boolean };
export type ProjectEditDraft = { id: string; projectId: string; inputMode: ProjectEditInputMode; instruction: string; createdAt: string; expiresAt: string; approvalToken: string; inputDigest?: string; snapshotId?: string; changes: ProjectEditChange[] };

export async function sendProjectMessage(projectId: string, message: string, inputMode: ProjectEditInputMode = "text"): Promise<{ project: Project; reply: string; provider: "cloud" | "factory"; model: string; expertContextLoaded: boolean; factory?: ProjectChatFactoryRequest }> {
  return request<{ project: Project; reply: string; provider: "cloud" | "factory"; model: string; expertContextLoaded: boolean; factory?: ProjectChatFactoryRequest }>("/api/project-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, message, inputMode }),
  });
}

export async function proposeProjectEdit(projectId: string, instruction: string, inputMode: ProjectEditInputMode, files: ProjectEditFileInput[], factoryRequest?: TypedFactoryRequest): Promise<{ draft: ProjectEditDraft }> {
  return request<{ draft: ProjectEditDraft }>("/api/project-edit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "propose", projectId, instruction, inputMode, files, factoryRequest }) });
}

export async function approveProjectEdit(projectId: string, approvalToken: string, factoryRequest?: TypedFactoryRequest): Promise<{ applied: boolean; draftId: string; paths: string[]; snapshotId?: string }> {
  return request<{ applied: boolean; draftId: string; paths: string[]; snapshotId?: string }>("/api/project-edit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve", projectId, approvalToken, factoryRequest }) });
}

export async function rejectProjectEdit(projectId: string, draftId: string): Promise<{ rejected: boolean }> {
  return request<{ rejected: boolean }>("/api/project-edit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reject", projectId, draftId }) });
}

export type GlobalInputMode = "text" | "voice";

export async function sendGlobalMessage(message: string, inputMode: GlobalInputMode = "text"): Promise<{ reply: string; provider: "cloud"; model: string; identityApplied: boolean; inputMode: GlobalInputMode }> {
  return request<{ reply: string; provider: "cloud"; model: string; identityApplied: boolean; inputMode: GlobalInputMode }>("/api/global-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, inputMode }),
  });
}

export async function loadArchivedProjects(): Promise<{ projects: Project[]; persistent: boolean }> {
  return request<{ projects: Project[]; persistent: boolean }>("/api/memory/projects/archived");
}

export async function restoreArchivedProject(id: string): Promise<{ project: Project; persistent: boolean }> {
  const result = await request<{ restored: boolean; persistent: boolean }>(`/api/memory/projects/${encodeURIComponent(id)}/restore`, { method: "POST" });
  if (!result.restored) throw new Error("تعذر استعادة المشروع المؤرشف.");
  const restored = await request<{ project: Project }>(`/api/memory/projects/${encodeURIComponent(id)}`);
  return { project: restored.project, persistent: result.persistent };
}

export async function archiveProject(id: string): Promise<{ archived: boolean; persistent: boolean }> {
  return request<{ archived: boolean; persistent: boolean }>(`/api/memory/projects/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function saveProject(project: Project, existing = false): Promise<{ project: Project; persistent: boolean }> {
  return request<{ project: Project; persistent: boolean }>(existing ? `/api/memory/projects/${encodeURIComponent(project.id)}` : "/api/memory/projects", {
    method: existing ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(project),
  });
}

export type FactoryVerification = {
  runId: string;
  sourceCommit: string;
  compile: "success" | "failure" | "cancelled" | "skipped" | "pending" | "unknown";
  build: "success" | "failure" | "cancelled" | "skipped" | "pending" | "unknown";
  workflowConclusion: string;
  recordedAt: string;
};

export type FactoryDiagnostic = {
  jobName: string;
  stepName: string;
  level: "error" | "warning" | "info";
  message: string;
  excerpt?: string;
};

export type FactoryBuildStatus = {
  requestId: string;
  projectId: string;
  status: "queued" | "building" | "packaging" | "ready" | "failed";
  apkStatus: "not_started" | "building" | "ready" | "failed";
  message: string;
  directUrl?: string;
  workflowUrl?: string;
  verification?: FactoryVerification;
  diagnostics?: FactoryDiagnostic[];
};

export async function startFactoryBuild(projectId: string, engine: "auto" | "html_js" | "kotlin" = "kotlin"): Promise<FactoryBuildStatus> {
  return request<FactoryBuildStatus>("/api/factory/build", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, engine }),
  });
}

export async function getFactoryBuildStatus(requestId: string): Promise<FactoryBuildStatus> {
  return request<FactoryBuildStatus>(`/api/factory/status?requestId=${encodeURIComponent(requestId)}`);
}

export async function loadModels(): Promise<{ models: ModelRegistryEntry[]; persistent: boolean }> {
  return request<{ models: ModelRegistryEntry[]; persistent: boolean }>("/api/models");
}

export type OllamaUiStatus =
  | { ok: true; status: "AVAILABLE"; modelCount: number; activeModel: string | null; baseUrl: string }
  | { ok: false; status: "BLOCKED"; reason: string };

export async function loadOllamaUiStatus(): Promise<OllamaUiStatus> {
  try {
    const [models, active] = await Promise.all([
      request<{ ok: true; status: "AVAILABLE"; models: Array<{ name?: string; model?: string }>; baseUrl: string }>("/api/ollama/models"),
      request<{ ok: true; status: "AVAILABLE"; model: string | null }>("/api/ollama/active"),
    ]);
    return { ok: true, status: "AVAILABLE", modelCount: models.models.length, activeModel: active.model, baseUrl: models.baseUrl };
  } catch (error) {
    return { ok: false, status: "BLOCKED", reason: error instanceof KazApiError ? error.code ?? error.message : "OLLAMA_UNAVAILABLE" };
  }
}

export async function registerModel(model: ModelRegistryEntry): Promise<{ model: ModelRegistryEntry; persistent: boolean }> {
  return request<{ model: ModelRegistryEntry; persistent: boolean }>("/api/models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(model),
  });
}

export async function verifyModelFile(modelId: string) {
  return request<{ result: { id: string; verified: boolean; status: string; expectedSha256: string | null; computedSha256: string; sizeBytes: number; model?: ModelRegistryEntry }; persistent: boolean }>(`/api/models/${encodeURIComponent(modelId)}/verify`, { method: "POST" });
}

export async function planModelDownload(modelId: string): Promise<{ plan: ModelDownloadPlan; persistent: boolean }> {
  return request<{ plan: ModelDownloadPlan; persistent: boolean }>(`/api/models/${encodeURIComponent(modelId)}/download-plan`, { method: "POST" });
}
