# KAZ — تقرير اختبار القبول الشامل End-to-End

**التاريخ:** 2026-10-30 05:36 (+03:00)

## النتيجة

**E2E_VERTICAL_SLICE=PASS_WITH_LIMITATION**

نجحت دورة KAZ الفعلية من طلب Typed Factory Request حتى `verification.json`، مع اختبار الطوارئ وحقن التعليمات. لم يتم ادعاء إنتاج APK؛ artifact الناتج هو حزمة مصدر Android حقيقية مضغوطة، لأن هذه الدورة لم تشغّل Android Gradle compile النهائي.

## تسلسل الدورة المثبت

1. **Typed Factory Request:** PASS — تم إنشاء طلب Todo حقيقي والتحقق من `inputDigest` بصيغة SHA-256.
2. **Multi-file Generation:** PASS — تم توليد 6 ملفات Android فعلية، مع `planDigest`.
3. **Planner + Policy + Diff:** PASS — تم إنشاء Diff لمسودة الملفات، وقُبلت السياسة داخل مساحة المشروع فقط.
4. **Approval Integrity:** PASS — الموافقة ارتبطت بالـSHA وبـ`inputDigest` وبشاهد استخدام واحد.
5. **Atomic Apply + Snapshot:** PASS — طُبقت الملفات عبر المنفذ المصرح فقط، وأنشئ Snapshot دائم قبل التطبيق.
6. **Execution Sandbox / compile:** PASS — فحص الملفات داخل `bubblewrap-rootless` مع عزل الشبكة والأسرار وحدود الموارد، والنتيجة `COMPILE_OK`.
7. **Build Artifact:** PASS — أنشئ artifact فعلي داخل العزل: `artifacts/todo-android-source.tar.gz` بحجم 1371 bytes، والنتيجة `BUILD_OK`.
8. **Evidence Ledger:** PASS — 6 أحداث مترابطة مع Hash Chain صالح:
   `factory_request_prepared -> request_approved -> execution_completed -> factory_build_verified -> artifact_created -> verification_artifact_created`.
9. **verification.json:** PASS — أنشئ من Evidence Ledger، ويحتوي `projectId`, `requestId`, `inputDigest`, نتائج compile/build، مسار artifact، وSHA-256 للartifact.
10. **Emergency Stop:** PASS — تحولت المهمة إلى `PAUSED`، رُفض Executor رغم وجود موافقة صالحة، وحُجب Sandbox بحالة `EMERGENCY_STOPPED`.
11. **Prompt Injection Defense:** PASS — رُفض محتوى الملف الخبيث بالسياسة، ولم تصل أدوات التنفيذ إليه، ولم تحدث كتابة على نظام الملفات.

## الأدلة الرقمية

- **Project ID:** `kaz-e2e-todo-1793327776335`
- **Request ID:** `request-kaz-e2e-todo-1793327776335`
- **Input Digest:** `sha256:e2d7e5a2ad9af9523916e45e2aec1ac2de73bc659f8b4b83f36ee383c6cb38e7`
- **Artifact SHA-256:** `5d9375781a79b3926a16af8e37a9aa7410c59fe7df308e3c3bf7430678e6133a`
- **Snapshot:** `snapshot-022919a5-2691-47fe-a2a6-533e7df4f8a9`
- **Approval Event:** `6d797871-84d1-435e-9020-5aaf0a71fcc7`
- **Execution Event:** `717610c7-4c3c-4156-a148-f8d00cc14021`
- **Sandbox backend:** `bubblewrap-rootless`

## التحقق والأخطاء

نجح اختبار Sandbox الأساسي الموجود مسبقًا برمز خروج `0`، بما يشمل رفض قراءة النظام، رفض الشبكة، عزل الأسرار، واختبار timeout.

ظهرت أثناء تشغيل اختبار الدورة مشكلتان في مشغل الاختبار فقط، وتم إصلاحهما دون تعديل كود KAZ: تشغيل المشغل خارج جذر Web منع تحميل Vite، ثم كان مسار `MainActivity.kt` ثابتًا بينما المولد ينتج اسم package يتضمن الطابع الزمني. بعد التصحيح نجحت الدورة كاملة.

تحذير Vite حول `optimizeDeps.disabled` وتحذير SQLite التجريبي غير مؤثرين على النتيجة، ولم يتحولا إلى فشل.

## الحد المتبقي

لم تُنفذ عملية Android Gradle compile حقيقية ولم يُنتج ملف APK في هذه الدورة. السبب أن الطلب العام داخل Sandbox محظور شبكيًا، والمشروع المولد لا يحتوي Gradle Wrapper أو cache مستقلًا. لذلك حالة APK الفعلية: **NOT_PROVEN**، وليست PASS.

## الملفات الناتجة

- `KAZ_E2E_VERIFICATION.json`: نسخة ثابتة من `verification.json` الناتج فعليًا.
- مسار الدليل التشغيلي الأصلي داخل مساحة الاختبار: `.data/kaz-e2e-workspace-1793327776335/e2e-report.json`.
