# KAZ Local-First

## القرار

KAZ هو Private AI Engineering OS محلي لمستخدم واحد هو المالك. يعمل افتراضيًا دون مفاتيح API أو خدمات سحابية، ويحفظ بيانات المشاريع والذاكرة والأدلة محليًا عبر SQLite. Ollama هو مزود الذكاء الافتراضي الوحيد.

الإعداد الأساسي هو:

```dotenv
KAZ_DEFAULT_PROVIDER=ollama
KAZ_API_ENABLED=false
KAZ_OLLAMA_HOST=http://127.0.0.1:11434
```

غياب Ollama لا يمنع تثبيت Web، لكنه يجعل المزود المحلي `BLOCKED` أو `degraded` حتى تعمل الخدمة ويكون النموذج مثبتًا. لا يوجد تحويل صامت إلى Gemini أو أي مزود سحابي.

## مستخدم واحد

لا يحتوي KAZ على multi-user أو accounts أو login flow داخل هذا القرار. يوجد Bearer token واحد للمالك لحماية المسارات الحساسة، ويُحفظ محليًا في `.env` وفي إعدادات المتصفح عند الحاجة. هذا ليس نظام حسابات؛ هو حماية تشغيلية لمالك النسخة المحلية.

## Gemini الاختياري

ملف `server/geminiProvider.ts` يبقى موجودًا للتوسع المستقبلي، لكنه معطل افتراضيًا عبر:

```dotenv
KAZ_ENABLE_GEMINI=false
```

عند تعطيله، يعيد `getProvider("gemini")` قيمة `null`، وتفشل أي محاولة صريحة لاختيار Gemini بأمان دون اتصال أو fallback صامت. عند الحاجة المستقبلية، فعّل المسار صراحةً في `.env` المحلي:

```dotenv
KAZ_ENABLE_GEMINI=true
KAZ_API_ENABLED=true
GEMINI_API_KEY=ضع_المفتاح_محليًا_فقط
GEMINI_MODEL=gemini-2.5-flash
```

لا تُرسل المفتاح إلى Git أو الواجهة أو Evidence Ledger. بعد التفعيل يجب اجتياز فحوص المزود الحقيقي قبل اعتباره متاحًا.

## Health

يعرض `GET /api/health` حالة النواة المحلية وقائمة المزودات. تظهر قاعدة البيانات وEvidence Ledger وauth كعناصر مطلوبة. يظهر Ollama `healthy` عند توفره و`degraded` عند غيابه. يظهر Gemini `disabled` عندما يكون العلم معطلًا، و`degraded` عند تفعيله دون توفره.

## حدود التحقق

هذا القرار لا يثبت أن Ollama مثبت أو أن نموذجًا محليًا تم تنزيله على كل جهاز. يثبت فقط أن التوجيه الافتراضي Fail-Closed، وأن تثبيت KAZ لا يحتاج Gemini، وأن حالة المزودات تُعرض بوضوح.
