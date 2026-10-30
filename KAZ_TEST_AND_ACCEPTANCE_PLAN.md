# KAZ Test and Acceptance Plan

## قواعد الحالة

`PASS` يعني أن الاختبار نُفذ وحقق معيار القبول. `FAIL` يعني أنه نُفذ وفشل. `NOT_RUN` يعني أنه لم يُنفذ. `BLOCKED` يعني وجود عائق مثبت. لا يتحول `NOT_RUN` أو `BLOCKED` إلى PASS.

## بوابة المرحلة الحالية: Typed Factory Request

| ID | الاختبار | الدليل المطلوب | الحالة قبل التنفيذ |
|---|---|---|---|
| TFR-01 | إنشاء طلب typed صالح | كائن مطابق للعقد وschema version | PASS — `factory-request.test.mjs` |
| TFR-02 | رفض projectId/requestId/userIntent الناقص | خطأ validation واضح | PASS — validation test |
| TFR-03 | رفض targetPlatform غير المدعوم | `VALIDATION_ERROR` موثق | PASS — validation test |
| TFR-04 | قبول acceptanceCriteria/buildCommands/testCommands | schema parse ناجح | PASS — schema test |
| TFR-05 | ثبات inputDigest للمدخل نفسه | digest متطابق في تشغيلين | PASS — SHA-256 contract |
| TFR-06 | اختلاف digest عند تغير المدخل | digest مختلف | PASS — tamper detection |
| TFR-07 | عزل projectId | لا يمكن استخدام طلب مشروع في مشروع آخر | NOT_RUN — تكامل API غير مربوط بعد |
| TFR-08 | persistence/restart | استعادة الطلب من SQLite بعد إعادة التشغيل | NOT_RUN — خارج عقد الواجهة الحالي؛ مطلوب قبل الإغلاق الكامل |
| TFR-09 | لا كتابة ملفات أثناء بناء الطلب | workspace يبقى دون تغيير | PASS — العقد pure والتحقق لا يكتب ملفات |
| TFR-10 | TypeScript | مخرجات `pnpm run check` | PASS — exit 0 |

## اختبارات محول AgentTask — AFR

| ID | الاختبار | الدليل المطلوب | الحالة |
|---|---|---|---|
| AFR-01 | تحويل AgentTask إلى TypedFactoryRequest | `projectId` و`requestId` و`userIntent` مأخوذة من المهمة | PASS — `agent-factory-request.test.mjs` |
| AFR-02 | منع تبديل نطاق المهمة | المحول لا يستقبل `projectId` خارجيًا | PASS — عقد المحول واختبار Runtime |
| AFR-03 | تمرير الناتج إلى حالة الحلقة | `state.factoryRequest` موجود دون كتابة أو dispatch | PASS — `agent-factory-request.test.mjs` |
| AFR-04 | رفض خطة غير صالحة | validation error واضح عند acceptance criteria فارغة | PASS — `agent-factory-request.test.mjs` |
| AFR-05 | تخزين SQLite أو API | استعادة الطلب بعد إعادة التشغيل | NOT_RUN — خارج هذه الدورة |

## اختبارات Multi-file Generation — MFG

| ID | الاختبار | الدليل المطلوب | الحالة |
|---|---|---|---|
| MFG-01 | توليد خطة Android متعددة الملفات | 6 ملفات حقيقية بمحتوى Gradle وManifest وKotlin | PASS — `multi-file-generator.test.mjs` |
| MFG-02 | اتساق package/namespace/entry point | `applicationId` و`namespace` وpackage ومسار MainActivity متطابقة | PASS — Runtime test |
| MFG-03 | منع التلاعب بالطلب | رفض الطلب عند تغير المحتوى بعد inputDigest | PASS — digest guard |
| MFG-04 | عدم الكتابة أثناء التوليد | generator يعيد خطة فقط ولا يطبق على القرص | PASS — no-disk-apply test path |
| MFG-05 | proposal/approval/apply | Diff وموافقة وتطبيق ذري | NOT_RUN — قدرات لاحقة |

## اختبارات الانحدار الموجودة

| الاختبار | الأمر | الحالة السابقة المسجلة |
|---|---|---|
| Agent Runtime | `pnpm run test:agent-runtime` | PASS مسجل في الاستمرارية السابقة |
| TypeScript | `pnpm run check` | PASS مسجل في دورات سابقة |
| Web build | `pnpm run build` | PASS مسجل في دورات سابقة |
| Workspace policy | `node tests/workspace-policy.test.mjs` | PASS مسجل في الاستمرارية السابقة |
| Git diff | `git diff --check` | PASS في مرحلة الجرد الحالية |

النتائج السابقة لا تثبت القدرة الأولى بعد تغييرها؛ يجب إعادة الاختبار بعد تنفيذ العقد.

## معايير قبول المرحلة الأولى الكاملة

1. جميع القدرات الـ12 لها عقد أو تنفيذ حقيقي، لا Mock.
2. الطلب typed وFile Plan وDiff والموافقة والتطبيق والتحقق والبناء مرتبطة بـ`projectId` و`requestId`.
3. SHA والموافقة single-use والexpiry مثبتة باختبار.
4. snapshot وrollback وfault injection ناجحة.
5. العزل يمنع traversal وsymlink والكتابة خارج workspace.
6. evidence ledger دائم وقابل للاستعادة.
7. `verification.json` صالح ويربط commit وtests وartifactSHA.
8. idempotency وtask recovery ناجحان بعد إعادة التشغيل.
9. Emergency Stop يوقف التنفيذ ويسجل الحالة.
10. Prompt Injection Defense يرفض تجاوز policy.
11. TypeScript وbuild واختبارات المسارات المرتبطة ناجحة.
12. RTL والجوال موثقـان باختبار يدوي أو آلي؛ غير المنفذ يبقى NOT_RUN.

## اختبارات لم تُنفذ بعد

- تشغيل GitHub Actions خارجي.
- بناء APK من commit جديد.
- تثبيت وتشغيل APK على emulator/device.
- Gemini runtime مع `KAZ_API_ENABLED=true`.
- اختبار تكامل كامل للمصنع والتعديل.
- اختبارات UI آلية للجوال وRTL.
- تشغيل نموذج محلي فعلي.

## سياسة البيانات التجريبية

تستخدم الاختبارات معرفات `test-<feature>-<timestamp>`، ولا تستخدم بيانات المستخدم الحقيقية. بعد الاختبار يجب حذف أو أرشفة بيانات الاختبار والتحقق من عدم ظهورها في القوائم النشطة أو نتائج البحث.

## بوابة التسليم

لا يُنشأ `KAZ_VERIFICATION_REPORT.md` كإعلان نجاح قبل تنفيذ الاختبارات المرتبطة بالقدرة وتسجيل الأمر ورمز الخروج والدليل. عند وجود اختبار غير منفذ، يظل التقرير `PARTIAL` أو `NOT_RUN` بحسب الحالة.


## اختبارات Approval Integrity — API

| ID | الاختبار | الدليل المطلوب | الحالة |
|---|---|---|---|
| API-01 | رفض SHA المتغير | تغيير الملف الفعلي بعد proposal يؤدي إلى `APPROVAL_SHA_MISMATCH` ولا يكتب المحتوى الجديد | PASS — `approval-integrity.test.mjs` |
| API-02 | single-use | إعادة استخدام نفس `approvalToken` بعد اعتماد ناجح تؤدي إلى `APPROVAL_TOKEN_ALREADY_USED` | PASS — Runtime |
| API-03 | expiry | token منتهي الصلاحية يؤدي إلى `APPROVAL_EXPIRED` دون تطبيق التعديل | PASS — Runtime بمرور وقت فعلي |
| API-04 | ربط الرمز بالمشروع | token من مشروع آخر لا يمر إلى الاعتماد | IMPLEMENTED — مسار projectId محفوظ في Approval |
| API-05 | Atomic Apply / Snapshot | التطبيق الذري وsnapshot وrollback | NOT_RUN — القدرة #4 وخارج هذه المرحلة |


## اختبارات Atomic Apply + Snapshot — API-06 إلى API-10

| ID | الاختبار | الدليل المطلوب | الحالة |
|---|---|---|---|
| API-06 | ربط الموافقة بـinputDigest | تغيير TypedFactoryRequest بعد proposal يرفض قبل الكتابة | PASS — `approval-integrity.test.mjs` |
| API-07 | Snapshot قبل التطبيق | وجود snapshot فعلي لمحتوى كل ملف قبل أول write | PASS — `atomic-apply.test.mjs` |
| API-08 | تطبيق ذري متعدد الملفات | الكتابة تستخدم مسارًا ذريًا لكل ملف ولا تعلن النجاح عند فشل ملف | PASS — Runtime |
| API-09 | Partial Failure rollback | فشل حقيقي في الملف الثاني يعيد الملف الأول والثاني 100% | PASS — `atomic-apply.test.mjs` |
| API-10 | منع فتح القدرة التالية | لا Execution Sandbox ولا تنفيذ أوامر خارج مسار التعديل | PASS — حدود المرحلة محفوظة |


## تصحيح Persistent Snapshot — API-11

| ID | الاختبار | الدليل المطلوب | الحالة |
|---|---|---|---|
| API-11 | Snapshot دائم بعد Restart | Manifest ومحتوى Snapshot يظلان قابلين للقراءة من `.kaz-snapshots/` بعد إغلاق وإعادة تشغيل Gateway | PASS — `pnpm run test:persistent-snapshot`, exit `0` |

لا يستخدم مسار Snapshot الإنتاجي `/tmp`. القدرة #5 Execution Sandbox تبقى خارج النطاق.

## اختبارات Execution Sandbox — SBX-01 إلى SBX-06

| ID | الاختبار | الدليل المطلوب | الحالة |
|---|---|---|---|
| SBX-01 | قراءة داخل workspace | الأمر يرى `/workspace` وملف fixture | PASS — `test:execution-sandbox` |
| SBX-02 | منع قراءة النظام | محاولة `/etc/passwd` تخرج `SYSTEM_READ=DENIED` | PASS — Runtime حقيقي |
| SBX-03 | حظر الشبكة | socket خارجي يخرج `NETWORK=DENIED` | PASS — Network namespace حقيقي |
| SBX-04 | عزل الأسرار | `GEMINI_API_KEY` غير مرئي داخل العملية | PASS — `SECRET=HIDDEN` |
| SBX-05 | حدود الوقت | `sleep 5` يتوقف عند timeout | PASS — `timed_out` |
| SBX-06 | الانحدار والبناء | TypeScript وWeb build وAtomic/Snapshot regression | PASS — كل exit `0` |

القدرة #6 Planner → Policy → Approval → Executor ما زالت `NOT_STARTED`.

## تصحيح اختبارات Execution Sandbox — Rootless Bubblewrap

| ID | الاختبار | النتيجة |
|---|---|---|
| SBX-07 | Backend هو bwrap فقط دون sudo/chroot/mount مخصص | PASS — `FORBIDDEN_SUDO_CHROOT_MOUNT=ABSENT` |
| SBX-08 | حظر curl الخارجي | PASS — `NETWORK=DENIED` |
| SBX-09 | منع `/etc/passwd` | PASS — `SYSTEM_READ=DENIED` |
| SBX-10 | Clear Env للأسرار | PASS — `SECRETS_ISOLATED=true` |
| SBX-11 | monotonic timeout | PASS — `sleep 10`, حد 500ms، قياس 501ms |
| SBX-12 | fail-closed عند غياب bwrap | PASS — `MISSING_BWRAP_STATUS=blocked` |

القدرة #6 Planner → Policy → Approval → Executor ما زالت `NOT_STARTED`.

## اختبارات Planner → Policy → Approval → Executor — PPE-01 إلى PPE-06

| ID | الاختبار | الدليل المطلوب | الحالة |
|---|---|---|---|
| PPE-01 | Planner no-write | إنشاء Proposal لا يغير الملف الحقيقي | PASS — `test:execution-pipeline` |
| PPE-02 | Policy path boundary | مسار `../etc/passwd` يُرفض قبل إصدار الموافقة | PASS — Runtime حقيقي |
| PPE-03 | Approval gate | لا يصدر Executor witness إلا بعد فحص SHA/inputDigest الحالي | PASS — Approval Integrity regression |
| PPE-04 | Forged approval | شاهد authorization مزور يُرفض ولا يكتب | PASS — Runtime حقيقي |
| PPE-05 | Approved executor | الكتابة تتم فقط عبر Executor بعد witness صالح | PASS — Runtime حقيقي |
| PPE-06 | Single-use witness | إعادة استخدام witness تُرفض | PASS — Runtime حقيقي |

القدرة #7 Evidence Ledger لم تبدأ.


## P1.8 — Unified verification.json

- يُنشأ ملف حقيقي داخل مساحة المشروع بعد اكتمال التنفيذ.
- يحتوي projectId وrequestId وcommitSha وinputDigest وtestResults وartifactPath وartifactSha256.
- يعتمد على Evidence Ledger ويرفض غياب Approval أو Execution أو inputDigest.
- يحسب SHA-256 من ملف المنتج الفعلي.
- اختبار Runtime وفحص TypeScript والبناء يجب أن تنجح قبل إغلاق القدرة.

## قبول P1.9 — Recovery Manager
- يكتشف Journal في حالة `APPLYING` أو `FAILED` ويعيد Snapshot الحقيقي.
- يثبت الاختبار أن ملفًا تالفًا بعد انقطاع مفترض يعود إلى محتواه السابق.
- يسجل حدث rollback في Evidence Ledger مع snapshot والسبب والمسارات.
- يفشل مغلقًا إلى `REVIEW_REQUIRED` إذا تعذر rollback.
- بدأت P1.10 بعد مراجعة هذه النتائج، وأغلقت اختبارات Task Recovery في القسم التالي.


## P1.10 — Task Recovery + Idempotency

- يمنع المفتاح الفريد إعادة تنفيذ الطلب نفسه.
- تحفظ حالة المهمة ورقم الخطوة في SQLite.
- تستأنف مهمة `IN_PROGRESS` بعد إعادة التشغيل من آخر checkpoint.
- تنتقل المهمة إلى `FAILED` إذا تعذر توفير خطة الاستئناف.
- لا تصبح المهمة `COMPLETED` إلا بعد اكتمال جميع الخطوات.
- لا تشمل هذه المرحلة Emergency Stop.


## P1.11 — Emergency Stop — 2026-10-30

معايير القبول المثبتة: `POST /api/emergency-stop` يفعّل الحالة العامة؛ Executor يرفض Approval صالحًا؛ Sandbox لا يشغّل عملية ويعيد `blocked`؛ مهام `IN_PROGRESS` تتحول إلى `PAUSED`؛ وترحيل SQLite إلى schema version 4 ناجح. `test:emergency-stop`, اختبارات الانحدار، `check`, `build`, و`git diff --check` كلها PASS. أُغلقت P1.12 في القسم التالي.

## قبول P1.12 — Prompt Injection Defense

- [x] حجب طلب حقن قبل تشغيل أي أداة.
- [x] تطهير محتوى ملف خبيث عند دخوله من البحث.
- [x] رفض مسودة تعديل تحتوي حقنًا قبل الموافقة.
- [x] نجاح اختبار Runtime والانحدار والبناء مع رموز خروج موثقة.
