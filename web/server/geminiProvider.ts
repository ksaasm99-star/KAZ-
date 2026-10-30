import type { LLMGenerateOptions, LLMProvider, ModelInfo } from "./llmProvider";

declare const process: { env: Record<string, string | undefined> };
declare const AbortController: new () => { signal: unknown; abort(): void };
declare function setTimeout(callback: () => void, delay: number): unknown;
declare function clearTimeout(timer: unknown): void;
declare function fetch(input: string, init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: unknown }): Promise<{ ok: boolean; status: number; json(): Promise<any> }>;

const DEFAULT_MODEL = "gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 30_000;

type GeminiProviderOptions = LLMGenerateOptions & { model?: string };

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";

  private model(options?: GeminiProviderOptions): string {
    return options?.model?.trim() || process.env.KAZ_LLM_MODEL?.trim() || process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  }

  async isAvailable(): Promise<boolean> {
    return process.env.KAZ_API_ENABLED === "true" && Boolean(process.env.GEMINI_API_KEY?.trim());
  }

  async listModels(): Promise<string[]> {
    return (await this.isAvailable()) ? [this.model()] : [];
  }

  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    if (!modelId.trim() || !(await this.isAvailable())) return null;
    return { id: modelId.trim(), provider: this.name };
  }

  async generate(prompt: string, options: GeminiProviderOptions = {}): Promise<string> {
    if (process.env.KAZ_API_ENABLED !== "true") throw new Error("KAZ_API_DISABLED");
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) throw new Error("AI_NOT_CONFIGURED");
    if (!prompt.trim()) throw new Error("LLM_PROMPT_REQUIRED");

    const model = this.model(options);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const generationConfig: Record<string, unknown> = {};
      if (options.temperature !== undefined) generationConfig.temperature = options.temperature;
      if (options.topP !== undefined) generationConfig.topP = options.topP;
      if (options.maxOutputTokens !== undefined) generationConfig.maxOutputTokens = options.maxOutputTokens;
      if (options.responseMimeType) generationConfig.responseMimeType = options.responseMimeType;
      if (options.responseSchema) generationConfig.responseSchema = options.responseSchema;

      const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(options.systemInstruction ? { systemInstruction: { parts: [{ text: options.systemInstruction }] } } : {}),
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig,
        }),
        signal: controller.signal,
      });
      const body = await upstream.json();
      if (!upstream.ok) throw new Error(`GEMINI_API_ERROR:${body?.error?.message ?? upstream.status}`);
      const text = body?.candidates?.[0]?.content?.parts?.map((part: any) => typeof part.text === "string" ? part.text : "").join("").trim();
      if (!text) throw new Error("LLM_EMPTY_RESPONSE");
      return text;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new Error("GEMINI_TIMEOUT");
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
