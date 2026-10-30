# KAZ System Inventory

## 1. بيانات الجرد

| الحقل | القيمة المثبتة |
|---|---|
| المشروع | KAZ — Private AI Engineering Studio |
| المستودع | https://github.com/ksaasm99-star/KAZ-.git |
| مسار نسخة العمل | `/home/ubuntu/kaz-work` |
| النسخة الاحتياطية | `/home/ubuntu/kaz-backup` |
| تاريخ الجرد | 2026-10-30 |
| نطاق هذه المرحلة | اكتشاف وجرد فقط؛ لا كتابة كود ولا تعديل Android |
| الفرع المحلي | `main` |
| HEAD المحلي | `0e24b91d803214f02ba287aba6bf00de91cdb288` |
| `origin/main` المفحوص | `4cc58703f1cf4d2032a8e3365f8a114d2263df4d` |
| علاقة الفرع | المحلي متقدم بتعديلين عن `origin/main` |
| حالة الشجرة | غير نظيفة؛ توجد ملفات معدلة وملفات غير متتبعة |
| `KAZ_API_ENABLED` أثناء الجرد | غير مضبوط في البيئة؛ وبحسب الكود تكون قيمته الفعلية `false` |
| قرار Git في هذه المرحلة | لا commit، لا push، لا merge، لا reset، لا clean |

مصدر الأدلة: أوامر `git branch --show-current`, `git rev-parse HEAD`, `git rev-parse --verify origin/main`, `git status --short --branch`, `git remote -v`، وقراءة ملفات KAZ الحالية.

## 2. حماية العمل قبل الجرد

- كان `KAZ_SYSTEM_INVENTORY.md` موجودًا، لكنه كان يحمل مسارًا تاريخيًا `/tmp/kaz-work`؛ قُرئ أولًا ثم حُدّث هذا الإصدار للحالة الحية في `/home/ubuntu/kaz-work`.
- تم التأكد من وجود `/tmp/kaz-backup` قبل إنشاء الملف.
- لم تُستخدم أوامر مدمرة، ولم تُحذف أو تُستبدل أي تغييرات محلية.
- التغييرات الموجودة في الشجرة سُجلت كما هي ولم تُعتبر جزءًا من هذه المرحلة.

## 3. حالة Git والتغييرات الموجودة

### ملفات معدلة مسبقًا

- `.github/workflows/build-apk.yml`
- `KAZ_WEB_CONTINUITY.md`
- `web/server/persistentMemory.ts`
- `web/src/App.tsx`
- `web/src/agent/agentTask.ts`
- `web/src/agent/executionLoop.ts`
- `web/src/agent/index.ts`
- `web/src/agent/modelRegistry.ts`
- `web/src/agent/projectManifest.ts`
- `web/src/index.css`
- `web/src/memoryApi.ts`
- `web/src/screens/ConversationScreen.tsx`
- `web/src/screens/ProjectWorkspaceScreen.tsx`
- `web/src/screens/SettingsScreen.tsx`
- `web/tests/agent-runtime.test.mjs`
- `web/vite.config.ts`

### ملفات غير متتبعة موجودة مسبقًا

- `.github/workflows/gitleaks-pr.yml`
- `.gitleaks.toml`
- `KAZ_MODEL_MANAGEMENT_RESEARCH.md`
- `KAZ_REVIEW_REPORT.md`
- `KAZ_WEB_RESEARCH_GAP_REPORT.md`
- `TODO.md`
- `plan.md`
- `web/server/node-shims.d.ts`
- `web/server/projectEditGateway.ts`
- `web/server/projectRag.ts`
- `web/server/workspacePolicy.ts`
- `web/src/agent/completionGate.ts`
- `web/src/agent/identity.ts`
- `web/src/agent/identityGuard.ts`
- `web/src/agent/projectExpert.ts`
- `web/src/agent/selfVerification.ts`
- `web/src/screens/ModelManagementScreen.tsx`
- `web/src/voice/`
- `web/tests/workspace-policy.test.mjs`

هذه القائمة وصف لحالة ما قبل تقرير الجرد، وليست موافقة على دمجها أو رفعها.

## 4. التقنية الفعلية

| المجال | الحالة المثبتة |
|---|---|
| الواجهة | React 19 + TypeScript + Vite |
| التنسيق | `web/src/index.css` مخصص؛ لا يظهر اعتماد Tailwind في `web/package.json` الحالي |
| اتجاه الواجهة | العربية وRTL موجودان في النصوص والتخطيط الحالي |
| تصميم الشاشات | Mobile-first مع قواعد media queries في CSS |
| التخزين | SQLite عبر `node:sqlite` في `web/server/persistentMemory.ts` |
| API | مسارات Vite middleware داخل `web/vite.config.ts` |
| النموذج السحابي | Gemini عند تفعيل `KAZ_API_ENABLED` وتوفير `GEMINI_API_KEY` |
| النموذج المحلي | Provider/Model Registry موجودان كعقود ومسارات؛ التشغيل المحلي الفعلي غير مثبت في هذا الجرد |
| مصنع Android | قالب داخل `web/factory-template` وWorkflow GitHub Actions |
| التغليف Android لاحقًا | مذكور كهدف معماري في سجل الاستمرارية؛ لم يُنفذ Capacitor في هذه المرحلة |

## 5. قائمة ملفات `web/` الحالية

### الجذر والإعدادات

- `web/README.md`
- `web/index.html`
- `web/package.json`
- `web/pnpm-lock.yaml`
- `web/public/manus-routes.json`
- `web/tsconfig.json`
- `web/tsconfig.app.json`
- `web/tsconfig.node.json`
- `web/vite.config.ts`

### الواجهة والتنقل

- `web/src/main.tsx`
- `web/src/App.tsx`
- `web/src/index.css`
- `web/src/project.ts`
- `web/src/memoryApi.ts`
- `web/src/screens/HomeScreen.tsx`
- `web/src/screens/ConversationScreen.tsx`
- `web/src/screens/ProjectWorkspaceScreen.tsx`
- `web/src/screens/BuildScreen.tsx`
- `web/src/screens/ModelManagementScreen.tsx`
- `web/src/screens/SettingsScreen.tsx`

### محركات ومزودو KAZ

- `web/src/engine/provider.ts`
- `web/src/engine/cloudProvider.ts`
- `web/src/engine/localProvider.ts`
- `web/src/engine/createKazProvider.ts`

### الوكيل وسياق المشروع

- `web/src/agent/AGENT_ARCHITECTURE_NOTES.md`
- `web/src/agent/agentTask.ts`
- `web/src/agent/executionLoop.ts`
- `web/src/agent/index.ts`
- `web/src/agent/readOnlyTools.ts`
- `web/src/agent/projectManifest.ts`
- `web/src/agent/projectExpert.ts`
- `web/src/agent/identity.ts`
- `web/src/agent/identityGuard.ts`
- `web/src/agent/completionGate.ts`
- `web/src/agent/selfVerification.ts`
- `web/src/agent/modelRegistry.ts`

### الخادم والتخزين

- `web/server/persistentMemory.ts`
- `web/server/projectRag.ts`
- `web/server/projectEditGateway.ts`
- `web/server/workspacePolicy.ts`
- `web/server/node-shims.d.ts`

### الإدخال الصوتي

- `web/src/voice/speechInput.ts`

### الاختبارات

- `web/tests/agent-runtime.test.mjs`
- `web/tests/workspace-policy.test.mjs`

### قالب مصنع APK

- `web/factory-template/build.gradle.kts`
- `web/factory-template/gradle.properties`
- `web/factory-template/settings.gradle.kts`
- `web/factory-template/app/build.gradle.kts`
- `web/factory-template/app/src/main/AndroidManifest.xml`
- `web/factory-template/app/src/main/assets/index.html`
- `web/factory-template/app/src/main/java/com/kaz/shell/MainActivity.java`
- `web/factory-template/app/src/main/res/values/strings.xml`

## 6. المكونات ووظائفها

| المكون | الموقع | الوظيفة الحالية |
|---|---|---|
| لوحة KAZ | `web/src/App.tsx`, `HomeScreen.tsx` | التنقل بين المحادثة والمشاريع والبناء والإعدادات والنماذج |
| مساحة المشروع | `ProjectWorkspaceScreen.tsx` | مصادر، معرفة، محادثة، هوية، مصنع APK، معاينة build، Diff |
| المحادثة العامة | `ConversationScreen.tsx` | محادثة عامة عبر طبقة API الحالية |
| ذاكرة المشاريع | `persistentMemory.ts` | حفظ المشاريع والمصادر والمعرفة والرسائل والأحداث في SQLite |
| البحث/RAG النصي | `projectRag.ts` + FTS5 | استرجاع أدلة المشروع النصية وإلحاقها بالرد |
| خبير المشروع | `projectExpert.ts` | إنشاء سياق خبير بناء من Project Manifest |
| حارس الهوية | `identityGuard.ts` | فحص طلبات وردود الهوية بحسب الإعدادات |
| حلقة الوكيل | `executionLoop.ts` | تنفيذ محدود لأدوات القراءة مع evidence وtimeout/cancel |
| عقد AgentTask | `agentTask.ts` | تعريف المهمة والأدوات المسموحة والحدود الزمنية والخطوات |
| بوابة الإكمال | `completionGate.ts` | منع إعلان النجاح دون حالات تحقق محددة |
| التحقق الذاتي | `selfVerification.ts` | فحوص ذاتية مرتبطة بحالة الوكيل |
| سياسة مساحة العمل | `workspacePolicy.ts` | احتواء المسار ومنع traversal وsymlink وكتابة غير مسموحة |
| منفذ التعديل | `projectEditGateway.ts` | اقتراح Diff وحفظ SHA وموافقة/رفض وتطبيق ذري محدود |
| مصنع التطبيقات | `vite.config.ts` + `build-apk.yml` | dispatch إلى GitHub Actions، polling، compile/build evidence، رابط APK |
| الإدخال الصوتي | `speechInput.ts` | SpeechRecognition عربي مع fallback كتابي ورسالة خطأ |
| سجل النماذج | `modelRegistry.ts` + API | تعريف/حفظ/تحقق SHA وخطة تنزيل؛ تشغيل نموذج محلي فعلي غير مثبت |

## 7. الخدمات ومسارات API المثبتة

المسارات معرفة داخل `web/vite.config.ts`، وأهمها:

- `/api/identity`: قراءة وتحديث هوية KAZ.
- `/api/build`: تحليل مسودة عبر Gemini عند تفعيل API؛ يعيد `KAZ_API_DISABLED` عندما لا يكون العلم فعالًا.
- `/api/project-chat`: محادثة مشروع مع عزل `projectId`، هوية، RAG، أو dispatch مصنع عند اكتشاف أمر build.
- `/api/global-chat`: المحادثة العامة.
- `/api/status`: حالة الخدمة.
- `/api/memory/projects`: إنشاء وقراءة وتحديث المشاريع.
- `/api/memory/projects/archived`: قراءة المشاريع المؤرشفة.
- `/api/memory/projects/:id/restore`: استعادة مشروع مؤرشف.
- `/api/memory/search`: بحث GET/POST في الفهرس.
- `/api/memory/health`: صحة SQLite والفهرسة.
- `/api/factory/build`: بدء تشغيل مصنع APK.
- `/api/factory/status`: قراءة حالة GitHub Actions وverification/diagnostics.
- `/api/models`: إدارة سجل النماذج.
- `/api/models/:id/verify`: التحقق من ملف النموذج وبصمة SHA-256.
- `/api/models/:id/download-plan`: إنشاء خطة تنزيل.
- `/api/project-edit`: `propose`, `approve`, `reject` لمسودة تعديل آمن.

### حالة الاتصال الخارجي

- `KAZ_API_ENABLED` غير مضبوط في بيئة الجرد، ولذلك `apiEnabled` في المصدر يساوي `false`.
- مسار `/api/build` يعيد 503 ولا يرسل طلب Gemini عندما يكون العلم معطلًا.
- مسار `/api/project-chat` يعالج أمر مصنع APK قبل شرط API، لكنه يحتاج إعداد GitHub فعليًا (`KAZ_GITHUB_TOKEN`) لتشغيل المصنع.
- لا توجد في هذا الجرد قيمة سر أو مفتاح مكشوف.

## 8. قاعدة البيانات والمخطط

`web/server/persistentMemory.ts` يثبت الآتي:

- `PRAGMA journal_mode = WAL`.
- جداول المشاريع والمصادر والمعرفة والرسائل والأحداث وسجل النماذج والبيانات الوصفية.
- جداول المصدر الحالية: `projects`, `project_sources`, `project_knowledge`, `project_messages`, `memory_events`, `model_registry`, `memory_metadata`.
- فهرس موحد `memory_search` باستخدام FTS5.
- فهارس حسب المشروع والتاريخ.
- `schema_version` يبدأ من 2 ويُرفع إلى 3 عند الترحيل الموجود.
- دعم الأرشفة والاستعادة عبر `archived_at` وعزل المشروع في الاستعلامات.
- تسجيل أحداث المشروع والمصنع والتحقق والتعديل والوكيل.
- صحة التخزين تعرض SQLite وschema version وFTS5 وعدد السجلات والمشاريع والنماذج.

الحالة: **موجودة ومقروءة من المصدر**؛ اختبار دورة كاملة جديد ليس جزءًا من المرحلة صفر.

## 9. مصنع التطبيقات

المسار الحالي:

```text
ProjectWorkspace / project-chat
→ isFactoryBuildCommand
→ dispatchFactoryBuild
→ GitHub repository_dispatch
→ .github/workflows/build-apk.yml
→ compileDebugKotlin
→ assembleDebug
→ verification.json + artifact
→ polling من /api/factory/status
→ FactoryLivePreview داخل محادثة المشروع
```

الموجود في المصدر:

- قالب Android WebView/Shell داخل `web/factory-template`.
- حقن بيانات المشروع في HTML و`strings.xml` بحسب سجل الاستمرارية السابق.
- خطوات منفصلة لـcompile وbuild في Workflow.
- رفع دليل التحقق حتى مع فشل الخطوات بحسب التغيير المحلي المسجل.
- قراءة diagnostics وcompile/build من GitHub Actions في الخادم والواجهة.

غير المثبت في هذه المرحلة:

- تشغيل GitHub Actions خارجي فعلي مرتبط بـcommit جديد.
- تثبيت APK وتشغيله على جهاز أو محاكي.
- توليد مشروع Android متعدد الملفات من مواصفة typed كاملة: أُنجز توليد FilePlan داخل الذاكرة واختُبر؛ لم تُطبق الملفات على workspace.
- دورة snapshot/rollback كاملة موثقة من المصنع إلى artifact.

## 10. الاختبارات الموجودة والفجوات

### ملفات الاختبار الموجودة

1. `web/tests/agent-runtime.test.mjs`
   - نجاح حلقة AgentTask.
   - الإلغاء قبل البدء.
   - انتهاء المهلة.
   - فشل أداة البحث.
   - evidence وCompletion Gate وسياق الخبير.

2. `web/tests/workspace-policy.test.mjs`
   - containment.
   - منع المسار المطلق وpath traversal.
   - allowlist الكتابة.
   - symlink.
   - atomic write.
   - optimistic SHA conflict.

### أوامر المشروع الحالية

- `pnpm run check`
- `pnpm run build`
- `pnpm run test:agent-runtime`
- `pnpm run test:multi-file-generator` لاختبار توليد 6 ملفات Android.
- لا يوجد script مستقل حاليًا لتشغيل `workspace-policy.test.mjs`.

### الفجوات المرصودة

- لا توجد suite تكامل دائمة تغطي كامل مسار `project-chat → project-edit → factory → verification`.
- لا يوجد اختبار API دائم لـpropose/approve/reject مع snapshot وrollback وفشل منتصف التطبيق.
- لا يوجد اختبار Android emulator/device مثبت في هذه البيئة.
- تشغيل GitHub Actions خارجي غير مثبت في هذا الجرد.
- اختبارات UI/RTL/mobile الآلية غير موجودة ضمن scripts الحالية.
- اختبار تشغيل النموذج المحلي والتحميل الفعلي غير مثبت.

## 11. التكرار والمخاطر المحددة

### تكرار أو تعارض محتمل

- يوجد مسار `/api/build` للتحليل ومسار `/api/factory/build` للمصنع؛ وظيفتهما المعلنة مختلفة، لكن يحتاجان توثيقًا معماريًا حتى لا يختلط التحليل بالتنفيذ.
- توجد شاشة `BuildScreen` وبطاقة مصنع داخل `ProjectWorkspaceScreen`؛ البطاقة هي المسار المدمج الحالي، بينما يلزم التأكد من أن شاشة البناء لا تنشئ مسارًا موازيًا عند التطوير اللاحق.
- سجل الاستمرارية يذكر Tailwind، بينما `package.json` الحالي لا يحتوي Tailwind؛ الحقيقة التنفيذية الحالية هي CSS مخصص.
- توجد طبقة `localProvider` وسجل نماذج، لكن دليل التشغيل المحلي الفعلي غير موجود في هذه المرحلة.

### مخاطر عالية تستحق المرحلة التالية

- الشجرة غير نظيفة والفروق غير ملتزمة؛ أي تعديل عشوائي قد يخلط مراحل متعددة.
- المحلي متقدم عن `origin/main` بتعديلين مع وجود تغييرات غير متتبعة؛ لا يجوز إعلان أن GitHub يحتوي الحالة الحالية.
- موافقة التعديل مرتبطة بالـSHA في المصدر، لكن snapshot/rollback الكامل وسجل rollback المستقل يحتاجان اختبار تكامل.
- `AgentTask` الحالي يسمح بأدوات قراءة فقط؛ الربط المنظم مع `filePlan` و`projectEditGateway` غير مكتمل.
- `verification.json` موجود في تصميم المصنع، لكن لا يوجد تشغيل خارجي جديد يثبت artifact فعليًا.
- `KAZ_API_ENABLED` غير مفعل في بيئة الجرد؛ محادثة Gemini غير قابلة للإثبات من هذه البيئة دون إعداد صريح.

## 12. حالة الوثائق المطلوبة في أمر KAZ

| الوثيقة | الحالة عند الجرد |
|---|---|
| `KAZ_SYSTEM_INVENTORY.md` | موجودة ومحدّثة للحالة الحية في `/home/ubuntu/kaz-work` |
| `KAZ_ARCHITECTURE.md` | موجودة وغير متتبعة حاليًا |
| `KAZ_FEATURE_MATRIX.md` | موجودة وغير متتبعة حاليًا |
| `KAZ_IMPLEMENTATION_ROADMAP.md` | موجودة وغير متتبعة حاليًا |
| `KAZ_VERIFICATION_REPORT.md` | موجودة وغير متتبعة حاليًا |
| `KAZ_TEST_AND_ACCEPTANCE_PLAN.md` | موجودة وغير متتبعة حاليًا |
| `KAZ_WEB_CONTINUITY.md` | موجودة وهي سجل الاستمرارية الحالي للويب |
| `KAZ_WEB_RESEARCH_GAP_REPORT.md` | موجودة كتقرير فجوات بحثي |

لا تُعتبر الوثائق الناقصة مكتملة بمجرد وجود تقارير بديلة؛ تحتاج قرارًا وتنفيذًا في مراحل لاحقة.

## 13. حكم المرحلة صفر

- الجرد: **UPDATED / CURRENT**.
- كتابة كود التطبيق ضمن هذه العملية: **NOT_RUN / لم تُنفذ**.
- تعديل ملفات `web/` ضمن هذه العملية: **لم يحدث**.
- تعديل Android: **لم يحدث**.
- الاختبارات الجديدة ضمن هذه العملية: **NOT_RUN**؛ تم فحص النتائج المسجلة سابقًا دون إعادة تشغيلها.
- Commit: **NOT_RUN**.
- Push: **NOT_RUN**.
- تحديث النسخة الاحتياطية للجرد: **تم بعد التحقق من الملف**؛ لم يُعدل كود التطبيق.

## 14. الخطوة الوحيدة التالية

بعد مراجعة هذا الجرد، المرحلة التالية هي إنشاء `KAZ_ARCHITECTURE.md` و`KAZ_FEATURE_MATRIX.md` و`KAZ_IMPLEMENTATION_ROADMAP.md` و`KAZ_TEST_AND_ACCEPTANCE_PLAN.md` من الحالة المثبتة، دون تعديل كود. لا تبدأ قدرة من القدرات الـ12 قبل إغلاق وثائق ما بعد الجرد أو صدور توجيه صريح بتغيير ترتيب المرحلة.


## 15. تحديث الحالة الحية — 2026-10-30T04:37Z

هذا القسم هو المرجع الأحدث عند تعارض أي قيمة تاريخية أعلاه معه. تم تنفيذ قراءة فقط وتحديث هذا الملف التوثيقي، دون تعديل كود أو Git action.

| الحقل | القيمة الحالية المثبتة |
|---|---|
| Workspace | `/home/ubuntu/kaz-work` |
| Backup | `/home/ubuntu/kaz-backup` |
| Repository | `https://github.com/ksaasm99-star/KAZ-.git` |
| Branch | `main` |
| HEAD | `0e24b91d803214f02ba287aba6bf00de91cdb288` |
| origin/main | `4cc58703f1cf4d2032a8e3365f8a114d2263df4d` |
| Relation | `HEAD` متقدم باثنين عن `origin/main` (`0 2` بصيغة `origin/main...HEAD`) |
| KAZ_API_ENABLED | غير مضبوط في البيئة (`<unset>`)، والقيمة التنفيذية في `web/vite.config.ts:17` هي `false` لأن المقارنة تتطلب النص `true` |
| api/ | غير موجود في جذر المستودع |
| Worktree | غير نظيف؛ توجد تغييرات معدلة وملفات غير متتبعة، ولم تُمسح أو تُستبدل |
| Git action | لا Commit، لا Push، لا Merge، لا Reset، لا Clean |
| Scope | KAZ فقط |

### ملفات الجذر الحالية

- `.env`
- `.env.example`
- `.github`
- `.gitignore`
- `.gitleaks.toml`
- `KAZ_ARCHITECTURE.md`
- `KAZ_FEATURE_MATRIX.md`
- `KAZ_IMPLEMENTATION_ROADMAP.md`
- `KAZ_MODEL_MANAGEMENT_RESEARCH.md`
- `KAZ_OPERATING_CONSTITUTION.md`
- `KAZ_REVIEW_REPORT.md`
- `KAZ_SYSTEM_INVENTORY.md`
- `KAZ_TEST_AND_ACCEPTANCE_PLAN.md`
- `KAZ_VERIFICATION_REPORT.md`
- `KAZ_WEB_CONTINUITY.md`
- `KAZ_WEB_RESEARCH_GAP_REPORT.md`
- `LICENSE`
- `README.md`
- `TODO.md`
- `UNIVERSAL_PROJECT_OPERATING_CONSTITUTION.md`
- `app`
- `build.gradle.kts`
- `gradle`
- `gradle.properties`
- `metadata.json`
- `plan.md`
- `scripts`
- `settings.gradle.kts`
- `tmp`
- `web`

### ملفات المصدر والخادم والاختبارات وWorkflows الحالية

- `.github/workflows/build-apk.yml`
- `.github/workflows/gitleaks-pr.yml`
- `.github/workflows/web-agent-runtime.yml`
- `web/server/multiFileGenerator.ts`
- `web/server/node-shims.d.ts`
- `web/server/persistentMemory.ts`
- `web/server/projectEditGateway.ts`
- `web/server/projectRag.ts`
- `web/server/workspacePolicy.ts`
- `web/src/App.tsx`
- `web/src/agent/AGENT_ARCHITECTURE_NOTES.md`
- `web/src/agent/agentTask.ts`
- `web/src/agent/completionGate.ts`
- `web/src/agent/executionLoop.ts`
- `web/src/agent/factoryRequest.ts`
- `web/src/agent/factoryRequestAdapter.ts`
- `web/src/agent/identity.ts`
- `web/src/agent/identityGuard.ts`
- `web/src/agent/index.ts`
- `web/src/agent/modelRegistry.ts`
- `web/src/agent/projectExpert.ts`
- `web/src/agent/projectManifest.ts`
- `web/src/agent/readOnlyTools.ts`
- `web/src/agent/selfVerification.ts`
- `web/src/engine/cloudProvider.ts`
- `web/src/engine/createKazProvider.ts`
- `web/src/engine/localProvider.ts`
- `web/src/engine/provider.ts`
- `web/src/index.css`
- `web/src/main.tsx`
- `web/src/memoryApi.ts`
- `web/src/project.ts`
- `web/src/screens/BuildScreen.tsx`
- `web/src/screens/ConversationScreen.tsx`
- `web/src/screens/HomeScreen.tsx`
- `web/src/screens/ModelManagementScreen.tsx`
- `web/src/screens/ProjectWorkspaceScreen.tsx`
- `web/src/screens/SettingsScreen.tsx`
- `web/src/voice/speechInput.ts`
- `web/tests/agent-factory-request.test.mjs`
- `web/tests/agent-runtime.test.mjs`
- `web/tests/factory-request.test.mjs`
- `web/tests/multi-file-generator.test.mjs`
- `web/tests/workspace-policy.test.mjs`

### إحصاءات الشجرة

- ملفات Git المتتبعة: `158`.
- ملفات غير متتبعة: `31`.
- الملفات المعدلة المتتبعة والملفات غير المتتبعة محفوظة في القسمين السابقين وفي ناتج `git status --short --branch` المسجل عند التحديث.

### قائمة التغييرات الحالية كما ظهرت في Git

```text
## main...origin/main [ahead 2]
 M .github/workflows/build-apk.yml
 M KAZ_WEB_CONTINUITY.md
 M web/package.json
 M web/server/persistentMemory.ts
 M web/src/App.tsx
 M web/src/agent/agentTask.ts
 M web/src/agent/executionLoop.ts
 M web/src/agent/index.ts
 M web/src/agent/modelRegistry.ts
 M web/src/agent/projectManifest.ts
 M web/src/index.css
 M web/src/memoryApi.ts
 M web/src/screens/ConversationScreen.tsx
 M web/src/screens/ProjectWorkspaceScreen.tsx
 M web/src/screens/SettingsScreen.tsx
 M web/tests/agent-runtime.test.mjs
 M web/vite.config.ts
?? .github/workflows/gitleaks-pr.yml
?? .gitleaks.toml
?? KAZ_ARCHITECTURE.md
?? KAZ_FEATURE_MATRIX.md
?? KAZ_IMPLEMENTATION_ROADMAP.md
?? KAZ_MODEL_MANAGEMENT_RESEARCH.md
?? KAZ_REVIEW_REPORT.md
?? KAZ_SYSTEM_INVENTORY.md
?? KAZ_TEST_AND_ACCEPTANCE_PLAN.md
?? KAZ_VERIFICATION_REPORT.md
?? KAZ_WEB_RESEARCH_GAP_REPORT.md
?? TODO.md
?? plan.md
?? web/server/multiFileGenerator.ts
?? web/server/node-shims.d.ts
?? web/server/projectEditGateway.ts
?? web/server/projectRag.ts
?? web/server/workspacePolicy.ts
?? web/src/agent/completionGate.ts
?? web/src/agent/factoryRequest.ts
?? web/src/agent/factoryRequestAdapter.ts
?? web/src/agent/identity.ts
?? web/src/agent/identityGuard.ts
?? web/src/agent/projectExpert.ts
?? web/src/agent/selfVerification.ts
?? web/src/screens/ModelManagementScreen.tsx
?? web/src/voice/
?? web/tests/agent-factory-request.test.mjs
?? web/tests/factory-request.test.mjs
?? web/tests/multi-file-generator.test.mjs
?? web/tests/workspace-policy.test.mjs
```

### جواب المالك المطلوب

- **HEAD الحالي:** `0e24b91d803214f02ba287aba6bf00de91cdb288`
- **KAZ_API_ENABLED:** غير مضبوط (`unset`)؛ والتطبيق يعامله كـ`false`.
- **حالة الجرد:** `CURRENT / DELIVERED` لهذا المسار.
- **القدرة الثالثة Approval Integrity:** `NOT_STARTED` بناءً على طلب الإيقاف.
