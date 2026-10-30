import { listOllamaModels } from "./ollamaGateway";
import { getDefaultProviderName, getProvider, listProviders } from "./providerRegistry";
import type { PersistentMemory } from "./persistentMemory";

declare const process: { env: Record<string, string | undefined> };
declare function setTimeout(callback: () => void, delay: number): unknown;

type HealthStatus = "healthy" | "degraded" | "unhealthy" | "disabled";
type Check = { status: HealthStatus; latencyMs: number; [key: string]: unknown };

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timer: unknown;
  const timeout = new Promise<T>((resolve) => { timer = setTimeout(() => resolve(fallback), timeoutMs); });
  try { return await Promise.race([promise, timeout]); } finally { void timer; }
}

export async function buildHealthReport(memory: PersistentMemory) {
  const timestamp = new Date().toISOString();
  let database: Check;
  try {
    const started = Date.now();
    const summary = memory.health();
    database = { status: "healthy", latencyMs: Date.now() - started, storage: summary.storage, schemaVersion: summary.schemaVersion, searchIndex: summary.searchIndex };
  } catch (error) {
    database = { status: "unhealthy", latencyMs: 0, reason: error instanceof Error ? error.message : "DATABASE_UNAVAILABLE" };
  }

  const ollamaStarted = Date.now();
  const ollamaResult = await withTimeout(listOllamaModels(), 1500, { ok: false, status: "BLOCKED", reason: "OLLAMA_HEALTH_TIMEOUT" } as const);
  const ollama: Check = ollamaResult.ok
    ? { status: "healthy", latencyMs: Date.now() - ollamaStarted, models: ollamaResult.models.map((item) => item.name ?? item.model ?? "unknown"), baseUrl: ollamaResult.baseUrl }
    : { status: "degraded", latencyMs: Date.now() - ollamaStarted, models: [], reason: ollamaResult.reason };

  const geminiEnabled = process.env.KAZ_ENABLE_GEMINI === "true";
  const geminiConfigured = geminiEnabled && process.env.KAZ_API_ENABLED === "true" && Boolean(process.env.GEMINI_API_KEY?.trim());
  const geminiStarted = Date.now();
  const geminiProvider = getProvider("gemini");
  const geminiAvailable = geminiConfigured && geminiProvider ? await withTimeout(geminiProvider.isAvailable(), 1500, false) : false;
  const gemini: Check = { status: !geminiEnabled ? "disabled" : geminiAvailable ? "healthy" : "degraded", configured: geminiConfigured, latencyMs: Date.now() - geminiStarted };

  let evidenceLedger: Check;
  try {
    const started = Date.now();
    evidenceLedger = { status: "healthy", latencyMs: Date.now() - started, lastEventAt: memory.lastEvidenceEventAt() };
  } catch (error) {
    evidenceLedger = { status: "unhealthy", latencyMs: 0, lastEventAt: null, reason: error instanceof Error ? error.message : "LEDGER_UNAVAILABLE" };
  }

  const ownerTokenConfigured = Boolean(process.env.KAZ_OWNER_TOKEN?.trim());
  const auth: Check = { status: ownerTokenConfigured ? "healthy" : "unhealthy", latencyMs: 0, ownerTokenConfigured };
  const providers: Check = { status: "healthy", latencyMs: 0, default: getDefaultProviderName(), available: listProviders() };
  const checks = { database, ollama, gemini, evidence_ledger: evidenceLedger, auth, providers };
  const requiredChecks = [database, evidenceLedger, auth];
  const status: HealthStatus = requiredChecks.some((check) => check.status === "unhealthy")
    ? "unhealthy"
    : "healthy";
  return { status, checks, timestamp };
}
