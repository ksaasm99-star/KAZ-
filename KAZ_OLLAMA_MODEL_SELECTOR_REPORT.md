# KAZ — Ollama Model Selector

## النطاق

أُضيفت بوابة خادمية محلية لإدارة Ollama فقط، دون تعديل الواجهة ودون تشغيل سحب نموذج تلقائيًا. المسارات هي:

- `GET /api/ollama/models`
- `GET /api/ollama/active`
- `POST /api/ollama/active`
- `POST /api/ollama/pull`

حالة الفشل مغلقة: إذا لم تكن Ollama متاحة، تعيد المسارات `503` مع JSON من الشكل `{ "ok": false, "status": "BLOCKED", "reason": "OLLAMA_UNAVAILABLE" }`.

## التنفيذ

الملف الأساسي هو `web/server/ollamaGateway.ts`. لا يستدعي KAZ أمرًا shell ولا يشغّل `ollama pull` مباشرة؛ يتصل فقط بواجهة Ollama المحلية `http://127.0.0.1:11434`، بمهلة 10 ثوانٍ، ولا ينفذ السحب إلا مع `ownerApproved: true`.

النموذج النشط يُحفظ في جدول SQLite الموجود أصلًا عبر المفتاح `ollama.active_model` داخل `memory_metadata`، لذلك لا يضيع بعد إعادة تشغيل الخادم.

سياسة Q4_K_M تمنع الوسوم غير المحددة. الطلب `qwen2.5-coder:7b` يُحوّل إلى الوسم الصريح `qwen2.5-coder:7b-instruct-q4_K_M`. أما `qwen2.5-coder:14b` فيُستخدم بوسمه الرسمي؛ صفحة Ollama الرسمية تعرضه بحجم 9.0GB وبـ`Q4_K_M`. لا توجد في واجهة `/api/pull` خانة مستقلة لاختيار quantization؛ التحكم يكون من خلال model tag.

## الاختبارات الفعلية

بيئة الاختبار: Ollama غير مثبتة وغير مستمعة على `127.0.0.1:11434`.

```text
OLLAMA_BIN=
OLLAMA_HTTP=curl: (7) Failed to connect to 127.0.0.1 port 11434
MEMORY=13Gi total, 3.3Gi used, 10Gi available
CPU=6
DISK=/dev/root 49G total, 39G available
```

```text
pnpm run check
CHECK_EXIT=0

pnpm run test:ollama-gateway
Ollama Model Selector Runtime: PASS (service=BLOCKED, pull=BLOCKED, q4Policy=PASS)
OLLAMA_TEST_EXIT=0

pnpm run build
✓ built in 1.55s
BUILD_EXIT=0
```

فحص HTTP المباشر:

```text
GET /api/ollama/models
{"ok":false,"status":"BLOCKED","reason":"OLLAMA_UNAVAILABLE"}
HTTP_STATUS=503

GET /api/ollama/active
{"ok":false,"status":"BLOCKED","reason":"OLLAMA_UNAVAILABLE"}
HTTP_STATUS=503

POST /api/ollama/pull
{"ok":false,"status":"BLOCKED","reason":"OLLAMA_UNAVAILABLE"}
HTTP_STATUS=503
```

اختبار الموافقة أثبت أيضًا أن السحب بلا `ownerApproved: true` يُرفض بـ`OLLAMA_OWNER_APPROVAL_REQUIRED`، وأن وسمًا غير Q4_K_M مثل `qwen2.5-coder:7b-q8_0` يُرفض بـ`Q4_K_M_MODEL_TAG_REQUIRED`.

## تقييم Qwen 14B في البيئة الحالية

المتوفر حاليًا نحو 10GiB RAM و39GB تخزين. حجم Qwen2.5-Coder 14B الرسمي هو 9.0GB، لذلك التخزين كافٍ، لكن هامش الذاكرة ضيق بعد احتساب runtime وKV cache ونظام التشغيل. التوصية التشغيلية الحالية هي البدء بـ7B Q4_K_M بحجم 4.7GB. يمكن تجربة 14B لاحقًا بعد توفر هامش ذاكرة أكبر، وليس اعتباره اختيارًا افتراضيًا آمنًا لهذه البيئة.

## الملفات

- `web/server/ollamaGateway.ts`
- `web/server/persistentMemory.ts`
- `web/vite.config.ts`
- `web/tests/ollama-gateway.test.mjs`
- `web/package.json`

## References

[1]: https://ollama.com/library/qwen2.5-coder:7b-instruct-q4_K_M "Ollama Qwen2.5-Coder 7B Q4_K_M"
[2]: https://ollama.com/library/qwen2.5-coder:14b "Ollama Qwen2.5-Coder 14B"
[3]: https://github.com/ollama/ollama/blob/main/docs/api.md "Ollama API reference"
[4]: https://docs.ollama.com/modelfile "Ollama Modelfile reference"
