# KAZ Web — P4.3 Verification

## Scope

ربط واجهة الويب بحالة مصنع التطبيقات والمعاينة المباشرة وحالة Ollama/Model Registry، داخل `web/` فقط. لم يتم تعديل Android، ولم يبدأ APK أو GitHub Actions من هذه الدفعة.

## Implemented

- أضيف `KazApiError` في `src/memoryApi.ts` لحفظ HTTP status وerror code بدل إخفاء سبب الرفض.
- أضيف `loadOllamaUiStatus()`، ويقرأ `/api/ollama/models` و`/api/ollama/active` للقراءة فقط.
- حالة المصنع في `ProjectWorkspaceScreen` تميز `blocked` عن `error`، وتعرض سبب BLOCKED الفعلي.
- معاينة المصنع لا تعرض رابط APK إلا عندما تعيد الحالة الخلفية `ready` ورابطًا فعليًا.
- شاشة إدارة النماذج تعرض عدد نماذج Ollama والنموذج النشط أو سبب BLOCKED، ولا تبدأ تنزيلًا أو تبديلًا تلقائيًا.

## Evidence

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS, exit 0 |
| `npm run build` | PASS, exit 0 |
| `GET /api/ollama/models` | HTTP 503, `{ok:false,status:"BLOCKED",reason:"OLLAMA_UNAVAILABLE"}` |
| `POST /api/factory/build` بدون Bearer Token | HTTP 401, `KAZ-AUTH-001` مع `traceId` |
| `git diff --check` | PASS, exit 0 |

## APK boundary

APK لم يُنتج في P4.3. السبب المثبت: خدمة Ollama غير متاحة، ومسار المصنع محمي ويعيد 401 دون توكن مالك؛ لا يوجد ادعاء نجاح ولا تشغيل خارجي غير مصرح.
