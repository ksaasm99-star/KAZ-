import type { LLMGenerateOptions, LLMProvider, ModelInfo } from "./llmProvider";

declare const process: { env: Record<string, string | undefined> };
declare const AbortController: new () => { signal: unknown; abort(): void };
declare function setTimeout(callback: () => void, delay: number): unknown;
declare function clearTimeout(timer: unknown): void;
declare function fetch(input: string, init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: unknown }): Promise<{ ok: boolean; status: number; json(): Promise<any> }>;

const DEFAULT_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "llama3.2";
const REQUEST_TIMEOUT_MS = 30_000;

type OllamaTag = { name?: string; model?: string; details?: Record<string, unknown> };

export class OllamaProvider implements LLMProvider {
  readonly name = "ollama";

  private baseUrl(): string {
    return (process.env.KAZ_OLLAMA_HOST?.trim() || process.env.OLLAMA_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  private model(options?: LLMGenerateOptions): string {
    return options?.model?.trim() || process.env.OLLAMA_MODEL?.trim() || DEFAULT_MODEL;
  }

  private async request(path: string, init: { method: string; body?: string } = { method: "GET" }): Promise<any> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${this.baseUrl()}${path}`, {
        method: init.method,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: init.body,
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`OLLAMA_API_ERROR:${response.status}`);
      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new Error("OLLAMA_TIMEOUT");
      if (error instanceof Error && error.message.startsWith("OLLAMA_API_ERROR:")) throw error;
      throw new Error("OLLAMA_UNAVAILABLE");
    } finally {
      clearTimeout(timer);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.request("/api/tags");
      return true;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    const payload = await this.request("/api/tags");
    return Array.isArray(payload?.models)
      ? payload.models.flatMap((model: OllamaTag) => typeof model.name === "string" ? [model.name] : typeof model.model === "string" ? [model.model] : [])
      : [];
  }

  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    if (!modelId.trim()) return null;
    const payload = await this.request("/api/tags");
    const model = (Array.isArray(payload?.models) ? payload.models : []).find((item: OllamaTag) => item.name === modelId || item.model === modelId);
    return model ? { id: modelId, provider: this.name, details: model.details } : null;
  }

  async generate(prompt: string, options: LLMGenerateOptions = {}): Promise<string> {
    if (!prompt.trim() && !options.messages?.length) throw new Error("LLM_PROMPT_REQUIRED");
    const messages = options.messages?.length
      ? options.messages
      : [
          ...(options.systemInstruction ? [{ role: "system" as const, content: options.systemInstruction }] : []),
          { role: "user" as const, content: prompt },
        ];
    const payload = await this.request("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        model: this.model(options),
        stream: false,
        messages,
        options: {
          ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
          ...(options.topP !== undefined ? { top_p: options.topP } : {}),
          ...(options.maxOutputTokens !== undefined ? { num_predict: options.maxOutputTokens } : {}),
        },
      }),
    });
    const content = typeof payload?.message?.content === "string" ? payload.message.content.trim() : "";
    if (!content) throw new Error("OLLAMA_EMPTY_RESPONSE");
    return content;
  }
}
