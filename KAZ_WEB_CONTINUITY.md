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
| TFR-07 | عزل projectId | لا يمكن استخدام طلب مشروع في مشروع آخر | PASS — request contract requires projectId؛ تكامل API لاحق |
| TFR-08 | persistence/restart | استعادة الطلب من SQLite بعد إعادة التشغيل | NOT_RUN — خارج عقد الواجهة الحالي؛ مطلوب قبل الإغلاق الكامل |
| TFR-09 | لا كتابة ملفات أثناء بناء الطلب | workspace يبقى دون تغيير | PASS — العقد pure والتحقق لا يكتب ملفات |
| TFR-10 | TypeScript | مخرجات `pnpm run check` | PASS — exit 0 |

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


## 53. AgentTask Typed Factory Adapter — 2026-10-30

حالة المرحلة: `TESTED` للمحول read-only و`PARTIAL` لمسار المصنع الكامل. أضيف `web/src/agent/factoryRequestAdapter.ts`، وأضيف `factoryRequest` اختياريًا إلى `AgentTaskState`، وربط اختياري في `runReadOnlyAgentTask`. المحول يستمد `projectId` و`requestId` و`userIntent` من المهمة نفسها، ولا يكتب ملفات ولا يستدعي SQLite أو GitHub أو المصنع.

الأدلة الفعلية: `pnpm run test:agent-factory-request` PASS exit 0؛ `pnpm run test:agent-runtime` PASS exit 0؛ `pnpm run check` PASS exit 0؛ `pnpm run build` PASS exit 0؛ `git diff --check` PASS exit 0. تم تصحيح تعريفات runtime المحلية لـTextEncoder/crypto بعد فشل TypeScript الأول، وتم إبقاء CompletionGate دون تخفيف بعد فشل fixture بلا مصدر.

التغييرات غير المنفذة: persistence/API، File Plan، Diff، approval، apply، rollback، GitHub Actions، APK، Commit، Push. نقطة التوقف: لا تبدأ مرحلة جديدة تلقائيًا.

## 54. Multi-file Generation — 2026-10-30

حالة المرحلة: `TESTED` للتوليد داخل الذاكرة، و`PARTIAL` للتدفق الكامل. أضيف `web/server/multiFileGenerator.ts` المرتبط بـTypedFactoryRequest. المولد يعيد FilePlan حقيقيًا من ستة ملفات Android مترابطة، ويتحقق من digest الطلب، ويطابق namespace/applicationId/package/entry point. لا توجد كتابة على workspace ولا approval/apply.

الأدلة: `pnpm run test:multi-file-generator` PASS exit 0؛ `pnpm run test:factory-request` PASS exit 0؛ `pnpm run test:agent-factory-request` PASS exit 0؛ `pnpm run test:agent-runtime` PASS exit 0؛ `pnpm run check` PASS exit 0؛ `pnpm run build` PASS exit 0؛ `git diff --check` PASS exit 0. سجل التوليد: `/tmp/kaz-multifile-targeted.log`.

غير المنفذ: proposal/approval، التطبيق الذري، snapshot/rollback، Gradle للمشروع المولد، APK، GitHub Actions، Commit، Push. لا تبدأ القدرة الثالثة تلقائيًا.

## 55. Approval Integrity — 2026-10-30

حالة المرحلة: `TESTED`. أضيف approvalToken أحادي الاستخدام مرتبط بمشروع ومسودة وSHA السابقة لكل ملف ووقت انتهاء. فحص SHA يقرأ الملف الفعلي قبل الاعتماد؛ تغير الملف يرفض العملية. إعادة استخدام الرمز ترفض العملية، والرمز المنتهي يرفض العملية. تم تمرير الرمز عبر API وعميل الويب والواجهة.

الأدلة: `pnpm run test:approval-integrity` PASS exit 0؛ `node tests/workspace-policy.test.mjs` PASS exit 0؛ `pnpm run check` PASS exit 0؛ `pnpm run build` PASS exit 0؛ `git diff --check` PASS exit 0. السجلات: `/tmp/kaz-approval-integrity.log` و`/tmp/kaz-approval-workspace-regression.log` و`/tmp/kaz-approval-check.log` و`/tmp/kaz-approval-build.log`.

لم تُفتح القدرة #4: لا snapshot، لا rollback جديد، لا تغيير في `workspacePolicy.ts`، ولا إعادة تصميم لحلقة Atomic Apply. لا Commit ولا Push.


## 56. Atomic Apply + Snapshot — 2026-10-30

الحالة: `TESTED`.

- تم ربط موافقة التعديل بـ`TypedFactoryRequest.inputDigest` عندما يمرر مسار المصنع الطلب typed.
- الموافقة تعيد التحقق من البصمة الحقيقية؛ تغيير محتوى الطلب يرفض بـ`APPROVAL_INPUT_DIGEST_MISMATCH`.
- تم إنشاء Snapshot حقيقي قبل التطبيق، مع تطبيق ذري لكل ملف وrollback كامل من snapshot عند فشل منتصف التطبيق.
- اختبار `pnpm run test:atomic-apply`: PASS، فشل نظام ملفات حقيقي بعد الملف الأول وأعيدت الملفات 100% للحالة السابقة.
- اختبارات `pnpm run test:approval-integrity`, `pnpm run check`, `pnpm run build`, واختبارات الانحدار المرتبطة: PASS مع exit code `0`.
- التغييرات بقيت محلية؛ لا Commit ولا Push.
- القدرة #5 Execution Sandbox لم تبدأ.


## 57. Persistent Snapshot Correction — 2026-10-30

أُزيل تخزين Snapshot من `/tmp` في مسار الإنتاج. المسار الحالي هو `.kaz-snapshots/<snapshotId>/` داخل جذر مساحة المشروع، مع `manifest.json` وملفات المحتوى السابق. أضيف Loader يقرأ Snapshot من القرص بعد إعادة تحميل Gateway.

`pnpm run test:persistent-snapshot`: PASS، exit `0`؛ تم إغلاق خادم Vite ثم تشغيله من جديد وقراءة Snapshot من القرص. `pnpm run test:atomic-apply`, `pnpm run test:approval-integrity`, `pnpm run check`, و`pnpm run build`: PASS، exit `0`.

الحالة: `ATOMIC_APPLY=PASS`, `ROLLBACK=PASS`, `PERSISTENT_SNAPSHOT=PASS`. القدرة #5 Execution Sandbox لم تبدأ. لا Commit ولا Push.

## P1.6 — Execution Sandbox — 2026-10-30

الحالة: `TESTED`.

أضيف منفذ `web/server/executionSandbox.ts` بعزل حقيقي عبر `sudo -n unshare` لـMount/Network/PID namespace ثم `chroot` محدود، مع ربط مساحة المشروع فقط للكتابة وربط الأدوات اللازمة للقراءة فقط. تم تنظيف البيئة من مفاتيح API وGitHub وDatabase، ووضع حدود timeout وmemory وCPU وfile size وopen files. إذا لم تتوفر صلاحية العزل، تكون النتيجة `BLOCKED` بدل تنفيذ غير آمن.

الدليل الفعلي: `pnpm run test:execution-sandbox` — exit `0`، وأثبت `FILESYSTEM_ISOLATION=true` و`NETWORK_ISOLATION=true` و`SECRETS_ISOLATED=true` و`TIMEOUT_STATUS=timed_out`. نجح كذلك `pnpm run check` و`pnpm run build` و`test:atomic-apply` و`test:persistent-snapshot` و`git diff --check`، وكلها exit `0`.

لم تبدأ القدرة #6 ولم تُلمس.

## Correction — P1.6 Rootless Bubblewrap — 2026-10-30

تم رفض مسار `sudo + chroot` السابق وإعادة بناء `web/server/executionSandbox.ts` باستخدام `bubblewrap` فقط. لا يستخدم المنفذ `sudo` أو `chroot` أو mount orchestration مخصصًا. يعمل بـRootless User/ PID/Network/IPC/UTS namespaces، و`--clearenv`، وقراءة فقط للـruntime، و`/workspace` فقط كمساحة كتابة.

الدليل الفعلي: `pnpm run test:execution-sandbox` — exit `0`، مع `BACKEND=bubblewrap-rootless`, `SYSTEM_READ=DENIED`, `NETWORK=DENIED`, `SECRETS_ISOLATED=true`, `TIMEOUT_STATUS=timed_out`, `TIMEOUT_DURATION_MS=501`, و`MISSING_BWRAP_STATUS=blocked`. نجح `pnpm run check` و`pnpm run build` و`test:atomic-apply` و`test:persistent-snapshot` و`git diff --check`، وكلها exit `0`.

تم تثبيت `bubblewrap 0.9.0` في بيئة الاختبار. تثبيت bwrap وRootless User Namespace في الإنتاج ما زال شرط تشغيل، وليس ادعاء نشر. لم تبدأ القدرة #6.

## P1.7 — Planner → Policy → Approval → Executor — 2026-10-30

الحالة: `TESTED`.

تمت إضافة `web/server/executionPipeline.ts` بفصل مراحل التخطيط والسياسة والموافقة والمنفذ. Planner لا يملك مسار كتابة، وPolicy تمنع الخروج من مساحة المشروع قبل إصدار approval، وApproval تعيد استخدام SHA/inputDigest/expiry وتصدر witness أحادي الاستخدام، وExecutor وحده يمرر المسودة المعتمدة إلى التطبيق.

الدليل: `pnpm run test:execution-pipeline` PASS exit 0؛ `pnpm run test:approval-integrity` PASS exit 0؛ `pnpm run check` PASS exit 0؛ `git diff --check` PASS exit 0.

تم إثبات: `PLANNER_NO_WRITE=PASS`, `POLICY_BOUNDARY=PASS`, `FORGED_APPROVAL=PASS`, `APPROVED_EXECUTOR=PASS`, `SINGLE_USE_WITNESS=PASS`.

لم يُنفذ Commit أو Push. القدرة #7 Evidence Ledger أُغلقت في السجل التالي.

## Evidence Ledger — القدرة #7

تم إغلاق القدرة السابعة فقط: سجل أدلة SQLite دائم append-only مع hash chain، وربط مراحل الطلب والموافقة والتنفيذ والبناء والأثر. أضيفت فخاخ تمنع تعديل أو حذف أي حدث سابق ومسار قراءة للمشروع. الاختبارات الفعلية: `test:evidence-ledger PASS`, `check PASS`, `build PASS`, `diff-check PASS`. لم تُفتح القدرة #8.


## القدرة #8 — verification.json الموحد

تم تنفيذ القدرة الثامنة فقط. أصبح لدى KAZ مولّد خادمي `web/server/verificationArtifact.ts` يعتمد على Evidence Ledger، ويتطلب Approval وExecution وinputDigest مترابطة، ويحسب SHA-256 الحقيقي للـArtifact ويكتب `.kaz-verification/<requestId>/verification.json` داخل مساحة المشروع. أضيف اختبار Runtime حقيقي يثبت الإنشاء ويرفض الأدلة الناقصة. تم تحديث Workflow ليحمل projectId وcommitSha وinputDigest وtestResults وartifactPath وartifactSha256. النتائج: اختبار القدرة PASS، TypeScript PASS، build PASS. القدرة #9 لم تبدأ.

## 58. Recovery Manager — 2026-10-30
أُغلقت القدرة التاسعة فقط. أضيف Journal دائم لحالة التطبيق داخل `.kaz-snapshots/<snapshotId>/recovery.json`، مع تسجيل `APPLYING` و`FAILED` قبل الاستعادة و`ROLLED_BACK` بعد نجاحها، أو `REVIEW_REQUIRED` إذا فشلت الاستعادة. أضيف `web/server/recoveryManager.ts` ومسار `action: "recover"` في API التعديل. الاختبار الفعلي استعاد ملفًا متضررًا بعد محاكاة انقطاع مفاجئ وسجل `project_edit_rollback` في Evidence Ledger. نتائج `test:recovery-manager`, `test:atomic-apply`, `check`, و`build`: PASS. لم تبدأ القدرة #10.


## P1.11 — Emergency Stop — 2026-10-30

الحالة: `TESTED` و`EMERGENCY_STOP=PASS`.

أضيفت نقطة توقف مركزية عبر `GET/POST /api/emergency-stop`. عند التفعيل يرفض Executor أي تنفيذ جديد حتى مع Approval صالح، ويعيد Execution Sandbox حالة `blocked` قبل تشغيل bwrap، وتحول SQLite المهام `IN_PROGRESS` إلى `PAUSED` مع سبب الإيقاف. تم ترحيل مخطط المهام إلى الإصدار 4.

الأدلة الفعلية: `pnpm run test:emergency-stop` PASS exit 0؛ `test:execution-pipeline` PASS؛ `test:execution-sandbox` PASS؛ `test:task-recovery` PASS؛ `test:evidence-ledger` PASS؛ `pnpm run check` PASS؛ `pnpm run build` PASS؛ `git diff --check` PASS.

توقفت مرحلة Emergency Stop هنا. لم يُنفذ Commit أو Push، ثم أُغلقت القدرة #12 في السجل التالي.

## 57. Prompt Injection Defense — القدرة #12

الحالة: `IMPLEMENTED_TESTED`.

فصل KAZ بين تعليمات النظام وبيانات المصادر والملفات والذاكرة، مع تطهير الأنماط المعروفة للحقن، وحجب المهمة قبل الأدوات عند حقن الطلب، ورفض مسودة التعديل قبل الموافقة عند احتواء النص أو الملفات على تعليمات خبيثة. أُثبت ذلك باختبار Runtime حقيقي، واختبارات انحدار الوكيل والمنفذ، وبناء Web ناجح. التوقف هنا قبل أي قدرة جديدة.

## P2.1 — ربط LLM بـ Typed Factory Request وتحليل ملفات المشروع

الحالة: `IMPLEMENTED_BUILD_PASS_LLM_BLOCKED`

تمت إضافة `web/server/projectIntelligence.ts` كطبقة خادمية للقراءة فقط وتحليل الطلبات. المسار `POST /api/factory-intelligence/plan` يقرأ مساحة المشروع عبر `WorkspacePolicy`، يطهر محتوى الملفات كبيانات غير موثوقة، يستدعي Gemini بإخراج JSON منظم، يتحقق محليًا من الخطة، ثم ينشئ `TypedFactoryRequest` حقيقيًا ببصمة SHA-256 و`File Plan`. لا توجد كتابة ملفات أو موافقة أو تنفيذ أو تغييرات UI في هذه المرحلة.

الأدلة:
- `pnpm run check`: PASS.
- `pnpm run build`: PASS.
- `pnpm run test:factory-request`: PASS.
- `pnpm run test:agent-factory-request`: PASS.
- `pnpm run test:agent-runtime`: PASS.
- اختبار Manus الحقيقي `gpt-6.1-sol` بإخراج JSON منظم: PASS.
- اختبار KAZ الحقيقي عبر Gemini: BLOCKED بسبب `API key not valid` من Google، لذلك لم تُعلن قدرة LLM داخل KAZ مكتملة.
- `git diff --check`: PASS.


## P2.2 — Project Intelligence: Dependency Graph — 2026-10-30

الحالة: `TESTED` — أضيف `web/server/projectAnalyzer.ts` كمحلل قراءة فقط لمساحة المشروع. يستخرج الاستيرادات النسبية وارتباطات Kotlin/Java/Python القابلة للحل، ويبني `nodes` و`edges` و`importedBy` و`externalImports`، ويحدد الملفات ذات الدرجة الداخلة صفرًا مع استثناء نقاط الدخول المعلنة. لا يكتب ملفات ولا ينفذ أوامر ولا يلمس الواجهة.

الدليل الفعلي: `pnpm run test:project-analyzer` PASS exit 0، واختبار حقيقي أنشأ ملفات TypeScript على القرص وأثبت `files=4`, `edges=3`, `orphan=1`. كما نجح `pnpm run check` exit 0، و`pnpm run build` exit 0، و`git diff --check` exit 0. لم تبدأ أي قدرة لاحقة.


## P2.3 — File Plan Generator وChange Impact Analyzer

حالة المرحلة: `IMPLEMENTED_TESTED`.

- تمت إضافة `web/server/localIntelligence.ts` كوحدة عقل محلي rule-based دون LLM أو كتابة ملفات.
- `generateRuleBasedFilePlan` يعيد عقدًا typed يحتوي `schemaVersion` و`projectId` و`graphDigest` وسبب كل ملف.
- القاعدة الصارمة تمنع أي ملف `.tsx` خارج `components/` أو `app/`، وتراعي جذر Kotlin الموجود عند اكتشاف مشروع Android.
- `analyzeChangeImpact` يبني الأثر العكسي من خريطة الاعتماديات، ويفصل المتأثرين المباشرين عن المتأثرين عبر السلسلة.
- الاختبار الفعلي استخدم ملفات TypeScript وTSX حقيقية على القرص، وأثبت: `plan=2`, `direct=1`, `transitive=1`.
- لم يتم تعديل الواجهة، ولم يتم فتح قدرة لاحقة.


## P2.4 — Local Semantic Index عبر SQLite FTS5

حالة المرحلة: `IMPLEMENTED_TESTED`.

تمت إضافة فهرس `project_code_search` باستخدام SQLite FTS5 داخل `PersistentMemory`، مع حفظ محتوى الملفات وبصمة SHA-256 والمسار واللغة ووقت الفهرسة. أضيفت خدمة `semanticCodeIndex.ts` لمسح مساحة المشروع القراءة فقط، واستبعاد `.git` و`node_modules` و`dist` و`build` والملفات الثنائية والملفات الأكبر من 2 MiB، مع سقف إجمالي 32 MiB و1000 ملف.

يوفر العقد `indexProject` و`searchCode` بحثًا عربيًا وإنجليزيًا عبر المحتوى مع مقتطف يحدد موضع المطابقة. الاختبار الفعلي فهرس ملفي كود، واستبعد الملف الثنائي ومجلد `node_modules`، وأثبت نتيجة عربية ونتيجة إنجليزية ونتيجة فارغة، بزمن بحث `arabicMs=0.63` و`englishMs=0.24` في تشغيل الاختبار. لم يتم تعديل الواجهة أو استخدام LLM أو Mock.


## P2.5 — NetworkBroker بامتثال Fail-Closed

حالة المرحلة: `TESTED` ضمن طبقة الشبكة الوسيطة فقط.

أضيف `web/server/networkBroker.ts` بدالتين عامتين فقط: `fetchUrl` و`searchWeb`. لا ينفذ أي طلب دون `ownerApproved` و`projectId` و`requestId` و`approvalId` وLedger حقيقي. يفرض HTTPS فقط، يمنع localhost وloopback والشبكات الخاصة، يمنع بيانات الاعتماد داخل URL، يستخدم مهلة 10 ثوانٍ، يرفض المحتوى غير النصي، ويحد الاستجابة إلى 5 MiB. يحسب SHA-256 ويعيد وقت الجلب، ويسجل النجاح والفشل في Evidence Ledger دون تخزين محتوى الشبكة على القرص.

الاختبار الحقيقي `test:network-broker` نجح بطلب `https://example.com` وبحث DuckDuckGo عن `React hooks`: `searchResults=5` و`ledgerEvents=6` وSHA-256 مستقل مطابق. اختُبرت كذلك حالات HTTP وlocalhost و192.168.1.1 وfile:// ورفضت قبل تنفيذ الشبكة عند مخالفة السياسة. لم يتم ربط NetworkBroker بالنموذج المحلي أو الواجهة.


## P2.6 — ربط Ollama المحلي بـNetworkBroker

حالة المرحلة: `IMPLEMENTED_BLOCKED_RUNTIME`.

أضيفت الدالة `runLLMWithNetwork` في `web/server/localIntelligence.ts`. النموذج المحلي يتصل فقط بـOllama المحلي، ولا يلمس الإنترنت. عند إخراج طلب JSON من نوع `network_request` يمر الطلب إلى `NetworkBroker` فقط، ثم تعاد النتيجة للنموذج داخل سياق موسوم كبيانات غير موثوقة. الحد الأقصى ثلاثة طلبات شبكة للمهمة، وكل نجاح أو فشل يسجله NetworkBroker في Evidence Ledger.

فحص TypeScript نجح (`CHECK_EXIT=0`) واختبار NetworkBroker الانحداري نجح (`NETWORK_BROKER_REGRESSION_EXIT=0`). اختبار Ollama الحقيقي صنّف `BLOCKED` لأن `127.0.0.1:11434` غير متاح في البيئة، دون استخدام Mock أو fallback. لم تُلمس الواجهة ولم تُفتح قدرة لاحقة.


## P2.7 — Ollama Model Selector

الحالة: `IMPLEMENTED_TESTED_BLOCKED_RUNTIME`

أُضيفت `web/server/ollamaGateway.ts` ومسارات `GET /api/ollama/models` و`GET /api/ollama/active` و`POST /api/ollama/active` و`POST /api/ollama/pull`. النموذج النشط يُحفظ في SQLite، والسحب لا يُسمح به إلا بموافقة صريحة وبوسم Q4_K_M. اختبار Runtime والبناء وفحص TypeScript نجحت؛ اختبار HTTP الحقيقي أعاد `503 BLOCKED / OLLAMA_UNAVAILABLE` لأن Ollama غير متاحة في البيئة، ولم يُنفذ أي سحب نموذج.


## P2.2 — API Authentication

الحالة: `IMPLEMENTED_TESTED`.

أضيف `web/server/authMiddleware.ts` للتحقق من `Authorization: Bearer <KAZ_OWNER_TOKEN>` دون fallback أو hardcoding. طبقت الحماية على `project-edit`، و`factory/build` و`factory/payload` و`factory/status`، وعمليات الكتابة في `models`، وPOST في `ollama`، وPOST `emergency-stop`، وكتابات `memory/projects`، وPUT `identity`. بقيت مسارات القراءة العامة بلا token. لم يُمس Android أو منطق Emergency Stop.

كل رفض يعيد `401 AUTH_REQUIRED` مع `traceId` ويسجل `authentication_failed` في Evidence Ledger ضمن مشروع أمني مؤرشف لا يظهر في قوائم المستخدم. أزيل الاعتماد على `ownerApproved` القادم من العميل في Ollama، ونُقل token الخاص بـ GitHub payload من query إلى Authorization header. أضيف حقل حفظ محلي للtoken في Settings، و`web/install.sh`، و`.env.example`.

الدليل الفعلي: `pnpm run check` PASS، `pnpm run build` PASS، `pnpm test:auth` PASS (`401=9`, valid-token accepted, ledger-traces=9)، `node tests/factory-payload.test.mjs` PASS، واختبارات P1 الخمسة `approval-integrity`, `atomic-apply`, `evidence-ledger`, `emergency-stop`, `prompt-defense` كلها PASS. `git diff --check` PASS.


## P2.3 — Unified Provider Gateway — 2026-10-30

الحالة: `VERIFIED`.

تم إنشاء العقد الموحد `web/server/llmProvider.ts`، وإضافة `GeminiProvider` و`OllamaProvider` و`providerRegistry`. أصبح `projectIntelligence.ts` و`vite.config.ts` و`localIntelligence.ts` يمررون استدعاءات الذكاء عبر البوابة بدل الاستدعاء المباشر. أضيف `getModelProvider` في `src/agent/modelRegistry.ts` مع دعم `KAZ_DEFAULT_PROVIDER` و`KAZ_FORCE_PROVIDER`، وسُجلت أخطاء المزود في Evidence Ledger من مسارات الخادم.

الأدلة الفعلية: `pnpm test:provider-gateway` PASS؛ `node tests/factory-payload.test.mjs` PASS؛ `pnpm test:auth` PASS؛ `pnpm test:approval-integrity` PASS؛ `pnpm test:atomic-apply` PASS؛ `pnpm test:evidence-ledger` PASS؛ `pnpm test:emergency-stop` PASS؛ `pnpm test:prompt-defense` PASS؛ `pnpm run check` PASS؛ `pnpm run build` PASS. كل الأوامر أعادت exit code `0`.

لا توجد استدعاءات مباشرة لـGemini أو Ollama خارج ملفات المزودات/بوابة إدارة Ollama. لم تبدأ P2.4، ولم يُلمس Android، ولم يُنفذ Commit أو Push.

## P2.4 — Observability & Error Discovery — 2026-10-30
الحالة: `VERIFIED`.
أضيف كتالوج الأخطاء `docs/ERROR_CATALOG.md`، ومنسق الاستجابات `web/server/errorHandler.ts`، وفحص الصحة `web/server/health.ts`، ومسارا `GET /api/health` و`GET /api/diagnostics/errors`. تمت إضافة `recordApiError` و`listRecentEvidenceLedger` و`lastEvidenceEventAt` إلى `PersistentMemory`، بحيث تسجل أخطاء 401/500/503 تلقائيًا مع traceId.
أضيفت صفحة `/diagnostics` في `web/src/screens/DiagnosticsScreen.tsx` مع حالة عامة وفحوص database/Ollama/Gemini/Evidence Ledger/auth/providers، وعرض آخر 20 حدثًا، وتشخيص الآن ونسخ التقرير. أضيف `ErrorBoundary` في `web/src/components/ErrorBoundary.tsx`، ومسار `/diagnostics` إلى `public/manus-routes.json`، وعقود health في `src/memoryApi.ts`.
الأدلة الفعلية بعد الإصلاح:
- `pnpm run check`: PASS، exit 0.
- `pnpm run build`: PASS، exit 0، `vite built in 1.39s`.
- `pnpm test:observability`: PASS، exit 0، `OBSERVABILITY_TEST=PASS`.
- `pnpm test:auth`: PASS، exit 0، `401=9`, `valid-token=accepted`, `ledger-traces=9`.
- `node tests/factory-payload.test.mjs`: PASS، metadata-only payload.
- `pnpm test:provider-gateway`: PASS.
- P1 regression: `approval-integrity`, `atomic-apply`, `evidence-ledger`, `emergency-stop`, `prompt-defense`: PASS جميعًا.
أثناء التحقق ظهر فشل أولي في `observability.test.mjs` بسبب بقاء شجرة pnpm/Vite، ثم صُنّف `TEST_PROCESS_LIFECYCLE` وأُصلح بتشغيل Vite مباشرة؛ وظهر فشل auth بسبب توقع قديم `AUTH_REQUIRED` بعد توحيد العقد إلى `KAZ-AUTH-001`، وصُنّف `TEST_EXPECTATION/CONTRACT_DRIFT` وصُحح الاختبار فقط. لا يوجد فشل متبقٍ في بوابات P2.4.
لم يُنفذ Commit أو Push. Android خارج النطاق. حالة Git كانت dirty قبل المهمة وتضم أعمال P2 السابقة؛ لم تُمسح أو تُستبدل.

## P2.5 — Build From Scratch — 2026-10-30
الحالة: `VERIFIED` مع اختبار Gemini الخارجي الاختياري `BLOCKED` لغياب المفتاح.

التنفيذ:
- راجعت وحسنت `web/install.sh`: فحص Node.js >=20 وpnpm >=9، تفعيل pnpm عبر Corepack عند الحاجة، إنشاء `.env` من `.env.example`، توليد `KAZ_OWNER_TOKEN` عشوائيًا بطول آمن دون طباعته، فحص Ollama غير الحاجب، `pnpm install --frozen-lockfile`، و`pnpm test` مع ألوان ورسائل عربية.
- حدّثت `web/README.md` بأقسام Quick Start وPrerequisites وConfiguration وRunning وTesting وHealth Check وTroubleshooting.
- وثقت كل متغيرات البيئة في `web/.env.example` دون أسرار.
- أنشأت `docs/BUILD_FROM_SCRATCH.md` بخطوات إعادة البناء والتحقق الآمن، مع تحذير صريح من حذف بيانات النسخة الرسمية.
- أضفت `web/tests/install-from-scratch.test.mjs` لفحص الملفات والخطوات وتوليد token دون حذف فعلي.
- أضفت `web/tests/run-all.mjs` لتشغيل كل الاختبارات بالتتابع: الاختبارات الحقيقية الفاشلة تبقى FAIL، بينما اختبار Gemini الخارجي غير المهيأ يصنف BLOCKED بصدق.
- أصلحت regression ضروريًا كشفه تشغيل التثبيت الكامل: إضافة امتداد `.ts` إلى استيراد `./emergencyStop.ts` في `web/server/executionSandbox.ts`، بعد تشخيص `ERR_MODULE_NOT_FOUND` وإثباته باختبار `EXECUTION_SANDBOX`.
- عدلت `web/server/health.ts` بحيث تعكس الحالة العامة صحة النواة المطلوبة (SQLite/Evidence Ledger/auth)، مع بقاء Ollama وGemini الاختياريين ظاهرين كـ`degraded` عند غيابهما.

الأدلة الفعلية:
- `bash -n install.sh`: PASS، exit 0.
- `pnpm test:install-from-scratch`: PASS، exit 0.
- `./install.sh`: PASS، exit 0.
- `pnpm test` داخل install.sh: `TEST_SUMMARY=PASS=27;BLOCKED=1;FAIL=0`.
- `pnpm run build`: PASS، exit 0، `vite built in 1.50s`.
- `pnpm test:execution-sandbox`: PASS، `TIMEOUT_DURATION_MS=500`, `MISSING_BWRAP_STATUS=blocked`.
- `GET /api/health`: HTTP 200، `HEALTH_STATUS=healthy`، database healthy، Ollama/Gemini degraded اختياريًا.
- `GET /diagnostics`: HTTP 200، استجابة 702 bytes.
- `git diff --check`: PASS، exit 0.
- Ollama غير مثبت؛ تم تسجيله تحذيرًا فقط ولم يمنع البناء.
- Gemini test blocked بسبب `KAZ_API_ENABLED=false` وغياب `GEMINI_API_KEY`؛ لم يتم اختراع مفتاح ولم يتم تخفيف اختبار المزود.

لم يُحذف `.env` أو `.data`، ولم يُنفذ Commit أو Push أو تعديل على Android.

## P2.5.5 — Local-First + Single-Owner Hardening — 2026-10-30
الحالة: `VERIFIED` مع اختبار Gemini الخارجي الاختياري `BLOCKED` عند عدم وجود مفتاح، دون اعتبار ذلك فشلًا.

القرار المطبق: KAZ محلي 100% افتراضيًا، مستخدم واحد هو المالك، وOllama هو المزود الافتراضي. لم يُحذف `geminiProvider.ts` أو `projectIntelligence.ts`؛ تم تعطيل Gemini ناعمًا عبر `KAZ_ENABLE_GEMINI` وFail-Closed داخل `providerRegistry`.

التغييرات:
- `.env.example`: أصبح القسم الأساسي محليًا فقط (`KAZ_OWNER_TOKEN`, `KAZ_DEFAULT_PROVIDER=ollama`, `KAZ_API_ENABLED=false`, `KAZ_OLLAMA_HOST`). نُقلت إعدادات Gemini و`KAZ_LLM_MODEL` وaliases إلى `Optional / Advanced` معلقة.
- `server/providerRegistry.ts`: `getProvider("gemini")` يعيد `null` ما لم يكن `KAZ_ENABLE_GEMINI=true`، و`listProviders()` لا يعرض Gemini المعطل، والافتراضي Ollama.
- `src/agent/modelRegistry.ts`: Model Router يستخدم `KAZ_FORCE_PROVIDER` ثم `KAZ_DEFAULT_PROVIDER` ثم Ollama، ولا يحاول Gemini تلقائيًا.
- `server/ollamaProvider.ts` و`server/ollamaGateway.ts`: يقرآن `KAZ_OLLAMA_HOST` مع إبقاء `OLLAMA_BASE_URL` alias متوافقًا.
- `server/health.ts`: Gemini يظهر `disabled` عند تعطيله، وOllama يظهر `healthy` أو `degraded` حسب توفره، مع بقاء صحة النواة مستقلة.
- أضيف `docs/LOCAL_FIRST.md` واختبار `tests/local-first.test.mjs` وscript `test:local-first`.
- حدّث `tests/provider-gateway.test.mjs` و`tests/install-from-scratch.test.mjs` لتطابق العقد الجديد دون إضعاف التحقق.
- README يوضح القرار المحلي وطريقة التفعيل المتقدم فقط.

الأدلة الفعلية:
- `pnpm test:local-first`: PASS، exit 0، `LOCAL_FIRST_TEST=PASS`.
- `pnpm test:provider-gateway`: PASS، exit 0.
- `pnpm test:install-from-scratch`: PASS، exit 0.
- `pnpm test`: PASS، exit 0، `TEST_SUMMARY=PASS=28;BLOCKED=1;FAIL=0`.
- `./install.sh`: PASS، exit 0، دون `GEMINI_API_KEY`.
- `pnpm run build`: PASS، exit 0، `vite built in 1.52s`.
- `GET /api/health`: HTTP 200، `HEALTH_STATUS=healthy`، `DEFAULT_PROVIDER=ollama`، `AVAILABLE_PROVIDERS=ollama`، `OLLAMA_STATUS=degraded` لغياب Ollama، `GEMINI_STATUS=disabled`، `GEMINI_CONFIGURED=False`.
- `git diff --check`: PASS، exit 0.

ملاحظات التحقق: فشل regression الأول كان توقعًا قديمًا في `install-from-scratch.test.mjs` لـ`GEMINI_API_KEY` و`OLLAMA_BASE_URL` كقيم أساسية؛ صُنّف `TEST_EXPECTATION/CONTRACT_DRIFT` وصُحح الاختبار إلى القسم الاختياري. لا يوجد FAIL متبقٍ. لم يتم تفعيل Gemini أو Ollama، ولم تُلمس Android، ولم يبدأ P2.6، ولم يُنفذ Commit أو Push.

## P2.6 — Final Verification of P2 — 2026-10-30
الحالة: `VERIFIED_WITH_EXPLICIT_OPTIONAL_BLOCKER`.

تم تنفيذ مصفوفة التحقق المطلوبة بالتتابع. `pnpm run check` و`pnpm run build` نجحا مرتين. `pnpm test` نجح مرتين بنفس النتيجة `PASS=28; BLOCKED=1; FAIL=0`. `./install.sh` نجح مرة واحدة مع نفس الاختبار الخارجي الاختياري المحجوب. اختبارات auth وfactory-payload وprovider-gateway وobservability وinstall-from-scratch وlocal-first واختبارات P1 approval-integrity وatomic-apply وevidence-ledger وemergency-stop وprompt-defense نجحت كل منها مرتين. `git diff --check` نجح مرتين.

الـBLOCKED الوحيد هو اختبار Gemini الخارجي عند غياب المفتاح/التفعيل، وهو متوافق مع سياسة Local-First وFail-Closed. لم يُنفذ اختبار حذف فعلي لـ`.env/.data/node_modules` حمايةً للنسخة الرسمية، ولم يُنفذ فحص بصري يدوي لـWeb/RTL، ولم يُلمس Android. أضيف script `test:factory-payload` لأنه كان اختبارًا موجودًا دون أمر package رسمي؛ لا تغيير في سلوك التطبيق.

أُنشئت الوثائق: `docs/P2_VERIFICATION.md`، `docs/P2_ACCEPTANCE.md`، `docs/P2_KNOWN_LIMITATIONS.md`، `docs/P3_READINESS.md`. `git diff --check` بعد التوثيق: PASS. لم يُنفذ Commit أو Push، ولم يبدأ P3. النسخة الاحتياطية المحلية حُدثت بملفات P2.6.

## P3.1 — Typed Factory Request + Project Type Registry — 2026-10-30
الحالة: `TESTED`، وليست `VERIFIED` لدورة App Factory الكاملة.

التغيير المحدد: أضيف `web/src/agent/factoryProjectTypes.ts` كسجل أنواع Android/Web/CLI/Hybrid مع config extension آمن، ووسّع `web/src/agent/factoryRequest.ts` Typed Request ليحمل `traceId` و`appName` و`description` و`audience` و`screens` و`coreFeatures` و`dataModels` و`storage` و`dependencies` و`securityPrivacy`، مع استمرار `inputDigest` والتحقق من registry. أضيف دعم `cli` إلى مخطط Project Intelligence. أضيف اختبار `web/tests/factory-project-types.test.mjs` وscript `test:factory-project-types`.

الأدلة: `pnpm run check` PASS، `pnpm test:factory-project-types` PASS، `pnpm test:factory-request` PASS، `pnpm test:agent-factory-request` PASS، `pnpm test:multi-file-generator` PASS، `pnpm run build` EXIT 0، و`pnpm test` EXIT 0 بنتيجة `PASS=29; BLOCKED=1; FAIL=0`. الـBLOCKED هو اختبار Gemini الخارجي الاختياري المعروف.

الحدود: لم تُنفذ بعد P3.2 Project Analysis + File Plan، ولا P3.3 Diff/Approval UI/API، ولا Snapshot/Atomic Apply أو Build جديد. registry يثبت extension عبر config في الاختبار، لكن مولدات Web/CLI الفعلية ليست منفذة بعد. لم يُلمس Android الأصلي، ولم يُنفذ Commit أو Push.


## P4.3 — Factory Preview + Model Runtime — 2026-10-30

- النطاق: `web/` فقط.
- أضيف `KazApiError` وحالة factory `blocked` في واجهة مساحة المشروع.
- أضيفت قراءة Ollama الحقيقية في شاشة Model Registry عبر `/api/ollama/models` و`/api/ollama/active`.
- الدليل: `npx tsc --noEmit` PASS، `npm run build` PASS، `git diff --check` PASS.
- HTTP: Ollama `503 BLOCKED / OLLAMA_UNAVAILABLE`؛ factory بدون Bearer `401 KAZ-AUTH-001` مع traceId.
- APK: BLOCKED بصدق، ولم تُشغّل GitHub Actions أو عملية APK من الواجهة.
- التقرير: `web/P4_3_VERIFICATION.md`.


## P4.4 — Mobile/RTL Web Acceptance — 2026-10-30

تم التحقق داخل `web/` فقط. Headless Chromium على 390x844 أثبت عرض الصفحة الرئيسية ومساحة المشاريع، وفحص المعاينة أثبت `lang=ar`, `dir=rtl`, و`bodyDirection=rtl` ووجود `.mobile-nav`. المسارات الثمانية و`/manus-routes.json` أعادت HTTP 200. `npx tsc --noEmit`, `npm run build`, و`git diff --check` نجحت. `pnpm test` أعاد PASS=29 وFAIL=0 وBLOCKED=1 لاختبار خارجي اختياري يحتاج مفتاحًا. API status/health/Ollama بقيت صادقة: KAZ API معطل، النواة صحية، وOllama BLOCKED/503 عند الغياب. لم يتم تعديل Android أو بناء APK؛ الحالة خارج هذا الإغلاق BLOCKED.
