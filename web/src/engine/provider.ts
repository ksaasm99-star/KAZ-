export type KazProviderId = "local" | "cloud";
export type EngineId = "auto" | "html_js" | "kotlin";

export type BuildRequest = {
  projectName: string;
  description: string;
  engine: EngineId;
};

export type BuildPlan = {
  summary: string;
  engine: string;
  features: string[];
  screens: string[];
  files: string[];
  nextSteps: string[];
};

export type ProviderResult = {
  provider: KazProviderId;
  model?: string;
  plan: BuildPlan;
};

export interface KazProvider {
  readonly id: KazProviderId;
  analyze(request: BuildRequest): Promise<ProviderResult>;
}
