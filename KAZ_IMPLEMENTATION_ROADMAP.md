# KAZ Implementation Roadmap

## مصدر الخطة

الخطة مبنية على أمر KAZ المرفق وعلى الجرد الفعلي في `KAZ_SYSTEM_INVENTORY.md`. التنفيذ متسلسل؛ لا تُفتح قدرة جديدة قبل قبول السابقة بأدلتها. لا Commit أو Push ضمن هذه المرحلة.

## المرحلة 0 — الاكتشاف

الحالة: `VERIFIED` للتقرير المحلي.

الدليل: `KAZ_SYSTEM_INVENTORY.md`، ويتضمن HEAD وGit status وبنية `web/` وAPI/SQLite والاختبارات والتكرار والمخاطر والفجوات.

## بوابة الوثائق بعد الجرد

الحالة: `IMPLEMENTED`.

المخرجات: `KAZ_ARCHITECTURE.md`, `KAZ_FEATURE_MATRIX.md`, `KAZ_IMPLEMENTATION_ROADMAP.md`, `KAZ_TEST_AND_ACCEPTANCE_PLAN.md`.

لا تعني هذه الحالة أن قدرات المرحلة الأولى نُفذت.

## المرحلة 1 — الأساس الآمن

### 1. Typed Factory Request — TESTED جزئيًا

المخرج: عقد TypeScript versioned يحتوي `schemaVersion`, `projectId`, `requestId`, `userIntent`, `requirements`, `constraints`, `targetPlatform`, `acceptanceCriteria`, `buildCommands`, `testCommands`, `inputDigest`.

المنفذ والمثبت: schema validation، مثال typed، رفض الحقول الناقصة، SHA-256 ثابت، كشف العبث، ومحول AgentTask read-only يثبت نطاق `projectId` و`requestId`؛ الأدلة في `KAZ_VERIFICATION_REPORT.md`.

المتبقي قبل الإغلاق الكامل: persistence/API دون كتابة ملفات أو dispatch تلقائي.

### 2. Multi-file Generation — TESTED دون تطبيق

المخرج المثبت: `multiFileGenerator.ts` يولد FilePlan حقيقيًا من 6 ملفات Android مترابطة لا Mock، مع digest وحارس بصمة الطلب.

الحد المثبت: توليد الملفات والتحقق من الترابط نجح. لم يبدأ proposal/approval/apply؛ الكتابة والتطبيق الذري خارج هذه الدورة.

### 3. Approval Integrity — TESTED

المخرج: موافقة مرتبطة بـSHA، single-use، وexpiry.

معيار الإغلاق: approve صحيح مرة واحدة فقط، ورفض SHA القديم والموافقة المنتهية والمكررة.

### 4. Atomic Apply + Snapshot — مغلقة حتى نجاح 3

المخرج: snapshot قبل التطبيق، atomic apply، rollback عند الفشل.

معيار الإغلاق: fault injection في منتصف دفعة يعيد الحالة السابقة دون كتابة جزئية.

### 5. Execution Sandbox — مغلقة حتى نجاح 4

المخرج: عزل ملفات/شبكة/أسرار/ذاكرة حسب حدود KAZ.

معيار الإغلاق: اختبارات traversal وsymlink وnetwork/secret policy وعدم الخروج من مساحة المشروع.

### 6. Planner → Policy → Approval → Executor — مغلقة حتى نجاح 5

المخرج: فصل صريح بين التخطيط والسياسة والموافقة والمنفذ.

معيار الإغلاق: لا يستطيع AgentTask تنفيذ كتابة مباشرة ولا تجاوز Policy.

### 7. Evidence Ledger — مغلقة حتى نجاح 6

المخرج: سلسلة دائمة من الطلب إلى المنتج.

معيار الإغلاق: كل مرحلة لها event مرتبط بـrequestId وprojectId وdigest وحالة ودليل.

### 8. verification.json — مغلقة حتى نجاح 7

المخرج: ملف يربط projectId وrequestId وcommitSha وtestResults وartifactSHA.

معيار الإغلاق: schema صالح وملف محفوظ حتى عند فشل compile/build، مع فشل واضح عند نقص دليل جوهري.

### 9. Recovery Manager — مغلقة بعد نجاح 8

المخرج: snapshots وrollback موثق وكشف partial apply.

معيار الإغلاق: استعادة اختبارية بعد فشل منتصف التطبيق وإظهار الحالة النهائية الصحيحة.

### 10. Task Recovery + Idempotency — TESTED

المخرج: استئناف بعد restart ومنع التكرار.

معيار الإغلاق: إعادة نفس request لا تنشئ dispatch أو apply مكررًا، والاستئناف يعيد الحالة من SQLite.

### 11. Emergency Stop — NOT_STARTED حتى مراجعة القدرة 10

المخرج: زر/عقد إيقاف مركزي للأدوات والشبكة والبناء.

معيار الإغلاق: إيقاف task قيد التنفيذ وتسجيل السبب ومنع الاستئناف غير المصرح.

### 12. Prompt Injection Defense — مغلقة بعد نجاح 11

المخرج: دفاع عند حدود الأدوات والصلاحيات.

معيار الإغلاق: محتوى مصدر غير موثوق لا يستطيع تغيير policy أو تنفيذ أداة حساسة. تحقق ذلك باختبار Runtime فعلي.

## ما بعد المرحلة الأولى

- P2: العقل الذكي المركزي والمهندس الذكي.
- P3: مصنع التطبيقات الشامل واستوديو التصميم.
- P4: البحث التقني والذاكرة الهندسية.
- P5: الذكاء الاصطناعي المتعدد والاختبار الذاتي.
- P6: الإصلاح والاستعادة والبناء والتسليم.
- P7: الأمان والخصوصية ومركز التحكم الموحد.

لا يبدأ أي محور P2-P7 قبل تقرير تحقق يثبت إغلاق القدرات الـ12 الأساسية.

## نقطة التوقف الحالية

نقطة التوقف بعد هذه الدورة: ربط `AgentTask` بمخرج Typed Factory Request للقراءة والتحقق فقط تم اختباره. لم تبدأ persistence/API أو Multi-file Generation أو أي تشغيل للمصنع. لا تعديل على Android، ولا Voice/Embeddings/PWA.


## Addendum — 2026-10-30 — P1.5 Atomic Apply + Snapshot

تم إغلاق القدرة الرابعة كـ`TESTED`: Snapshot حقيقي قبل التطبيق، كتابة ذرية لكل ملف، وrollback كامل مثبت بفشل نظام ملفات حقيقي في منتصف العملية. كما تم تصحيح ربط الموافقة بـ`TypedFactoryRequest.inputDigest` واختباره. القدرة الخامسة Execution Sandbox ما زالت `NOT_STARTED` وتحتاج مراجعة مستقلة قبل فتحها.

## Addendum — P1.6 Execution Sandbox — 2026-10-30

أُغلقت القدرة الخامسة كـ`TESTED`: تنفيذ فعلي داخل Mount/Network/PID namespace و`chroot` محدود، مع filesystem isolation وnetwork isolation وsecret isolation وحدود timeout/memory/CPU. اختبار Runtime حاول قراءة ملف نظام واتصالًا شبكيًا وأثبت الرفض، ثم أثبت timeout فعليًا. القدرة السادسة Planner → Policy → Approval → Executor لم تبدأ.

## Correction — P1.6 Rootless Bubblewrap — 2026-10-30

أعيد بناء القدرة الخامسة بعد الرفض الأمني السابق. Backend المعتمد الآن هو `bubblewrap-rootless` فقط؛ لا `sudo`، لا `chroot` مخصص، ولا fallback. الحالة `TESTED` في Sandbox الحالي بعد إثبات `curl` و`cat /etc/passwd` وClear Env وtimeout monotonic ورفض Backend مفقود. شرط الإنتاج المتبقي هو توفير bwrap وRootless User Namespace في Runtime الإنتاج. القدرة السادسة لم تبدأ.

## Addendum — P1.7 Planner → Policy → Approval → Executor — 2026-10-30

أُغلقت القدرة السادسة كـ`TESTED`. أضيف فصل typed بين Planner وPolicy وApproval وExecutor، مع شاهد موافقة opaque أحادي الاستخدام. الاختبار أثبت أن Planner لا يكتب، وأن المسار خارج النطاق يُرفض، وأن شاهدًا مزورًا لا يصل إلى الكتابة، وأن التنفيذ ينجح فقط بعد موافقة SHA/inputDigest الفعلية. لم تبدأ القدرة السابعة Evidence Ledger.


## P1.8 — verification.json الموحد

أُغلقت القدرة الثامنة بعد إضافة المولّد واختبار الإنشاء والرفض المغلق، وتحديث Workflow بحقوق التحقق الموحدة. لا انتقال إلى P1.9 Recovery Manager ضمن هذه المرحلة.

## تحديث P1.9 — Recovery Manager
أُغلقت القدرة التاسعة بعد إضافة Recovery Manager مستقل يعتمد على Snapshot الدائم وJournal حالات التطبيق، وربطه بمسار API الاستعادة وتسجيل rollback في Evidence Ledger. تمت مراجعة القدرة التاسعة ثم أُغلقت القدرة العاشرة في قسم P1.10 أدناه.


## P1.10 — Task Recovery + Idempotency — CLOSED

تم تنفيذ التخزين الدائم للمهمة، idempotency key، checkpoints، واستئناف المهام `IN_PROGRESS` بعد إعادة التشغيل. تم إثبات الإكمال الكامل وعدم التكرار واكتشاف تعذر الاستئناف. لا انتقال إلى Emergency Stop ضمن هذه المرحلة.


## P1.11 — Emergency Stop — 2026-10-30

أُغلقت القدرة الحادية عشرة بالاختبار الفعلي. نقطة التوقف المركزية تمنع Executor وExecution Sandbox، وتوقف المهام `IN_PROGRESS` إلى `PAUSED` في SQLite. بوابة الانتقال إلى P1.12 غير مفتوحة حتى يصدر اعتماد مستقل.

## إغلاق P1.12 — Prompt Injection Defense

أُغلقت القدرة الأخيرة في P1 بعد إضافة فصل البيانات غير الموثوقة وتطهيرها وربطها بحدود الوكيل والسياسة. لا توجد قدرة تالية مفتوحة في هذا التسلسل قبل مراجعة المالك.
