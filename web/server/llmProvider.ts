export type LLMMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LLMGenerateOptions = {
  model?: string;
  systemInstruction?: string;
  messages?: LLMMessage[];
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
  responseSchema?: unknown;
};

export type ModelInfo = {
  id: string;
  provider: string;
  contextLength?: number;
  details?: Record<string, unknown>;
};

export interface LLMProvider {
  readonly name: string;
  generate(prompt: string, options?: LLMGenerateOptions): Promise<string>;
  isAvailable(): Promise<boolean>;
  listModels(): Promise<string[]>;
  getModelInfo(modelId: string): Promise<ModelInfo | null>;
}
