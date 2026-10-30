export const UNIFIED_CONNECTOR_CONTRACT_VERSION = 1 as const;

export type FactoryConnectorCapability =
  | "analyze"
  | "plan"
  | "preview"
  | "apply"
  | "build"
  | "artifact";

export type FactoryConnectorOperation = FactoryConnectorCapability;

export type FactoryConnectorProvider = "github" | "kaz-workspace" | "local" | "custom";
export type FactoryConnectorAuthMode = "oauth" | "bearer" | "local" | "none";
export type FactoryConnectorConnectionState = "connected" | "disconnected" | "blocked" | "not_configured";

export type FactoryConnectorDefinition = Readonly<{
  id: string;
  displayName: string;
  provider: FactoryConnectorProvider;
  icon: "github" | "workspace" | "plug";
  authMode: FactoryConnectorAuthMode;
  capabilities: readonly FactoryConnectorCapability[];
  connectionState: FactoryConnectorConnectionState;
  ownerApprovalRequired: boolean;
}>;

export type FactoryConnectorBinding = Readonly<{
  id: string;
  version: string;
  capabilities: readonly FactoryConnectorCapability[];
}>;

export type UnifiedConnectorStatus = "PASS" | "PARTIAL" | "BLOCKED" | "FAIL";

export type UnifiedConnectorContext = Readonly<{
  projectId: string;
  requestId: string;
  traceId: string;
  inputDigest: string;
}>;

export type UnifiedConnectorResult<T> = Readonly<{
  status: UnifiedConnectorStatus;
  context: UnifiedConnectorContext;
  data?: T;
  reason?: string;
}>;

/**
 * Contract only: implementations must delegate to KAZ's existing pipeline.
 * The connector cannot approve itself and cannot bypass Policy or Executor.
 */
export type UnifiedFactoryConnector<TPlan = unknown, TPreview = unknown, TBuild = unknown, TArtifact = unknown> = Readonly<{
  binding: FactoryConnectorBinding;
  analyze(context: UnifiedConnectorContext): Promise<UnifiedConnectorResult<unknown>>;
  plan(context: UnifiedConnectorContext): Promise<UnifiedConnectorResult<TPlan>>;
  preview(context: UnifiedConnectorContext): Promise<UnifiedConnectorResult<TPreview>>;
  apply(context: UnifiedConnectorContext): Promise<UnifiedConnectorResult<unknown>>;
  build(context: UnifiedConnectorContext): Promise<UnifiedConnectorResult<TBuild>>;
  artifact(context: UnifiedConnectorContext): Promise<UnifiedConnectorResult<TArtifact>>;
}>;

export const DEFAULT_FACTORY_CONNECTOR: FactoryConnectorBinding = Object.freeze({
  id: "kaz.unified-factory",
  version: `v${UNIFIED_CONNECTOR_CONTRACT_VERSION}`,
  capabilities: Object.freeze(["analyze", "plan", "preview", "apply", "build", "artifact"] as const),
});

export const BUILTIN_CONNECTORS: readonly FactoryConnectorDefinition[] = Object.freeze([
  Object.freeze({
    id: "github",
    displayName: "GitHub",
    provider: "github",
    icon: "github",
    authMode: "oauth",
    capabilities: Object.freeze(["analyze", "plan", "preview", "apply", "build", "artifact"] as const),
    connectionState: "not_configured",
    ownerApprovalRequired: true,
  }),
  Object.freeze({
    id: "kaz-workspace",
    displayName: "مساحة KAZ",
    provider: "kaz-workspace",
    icon: "workspace",
    authMode: "local",
    capabilities: Object.freeze(["analyze", "plan", "preview", "apply"] as const),
    connectionState: "connected",
    ownerApprovalRequired: true,
  }),
]);

export function listFactoryConnectors(): readonly FactoryConnectorDefinition[] {
  return BUILTIN_CONNECTORS;
}

export function isFactoryConnectorCapability(value: unknown): value is FactoryConnectorCapability {
  return typeof value === "string" && DEFAULT_FACTORY_CONNECTOR.capabilities.includes(value as FactoryConnectorCapability);
}

export function isFactoryConnectorBinding(value: unknown): value is FactoryConnectorBinding {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<FactoryConnectorBinding>;
  return typeof candidate.id === "string"
    && candidate.id.trim().length >= 3
    && typeof candidate.version === "string"
    && candidate.version.trim().length > 0
    && Array.isArray(candidate.capabilities)
    && candidate.capabilities.length > 0
    && candidate.capabilities.every(isFactoryConnectorCapability);
}
