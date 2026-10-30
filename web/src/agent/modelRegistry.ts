export type ModelFormat = "gguf" | "pte" | "safetensors" | "onnx";
export type ModelExecution = "local" | "cloud";
export type ModelStatus =
  | "planned"
  | "registered"
  | "downloading"
  | "paused"
  | "available"
  | "installed"
  | "verifying"
  | "verified"
  | "corrupted"
  | "failed"
  | "deleted";
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
    computedSha256?: string;
    localPath?: string;
    downloadedBytes?: number;
  };
  sourceUrl?: string;
  license?: string;
  runtime: "llama.cpp" | "executorch" | "managed-api";
  requirements: {
    minimumMemoryMb?: number;
    preferredMemoryMb?: number;
    storageRequiredMb?: number;
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
  createdAt?: string;
  updatedAt?: string;
  errorMessage?: string;
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


export type ModelRegistryState = {
  version: number;
  models: readonly ModelRegistryEntry[];
};

export type ModelDeviceProfile = {
  availableMemoryMb?: number;
  availableStorageMb?: number;
  runtime: ModelRegistryEntry["runtime"];
  androidAbi?: string;
};

export type ModelDownloadPlan = {
  modelId: string;
  sourceUrl: string;
  remoteSizeBytes?: number;
  requiredStorageBytes?: number;
  storageAvailable: boolean;
  remoteCheck: "ok" | "unavailable";
  downloadStarted: false;
};

export type ModelCompatibility = {
  compatible: boolean;
  reasons: string[];
  hasEnoughMemory: boolean;
  hasEnoughStorage: boolean;
  runtimeAvailable: boolean;
  abiSupported: boolean;
};

export const MODEL_REGISTRY_STATE: ModelRegistryState = {
  version: MODEL_REGISTRY_VERSION,
  models: MODEL_REGISTRY,
};

export function getModel(
  registry: ModelRegistryState,
  modelId: string,
): ModelRegistryEntry | null {
  return registry.models.find((model) => model.id === modelId) ?? null;
}

export function registerModel(
  registry: ModelRegistryState,
  model: ModelRegistryEntry,
): ModelRegistryState {
  if (registry.models.some((entry) => entry.id === model.id)) {
    throw new Error(`Model already registered: ${model.id}`);
  }

  const now = new Date().toISOString();
  return {
    ...registry,
    models: [...registry.models, { ...model, createdAt: model.createdAt ?? now, updatedAt: model.updatedAt ?? now }],
  };
}

export function updateModel(
  registry: ModelRegistryState,
  modelId: string,
  patch: Partial<ModelRegistryEntry>,
): ModelRegistryState {
  const existing = getModel(registry, modelId);
  if (!existing) {
    throw new Error(`Model not found: ${modelId}`);
  }

  return {
    ...registry,
    models: registry.models.map((model) =>
      model.id === modelId
        ? { ...model, ...patch, id: model.id, updatedAt: new Date().toISOString() }
        : model,
    ),
  };
}

export function canRunModel(model: ModelRegistryEntry): boolean {
  if (model.status !== "verified") {
    return false;
  }

  if (model.execution === "cloud") {
    return model.verification.metadataRead;
  }

  return model.verification.metadataRead && model.verification.loaded && model.verification.firstToken;
}

export function getModelProvider(modelId: string): string {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const configured = env?.KAZ_FORCE_PROVIDER?.trim() || env?.KAZ_DEFAULT_PROVIDER?.trim() || "ollama";
  return configured.toLowerCase();
}

export function checkModelCompatibility(
  model: ModelRegistryEntry,
  device: ModelDeviceProfile,
): ModelCompatibility {
  const reasons: string[] = [];
  const minimumMemory = model.requirements.minimumMemoryMb;
  const requiredStorage = model.requirements.storageRequiredMb ?? 0;
  const hasEnoughMemory = minimumMemory === undefined
    || device.availableMemoryMb === undefined
    || device.availableMemoryMb >= minimumMemory;
  const hasEnoughStorage = device.availableStorageMb === undefined
    || device.availableStorageMb >= requiredStorage;
  const runtimeAvailable = model.runtime === device.runtime;
  const abiSupported = !model.requirements.androidAbis?.length
    || !device.androidAbi
    || model.requirements.androidAbis.includes(device.androidAbi);

  if (!hasEnoughMemory) reasons.push("insufficient_memory");
  if (!hasEnoughStorage) reasons.push("insufficient_storage");
  if (!runtimeAvailable) reasons.push("runtime_unavailable");
  if (!abiSupported) reasons.push("android_abi_unsupported");

  return {
    compatible: reasons.length === 0,
    reasons,
    hasEnoughMemory,
    hasEnoughStorage,
    runtimeAvailable,
    abiSupported,
  };
}
