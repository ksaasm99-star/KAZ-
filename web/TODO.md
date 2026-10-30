

## P4.2 — المحادثة والصوت وحارس الهوية

- [x] المحادثة العامة تدعم `inputMode=text|voice` عبر عقد API واحد.
- [x] الإدخال الصوتي العربي يستخدم `useSpeechInput` الحقيقي الموجود في Web ويضيف النص إلى نفس محرر الرسالة.
- [x] حارس الهوية يظل على الخادم ويفحص الطلب والرد، مع تبديل الهوية عبر `PUT /api/identity` المحمي بـBearer Token.
- [x] `npx tsc --noEmit` و`npm run build` نجحا.
- [x] HTTP أثبت `BLOCKED/503` عند تعطيل KAZ API و`401 KAZ-AUTH-001` عند محاولة تعديل الهوية دون Token.
- [ ] APK: `BLOCKED`؛ لا يوجد Gradle Wrapper أو Android SDK أو Gradle في بيئة البناء الحالية، كما أن Web P4.2 لم يُدمج بعد داخل حزمة Android.


## P4.3 — المصنع والمعاينة وحالة النماذج

- [x] `KazApiError` يحفظ status/code، لتفريق `BLOCKED` عن الفشل العام.
- [x] معاينة المصنع تعرض حالات التحضير والبناء والتغليف والجاهزية، ولا تعرض رابط APK إلا عند `ready` ورابط فعلي.
- [x] حالة `BLOCKED` تظهر صراحةً في واجهة المصنع مع سبب الخادم، ولا تُشغّل GitHub Actions تلقائيًا.
- [x] شاشة Model Registry تقرأ حالة Ollama الحقيقية والنموذج النشط عبر API للقراءة فقط.
- [x] عند غياب Ollama تعرض الواجهة `BLOCKED — OLLAMA_UNAVAILABLE` بدل نموذج وهمي.
- [x] `npx tsc --noEmit` و`npm run build` و`git diff --check` PASS.
- [ ] APK: BLOCKED في هذه الدفعة؛ فحص المصنع بدون توكن أعاد HTTP 401، وOllama أعاد HTTP 503.


## P4.4 — قبول الجوال وRTL والويب

- [x] Headless Chromium على `390x844` أثبت عرض الصفحة الرئيسية ومساحة المشاريع على الهاتف.
- [x] RTL مثبت: `lang=ar` و`dir=rtl` و`bodyDirection=rtl`، وشريط `.mobile-nav` موجود في مساحة المشاريع.
- [x] جميع المسارات الثمانية المعلنة في `manus-routes.json` أعادت HTTP 200، والـmanifest أعاد HTTP 200.
- [x] `npx tsc --noEmit` و`npm run build` و`git diff --check` PASS.
- [x] `pnpm test`: PASS=29، FAIL=0، BLOCKED=1 لاختبار خارجي اختياري يحتاج مفتاحًا؛ لم يُخفَ كنجاح.
- [x] API status/health/Ollama أعادت الحالات الحقيقية: KAZ API معطل، النواة صحية، Ollama BLOCKED/503 عند الغياب.
- [ ] APK: BLOCKED وخارج نطاق إغلاق Web؛ لم يتم بناء APK أو لمس Android.

الدليل الكامل: `P4_4_VERIFICATION.md`، واللقطات: `evidence/p4-4-mobile-home.png` و`evidence/p4-4-mobile-app.png`.


## P4.5.1 — Unified Connector Contract

- [x] عقد موحد في `src/agent/unifiedConnector.ts` يصف العمليات: analyze, plan, preview, apply, build, artifact.
- [x] قائمة موصلات قابلة للاختيار: `github` و`kaz-workspace`، مع provider وauthMode وconnectionState وownerApprovalRequired.
- [x] `TypedFactoryRequest` يحمل binding الموصل داخل `inputDigest`؛ تغيير الموصل يكسر البصمة ويُرفض.
- [x] لا يوجد تنفيذ خارجي أو موافقة ذاتية داخل العقد؛ التنفيذ يبقى خلف Pipeline الحالي.
- [x] الاختبار المستهدف وTypeScript PASS.
- [ ] اتصال GitHub OAuth أو تشغيل Workflow لم يُنفذ في هذه الدفعة؛ سيأتي بعد اعتماد العقد وربطه بطبقة Backend.
