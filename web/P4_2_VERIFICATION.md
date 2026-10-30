# P4.2 — المحادثة والصوت وحارس الهوية

## النطاق

هذه الدفعة تخص `web/` فقط. لم تُعدّل ملفات Android، ولم تُنفذ عملية APK داخل هذه الدفعة.

## المنفذ

- `ConversationScreen` يستخدم خطاف `useSpeechInput` الموجود مسبقًا باللغة العربية `ar-SA`.
- الإدخال الكتابي والصوتي يمرران عبر العقد نفسه `sendGlobalMessage(message, inputMode)`.
- الخادم يقبل `inputMode` بقيمتي `text` و`voice` ويرفض القيم غير المعروفة.
- حارس الهوية الموجود في الخادم يفحص الطلب والرد عند تفعيل هوية المحادثة العامة.
- زر تشغيل/إيقاف الهوية يحفظ الحالة عبر `PUT /api/identity`، ويتطلب Bearer Token حقيقيًا.
- عند غياب token تعيد العملية `401 KAZ-AUTH-001`، ولا يوجد تجاوز من الواجهة.

## الأدلة

- `npx tsc --noEmit`: PASS، exit code 0.
- `npm run build`: PASS، exit code 0.
- `POST /api/global-chat` مع `inputMode=voice` أثناء `KAZ_API_ENABLED=false`: BLOCKED، HTTP 503، `KAZ_API_DISABLED`، مع `traceId`.
- `PUT /api/identity` دون Bearer Token: BLOCKED، HTTP 401، `KAZ-AUTH-001`، مع `traceId`.
- لم يُرسل طلب إلى مزود الذكاء أثناء حالة API المعطلة.

## APK

حالة APK: `BLOCKED`.

السبب المثبت: نسخة العمل الحالية لا تحتوي على `gradlew`، ولا يتوفر Android SDK في `/home/ubuntu/android-sdk` أو المسارات البديلة المفحوصة، ولا تتوفر `gradle` أو `sdkmanager` أو `adb`. كذلك فإن P4.2 لم يدمج Web داخل تطبيق Android؛ لذلك لا يصح نسبة ميزات Web إلى APK غير مبني.

لم يُستخدم APK قديم أو أرشيف مصدر غير موثق بدل البناء من المصدر الحالي.
