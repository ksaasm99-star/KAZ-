# KAZ P3 Readiness

## الحكم

KAZ جاهز مبدئيًا لفتح مراجعة P3 من ناحية الأساس المحلي والحوكمة، لكنه ليس تفويضًا لبدء P3. يلزم توقيع المالك على `docs/P2_ACCEPTANCE.md` أولًا.

## الجاهز

- App Factory pipeline موجود ومربوط بطلبات typed وpayload metadata-only.
- Provider Gateway موحد، مع Ollama افتراضيًا وGemini Fail-Closed.
- Bearer owner token يحمي المسارات الحساسة ويسجل الرفض في Evidence Ledger.
- Evidence Ledger وhash chain وverification وrecovery وemergency stop مثبتة باختبارات.
- Sandbox rootless عبر bubblewrap مع network/filesystem/secrets/timeout checks.
- Health وDiagnostics وError Catalog موجودة وقابلة للاكتشاف.
- `install.sh` وREADME وBUILD_FROM_SCRATCH يوثقان إعادة البناء.

## المتبقي قبل أو أثناء P3

- تشغيل Ollama حقيقيًا وتنزيل نموذج Q4_K_M والتحقق من أول token، إذا كان مطلوبًا على الجهاز المستهدف.
- توحيد Approval Gateway النهائي حول مسار App Factory قبل أي تنفيذ إنتاجي واسع، إن أظهرت المراجعة أن بعض المسارات القديمة ما زالت منفصلة.
- تحديد معيار artifact النهائي: APK فعلي، build backend، provenance، SHA-256، وتثبيت/تشغيل Android.
- فحص بصري يدوي للواجهة وRTL والتفاعل على أحجام شاشة متعددة.
- إغلاق حدود P2 الاختيارية إذا أصبحت مطلوبة: Gemini الحقيقي، pristine destructive run على نسخة معزولة، وHealth contract field `code` إن اعتمد رسميًا.

## قرارات المالك المطلوبة

1. توقيع `P2_ACCEPTANCE.md` وفتح P3 صراحةً.
2. تحديد جهاز/بيئة Ollama المستهدفة والنموذج المحلي المطلوب.
3. تحديد هل P3 يثبت APK فعليًا أم يثبت pipeline فقط في أول دفعة.
4. تحديد أولوية اختبار Android مقابل تحسين Web UI/RTL.
5. الإبقاء على Gemini معطلًا، أو تفويض اختبار تفعيله بمفتاح حقيقي محليًا.

## المخاطر المتوقعة في P3

- اختلاف البيئة بين Ollama المحلي وAndroid أو جهاز البناء.
- فجوة بين نجاح pipeline ونجاح APK runtime الفعلي.
- حجم/ذاكرة النموذج المحلي وزمن الاستدلال.
- أي مسار Factory قد يكتب ملفات خارج سياسة workspace إذا لم يُمرر عبر Executor الموحد.
- الحاجة إلى اختبار artifact provenance وعدم الاعتماد على build قديم.

## مدة تقديرية

التقدير الأولي لدفعة P3 هو 3–4 أسابيع، لكنه تقدير تخطيطي وليس نتيجة قياس أو التزام زمني. يعتمد على توفر Ollama/Android environment وحسم نطاق APK.

## قاعدة البدء

لا يبدأ P3 قبل مراجعة هذا الملف و`P2_ACCEPTANCE.md` وتوقيع المالك. لا يُعد وجود هذا التقرير أو نجاح الاختبارات تفويضًا تلقائيًا للمرحلة التالية.
