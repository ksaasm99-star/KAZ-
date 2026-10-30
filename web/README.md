# KAZ Web App

هذا المجلد هو واجهة الويب الرسمية لمشروع KAZ داخل نفس المستودع، مع إبقاء تطبيق Android في الجذر مستقلًا ودون حذف أو استبدال.

## البدء السريع

```bash
git clone https://github.com/ksaasm99-star/KAZ-.git
cd KAZ-
cd web
./install.sh
pnpm dev
```

بعد التشغيل افتح الواجهة المحلية، أو افحص صحة الخادم:

```bash
curl http://localhost:3000/api/health
```

## المتطلبات

- Node.js `>= 20`.
- pnpm `>= 9`؛ يحاول `install.sh` تفعيله عبر Corepack إذا لم يكن موجودًا.
- Ollama اختياري للمزود المحلي فقط؛ غيابه لا يمنع تشغيل Web.
- Python 3 مطلوب فقط لتحديث `.env` تلقائيًا أثناء التثبيت.

## القرار التشغيلي

يعمل KAZ محليًا 100% افتراضيًا لمستخدم واحد هو المالك. Ollama هو المزود الافتراضي الوحيد، ولا يحتاج التشغيل المحلي إلى أي مفتاح API. Gemini موجود كتكامل اختياري متقدم لكنه معطل افتراضيًا عبر `KAZ_ENABLE_GEMINI=false`.

## التقنية

- React + TypeScript + Vite.
- CSS tokens مخصص يدعم العربية وRTL وMobile-first.
- Vite middleware لمسارات API الخادمية الحالية.
- SQLite عبر `server/persistentMemory.ts` كمصدر حقيقة للذاكرة والمشاريع والأرشيف والنماذج والأدلة.
- عقود API typed في `src/memoryApi.ts` قابلة لإعادة الاستخدام لاحقًا مع Android أو Capacitor.

## الإعداد

ينشئ `install.sh` ملف `.env` من `.env.example` إذا لم يكن موجودًا، ثم يولّد `KAZ_OWNER_TOKEN` عشوائيًا بطول آمن. لا تُرسل قيمة token إلى Git أو الواجهة العامة.

| المتغير | الغرض | القيمة الافتراضية/الحالة |
|---|---|---|
| `KAZ_OWNER_TOKEN` | Bearer token للمسارات الحساسة | يولده `install.sh` محليًا |
| `KAZ_API_ENABLED` | تفعيل مسارات الذكاء الخارجي الحساسة | `false` |
| `KAZ_DEFAULT_PROVIDER` | المزود الافتراضي المحلي | `ollama` |
| `KAZ_OLLAMA_HOST` | عنوان Ollama المحلي | `http://127.0.0.1:11434` |
| `KAZ_LOCAL_MODEL_ID` | معرف النموذج المحلي المنطقي | `kaz-local-general-small` |
| `OLLAMA_MODEL` | نموذج Ollama الافتراضي | `llama3.2` |

### Optional / Advanced

| المتغير | الغرض | الحالة الافتراضية |
|---|---|---|
| `KAZ_ENABLE_GEMINI` | تفعيل Gemini للمهام المتقدمة | `false` |
| `GEMINI_API_KEY` | مفتاح Gemini | غير مطلوب محليًا |
| `GEMINI_MODEL` | نموذج Gemini | `gemini-2.5-flash` |
| `KAZ_LLM_MODEL` | نموذج المسارات المتقدمة | فارغ |
| `KAZ_FORCE_PROVIDER` | فرض مزود محدد | فارغ |
| `OLLAMA_BASE_URL` | alias قديم متوافق | استخدم `KAZ_OLLAMA_HOST` |

لتفعيل Gemini مستقبلًا، أضف `KAZ_ENABLE_GEMINI=true` و`GEMINI_API_KEY` في `.env` المحلي فقط. لا تضع المفتاح في Git أو داخل ملفات الواجهة. عند بقاء العلم معطلًا، يعيد سجل المزود `null` لمسارات Gemini بدل الاتصال أو التحويل الصامت.

لتشغيل Ollama محليًا، ثبّته من موقع Ollama الرسمي، شغّل الخدمة، ثم نزّل نموذجًا مثلًا:

```bash
ollama serve
ollama pull llama3.2
```

غياب Ollama أو النموذج لا يمنع تثبيت KAZ؛ يظهر المزود المحلي كـ `BLOCKED` أو `degraded` حتى يصبح متاحًا. يظهر Gemini كـ`disabled` عندما يبقى معطلًا.

## التشغيل

للتطوير:

```bash
pnpm dev
```

لإنشاء نسخة إنتاج محلية ومعاينتها:

```bash
pnpm build
pnpm preview
```

## الاختبارات

يشغّل `pnpm test` فحص TypeScript ثم جميع اختبارات `web/tests/*.test.mjs` بالتتابع. ويمكن تشغيل الاختبارات منفردة:

```bash
pnpm test:auth
pnpm test:observability
pnpm test:provider-gateway
pnpm test:install-from-scratch
pnpm test:emergency-stop
pnpm test:prompt-defense
```

## التحقق من الصحة والتشخيص

```bash
curl http://localhost:3000/api/health
```

افتح `/diagnostics` في المتصفح لمراجعة حالة قاعدة البيانات وOllama وGemini وEvidence Ledger والمزودات، وعرض آخر الأخطاء ذات `traceId`. تكون الحالة العامة `healthy` عندما تكون نواة KAZ (SQLite وEvidence Ledger وauth) سليمة، بينما تبقى حالة Ollama التفصيلية `degraded` إذا لم تتوفر الخدمة، ويظهر Gemini كـ`disabled` عند تعطيله.

## الاستكشاف وإصلاح الأعطال

### فشل `install.sh`

تحقق من أن Node.js إصدار 20 أو أحدث، وأن Python 3 متاح، ثم شغّل `bash -n install.sh` واقرأ أول رسالة `[FAIL]`. بعد إصلاح البيئة أعد تشغيل السكربت؛ هو آمن لإعادة التشغيل ولا يحذف `.env` أو `.data`.

### Ollama لا يعمل

تأكد من تشغيل `ollama serve`، ثم افحص `ollama list`. تشغيل KAZ لا يعتمد على Ollama؛ سيبقى المزود المحلي `BLOCKED` أو `degraded` إلى أن تتوفر الخدمة والنموذج.

### Gemini متاح فقط كخيار متقدم

التشغيل الافتراضي لا يحتاج Gemini. إذا احتجته، فعّل `KAZ_ENABLE_GEMINI=true` و`KAZ_API_ENABLED=true` وضع المفتاح في `.env`. لا يطبع KAZ المفتاح في السجلات، ويبقى المزود `disabled` أو `BLOCKED` عند عدم التفعيل.

### أين السجلات؟

- أخطاء API الأخيرة: `GET /api/diagnostics/errors`.
- لوحة التشخيص: `/diagnostics`.
- Evidence Ledger: SQLite عبر `web/server/persistentMemory.ts`.
- كتالوج الرموز والحلول: `../docs/ERROR_CATALOG.md`.
- سجل استمرارية المشروع: `../KAZ_WEB_CONTINUITY.md`.

## الحالة

الواجهة الحالية تحتوي على الصفحة الرئيسية، مساحة المشاريع، بناء مشروع، محادثة المشروع، الإدخال الصوتي والكتابي، الأرشيف، إدارة النماذج، الإعدادات، معاينة مصنع التطبيقات، والتشخيص. البنود غير المثبتة تبقى معلقة في `TODO.md` ولا تُعد منجزة حتى يثبتها اختبار حقيقي.

## قواعد النطاق

- لا تعديل على تطبيق Android من مهمة واجهة الويب.
- لا تُضاف بيانات وهمية أو أزرار شكلية بدل الوظائف الحقيقية.
- لا تُحفظ الأسرار في ملفات الواجهة أو Git.
- `.env` محلي ومُستثنى من Git؛ استخدم `.env.example` فقط للتوثيق.
- `KAZ_API_ENABLED=false` أو غياب المفاتيح يجب أن يبقى BLOCKED/503.
- كل شاشة جديدة يجب أن تدعم RTL والجوال وتُربط بمصدر بيانات حقيقي أو تُوسم صراحة بأنها غير منفذة.

## Observability

- `GET /api/health` يعيد حالة قاعدة البيانات وOllama وGemini وEvidence Ledger وBearer auth والمزود الافتراضي.
- صفحة `/diagnostics` تعرض الحالة، آخر 20 خطأ من Evidence Ledger، تشغيل فحص جديد ونسخ التقرير.
- الاستجابات الحساسة `401/500/503` تستخدم الصيغة الموحدة `{ error, message, traceId, hint, timestamp }`.
- مرجع الرموز موجود في `../docs/ERROR_CATALOG.md`، واختباره عبر `pnpm test:observability`.
