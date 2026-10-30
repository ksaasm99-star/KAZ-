import { getModelProvider } from "../src/agent/modelRegistry";
import { GeminiProvider } from "./geminiProvider";
import type { LLMProvider } from "./llmProvider";
import { OllamaProvider } from "./ollamaProvider";

declare const process: { env: Record<string, string | undefined> };

const providers = new Map<string, LLMProvider>([
  ["gemini", new GeminiProvider()],
  ["ollama", new OllamaProvider()],
]);

export function getDefaultProviderName(): string {
  return process.env.KAZ_DEFAULT_PROVIDER?.trim() || "ollama";
}

export function getProvider(name?: string): LLMProvider | null {
  const normalized = (name?.trim() || getDefaultProviderName()).toLowerCase();
  if (normalized === "gemini" && process.env.KAZ_ENABLE_GEMINI !== "true") return null;
  return providers.get(normalized) ?? null;
}

export function listProviders(): string[] {
  return [...providers.keys()].filter((name) => getProvider(name) !== null).sort();
}

export function registerProvider(name: string, provider: LLMProvider): void {
  const normalized = name.trim().toLowerCase();
  if (!normalized) throw new Error("PROVIDER_NAME_REQUIRED");
  providers.set(normalized, provider);
}

export function getProviderForModel(modelId: string): LLMProvider | null {
  return getProvider(getModelProvider(modelId));
}
