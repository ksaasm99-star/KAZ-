import { randomUUID } from "node:crypto";

type ErrorDetails = Record<string, unknown> & { message?: string; hint?: string };

type ErrorDefinition = { message: string; hint: string };

const DEFINITIONS: Record<string, ErrorDefinition> = {
  "KAZ-AUTH-001": { message: "المصادقة مطلوبة لهذه العملية.", hint: "أدخل KAZ_OWNER_TOKEN الصحيح في إعدادات KAZ." },
  "KAZ-PROVIDER-001": { message: "مزود الذكاء غير متاح حاليًا.", hint: "افحص /api/health ثم إعدادات Gemini أو Ollama." },
  "KAZ-PROVIDER-002": { message: "النموذج المطلوب غير متاح لدى المزود.", hint: "ثبّت النموذج أو اختر نموذجًا مسجلًا ومتاحًا." },
  "KAZ-FACTORY-001": { message: "تعذر إكمال عملية بناء المشروع.", hint: "راجع تقرير التشخيص وسجل البناء قبل إعادة المحاولة." },
  "KAZ-NETWORK-001": { message: "تعذر الوصول إلى المصدر الخارجي.", hint: "افحص HTTPS وNetworkBroker والموافقة الصريحة." },
  "KAZ-SANDBOX-001": { message: "تعذر تشغيل الأمر داخل العزل الآمن.", hint: "افحص Bubblewrap rootless وحالة العزل." },
  "KAZ-DB-001": { message: "ذاكرة KAZ الدائمة غير متاحة.", hint: "افحص SQLite ومساحة القرص ثم أعد التشغيل." },
  "KAZ-EMERGENCY-001": { message: "التنفيذ متوقف لحماية المشروع.", hint: "راجع سبب إيقاف الطوارئ قبل استئناف التنفيذ." },
  AUTH_REQUIRED: { message: "المصادقة مطلوبة لهذه العملية.", hint: "أدخل KAZ_OWNER_TOKEN الصحيح في إعدادات KAZ." },
};

function definitionFor(code: string, details: ErrorDetails): ErrorDefinition {
  return DEFINITIONS[code] ?? {
    message: typeof details.message === "string" ? details.message : "حدث خطأ غير متوقع في KAZ.",
    hint: typeof details.hint === "string" ? details.hint : "افتح صفحة التشخيص واستخدم traceId لمراجعة السبب.",
  };
}

export function formatError(code: string, traceId = `trace-${randomUUID()}`, details: ErrorDetails = {}) {
  const definition = definitionFor(code, details);
  return {
    error: code,
    message: definition.message,
    traceId,
    hint: definition.hint,
    timestamp: new Date().toISOString(),
  };
}

export function errorCatalogCodes(): string[] {
  return Object.keys(DEFINITIONS);
}
