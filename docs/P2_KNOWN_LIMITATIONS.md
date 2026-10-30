# KAZ P2 Known Limitations

| # | العنصر | الحالة | الأثر |
|---:|---|---|---|
| 1 | Ollama غير مثبت في بيئة التحقق | NOT_RUN / BLOCKED | لم يُثبت استدلال محلي حقيقي؛ Health يعرض Ollama `degraded` |
| 2 | Gemini | BLOCKED عمدًا | لا يوجد مفتاح، و`KAZ_ENABLE_GEMINI=false`؛ المسار Fail-Closed |
| 3 | حذف فعلي لـ`.data/.env/node_modules` | NOT_RUN | لم تُحذف بيانات النسخة الرسمية؛ تم استخدام اختبار static وinstall آمن |
| 4 | Android | NOT_RUN | خارج نطاق P2، مؤجل لمرحلة Android اللاحقة |
| 5 | الفحص البصري الكامل لـWeb UI | NOT_RUN | تحقق HTTP/static فقط؛ لم تُنفذ مراجعة مرئية يدوية شاملة |
| 6 | اختبار RTL اليدوي | NOT_RUN | RTL مدعوم في المصدر، لكن لم يُثبت عبر جلسة تفاعل بصرية |
| 7 | تشغيل Gemini بعد التفعيل | NOT_RUN | لم يُختبر `KAZ_ENABLE_GEMINI=true` بمفتاح حقيقي |
| 8 | إضافة Health check دون تعديل health.ts | UNVERIFIED | المعمارية قابلة للتوسعة، لكن معيار الإضافة دون تعديل الكود لم يُثبت حرفيًا |
| 9 | عقد `code` في كل أخطاء API | PARTIAL | العقد الحالي المثبت يستخدم `error`، `message`، `traceId`، `hint`، `timestamp` |

## ما لا تعنيه هذه الحدود

لا تعني هذه البنود أن P2 المحلي فشل. تعني أن الأدلة المتاحة لا تثبت تشغيل Ollama/Gemini أو اختبار Android/RTL البصري أو تجربة pristine destructively، ولذلك بقيت الحالات صريحة.
