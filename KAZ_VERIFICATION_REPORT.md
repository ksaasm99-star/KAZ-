# KAZ Verification Report — Typed Factory Request

## الحالة

- المرحلة: P1.1 — Typed Factory Request
- التاريخ: 2026-10-30
- المشروع: KAZ فقط
- workspace: `/tmp/kaz-work`
- HEAD عند الفحص: `0e24b91d803214f02ba287aba6bf00de91cdb288`
- الفرع: `main`
- حالة Git: شجرة تحتوي تغييرات محلية سابقة؛ لم تُستبدل ولم تُنظف.
- الحالة النهائية لهذه القدرة: `TESTED` للعقد والتحقق، وليست إغلاقًا للمسار الكامل للمصنع.

## ما تم تنفيذه

أُضيف `web/src/agent/factoryRequest.ts` ويحتوي على:

- `TypedFactoryRequest` versioned بعقد `schemaVersion`.
- الحقول المطلوبة: `projectId`, `requestId`, `userIntent`, `requirements`, `constraints`, `targetPlatform`, `acceptanceCriteria`, `buildCommands`, `testCommands`, `inputDigest`.
- `createdAt` لتثبيت زمن الطلب.
- تحقق صارم من الحقول والقوائم والمنصة وصيغة SHA-256.
- حساب SHA-256 حقيقي عبر Web Crypto، لا قيمة ثابتة ولا Mock.
- كشف العبث بتغيير محتوى الطلب بعد إنشاء البصمة.

أُضيف `web/tests/factory-request.test.mjs` ويغطي العقد الصحيح، البصمة، كشف التغيير، الحقول الناقصة، والمنصة غير المدعومة.

أُضيف الأمر `test:factory-request` إلى `web/package.json`.

## الأدلة الفعلية

| البوابة | الأمر | النتيجة |
|---|---|---|
| Runtime للعقد | `node tests/factory-request.test.mjs` | PASS — exit `0` |
| TypeScript | `pnpm run check` | PASS — exit `0` |
| Web build | `pnpm run build` | PASS — exit `0` |
| Agent Runtime regression | `pnpm run test:agent-runtime` | PASS — exit `0` |
| Diff formatting | `git diff --check` | PASS — exit `0` |

رسالة اختبار Runtime:
`Typed Factory Request Runtime: PASS (schema, SHA-256 digest, tamper detection, validation)`

## ما لم يُنفذ

- لم يُربط العقد بعد بـ`AgentTask` كمخرج منظم.
- لم يُحفظ Typed Factory Request في SQLite.
- لم يُضف API يستقبل الطلب typed.
- لم يُنشأ File Plan أو Multi-file Generation.
- لم يُشغّل projectEditGateway تلقائيًا من هذا العقد.
- لم يُشغّل GitHub Actions أو APK.
- لم يُنفذ Commit أو Push.

## الحكم

`PASS` يخص عقد TypeScript والتحقق والبصمة والاختبارات أعلاه فقط.

الحالة العامة للقدرة: `PARTIAL` حتى يُربط العقد بمسار KAZ المنظم دون السماح بالتنفيذ المباشر. لا يجوز اعتبار هذا التقرير دليلًا على نجاح مصنع APK أو توليد ملفات.

## الملفات المتغيرة في هذه المرحلة

- `web/src/agent/factoryRequest.ts`
- `web/tests/factory-request.test.mjs`
- `web/package.json`
- `KAZ_VERIFICATION_REPORT.md`
- تحديثات توثيق الحالة: `KAZ_FEATURE_MATRIX.md`, `KAZ_IMPLEMENTATION_ROADMAP.md`, `KAZ_TEST_AND_ACCEPTANCE_PLAN.md`, `KAZ_WEB_CONTINUITY.md`

## الخطوة التالية الوحيدة

إضافة اختبار/محوّل يربط `AgentTask` بمخرج Typed Factory Request للقراءة والتحقق فقط، دون كتابة ملفات أو تشغيل المصنع، ثم إيقاف الدورة وإعادة الفحص.

## P1.2 — AgentTask Typed Factory Adapter — 2026-10-30

### تم

أضيف `web/src/agent/factoryRequestAdapter.ts` كمحول read-only يأخذ `projectId` و`requestId` و`userIntent` من `AgentTask` نفسه، ويستقبل حقول الخطة typed دون السماح بتمرير `projectId` خارجي. أضيف `factoryRequest?: TypedFactoryRequest` إلى `AgentTaskState`، وربط اختياري داخل `runReadOnlyAgentTask` لا ينفذ كتابة أو SQLite أو GitHub أو dispatch. أضيفت الصادرات والاختبار `web/tests/agent-factory-request.test.mjs` والأمر `test:agent-factory-request`.

### الاختبارات الفعلية

| البوابة | الأمر | النتيجة |
|---|---|---|
| العقد الأساسي | `pnpm run test:factory-request` | PASS — exit `0` |
| المحول | `pnpm run test:agent-factory-request` | PASS — exit `0` |
| Agent Runtime regression | `pnpm run test:agent-runtime` | PASS — exit `0` |
| TypeScript | `pnpm run check` | PASS — exit `0` |
| Web build | `pnpm run build` | PASS — exit `0` |
| Diff formatting | `git diff --check` | PASS — exit `0` |

### التصحيح أثناء التحقق

فشل التحقق الأول بسبب تعريفات TypeScript لـ`TextEncoder` و`globalThis.crypto` في بيئة المشروع، وتصنيفه `DEPENDENCY/TYPE-LIB`. عولج بأصغر تعديل داخل عقد الطلب باستخدام تعريف runtime محلي دون مكتبة أو تغيير إعداد عام. وفشل fixture الأول لأن البحث أعاد صفر مصادر، فحجب `CompletionGate` الحالة كما هو مصمم؛ صُحح الاختبار بإضافة مصدر اصطناعي، ولم تُخفف بوابة الإكمال.

### الناقص وغير المتحقق

لم يُنفذ تخزين SQLite، ولا API، ولا File Plan، ولا Diff، ولا موافقة، ولا كتابة ملفات، ولا تشغيل مصنع APK، ولا GitHub Actions، ولا Commit أو Push. اختبار عزل API بعد إعادة الطلب ما زال `NOT_RUN`.

### الحكم

حالة المحول: `TESTED`. حالة مسار المصنع الكامل: `PARTIAL`. النجاح يثبت التحويل داخل الذاكرة والتحقق والعزل من تبديل project scope فقط، ولا يثبت توليد ملفات أو بناء APK.

## P1.3 — Multi-file Generation — 2026-10-30

### تم

أضيف `web/server/multiFileGenerator.ts` كمولد حتمي مرتبط بـ`TypedFactoryRequest`. يولد FilePlan حقيقيًا من 6 ملفات Android مترابطة: `settings.gradle.kts`, `build.gradle.kts`, `gradle.properties`, `app/build.gradle.kts`, `AndroidManifest.xml`, و`MainActivity.kt`. تم التحقق من تطابق `namespace` و`applicationId` وpackage ومسار نقطة الدخول، وإضافة `planDigest`، ورفض الطلب عند تغير محتواه بعد `inputDigest`.

### الاختبارات الفعلية

| البوابة | الأمر | النتيجة |
|---|---|---|
| Multi-file Generator | `pnpm run test:multi-file-generator` | PASS — exit `0` |
| Typed Factory Request regression | `pnpm run test:factory-request` | PASS — exit `0` |
| AgentTask adapter regression | `pnpm run test:agent-factory-request` | PASS — exit `0` |
| Agent Runtime regression | `pnpm run test:agent-runtime` | PASS — exit `0` |
| TypeScript | `pnpm run check` | PASS — exit `0` |
| Web build | `pnpm run build` | PASS — exit `0` |
| Diff formatting | `git diff --check` | PASS — exit `0` |

الدليل النصي المسجل في `/tmp/kaz-multifile-targeted.log`:
`Multi-file Generator Runtime: PASS (6 real Android files, linked entry point, digest guard, no disk apply)`.

### الحدود

المولد لا يكتب الملفات على workspace ولا ينفذ approval أو apply أو snapshot أو rollback. لم يُربط بعد بمسار proposal في `projectEditGateway` لأن ذلك يدخل في سلامة الموافقة والتطبيق، وهي قدرة لاحقة مستقلة. لم يُشغّل Gradle للمشروع الناتج؛ لذلك حالة البناء الفعلي للمشروع المولد `NOT_RUN`.

### الحكم

حالة القدرة الثانية: `TESTED`. حالة التطبيق على مساحة المشروع والمصنع الكامل: `PARTIAL`. لا يوجد APK ناتج من هذه الدورة، ولا Commit أو Push.

## P1.4 — Approval Integrity — 2026-10-30

### تم

أضيف عقد موافقة مستقل داخل `web/server/projectEditGateway.ts`:

- `approvalToken` عشوائي أحادي الاستخدام لكل مسودة.
- ربط الرمز بـ`projectId` و`draftId` و`expiresAt` وبصمة SHA السابقة لكل ملف.
- فحص SHA حقيقي من الملف الموجود على القرص قبل بدء الاعتماد.
- رفض التعديل عند تغير الملف بـ`APPROVAL_SHA_MISMATCH`.
- استهلاك الرمز قبل الاعتماد ومنع إعادة استخدامه بـ`APPROVAL_TOKEN_ALREADY_USED`.
- رفض الرمز المنتهي بـ`APPROVAL_EXPIRED`.
- تمرير الرمز عبر `/api/project-edit` وعميل الويب والواجهة.

### الاختبارات الفعلية

| البوابة | الأمر | النتيجة |
|---|---|---|
| Approval Integrity | `pnpm run test:approval-integrity` | PASS — exit `0` |
| SHA/workspace regression | `node tests/workspace-policy.test.mjs` | PASS — exit `0` |
| TypeScript | `pnpm run check` | PASS — exit `0` |
| Web build | `pnpm run build` | PASS — exit `0` |
| Diff formatting | `git diff --check` | PASS — exit `0` |

الدليل النصي الأساسي:
`Approval Integrity Runtime: PASS (real SHA conflict, single-use rejection, expiry rejection)`.

### حدود المرحلة

لم يُعدّل `workspacePolicy.ts` أو منطق snapshot/rollback. حلقة الكتابة الموجودة في `projectEditGateway.ts` بقيت كما هي؛ الإضافة الحالية تحقق سلامة الموافقة قبل دخولها. لم تُفتح القدرة #4، ولم يُنفذ اختبار snapshot/rollback مستقل، ولا Commit أو Push.

### الحكم

حالة القدرة الثالثة: `TESTED`. حالة المرحلة التالية Atomic Apply + Snapshot: `NOT_STARTED`.


## P1.5 — Atomic Apply + Snapshot — 2026-10-30

### تم

- ربط Approval اختياريًا بـ`TypedFactoryRequest.inputDigest` مع إعادة التحقق من SHA-256 عند الموافقة.
- رفض الطلب إذا تغيّر محتوى TypedFactoryRequest بعد إنشاء المسودة عبر `APPROVAL_INPUT_DIGEST_MISMATCH`.
- إنشاء Snapshot حقيقي قبل أول كتابة في مجلد مؤقت محمي، مع manifest ومحتوى الملفات السابقة.
- تطبيق الملفات بالتتابع مع كتابة ذرية لكل ملف.
- تنفيذ rollback كامل من Snapshot عند فشل منتصف التطبيق.
- عدم فتح القدرة #5 Execution Sandbox.

### الاختبارات الفعلية

| البوابة | الأمر | النتيجة |
|---|---|---|
| inputDigest approval binding | `pnpm run test:approval-integrity` | PASS — exit `0`؛ رفض تغيير طلب المصنع مثبت |
| Atomic Apply + Snapshot | `pnpm run test:atomic-apply` | PASS — exit `0`؛ فشل ملفات حقيقي في المنتصف أعاد جميع الملفات |
| TypeScript | `pnpm run check` | PASS — exit `0` |
| Web build | `pnpm run build` | PASS — exit `0` |
| Factory request regression | `pnpm run test:factory-request` | PASS — exit `0` |
| Agent factory regression | `pnpm run test:agent-factory-request` | PASS — exit `0` |
| Agent runtime regression | `pnpm run test:agent-runtime` | PASS — exit `0` |
| Workspace policy regression | `node tests/workspace-policy.test.mjs` | PASS — exit `0` |
| Multi-file generator regression | `pnpm run test:multi-file-generator` | PASS — exit `0` |
| Diff formatting | `git diff --check` | PASS |

### دليل الفشل الجزئي

اختبار `atomic-apply.test.mjs` أنشأ ملفين حقيقيين، ثم جعل مجلد الملف الثاني غير قابل للكتابة بعد إنشاء المسودة. فشل التطبيق عند الملف الثاني بعد كتابة الأول، ثم أعاد Snapshot الملف الأول والثاني إلى المحتوى السابق. تمت مقارنة محتوى الملفين فعليًا بعد rollback، والنتيجة PASS.

### الحدود

Snapshot الحالي محفوظ في مساحة مؤقتة للنظام وليس في سجل SQLite دائم. لم تُفتح القدرة #5 Execution Sandbox، ولم يُنفذ Commit أو Push.

### الحكم

حالة القدرة الثالثة بعد التصحيح: `TESTED` مع inputDigest binding.
حالة القدرة الرابعة: `TESTED`.
حالة القدرة الخامسة Execution Sandbox: `NOT_STARTED`.


## Correction — Persistent Snapshot — 2026-10-30

تم تصحيح قيد القدرة الرابعة: لم يعد الإنتاج يستخدم `/tmp` لحفظ Snapshot. أصبح المسار الدائم داخل مساحة المشروع:

`.kaz-snapshots/<snapshotId>/`

يحتوي كل Snapshot على `manifest.json` ومحتوى الملفات السابقة بصلاحيات ملف مقيدة. أضيف `loadProjectEditSnapshot` لقراءة Snapshot من القرص بعد إعادة تحميل وحدة Gateway.

اختبار الاستمرارية:

`pnpm run test:persistent-snapshot` — PASS، exit `0`.

الاختبار أغلق خادم Vite، أنشأ خادمًا جديدًا، ثم قرأ Manifest ومحتوى الملف السابق من `.kaz-snapshots/` ونجح. كما بقيت النتائج التالية PASS: `test:atomic-apply`, `test:approval-integrity`, `pnpm run check`, و`pnpm run build`، وكلها exit `0`.

تحذير Vite الخاص بإغلاق dependency scan ظهر بعد رسالة PASS أثناء إنهاء خادم الاختبار، ولم يغيّر exit code أو نتيجة الاختبار.

الحالة المحدثة: `ATOMIC_APPLY=PASS`, `ROLLBACK=PASS`, `PERSISTENT_SNAPSHOT=PASS`.
القدرة #5 Execution Sandbox: `NOT_STARTED`.

## P1.6 — Execution Sandbox — 2026-10-30

### تم

أضيف `web/server/executionSandbox.ts` كمنفذ تشغيل مقيد مستقل. يرفض التنفيذ إذا لم تتوفر صلاحية `sudo -n unshare`، ولا يستخدم عزلًا شكليًا. عند توفره ينشئ Mount/Network/PID namespaces و`chroot` مؤقتًا داخل مساحة التشغيل، ويربط للقراءة فقط أدوات النظام اللازمة، ويربط مساحة المشروع للكتابة فقط. بيئة العملية مصفّاة ولا تمرر مفاتيح Gemini/OpenAI/GitHub أو `DATABASE_URL`، مع حدود timeout وvirtual memory وCPU وfile size وopen files.

### الاختبار الحقيقي

أضيف `web/tests/execution-sandbox.test.mjs` واختبر فعليًا:

- قراءة ملف داخل `/workspace` نجحت.
- محاولة قراءة `/etc/passwd` رُفضت (`SYSTEM_READ=DENIED`).
- محاولة socket إلى `1.1.1.1:80` رُفضت (`NETWORK=DENIED`).
- متغيرات الأسرار بقيت مخفية (`SECRET=HIDDEN`).
- أمر `sleep 5` أوقفته المهلة وأعاد `TIMEOUT_STATUS=timed_out`.

| البوابة | الأمر | النتيجة |
|---|---|---|
| Execution Sandbox attack/runtime | `pnpm run test:execution-sandbox` | PASS — exit `0` |
| TypeScript | `pnpm run check` | PASS — exit `0` |
| Web build | `pnpm run build` | PASS — exit `0` |
| Atomic Apply regression | `pnpm run test:atomic-apply` | PASS — exit `0` |
| Persistent Snapshot regression | `pnpm run test:persistent-snapshot` | PASS — exit `0` |
| Diff formatting | `git diff --check` | PASS — exit `0` |

### الحكم والحدود

`EXECUTION_SANDBOX=PASS`, `FILESYSTEM_ISOLATION=true`, `NETWORK_ISOLATION=true`, `SECRETS_ISOLATED=true`, و`TIMEOUT_STATUS=timed_out`. القدرة #6 Planner → Policy → Approval → Executor لم تبدأ ولم تُلمس.

## Correction — P1.6 Rootless Bubblewrap Execution Sandbox — 2026-10-30

تم رفض تنفيذ القدرة #5 السابق المعتمد على `sudo` و`chroot` المخصص واستبداله بالكامل. المنفذ الحالي في `web/server/executionSandbox.ts` يستخدم `bwrap` فقط، ولا يحتوي على `sudo` أو `chroot` أو أوامر `mount` مخصصة.

### الضوابط الفعلية

- `--unshare-user`, `--unshare-pid`, `--unshare-net`, `--unshare-ipc`, و`--unshare-uts` عبر bubblewrap.
- `--clearenv` ثم allowlist صريحة لـ`PATH`, `HOME`, `TMPDIR`, `LANG`, `LC_ALL`, `CI`, و`KAZ_SANDBOX`.
- ربط `/workspace` فقط للكتابة، وربط `/bin`, `/usr`, `/lib`, `/lib64` وRuntime Node للقراءة فقط.
- لا يوجد fallback عند غياب bwrap أو فشل Rootless probe؛ النتيجة `BLOCKED`.
- قياس timeout بواسطة `process.hrtime.bigint()`، وإنهاء process group بـ`SIGTERM` ثم `SIGKILL` بعد grace محدد.

### اختبارات القبول الفعلية

| الشرط | الدليل | النتيجة |
|---|---|---|
| Bubblewrap backend فقط | `BACKEND=bubblewrap-rootless` | PASS |
| `curl https://google.com` | `NETWORK=DENIED` | PASS |
| `cat /etc/passwd` | `SYSTEM_READ=DENIED` | PASS |
| Clear Env | `SECRETS_ISOLATED=true` وغياب الأسرار | PASS |
| `sleep 10` بمهلة 500ms | `TIMEOUT_STATUS=timed_out`, `TIMEOUT_DURATION_MS=501` | PASS |
| غياب bwrap | `MISSING_BWRAP_STATUS=blocked` بعد تشغيل Backend غير موجود | PASS |
| TypeScript | `pnpm run check` | PASS — exit `0` |
| Web build | `pnpm run build` | PASS — exit `0` |
| Atomic Apply regression | `pnpm run test:atomic-apply` | PASS — exit `0` |
| Persistent Snapshot regression | `pnpm run test:persistent-snapshot` | PASS — exit `0` |
| Diff formatting | `git diff --check` | PASS — exit `0` |

تم تثبيت `bubblewrap 0.9.0` في بيئة الاختبار. تثبيته في بيئة الإنتاج لم يُنفذ بعد، ولذلك يتطلب الإنتاج حزمة bwrap وRootless User Namespace قبل السماح بالتنفيذ.

الحالة: `TESTED` في البيئة الحالية، مع بقاء نشر Backend الإنتاج كشرط تشغيل مستقل. القدرة #6 لم تبدأ ولم تُلمس.

## P1.7 — Planner → Policy → Approval → Executor — 2026-10-30

### تم

- أضيف `web/server/executionPipeline.ts` بفصل صريح بين `createPlannerProposal` و`evaluatePolicy` و`approvePlannerProposal` و`executeApprovedProjectEdit`.
- Planner يعيد Proposal immutable فقط ولا يقرأ أو يكتب أو ينفذ أوامر.
- Policy تتحقق من نطاق المشروع، مسارات الكتابة، التكرار، وعدد وحجم الملفات قبل إصدار الموافقة.
- Approval يعيد استخدام بوابة SHA/inputDigest/expiry الحالية ويصدر شاهد تنفيذ opaque أحادي الاستخدام.
- Executor هو المسار الوحيد في هذه الطبقة الذي يستدعي `applyAuthorizedProjectEdit` للكتابة؛ غياب الشاهد أو تزويره يُرفض قبل أي كتابة.
- فُصل التفويض عن التطبيق داخل `projectEditGateway.ts` عبر `authorizeProjectEditApproval` و`applyAuthorizedProjectEdit`، مع إبقاء `approveProjectEdit` متوافقًا كواجهة تركيبية.

### الاختبارات الفعلية

| البوابة | الأمر | النتيجة |
|---|---|---|
| Planner/Policy/Approval/Executor | `pnpm run test:execution-pipeline` | PASS — exit `0` |
| Approval Integrity regression | `pnpm run test:approval-integrity` | PASS — exit `0` |
| TypeScript | `pnpm run check` | PASS — exit `0` |
| Diff formatting | `git diff --check` | PASS — exit `0` |

الدليل النصي:
`Execution Pipeline Runtime: PASS (planner no-write, policy reject, forged approval reject, approved executor apply, single-use witness)`.

### حدود المرحلة

لم يُنفذ Commit أو Push. ما زال تشغيل GitHub Actions وبناء APK الفعلي خارج هذه المرحلة.

### الحكم

`PLANNER_NO_WRITE=PASS`, `POLICY_BOUNDARY=PASS`, `FORGED_APPROVAL=PASS`, `APPROVED_EXECUTOR=PASS`, `SINGLE_USE_WITNESS=PASS`.
حالة القدرة السادسة: `TESTED`. القدرة السابعة Evidence Ledger: `ACCEPTED`.

## P1.7 — Evidence Ledger

الحالة: `ACCEPTED`

- أضيف جدول SQLite مستقل `evidence_ledger` بتسلسل دائم وhash chain.
- كل سجل يحمل `Request ID`, `Approval ID`, `Execution ID`, `Build ID`, و`Artifact ID` عند توفرها.
- أضيفت قيود SQLite `BEFORE UPDATE` و`BEFORE DELETE` تعيد `EVIDENCE_LEDGER_APPEND_ONLY`.
- رُبطت أحداث طلب المصنع، اقتراح/موافقة/تطبيق تعديل المشروع، ونتيجة build بالسجل.
- أضيف مسار القراءة: `GET /api/memory/projects/:projectId/ledger` مع مرشح اختياري `requestId`.

الدليل الفعلي:

- `pnpm run test:evidence-ledger`: `PASS`
- الاختبار أثبت correlation وhash-chain ورفض `UPDATE` ورفض `DELETE` مباشرة على SQLite.
- `pnpm run check`: `PASS`
- `pnpm run build`: `PASS`
- `git diff --check`: `PASS`

لم يتم تعديل `verification.json` أو بدء القدرة #8.


## P1.8 — Unified verification.json

الحالة: `IMPLEMENTED_TESTED`.

- أضيف `web/server/verificationArtifact.ts` كمولّد موحّد لملف `verification.json`.
- المصدر الموثوق هو `Evidence Ledger` عبر `PersistentMemory.listEvidenceLedger`.
- لا يُنشأ الملف دون حدث Approval وحدث Execution مترابطين، أو إذا لم توجد `inputDigest` داخل Ledger.
- تُقرأ الـArtifact من القرص ويُحسب SHA-256 فعليًا؛ لا تُقبل بصمة مقدمة من الذاكرة.
- الحقول الإلزامية: `projectId`, `requestId`, `commitSha`, `inputDigest`, `testResults`, `artifactPath`, `artifactSha256`، مع مراجع أحداث Ledger.
- مسار الملف: `.kaz-verification/<requestId>/verification.json` داخل مساحة المشروع.

التحقق الفعلي:
- `pnpm run test:verification-artifact`: PASS؛ إنشاء الملف، SHA-256 الحقيقي، correlation، ورفض غياب Approval/Execution/inputDigest.
- `pnpm run check`: PASS.
- `pnpm run build`: PASS.
- Workflow `build-apk.yml` أصبح يضم الحقول الموحدة ونتائج compile/build وبصمة المنتج عند توفر APK.

تم إغلاق Recovery Manager (القدرة #9)، وتفاصيل التحقق موثقة في P1.9 أدناه.

## P1.9 — Recovery Manager — 2026-10-30
الحالة: `TESTED`.
- أضيف `web/server/recoveryManager.ts` لاستعادة Snapshot دائم عندما يكون Journal في `APPLYING` أو `FAILED`.
- أضيف Journal دائم داخل `.kaz-snapshots/<snapshotId>/recovery.json` بحالات `CREATED`, `APPLYING`, `APPLIED`, `FAILED`, `ROLLED_BACK`, و`REVIEW_REQUIRED`.
- يسجل التطبيق المسارات التي اكتملت قبل الانقطاع، ويكتب حالة الفشل قبل الاستعادة، ثم يحفظ المسارات المستعادة بعد نجاح rollback.
- أضيف مسار `POST /api/project-edit` مع `action: "recover"` واشتراط `projectId`, `snapshotId`, و`requestId`.
- يسجل Recovery Manager حدث `project_edit_rollback` في Evidence Ledger مع Snapshot ID والسبب والمسارات المطبقة والمستعادة.

الاختبارات الفعلية:
- `node tests/recovery-manager.test.mjs`: PASS — exit `0`؛ Journal حقيقي بحالة `APPLYING`، تلف ملف فعلي، استعادة المحتوى السابق، وتسجيل Rollback في SQLite Ledger.
- `node tests/atomic-apply.test.mjs`: PASS — exit `0`.
- `pnpm run check`: PASS — exit `0`.
- `pnpm run build`: PASS — exit `0`.
- `git diff --check`: PASS — exit `0`.

الدليل النصي: `Recovery Manager Runtime: PASS (real interrupted journal restored file and recorded rollback)`.
الحالات: `PARTIAL_WRITE_DETECTION=PASS`, `AUTOMATIC_RECOVERY=PASS`, `ROLLBACK_LEDGER=PASS`, `RESTART_JOURNAL=PASS`.
بدأت القدرة #10 بعد قبول القدرة التاسعة، وتوثيق إغلاقها في قسم P1.10 أدناه.


## P1.10 — Task Recovery + Idempotency

- النطاق: KAZ فقط؛ لم يبدأ تنفيذ القدرة #11 (Emergency Stop).
- الملفات: `web/server/persistentMemory.ts`, `web/server/taskRecovery.ts`, `web/tests/task-recovery.test.mjs`, `web/package.json`.
- التخزين: جدول SQLite دائم `task_recovery` بمفتاح فريد مركب `(project_id, idempotency_key)` وحالات `QUEUED`, `IN_PROGRESS`, `COMPLETED`, `FAILED`.
- الاستئناف: يحفظ `step_index` و`total_steps` ونتيجة آخر checkpoint، ويعيد تحميل المهام `IN_PROGRESS` بعد إعادة تشغيل Vite/الخادم. إذا تعذر توفير خطة الخطوات تُحوّل المهمة إلى `FAILED` مع سبب صريح.
- منع التكرار: إعادة إرسال نفس `idempotencyKey` بعد `COMPLETED` يعيد النتيجة السابقة ولا يشغل أي خطوة إضافية.
- الأدلة: تُسجل أحداث بدء المهمة، checkpoint، الإكمال، الفشل، وفشل الاستئناف في Evidence Ledger القائم.

| الفحص | النتيجة |
|---|---|
| `pnpm run test:task-recovery` | PASS — exit `0` |
| `pnpm run check` | PASS — exit `0` |
| `pnpm run build` | PASS — exit `0` |
| `pnpm run test:evidence-ledger` | PASS — exit `0` |
| `git diff --check` | PASS — exit `0` |

رسالة اختبار Runtime: `Task Recovery Runtime: PASS (idempotency, checkpoint resume after restart, unavailable-plan failure)`.


## P1.11 — Emergency Stop — 2026-10-30

### تم

- أضيفت وحدة تحكم مركزية `web/server/emergencyStop.ts` بحالة عامة `EMERGENCY_STOPPED` وسبب وزمن تفعيل.
- أضيف المسار `GET/POST /api/emergency-stop`؛ POST يفعّل الإيقاف ويعيد قائمة المهام التي أوقفت بأمان.
- أضيف حارس في `executionPipeline.ts` يرفض Executor قبل استهلاك Approval صالح عند تفعيل الطوارئ.
- أضيف حارس في `executionSandbox.ts` يعيد `blocked` ولا يشغّل Bubblewrap عند تفعيل الطوارئ.
- أضيفت حالة SQLite `PAUSED` مع ترحيل مخطط إلى الإصدار 4، وتحويل كل مهام `IN_PROGRESS` إلى `PAUSED` مع سبب الإيقاف.

### الاختبارات الفعلية

| البوابة | الأمر | النتيجة |
|---|---|---|
| Emergency Stop Runtime | `pnpm run test:emergency-stop` | PASS — exit `0`؛ Approval صالح مرفوض، Sandbox محجوب، والمهمة أصبحت `PAUSED` |
| Executor regression | `pnpm run test:execution-pipeline` | PASS — exit `0` |
| Sandbox regression | `pnpm run test:execution-sandbox` | PASS — exit `0`؛ Bubblewrap والعزل والمهلة وغياب bwrap |
| Task Recovery regression | `pnpm run test:task-recovery` | PASS — exit `0` |
| Evidence Ledger regression | `pnpm run test:evidence-ledger` | PASS — exit `0` |
| TypeScript | `pnpm run check` | PASS — exit `0` |
| Web build | `pnpm run build` | PASS — exit `0` |
| Diff formatting | `git diff --check` | PASS — exit `0` |

### الحدود

لم يُنفذ Commit أو Push. إعادة التشغيل بعد تفعيل الطوارئ ليست آلية إلغاء تلقائي؛ المهام الموقوفة تبقى `PAUSED` ولا تدخل قائمة الاستئناف الحالية. أُغلقت القدرة #12 لاحقًا في السجل التالي.

### الحكم

`EMERGENCY_STOP=PASS`. القدرة #11 مغلقة للاختبارات المحددة؛ القدرة #12 موثقة في السجل التالي.

## P1.12 — Prompt Injection Defense

الحالة: `PASS`.

- أضيفت طبقة `web/src/agent/promptDefense.ts` للفصل بين التعليمات وبيانات المشروع غير الموثوقة.
- تُوسم نصوص المصادر والمعرفة والرسائل ونتائج RAG كـ`KAZ_UNTRUSTED_DATA`، وتُحجب الأنماط المعروفة لانتحال رسائل النظام أو طلب كشف الأسرار أو تشغيل الأدوات.
- حلقة الوكيل تحجب الطلب المحقون قبل تشغيل أي أداة، وتطهر محتوى نتائج البحث قبل إعادته إلى الحالة.
- سياسة المنفذ ترفض أي مقترح تعديل يحتوي نمط حقن في التعليمات أو محتوى الملفات قبل إصدار الموافقة.
- الاختبار الفعلي: `pnpm run test:prompt-defense` — `PROMPT_DEFENSE_EXIT=0`.
- الانحدار: `pnpm run test:agent-runtime` — `PASS`.
- الانحدار: `pnpm run test:execution-pipeline` — `PIPELINE_REGRESSION_EXIT=0`.
- البناء: `pnpm run build` — `BUILD_EXIT=0`.
- لم تُفتح أي قدرة لاحقة.


## P2.2 — Project Analyzer / Dependency Graph — 2026-10-30

- أضيف `web/server/projectAnalyzer.ts` كمحلل قراءة فقط يستخدم `WorkspacePolicy`، ويستخرج الاستيرادات ويبني العقد والحواف و`importedBy` والاستيرادات الخارجية.
- التقرير يحدد نقاط الدخول والملفات المعزولة مع سبب العزل، دون كتابة أو تنفيذ أو لمس الواجهة.
- `pnpm run test:project-analyzer` — PASS، `files=4`, `edges=3`, `orphan=1`.
- `pnpm run check` — PASS؛ `pnpm run build` — PASS؛ `git diff --check` — PASS.
- الحدود: لا تنفيذ ولا كتابة ولا LLM في هذه القدرة، ولم تبدأ قدرة جديدة.


## P2.3 — Local Intelligence: File Plan وChange Impact

النتيجة: `PASS`.

الأدلة الفعلية:

- `pnpm run test:local-intelligence` → `EXIT_TEST=0`.
- المخرج: `Local Intelligence Runtime: PASS (plan=2, direct=1, transitive=1)`.
- `pnpm run check` → `EXIT_CHECK=0`.
- `pnpm run build` → `EXIT_BUILD=0`.
- `git diff --check` → `EXIT_DIFF=0`.

يشمل الاختبار مشروعًا مؤقتًا بملفات حقيقية، وتحقق من بصمة graph SHA-256، وخطة Auth typed، وقاعدة `.tsx`، ثم أثبت أن تعديل `src/utils.ts` يؤثر مباشرة على `src/components/Existing.tsx` وبشكل متسلسل على `src/main.ts`. لم يتم تعديل UI أو تنفيذ أي ملف مولد.


## P2.4 — Local Semantic Index / SQLite FTS5

النتيجة: `PASS` ضمن نطاق الفهرسة والبحث المحلي.

الأدلة الفعلية:

- `pnpm run test:semantic-code-index` → `EXIT_TEST=0`.
- المخرج: `Semantic Code Index Runtime: PASS (indexed=2, arabic=1, english=1, arabicMs=0.63, englishMs=0.24)`.
- `pnpm run check` → `EXIT_CHECK=0`.
- `pnpm run build` → `EXIT_BUILD=0`.
- `git diff --check` → `EXIT_DIFF=0`.

الاختبار استخدم SQLite وFTS5 وملفات حقيقية على القرص. تحقق من فهرسة المحتوى لا أسماء الملفات فقط، ومن البحث العربي `تسجيل الدخول` والإنجليزي `semantic search`، ومن إنتاج مقتطف، ومن عدم ظهور الملف الثنائي أو محتوى `node_modules`. لا يشمل هذا التسليم مسار API أو واجهة UI، وفق حدود المهمة الحالية.


## P2.5 — NetworkBroker

النتيجة: `PASS` للطبقة المطلوبة فقط، مع بقاء الربط بالنموذج المحلي غير منفذ عمدًا.

الأدلة الفعلية:

- `pnpm run test:network-broker` → `EXIT_TEST=0`.
- المخرج: `NetworkBroker Runtime: PASS (exampleSha256=25ddf2c883e0d1958ea971d279a7e4f0fd446724ee3db7db19dadabd4a62e484, searchResults=5, ledgerEvents=6)`.
- `pnpm run check` → `EXIT_CHECK=0`.
- `pnpm run build` → `EXIT_BUILD=0`.
- `git diff --check` → `EXIT_DIFF=0`.

الاختبار استخدم شبكة حقيقية، ولم يستخدم Mock. تحقق من SHA-256 مستقل لجسم `example.com`، ونجاح بحث DuckDuckGo بخمس نتائج، ورفض HTTP وlocalhost و192.168.1.1 وfile://، ورفض الطلب عند غياب موافقة المالك. سُجلت الطلبات الناجحة والفاشلة في Evidence Ledger. لم تُضف واجهة أو اتصال تلقائي بالنموذج المحلي.


## P2.6 — Local Ollama → NetworkBroker

النتيجة: `IMPLEMENTED`, واختبار التكامل الحقيقي `BLOCKED` بسبب عدم توفر Ollama محليًا.

الملفات:

- `web/server/localIntelligence.ts`: الدالة `runLLMWithNetwork(prompt, projectContext, approval)`، وتحليل طلبات `network_request`، وتمريرها حصراً إلى `searchWeb` أو `fetchUrl`، وإعادة النتيجة للنموذج.
- `web/tests/llm-network-broker.test.mjs`: اختبار تكامل حقيقي بلا Mock، مع حد أقصى ثلاثة طلبات.
- `web/package.json`: الأمر `test:llm-network-broker`.

الأدلة الفعلية:

- `pnpm run check` → `CHECK_EXIT=0`.
- `pnpm run test:network-broker` → `NETWORK_BROKER_REGRESSION_EXIT=0`، و`searchResults=5` و`ledgerEvents=6`.
- `pnpm run test:llm-network-broker` → `RUNTIME_EXIT=0` مع تصنيف الاختبار: `P2.6 Runtime: BLOCKED (Ollama unavailable at http://127.0.0.1:11434; no fallback or Mock used)`.
- `git diff --check` → `DIFF_CHECK_EXIT=0`.

لم يُعلن نجاح دورة النموذج النهائية؛ لم تتوفر خدمة Ollama، ولذلك لم يمكن إثبات أن النموذج طلب البحث ثم استلم النتيجة وأنتج الخطة. عند تشغيل Ollama محليًا وإتاحة نموذج عبر `OLLAMA_MODEL` يعاد تشغيل الأمر نفسه لإغلاق الحالة.


## P2.7 — Ollama Model Selector

- `pnpm run check`: `PASS`، exit 0.
- `pnpm run test:ollama-gateway`: `PASS`، وأثبت الرفض المغلق عند غياب Ollama وسياسة موافقة المالك وسياسة Q4_K_M.
- `pnpm run build`: `PASS`، exit 0.
- HTTP: `/api/ollama/models` و`/api/ollama/active` و`/api/ollama/pull` أعادت `503` مع `status=BLOCKED` و`reason=OLLAMA_UNAVAILABLE`.
- لم يُنفذ تنزيل أو تشغيل نموذج لأن Ollama غير متاحة.
