# KAZ — Build From Scratch

هذا الدليل يشرح إعادة إعداد Web App من نسخة مستودع KAZ جديدة دون حذف بيانات المستخدم أو تعديل تطبيق Android.

## المتطلبات

- Node.js 20 أو أحدث.
- pnpm 9 أو أحدث؛ `install.sh` يحاول تفعيله عبر Corepack.
- Python 3 لتحديث `.env` تلقائيًا.
- Ollama اختياري فقط للمزود المحلي.

## الإعداد من مستودع جديد

```bash
git clone https://github.com/ksaasm99-star/KAZ-.git
cd KAZ-
cd web
./install.sh
pnpm dev
```

يؤدي `install.sh` إلى:

1. فحص Node.js ورفض الإصدارات الأقدم من 20.
2. توفير pnpm ورفض الإصدارات الأقدم من 9.
3. إنشاء `.env` من `.env.example` عند غيابه.
4. توليد `KAZ_OWNER_TOKEN` عشوائيًا إذا كان مفقودًا أو placeholder أو أقصر من 32 محرفًا.
5. فحص Ollama مع تحذير غير حاجب عند غيابه أو توقفه.
6. تشغيل `pnpm install --frozen-lockfile`.
7. تشغيل `pnpm test`، الذي يبدأ بفحص TypeScript ثم اختبارات Web. الاختبار الذي يتطلب مفتاح Gemini صالحًا يُصنّف `BLOCKED` عند غياب المفتاح، بينما يبقى أي فشل حقيقي سببًا لفشل التثبيت.

لا يطبع السكربت قيمة token، ولا يحذف `.env` أو `.data` أو `node_modules`.

## التحقق بعد التشغيل

```bash
curl http://localhost:3000/api/health
```

يجب أن يعيد الخادم JSON بحالة عامة `healthy` عندما تكون نواة KAZ (SQLite وEvidence Ledger وauth) سليمة، مع إبقاء Ollama/Gemini الاختياريين مفصلين كـ`degraded` عند غيابهما. افتح `/diagnostics` لمراجعة الحالة والأخطاء الأخيرة.

## فحص البناء والإنتاج المحلي

```bash
pnpm run check
pnpm run build
pnpm preview
```

نجاح `build` يثبت تجميع Web فقط، ولا يثبت تشغيل Android أو توفر Ollama أو Gemini.

## اختبار مسار البناء من الصفر بأمان

اختبار `pnpm test:install-from-scratch` لا يحذف أي ملف. يفحص وجود `install.sh` و`.env.example` وREADME وهذا الدليل، ويتحقق نصيًا من خطوات التثبيت وتوليد token.

للتجربة الواقعية على جهاز منفصل أو نسخة عمل مؤقتة، نفذ الخطوات التالية بعد التأكد من أن النسخة ليست مصدر بياناتك الوحيد:

```bash
cp -a web /path/to/kaz-web-scratch
cd /path/to/kaz-web-scratch
rm -rf node_modules .env .data
./install.sh
pnpm dev
```

لا تنفذ أمر `rm -rf` داخل نسخة KAZ الرسمية أو على بيانات المستخدم. الاختبار المدمج متعمد ألا ينفذ الحذف.

## استكشاف الأعطال

- `Node.js` قديم: ثبّت Node 20+ ثم أعد `./install.sh`.
- `pnpm` غير موجود: ثبّت Corepack أو pnpm 9+ ثم أعد السكربت.
- Ollama غير متاح: تابع تشغيل Web؛ سيظهر المزود المحلي `BLOCKED` أو `degraded`.
- Gemini غير متاح: راجع `GEMINI_API_KEY` و`KAZ_API_ENABLED` في `.env`، دون وضع السر في Git.
- خطأ API: افحص `/diagnostics` و`GET /api/diagnostics/errors` وكتالوج `../docs/ERROR_CATALOG.md`.
- فشل اختبار: احتفظ بأول خطأ ورمز الخروج، ثم شغّل الاختبار المحدد بدل حذف البيانات أو تعطيل الحماية.

## حدود الدليل

هذا الدليل لا ينشئ Docker أو CI بديلًا، ولا يغير تطبيق Android، ولا يثبت أن التطبيق يعمل على جهاز Android. تلك عمليات مستقلة تحتاج أدلة خاصة بها.
