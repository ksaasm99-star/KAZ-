import type { PersistentMemory } from "./persistentMemory";

declare function fetch(input: string, init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: unknown }): Promise<OllamaResponse>;
declare const AbortController: new () => { signal: unknown; abort(): void };
declare function setTimeout(callback: () => void, delay: number): unknown;
declare function clearTimeout(timer: unknown): void;

const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
const REQUEST_TIMEOUT_MS = 10_000;
const Q4_K_M = "Q4_K_M";

type OllamaResponse = {
  ok: boolean;
  status: number;
  json(): Promise<any>;
  text(): Promise<string>;
};

type OllamaModel = {
  name: string;
  model?: string;
  modified_at?: string;
  size?: number;
  digest?: string;
  details?: Record<string, unknown>;
};

type OllamaApproval = { ownerApproved?: boolean };

export type OllamaBlocked = {
  ok: false;
  status: "BLOCKED";
  reason: string;
};

export type OllamaModelsResult =
  | { ok: true; status: "AVAILABLE"; models: OllamaModel[]; baseUrl: string }
  | OllamaBlocked;

export type OllamaActiveResult =
  | { ok: true; status: "AVAILABLE"; model: string | null }
  | OllamaBlocked;

export type OllamaPullResult =
  | { ok: true; status: "PULLED"; model: string; requestedModel: string; quantization: typeof Q4_K_M; response: unknown }
  | OllamaBlocked;

function baseUrl(): string {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const raw = env?.KAZ_OLLAMA_HOST?.trim() || env?.OLLAMA_BASE_URL?.trim();
  return (raw || DEFAULT_OLLAMA_URL).replace(/\/$/, "");
}

function blocked(reason: string): OllamaBlocked {
  return { ok: false, status: "BLOCKED", reason };
}

async function request(path: string, init: { method: string; body?: string } = { method: "GET" }): Promise<OllamaResponse | OllamaBlocked> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl()}${path}`, {
      method: init.method,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: init.body,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    return blocked(error instanceof Error && error.name === "AbortError" ? "OLLAMA_TIMEOUT" : "OLLAMA_UNAVAILABLE");
  } finally {
    clearTimeout(timer);
  }
}

function resolveQ4Model(modelName: string): string | null {
  const requested = modelName.trim();
  if (!requested) return null;
  if (requested === "qwen2.5-coder:7b") return "qwen2.5-coder:7b-instruct-q4_K_M";
  if (requested === "qwen2.5-coder:14b") return "qwen2.5-coder:14b";
  if (/_q4_k_m$/i.test(requested)) return requested;
  return null;
}

export async function listOllamaModels(): Promise<OllamaModelsResult> {
  const response = await request("/api/tags");
  if ("status" in response && response.status === "BLOCKED") return response;
  if (!response.ok) return blocked(`OLLAMA_HTTP_${response.status}`);
  try {
    const payload = await response.json();
    return { ok: true, status: "AVAILABLE", models: Array.isArray(payload?.models) ? payload.models : [], baseUrl: baseUrl() };
  } catch {
    return blocked("OLLAMA_INVALID_RESPONSE");
  }
}

export async function getActiveOllamaModel(memory: Pick<PersistentMemory, "getActiveOllamaModel">): Promise<OllamaActiveResult> {
  const models = await listOllamaModels();
  if (!models.ok) return models;
  return { ok: true, status: "AVAILABLE", model: memory.getActiveOllamaModel() };
}

export async function setActiveOllamaModel(
  memory: Pick<PersistentMemory, "getActiveOllamaModel" | "setActiveOllamaModel">,
  modelName: string,
  approval?: OllamaApproval,
): Promise<OllamaActiveResult> {
  if (!approval?.ownerApproved) return blocked("OLLAMA_OWNER_APPROVAL_REQUIRED");
  const requested = modelName.trim();
  if (!requested) return blocked("OLLAMA_MODEL_REQUIRED");
  const models = await listOllamaModels();
  if (!models.ok) return models;
  const found = models.models.some((model) => model.name === requested || model.model === requested);
  if (!found) return blocked("OLLAMA_MODEL_NOT_INSTALLED");
  memory.setActiveOllamaModel(requested);
  return { ok: true, status: "AVAILABLE", model: requested };
}

export async function pullModel(modelName: string, approval?: OllamaApproval): Promise<OllamaPullResult> {
  if (!approval?.ownerApproved) return blocked("OLLAMA_OWNER_APPROVAL_REQUIRED");
  const resolved = resolveQ4Model(modelName);
  if (!resolved) return blocked("Q4_K_M_MODEL_TAG_REQUIRED");
  const response = await request("/api/pull", { method: "POST", body: JSON.stringify({ model: resolved, stream: false }) });
  if ("status" in response && response.status === "BLOCKED") return response;
  if (!response.ok) return blocked(`OLLAMA_HTTP_${response.status}`);
  try {
    const payload = await response.json();
    if (payload?.status !== "success") return blocked("OLLAMA_PULL_NOT_COMPLETED");
    return { ok: true, status: "PULLED", model: resolved, requestedModel: modelName.trim(), quantization: Q4_K_M, response: payload };
  } catch {
    return blocked("OLLAMA_INVALID_PULL_RESPONSE");
  }
}
