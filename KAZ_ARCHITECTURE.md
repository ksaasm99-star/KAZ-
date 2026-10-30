# KAZ Architecture

## الحالة والمرجع

هذه الوثيقة تصف المعمارية الحالية الفعلية في KAZ كما جُردت بتاريخ 2026-10-30. مصدر الحقيقة هو `KAZ_SYSTEM_INVENTORY.md`، مع HEAD محلي `0e24b91d803214f02ba287aba6bf00de91cdb288`. هذه الوثيقة لا تثبت نجاح تشغيل GitHub Actions أو APK أو Gemini وقت التشغيل.

## حدود النظام

النطاق الحالي هو Web App داخل `web/` مع مستخدم واحد ومساحة مشروع مستقلة. تطبيق Android الموجود خارج نطاق تعديل هذه المرحلة. Git وGitHub Actions يمثلان تكاملًا خارجيًا للمصنع، ولا يُعتبر الاتصال الخارجي ناجحًا إلا بدليل تشغيل فعلي.

## الطبقات الحالية

| الطبقة | المالك | المسؤولية | الحالة |
|---|---|---|---|
| UI | `web/src/App.tsx` و`web/src/screens/*` | التنقل، المشاريع، المحادثة، البناء، النماذج والإعدادات | موجود؛ تحقق الواجهة السابق موثق في الاستمرارية |
| Client API | `web/src/memoryApi.ts` | عقود HTTP واستدعاء الخادم | موجود |
| Vite API | `web/vite.config.ts` | مسارات الذاكرة، المحادثة، المصنع، النماذج والتعديل | موجود؛ يحتاج اختبارات تكامل أوسع |
| Persistent memory | `web/server/persistentMemory.ts` | SQLite/WAL/FTS5 والمشاريع والأحداث | موجود ومفحوص مصدرًا |
| Project RAG | `web/server/projectRag.ts` | استرجاع أدلة نصية من ذاكرة المشروع | موجود نصيًا؛ ingestion خارجي/دلالي غير مثبت |
| Agent | `web/src/agent/*` | AgentTask وحلقة قراءة وأدلة وحارس إكمال | قراءة فقط حاليًا |
| Safe edit | `web/server/workspacePolicy.ts` و`projectEditGateway.ts` | عزل المسار، Diff، SHA، موافقة، تطبيق ذري محدود | موجود؛ snapshot/rollback الكامل يحتاج إغلاقًا |
| Factory | `web/factory-template` و`.github/workflows/build-apk.yml` | قالب Android وcompile/build/evidence/artifact | التصميم موجود؛ تشغيل خارجي غير مثبت |
| Engines | `web/src/engine/*` | عقود السحابي والمحلي واختيار المزود | عقود موجودة؛ runtime محلي غير مثبت |

## تدفق المصنع المستهدف

```text
ProjectChat أو Factory UI
  -> typed request
  -> Project Manifest + File Plan
  -> Planner/Policy
  -> Diff مع SHA
  -> موافقة single-use من المستخدم
  -> Snapshot
  -> Atomic Apply داخل workspace
  -> compile/lint/test
  -> verification.json
  -> GitHub Actions أو build محلي موثق
  -> APK/artifact مع SHA
```

التدفق الحالي يحقق أجزاءً من هذا المسار: محادثة المشروع، dispatch للمصنع، Diff وموافقة، وقراءة compile/build evidence. لا يوجد بعد عقد typed موحد يربط كل المراحل ولا vertical slice كامل مثبت.

## قرارات معمارية ملزمة للمرحلة الأولى

1. توسيع المكونات الحالية بدل إنشاء مصنع أو Agent أو Model Registry ثانٍ.
2. إبقاء `AgentTask` في وضع القراءة والتخطيط والاقتراح حتى يمر الناتج عبر Policy وDiff وموافقة بشرية.
3. جعل SQLite مصدر الحالة الدائمة للمشاريع والأحداث والأدلة، مع عدم استخدام `localStorage` كمصدر حقيقة.
4. ربط كل عملية تعديل بـ`projectId` و`requestId` وSHA قبل/بعد العملية.
5. فصل نجاح compile وbuild والartifact والتشغيل إلى حالات مستقلة.
6. اعتبار المحتوى الخارجي بيانات غير موثوقة وعدم السماح له بتجاوز Policy.
7. عدم تفعيل Gemini أو GitHub Actions تلقائيًا في بيئة لا تحتوي إعداداتهما.

## حدود ومخاطر معروفة

- `KAZ_API_ENABLED` غير مضبوط حاليًا، وبالتالي محرك `/api/build` غير مفعل.
- `KAZ_GITHUB_TOKEN` غير مثبت في بيئة الجرد؛ dispatch الخارجي غير مثبت.
- `projectEditGateway` يحتاج اختبار تكامل دائم للتراجع والفشل الجزئي.
- `AgentTask` لا ينتج `filePlan` typed بعد.
- قالب Android الحالي Shell/WebView وليس مولد تطبيق متعدد الملفات كاملًا.
- لا توجد اختبارات emulator/device ضمن scripts الحالية.

## قرار المرحلة التالية

القدرة الأولى فقط هي `Typed Factory Request`. لا تبدأ Multi-file Generation أو قدرات أخرى حتى ينجح عقد الطلب typed وفحوصه ويُسجل ذلك في `KAZ_VERIFICATION_REPORT.md`.
