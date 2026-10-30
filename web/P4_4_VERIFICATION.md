# KAZ Web — P4.4 Verification

**النطاق:** `/home/ubuntu/kaz-work/web` فقط. لم يتم تعديل Android ولم يتم بناء APK.

## فحص العرض الهاتفي وRTL

- Headless Chromium على `390x844` التقط الصفحة الرئيسية ومساحة المشاريع بنجاح.
- الصفحة الرئيسية ومساحة المشاريع ظهرتا دون انكسار أفقي ظاهر، مع بطاقات وشريط تنقل سفلي مناسبين للهاتف.
- فحص DOM في المعاينة: `lang=ar`، `dir=rtl`، و`bodyDirection=rtl`.
- مسار `/app` يحتوي `.mobile-nav` وشريط التنقل السفلي.
- عدد المشاريع الظاهر في قاعدة البيانات: `107`، وهي بيانات اختبار موجودة مسبقًا؛ لم تُحذف أو تُعدّل ضمن P4.4.

## المسارات

- `/`, `/app`, `/app/new`, `/app/conversation`, `/app/settings`, `/app/models`, `/app/diagnostics`: HTTP `200`.
- `/manus-routes.json`: HTTP `200`، وعدد المسارات المعلن `8`، وجميعها تبدأ بـ`/`.

## بوابات الكود والاختبار

| البوابة | النتيجة |
|---|---|
| `npx tsc --noEmit` | PASS (exit 0) |
| `npm run build` | PASS (exit 0) |
| `pnpm test` | PASS: 29، FAIL: 0، BLOCKED: 1 اختياري |
| `git diff --check` | PASS (exit 0) |
| `GET /api/status` | HTTP 200، `enabled=false` بصدق |
| `GET /api/health` | HTTP 200، النواة healthy وOllama degraded بسبب الغياب |
| `GET /api/ollama/models` | HTTP 503، `BLOCKED / OLLAMA_UNAVAILABLE` |

الاختبار الاختياري `factory-intelligence.test.mjs` صُنّف `BLOCKED` لأنه يتطلب مزودًا خارجيًا ومفتاحًا صالحًا. لم يُحوّل إلى نجاح وهمي.

## APK

الحالة `BLOCKED` خارج P4.4: هذه الدفعة تحقق Web فقط، وتعطيل `KAZ_API_ENABLED` وغياب Ollama يمنعان ادعاء جاهزية APK. لا يوجد أي APK ناتج من هذه الدفعة.
