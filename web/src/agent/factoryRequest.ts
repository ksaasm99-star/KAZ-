export const FACTORY_REQUEST_SCHEMA_VERSION = 1 as const;

import { isFactoryTargetPlatformRegistered, type FactoryTargetPlatform } from "./factoryProjectTypes";
import { DEFAULT_FACTORY_CONNECTOR, isFactoryConnectorBinding, type FactoryConnectorBinding } from "./unifiedConnector";

export type { FactoryTargetPlatform } from "./factoryProjectTypes";

export type TypedFactoryRequestInput = {
  projectId: string;
  requestId: string;
  traceId?: string;
  userIntent: string;
  appName?: string;
  description?: string;
  audience?: string;
  screens?: string[];
  coreFeatures?: string[];
  dataModels?: string[];
  storage?: string;
  dependencies?: string[];
  securityPrivacy?: string[];
  requirements: string[];
  constraints: string[];
  targetPlatform: FactoryTargetPlatform;
  connector?: FactoryConnectorBinding;
  acceptanceCriteria: string[];
  buildCommands: string[];
  testCommands: string[];
};

export type TypedFactoryRequest = TypedFactoryRequestInput & {
  schemaVersion: typeof FACTORY_REQUEST_SCHEMA_VERSION;
  connector: FactoryConnectorBinding;
  traceId: string;
  appName: string;
  description: string;
  audience: string;
  screens: string[];
  coreFeatures: string[];
  dataModels: string[];
  storage: string;
  dependencies: string[];
  securityPrivacy: string[];
  inputDigest: string;
  createdAt: string;
};

export type FactoryRequestValidationResult =
  | { valid: true }
  | { valid: false; errors: string[] };

function requireText(value: unknown, field: string, errors: string[], minimum = 1): value is string {
  if (typeof value !== "string" || value.trim().length < minimum) {
    errors.push(`${field} مطلوب بطول لا يقل عن ${minimum}.`);
    return false;
  }
  return true;
}

function requireTextList(value: unknown, field: string, errors: string[]): value is string[] {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string" || item.trim().length === 0)) {
    errors.push(`${field} يجب أن تكون مصفوفة نصوص غير فارغة.`);
    return false;
  }
  return true;
}

function normalizedList(value: string[] | undefined, fallback: string[]): string[] {
  return (value?.length ? value : fallback).map((item) => item.trim()).filter(Boolean);
}

function canonicalInput(input: TypedFactoryRequestInput): string {
  return JSON.stringify({
    projectId: input.projectId.trim(),
    requestId: input.requestId.trim(),
    traceId: (input.traceId ?? input.requestId).trim(),
    userIntent: input.userIntent.trim(),
    appName: (input.appName ?? input.projectId).trim(),
    description: (input.description ?? input.userIntent).trim(),
    audience: (input.audience ?? "غير محدد").trim(),
    screens: normalizedList(input.screens, ["غير محددة"]),
    coreFeatures: normalizedList(input.coreFeatures, input.requirements),
    dataModels: normalizedList(input.dataModels, []),
    storage: (input.storage ?? "يحدد بعد تحليل المشروع").trim(),
    dependencies: normalizedList(input.dependencies, []),
    securityPrivacy: normalizedList(input.securityPrivacy, input.constraints),
    requirements: input.requirements.map((item) => item.trim()),
    constraints: input.constraints.map((item) => item.trim()),
    targetPlatform: input.targetPlatform,
    connector: input.connector ?? DEFAULT_FACTORY_CONNECTOR,
    acceptanceCriteria: input.acceptanceCriteria.map((item) => item.trim()),
    buildCommands: input.buildCommands.map((item) => item.trim()),
    testCommands: input.testCommands.map((item) => item.trim()),
  });
}

type TextEncoderRuntime = new () => { encode(input: string): Uint8Array };
type CryptoRuntime = { subtle: { digest(algorithm: string, data: Uint8Array): Promise<ArrayBuffer> } };

export async function computeFactoryInputDigest(input: TypedFactoryRequestInput): Promise<string> {
  const runtime = globalThis as typeof globalThis & { TextEncoder: TextEncoderRuntime; crypto: CryptoRuntime };
  const bytes = new runtime.TextEncoder().encode(canonicalInput(input));
  const digest = await runtime.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function validateTypedFactoryRequest(request: unknown, projectTypesConfig?: string): FactoryRequestValidationResult {
  const errors: string[] = [];
  if (!request || typeof request !== "object") return { valid: false, errors: ["الطلب typed مطلوب."] };
  const value = request as Partial<TypedFactoryRequest>;

  if (value.schemaVersion !== FACTORY_REQUEST_SCHEMA_VERSION) errors.push("schemaVersion غير مدعوم.");
  requireText(value.projectId, "projectId", errors, 2);
  requireText(value.requestId, "requestId", errors, 2);
  requireText(value.userIntent, "userIntent", errors, 2);
  requireTextList(value.requirements, "requirements", errors);
  requireTextList(value.constraints, "constraints", errors);
  if (!isFactoryTargetPlatformRegistered(value.targetPlatform, projectTypesConfig)) errors.push("targetPlatform غير مسجل في Factory Project Type Registry.");
  if (!isFactoryConnectorBinding(value.connector)) errors.push("connector غير صالح أو لا يحتوي على capabilities مسجلة.");
  requireText(value.traceId ?? value.requestId, "traceId", errors, 2);
  requireText(value.appName, "appName", errors, 2);
  requireText(value.description, "description", errors, 2);
  requireText(value.audience, "audience", errors, 2);
  requireTextList(value.screens, "screens", errors);
  requireTextList(value.coreFeatures, "coreFeatures", errors);
  if (!Array.isArray(value.dataModels) || value.dataModels.some((item) => typeof item !== "string" || item.trim().length === 0)) errors.push("dataModels يجب أن تكون مصفوفة نصوص أو فارغة.");
  requireText(value.storage, "storage", errors, 2);
  if (!Array.isArray(value.dependencies) || value.dependencies.some((item) => typeof item !== "string" || item.trim().length === 0)) errors.push("dependencies يجب أن تكون مصفوفة نصوص أو فارغة.");
  requireTextList(value.securityPrivacy, "securityPrivacy", errors);
  requireTextList(value.acceptanceCriteria, "acceptanceCriteria", errors);
  requireTextList(value.buildCommands, "buildCommands", errors);
  requireTextList(value.testCommands, "testCommands", errors);
  if (!/^sha256:[a-f0-9]{64}$/.test(value.inputDigest ?? "")) errors.push("inputDigest يجب أن يكون SHA-256 بصيغة sha256:<64 hex>. ");
  requireText(value.createdAt, "createdAt", errors, 10);

  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

export async function createTypedFactoryRequest(input: TypedFactoryRequestInput, createdAt = new Date().toISOString(), projectTypesConfig?: string): Promise<TypedFactoryRequest> {
  const normalized: TypedFactoryRequestInput & {
    traceId: string;
    appName: string;
    description: string;
    audience: string;
    screens: string[];
    coreFeatures: string[];
    dataModels: string[];
    storage: string;
    dependencies: string[];
    securityPrivacy: string[];
    connector: FactoryConnectorBinding;
  } = {
    projectId: input.projectId.trim(),
    requestId: input.requestId.trim(),
    traceId: (input.traceId ?? input.requestId).trim(),
    userIntent: input.userIntent.trim(),
    appName: (input.appName ?? input.projectId).trim(),
    description: (input.description ?? input.userIntent).trim(),
    audience: (input.audience ?? "غير محدد").trim(),
    screens: normalizedList(input.screens, ["غير محددة"]),
    coreFeatures: normalizedList(input.coreFeatures, input.requirements),
    dataModels: normalizedList(input.dataModels, []),
    storage: (input.storage ?? "يحدد بعد تحليل المشروع").trim(),
    dependencies: normalizedList(input.dependencies, []),
    securityPrivacy: normalizedList(input.securityPrivacy, input.constraints),
    requirements: input.requirements.map((item) => item.trim()),
    constraints: input.constraints.map((item) => item.trim()),
    targetPlatform: input.targetPlatform,
    connector: input.connector ?? DEFAULT_FACTORY_CONNECTOR,
    acceptanceCriteria: input.acceptanceCriteria.map((item) => item.trim()),
    buildCommands: input.buildCommands.map((item) => item.trim()),
    testCommands: input.testCommands.map((item) => item.trim()),
  };
  const inputDigest = await computeFactoryInputDigest(normalized);
  const request: TypedFactoryRequest = { ...normalized, schemaVersion: FACTORY_REQUEST_SCHEMA_VERSION, inputDigest: `sha256:${inputDigest}`, createdAt };
  const validation = validateTypedFactoryRequest(request, projectTypesConfig);
  if (!validation.valid) throw new Error(`Typed Factory Request غير صالح: ${validation.errors.join(" ")}`);
  return request;
}

export async function verifyFactoryInputDigest(request: TypedFactoryRequest): Promise<boolean> {
  const expected = `sha256:${await computeFactoryInputDigest(request)}`;
  return expected === request.inputDigest;
}
