export type ModelFormat = "gguf" | "pte" | "safetensors";
export type ModelExecution = "local" | "cloud";
export type ModelStatus = "planned" | "available" | "installed" | "verified" | "failed";
export type ModelCapability = "chat" | "planning" | "code" | "review" | "embedding";

export type ModelRegistryEntry = {
  id: string;
  displayName: string;
  execution: ModelExecution;
  format: ModelFormat;
  status: ModelStatus;
  capabilities: ModelCapability[];
  family?: string;
  quantization?: string;
  contextLength: number;
  artifact?: {
    uri: string;
    sizeBytes?: number;
    sha256?: string;
  };
  runtime: "llama.cpp" | "executorch" | "managed-api";
  requirements: {
    minimumMemoryMb?: number;
    preferredMemoryMb?: number;
    androidAbis?: string[];
  };
  policy: {
    allowProjectData: boolean;
    allowNetwork: boolean;
    allowSilentFallback: boolean;
  };
  verification: {
    metadataRead: boolean;
    loaded: boolean;
    firstToken: boolean;
    lastVerifiedAt?: string;
    evidence?: string;
  };
};

export type ModelSelectionRequest = {
  capability: ModelCapability;
  execution: ModelExecution;
  availableMemoryMb?: number;
  preferredFormat?: ModelFormat;
};

export const MODEL_REGISTRY_VERSION = 1;

export const MODEL_REGISTRY: readonly ModelRegistryEntry[] = [
  {
    id: "kaz-local-general-small",
    displayName: "KAZ Local General Small",
    execution: "local",
    format: "gguf",
    status: "planned",
    family: "instruct-model-to-be-selected",
    capabilities: ["chat", "planning", "review"],
    quantization: "Q4_K_M",
    contextLength: 8192,
    runtime: "llama.cpp",
    requirements: { minimumMemoryMb: 4096, preferredMemoryMb: 6144, androidAbis: ["arm64-v8a"] },
    policy: { allowProjectData: true, allowNetwork: false, allowSilentFallback: false },
    verification: { metadataRead: false, loaded: false, firstToken: false },
  },
  {
    id: "kaz-local-code-small",
    displayName: "KAZ Local Code Small",
    execution: "local",
    format: "gguf",
    status: "planned",
    family: "code-instruct-model-to-be-selected",
    capabilities: ["code", "review", "planning"],
    quantization: "Q4_K_M",
    contextLength: 8192,
    runtime: "llama.cpp",
    requirements: { minimumMemoryMb: 6144, preferredMemoryMb: 8192, androidAbis: ["arm64-v8a"] },
    policy: { allowProjectData: true, allowNetwork: false, allowSilentFallback: false },
    verification: { metadataRead: false, loaded: false, firstToken: false },
  },
  {
    id: "kaz-cloud-planner",
    displayName: "KAZ Cloud Planner",
    execution: "cloud",
    format: "safetensors",
    status: "planned",
    capabilities: ["chat", "planning", "code", "review"],
    contextLength: 32768,
    runtime: "managed-api",
    requirements: {},
    policy: { allowProjectData: false, allowNetwork: true, allowSilentFallback: false },
    verification: { metadataRead: true, loaded: false, firstToken: false },
  },
];

export function selectModel(request: ModelSelectionRequest): ModelRegistryEntry | null {
  const candidates = MODEL_REGISTRY.filter((model) =>
    model.execution === request.execution &&
    model.capabilities.includes(request.capability) &&
    (!request.preferredFormat || model.format === request.preferredFormat) &&
    (!request.availableMemoryMb || !model.requirements.minimumMemoryMb || request.availableMemoryMb >= model.requirements.minimumMemoryMb),
  );

  return candidates.find((model) => model.status === "verified")
    ?? candidates.find((model) => model.status === "installed")
    ?? candidates.find((model) => model.status === "available")
    ?? candidates[0]
    ?? null;
}
