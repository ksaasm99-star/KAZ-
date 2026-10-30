# KAZ Feature Matrix

مرجع الحالة: `KAZ_SYSTEM_INVENTORY.md`، HEAD `0e24b91d803214f02ba287aba6bf00de91cdb288`، تاريخ التقييم 2026-10-30.

الحالات المستخدمة: `FOUND`, `PARTIAL`, `IMPLEMENTED_UNVERIFIED`, `TESTED`, `NOT_FOUND`, `BLOCKED`.

| # | القدرة الأساسية | المكون الحالي | الحالة | ما ثبت | الفجوة/معيار الإغلاق |
|---:|---|---|---|---|---|
| 1 | Typed Factory Request | `web/src/agent/factoryRequest.ts`, `factoryRequestAdapter.ts`, `executionLoop.ts` | TESTED | عقد versioned، تحقق صارم، SHA-256، كشف العبث، محول AgentTask read-only، واختبار Runtime ناجح | persistence/API دون تنفيذ مباشر |
| 2 | Multi-file Generation | `web/server/multiFileGenerator.ts` | TESTED | توليد 6 ملفات Android مترابطة من TypedFactoryRequest، package/namespace/entry point متسقة، digest للخطة، واختبار Runtime ناجح | ربط FilePlan بمسار proposal/approval ثم التطبيق الذري؛ لم تُكتب الملفات بعد |
| 3 | Approval Integrity | `projectEditGateway.ts`, `/api/project-edit`, `memoryApi.ts` | TESTED | رمز موافقة عشوائي أحادي الاستخدام، مربوط بـSHA السابق لكل ملف، مع expiry وفحص SHA حقيقي قبل الاعتماد | snapshot/rollback والتطبيق الذري خارج هذه القدرة ولم يُعدّل |
| 4 | Atomic Apply + Snapshot | `workspacePolicy.ts`, `projectEditGateway.ts` | PARTIAL | atomic write وrollback best-effort مذكوران واختبار policy موجود | snapshot دائم قبل التطبيق، كشف partial apply، واستعادة مثبتة |
| 5 | Execution Sandbox | `workspacePolicy.ts` | PARTIAL | احتواء المسارات ومنع symlink/allowlist | عزل الشبكة والأسرار والذاكرة والتنفيذ الخارجي مع اختبار حدود |
| 6 | Planner → Policy → Approval → Executor | `agent/executionLoop.ts`, `projectEditGateway.ts` | PARTIAL | الوكيل قراءة فقط ومنفذ التعديل منفصل | مخرج Planner typed يمر صراحة عبر Policy قبل Approval/Executor |
| 7 | Evidence Ledger | `persistentMemory.ts`, `selfVerification.ts` | PARTIAL | أحداث ودليل وكيل وأدلة مصنع محفوظة | سلسلة request/spec/diff/approval/apply/verify/build/product قابلة للتتبع |
| 8 | `verification.json` | `build-apk.yml`, `vite.config.ts` | IMPLEMENTED_UNVERIFIED | Workflow يذكر verification وقراءة compile/build | تشغيل خارجي فعلي يثبت commitSha وtestResults وartifactSHA |
| 9 | Recovery Manager | `projectEditGateway.ts`, `recoveryManager.ts`, `persistentMemory.ts` | TESTED | Journal دائم، استعادة Snapshot، Ledger rollback | اختبار Runtime بعد انقطاع مفترض؛ القدرة #10 لم تبدأ |
| 10 | Task Recovery + Idempotency | `persistentMemory.ts`, `taskRecovery.ts` | TESTED | SQLite task store، checkpoints، resume بعد restart، ومنع dispatch المكرر | ربط Emergency Stop خارج هذه القدرة |
| 11 | Emergency Stop | `emergencyStop.ts`, `executionPipeline.ts`, `executionSandbox.ts` | VERIFIED | نقطة إيقاف مركزية وحالة `EMERGENCY_STOPPED` وتحويل المهام إلى `PAUSED` | اختبار إيقاف فعلي مع Approval صالح وSandbox |
| 12 | Prompt Injection Defense | `promptDefense.ts`, `executionLoop.ts`, `executionPipeline.ts`, `projectRag.ts` | VERIFIED | فصل البيانات عن التعليمات وتطهيرها ورفض المقترحات المحقونة | اختبار injection فعلي وانحدار الوكيل والمنفذ والبناء |

## القدرات المؤجلة عمدًا

Digital Twin وSimulation وAdversarial Lab وAI Evaluation وEmbeddings وVoice وPWA ليست جزءًا من تنفيذ المرحلة الأولى حسب أمر KAZ، حتى لو كان بعضها موجودًا جزئيًا في الكود السابق. لا تُفتح قبل إغلاق القدرات الأساسية بالترتيب.

## القرار

القدرة الوحيدة المفتوحة للتنفيذ الآن هي رقم 1. بقية القدرات تبقى غير مكتملة أو غير مثبتة ولا يجوز إعلانها `VERIFIED` من هذه المصفوفة.


## Addendum — P1.5 Atomic Apply + Snapshot — 2026-10-30

| القدرة | الحالة | الدليل | الحدود |
|---|---|---|---|
| Approval inputDigest binding | TESTED | `test:approval-integrity` exit 0؛ تغيير الطلب يُرفض | يعمل عند تمرير TypedFactoryRequest إلى مسار التعديل |
| Atomic Apply + Snapshot | TESTED | `test:atomic-apply` exit 0؛ rollback فعلي بعد فشل منتصف التطبيق | Snapshot مؤقت، ولا توجد بعد Sandbox أو تنفيذ أوامر |


## Correction — Persistent Snapshot — 2026-10-30

| القدرة | الحالة المحدثة | الدليل الجديد |
|---|---|---|
| Atomic Apply + Snapshot | TESTED | `.kaz-snapshots/` داخل مساحة المشروع، و`test:persistent-snapshot` يثبت القراءة بعد Restart |
| Recovery persistence | PARTIAL | Snapshot دائم على القرص مثبت؛ سجل SQLite واستعادة تلقائية بعد crash ما زالا خارج القدرة الرابعة |

## Addendum — P1.6 Execution Sandbox — 2026-10-30

| القدرة | الحالة المحدثة | الدليل | الحدود |
|---|---|---|---|
| 5. Execution Sandbox | TESTED | `test:execution-sandbox` exit 0؛ منع قراءة `/etc/passwd`، منع socket خارجي، إخفاء الأسرار، وإيقاف timeout فعلي | لم يُربط بعد بحلقة Planner/Policy/Approval؛ ذلك هو نطاق القدرة #6 ولم يبدأ |

## Correction — P1.6 Rootless Bubblewrap — 2026-10-30

| القدرة | الحالة | الدليل | المتبقي |
|---|---|---|---|
| 5. Execution Sandbox | TESTED | `test:execution-sandbox` exit 0؛ bwrap rootless، network/filesystem/secret isolation، timeout 501ms، وBLOCKED عند غياب bwrap | تثبيت bwrap وRootless namespace في Runtime الإنتاج، دون فتح القدرة #6 |

## Addendum — P1.7 Planner → Policy → Approval → Executor — 2026-10-30

| القدرة | الحالة | الدليل | المتبقي |
|---|---|---|---|
| 6. Planner → Policy → Approval → Executor | TESTED | `test:execution-pipeline` exit 0؛ رفض الكتابة من Planner، رفض المسار خارج Policy، رفض approval مزور، وتطبيق ناجح بعد Approval | Evidence Ledger في القدرة #7 |

بعد إغلاق القدرة السادسة، القدرة المفتوحة التالية فقط هي رقم 7 Evidence Ledger. لا تُفتح أي قدرة أخرى في هذه الدورة.


## P1.8 — verification.json

الحالة: `IMPLEMENTED_TESTED`. مولّد موحّد مبني على Evidence Ledger، مع correlation للموافقة والتنفيذ، inputDigest من السجل، SHA-256 فعلي للـArtifact، ورفض مغلق عند فقد أي دليل. اختباره Runtime وفحص TypeScript وبناء الويب ناجحة. Recovery Manager وTask Recovery منفذان ومختبران؛ القدرة #11 Emergency Stop خارج النطاق.

## تصحيح حالة القدرة #9 — Recovery Manager
الحالة: `TESTED`. Journal دائم، كشف `APPLYING/FAILED`، استعادة Snapshot فعلية، وتسجيل Rollback في Evidence Ledger مثبتة باختبار Runtime. القدرة #10 لم تبدأ.


## P1.10 — Task Recovery + Idempotency — 2026-10-30

الحالة: `TESTED`.

أضيف `web/server/taskRecovery.ts` وجدول SQLite الدائم `task_recovery`. ثبت الاختبار منع التكرار بالمفتاح الفريد، الاستئناف من checkpoint بعد إعادة تشغيل Vite، وتحويل المهمة إلى `FAILED` عند غياب خطة الاستئناف. القدرة #11 Emergency Stop لم تبدأ.


## P1.11 — Emergency Stop — 2026-10-30

الحالة: `TESTED`.

الدليل: نقطة API مركزية، حارس Executor، حارس Bubblewrap Sandbox، وحالة SQLite `PAUSED` للمهام قيد التنفيذ. الاختبار الفعلي `test:emergency-stop` أثبت رفض Approval صالح، حجب Sandbox، وتحويل المهمة إلى `PAUSED`. القدرة #12 موثقة في القسم التالي.

## P1.12 — Prompt Injection Defense

الحالة: `VERIFIED`.

الدليل: `web/src/agent/promptDefense.ts`، تطهير `projectRag.ts` و`vite.config.ts`، حارس `executionLoop.ts`، ورفض السياسة في `executionPipeline.ts`. الاختبار `test:prompt-defense` أثبت حجب الحقن، عدم وصوله للأدوات، ورفض مسودة التعديل، مع نجاح الانحدار والبناء.
