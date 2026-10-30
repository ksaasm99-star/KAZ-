export type FactoryTargetPlatform = string & {};

export type FactoryProjectTypeDefinition = Readonly<{
  id: string;
  displayName: string;
  targetPlatform: FactoryTargetPlatform;
  defaultBuildCommands: readonly string[];
  defaultTestCommands: readonly string[];
  allowedWritePrefixes: readonly string[];
}>;

const BUILTIN_PROJECT_TYPES: readonly FactoryProjectTypeDefinition[] = Object.freeze([
  Object.freeze({ id: "android", displayName: "Android", targetPlatform: "android", defaultBuildCommands: ["./gradlew assembleDebug"], defaultTestCommands: ["./gradlew test"], allowedWritePrefixes: ["android/"] }),
  Object.freeze({ id: "web", displayName: "Web", targetPlatform: "web", defaultBuildCommands: ["pnpm run build"], defaultTestCommands: ["pnpm run check"], allowedWritePrefixes: ["web/"] }),
  Object.freeze({ id: "cli", displayName: "CLI", targetPlatform: "cli", defaultBuildCommands: ["pnpm run build"], defaultTestCommands: ["pnpm run check"], allowedWritePrefixes: ["cli/"] }),
  Object.freeze({ id: "hybrid", displayName: "Hybrid", targetPlatform: "hybrid", defaultBuildCommands: [], defaultTestCommands: [], allowedWritePrefixes: ["android/", "web/", "cli/"] }),
]);

const PLATFORM_ID = /^[a-z][a-z0-9_-]{1,31}$/;

export type FactoryFilePlanAction = "create" | "modify" | "inspect";

export type FactoryFilePlanEntry = Readonly<{
  path: string;
  action: FactoryFilePlanAction;
  purpose: string;
  reason: string;
}>;

export type FactoryFilePlan = Readonly<{
  schemaVersion: 1;
  targetPlatform: FactoryTargetPlatform;
  entries: readonly FactoryFilePlanEntry[];
}>;

function isDefinition(value: unknown): value is FactoryProjectTypeDefinition {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<FactoryProjectTypeDefinition>;
  return typeof item.id === "string" && PLATFORM_ID.test(item.id)
    && typeof item.displayName === "string" && item.displayName.trim().length > 0
    && typeof item.targetPlatform === "string" && PLATFORM_ID.test(item.targetPlatform)
    && Array.isArray(item.defaultBuildCommands) && item.defaultBuildCommands.every((command) => typeof command === "string" && command.trim().length > 0)
    && Array.isArray(item.defaultTestCommands) && item.defaultTestCommands.every((command) => typeof command === "string" && command.trim().length > 0)
    && Array.isArray(item.allowedWritePrefixes) && item.allowedWritePrefixes.every((prefix) => typeof prefix === "string" && prefix.trim().length > 0);
}

export function getFactoryProjectTypes(configJson?: string): readonly FactoryProjectTypeDefinition[] {
  const configured: unknown[] = [];
  if (configJson?.trim()) {
    try {
      const parsed = JSON.parse(configJson) as unknown;
      if (Array.isArray(parsed)) configured.push(...parsed);
    } catch {
      // Invalid optional config is ignored; built-ins remain the safe default.
    }
  }
  const byId = new Map(BUILTIN_PROJECT_TYPES.map((definition) => [definition.id, definition]));
  for (const candidate of configured) {
    if (!isDefinition(candidate)) continue;
    const definition: FactoryProjectTypeDefinition = Object.freeze({
      id: candidate.id,
      displayName: candidate.displayName.trim(),
      targetPlatform: candidate.targetPlatform,
      defaultBuildCommands: Object.freeze(candidate.defaultBuildCommands.map((command) => command.trim())),
      defaultTestCommands: Object.freeze(candidate.defaultTestCommands.map((command) => command.trim())),
      allowedWritePrefixes: Object.freeze(candidate.allowedWritePrefixes.map((prefix) => prefix.trim())),
    });
    byId.set(definition.id, definition);
  }
  return Object.freeze([...byId.values()]);
}

export function isFactoryTargetPlatformRegistered(targetPlatform: unknown, configJson?: string): targetPlatform is FactoryTargetPlatform {
  return typeof targetPlatform === "string" && getFactoryProjectTypes(configJson).some((definition) => definition.targetPlatform === targetPlatform);
}

function normalizePlanPath(value: string): string | null {
  const portable = value.trim().replaceAll("\\", "/");
  if (!portable || portable.includes("\0") || portable.startsWith("/") || /^[a-zA-Z]:\//.test(portable)) return null;
  const segments = portable.split("/").filter(Boolean);
  if (segments.some((segment) => segment === ".." || segment === ".")) return null;
  return segments.join("/");
}

function isWithinPrefix(filePath: string, prefix: string): boolean {
  const normalizedPrefix = prefix.trim().replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
  return normalizedPrefix.length > 0 && (filePath === normalizedPrefix || filePath.startsWith(`${normalizedPrefix}/`));
}

export function validateFactoryFilePlan(plan: unknown, configJson?: string): { valid: true } | { valid: false; errors: string[] } {
  const errors: string[] = [];
  if (!plan || typeof plan !== "object") return { valid: false, errors: ["File Plan مطلوب."] };
  const value = plan as Partial<FactoryFilePlan>;
  const definition = getFactoryProjectTypes(configJson).find((item) => item.targetPlatform === value.targetPlatform);
  if (!definition) errors.push("targetPlatform غير مسجل في Factory Project Type Registry.");
  if (value.schemaVersion !== 1) errors.push("schemaVersion غير مدعوم.");
  if (!Array.isArray(value.entries) || value.entries.length === 0) {
    errors.push("File Plan يجب أن يحتوي على entries غير فارغة.");
    return { valid: false, errors };
  }
  const seen = new Set<string>();
  for (const entry of value.entries) {
    if (!entry || typeof entry !== "object") {
      errors.push("كل File Plan entry يجب أن تكون كائنًا.");
      continue;
    }
    const item = entry as Partial<FactoryFilePlanEntry>;
    if (item.action !== "create" && item.action !== "modify" && item.action !== "inspect") errors.push("action غير مدعوم في File Plan.");
    const normalizedPath = typeof item.path === "string" ? normalizePlanPath(item.path) : null;
    if (!normalizedPath) {
      errors.push("مسار File Plan غير آمن.");
      continue;
    }
    if (seen.has(normalizedPath)) errors.push("لا يسمح بتكرار مسار File Plan.");
    seen.add(normalizedPath);
    if (definition && !definition.allowedWritePrefixes.some((prefix) => isWithinPrefix(normalizedPath, prefix))) errors.push("مسار File Plan خارج نطاق الكتابة المسموح.");
    if (typeof item.purpose !== "string" || item.purpose.trim().length === 0) errors.push("purpose مطلوب في File Plan.");
    if (typeof item.reason !== "string" || item.reason.trim().length === 0) errors.push("reason مطلوب في File Plan.");
  }
  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}
