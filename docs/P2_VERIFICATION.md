# KAZ P2 Verification

**تاريخ التحقق:** 2026-10-30 09:13 +03:00  
**النطاق:** تحقق P2 فقط، دون بدء P3 ودون تعديل Android.  
**الحالة العامة:** `VERIFIED_WITH_BLOCKED_OPTIONAL`

## المبادئ الخمسة

| المبدأ | الدليل الفعلي | الحالة | الحدود |
|---|---|---|---|
| قابل للتوسع | `provider-gateway.test.mjs` سجّل مزودًا تجريبيًا عبر `registerProvider` دون تعديل Provider Gateway؛ `providerRegistry` و`health` و`LLMProvider` مفصولة | PARTIAL | إضافة check جديد إلى Health تحتاج تعديل health.ts؛ لم يُثبت حرفيًا دون تعديل الكود |
| قابل للتعديل | `local-first.test.mjs` أثبت تغيير `KAZ_DEFAULT_PROVIDER=ollama` ورفض Gemini عند `KAZ_ENABLE_GEMINI=false`؛ `KAZ_FORCE_PROVIDER` يعمل في provider gateway | PARTIAL | مسار Gemini المفعّل لم يُختبر بخدمة/مفتاح حقيقي؛ لا توجد لقطة شاشة للـ`.env` لأن ذلك قد يكشف أسرارًا |
| قابل للبناء من الصفر | `./install.sh` فعليًا: exit 0، Node/pnpm check، install، test؛ `install-from-scratch.test.mjs` PASS؛ token generation موجود | PARTIAL | لم يُحذف `.env/.data/node_modules` من النسخة الرسمية؛ لذلك اختبار pristine destructive NOT_RUN. النتيجة 28 PASS و1 BLOCKED لا 28 PASS فقط |
| قابل للاكتشاف | `/api/health` HTTP 200 يعيد 6 checks: database, ollama, gemini, evidence_ledger, auth, providers؛ `/diagnostics` HTTP 200؛ Error Catalog وObservability PASS | PARTIAL | عقد الأخطاء المثبت الحالي يستخدم `error` مع `message/traceId/hint/timestamp`؛ لم يُثبت حقل `code` بالاسم المطلوب في كل استجابة |
| يطور نفسه / الاستعداد | الملفات موزعة إلى provider registry/router/health/tests/docs، وكل مسار رئيسي له اختبار؛ regression ثابت مرتين | PARTIAL | لا يوجد اختبار مستقل يثبت rollback لكل تعديل توثيقي أو كل مسار مستقبلي |

## مصفوفة regression

كل صف شُغّل بالتتابع، وليس بالتوازي، لحماية SQLite وعمليات Vite. `EXIT=0` تعني نجاح الأمر. `BLOCKED` لا يمثل فشلًا: اختبار Gemini الحقيقي اختياري ويتطلب مفتاحًا غير موجود.

| الأمر | تشغيل 1 | تشغيل 2 | النتيجة |
|---|---:|---:|---|
| `pnpm run check` | EXIT 0 | EXIT 0 | PASS |
| `pnpm run build` | EXIT 0، built 1.32s | EXIT 0، built 1.39s | PASS |
| `pnpm test` | EXIT 0، 28/1/0 | EXIT 0، 28/1/0 | PASS + BLOCKED optional |
| `./install.sh` | EXIT 0 | — | PASS + BLOCKED optional |
| `pnpm test:auth` | EXIT 0 | EXIT 0 | PASS |
| `pnpm test:factory-payload` | EXIT 0 | EXIT 0 | PASS |
| `pnpm test:provider-gateway` | EXIT 0 | EXIT 0 | PASS |
| `pnpm test:observability` | EXIT 0 | EXIT 0 | PASS |
| `pnpm test:install-from-scratch` | EXIT 0 | EXIT 0 | PASS |
| `pnpm test:local-first` | EXIT 0 | EXIT 0 | PASS |
| `pnpm test:approval-integrity` | EXIT 0 | EXIT 0 | PASS |
| `pnpm test:atomic-apply` | EXIT 0 | EXIT 0 | PASS |
| `pnpm test:evidence-ledger` | EXIT 0 | EXIT 0 | PASS |
| `pnpm test:emergency-stop` | EXIT 0 | EXIT 0 | PASS |
| `pnpm test:prompt-defense` | EXIT 0 | EXIT 0 | PASS |
| `git diff --check` | EXIT 0 | EXIT 0 | PASS |

**Full test output:** `TEST_SUMMARY=PASS=28;BLOCKED=1;FAIL=0` في التشغيلين.

## Health وDiagnostics

التحقق الفعلي عبر HTTP:

```text
GET /api/health       HTTP 200
HEALTH_STATUS=healthy
DEFAULT_PROVIDER=ollama
AVAILABLE_PROVIDERS=ollama
OLLAMA_STATUS=degraded
GEMINI_STATUS=disabled
GEMINI_CONFIGURED=False
GET /diagnostics      HTTP 200
```

`OLLAMA_STATUS=degraded` لأن Ollama غير مثبت في بيئة التحقق، وليس لأن التوجيه يحاول مزودًا آخر. Gemini `disabled` وفق سياسة Local-First.

## تفسير BLOCKED

`factory-intelligence.test.mjs` يرفض التشغيل عمدًا عند غياب `KAZ_API_ENABLED=true` و`GEMINI_API_KEY`. لم يتم إنشاء مفتاح وهمي، ولم يتم تخفيف الاختبار، ولم يحدث اتصال Gemini. هذا يثبت السلوك Fail-Closed لكنه يمنع إعلان تحقق Gemini الحقيقي.

## مصدر السجلات

السجلات الكاملة محفوظة مؤقتًا أثناء التحقق تحت `/tmp/kaz-p26/`، وسجل الحالة الدائم في `KAZ_WEB_CONTINUITY.md`. لم يحدث Commit أو Push.
