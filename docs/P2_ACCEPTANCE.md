# KAZ P2 Acceptance

**تاريخ التحقق:** 2026-10-30 09:13 +03:00  
**الحكم:** `P2_ACCEPTED_WITH_EXPLICIT_OPTIONAL_BLOCKER`  
**P3:** لم يبدأ؛ يتطلب توقيع المالك.

| # | المعيار | الدليل | الحالة |
|---:|---|---|---|
| 1 | لا تسريب بيانات إلى GitHub | `factory-payload.test.mjs`: unauthorized=401، dispatch metadata-only، payload من API | PASS |
| 2 | كل مسار حساس محمي بـtoken | `auth.test.mjs`: 401=9، valid-token accepted، ledger traces=9 | PASS |
| 3 | Emergency Stop لا يتذبذب | تشغيلان من `test:emergency-stop`، وكلاهما PASS؛ full suite أيضًا PASS | PASS |
| 4 | كل ذكاء يمر عبر LLMProvider | `provider-gateway.test.mjs` تشغيلان PASS، direct-calls=PASS | PASS |
| 5 | Error Catalog موحد | `docs/ERROR_CATALOG.md` و`test:observability` تشغيلان PASS | PASS |
| 6 | Health Check يعمل | `/api/health` HTTP 200 و`HEALTH_STATUS=healthy` | PASS |
| 7 | Diagnostics Dashboard موجودة | `/diagnostics` HTTP 200 و`test:observability` PASS مرتين | PASS |
| 8 | install.sh يعمل من الصفر | `./install.sh` exit 0، و`install-from-scratch` PASS مرتين | PASS_WITH_PRISTINE_LIMIT |
| 9 | KAZ محلي 100% افتراضي | `local-first.test.mjs` PASS، default=ollama، available=ollama، Gemini disabled | PASS |
| 10 | مستخدم واحد فقط | Bearer token واحد، `auth.test.mjs` يقبل token الصحيح ويرفض غيره | PASS |
| 11 | P1 regression | `pnpm test` يضم اختبارات P1 وخرج 28 PASS/1 BLOCKED/0 FAIL مرتين | PASS_WITH_OPTIONAL_BLOCKED |
| 12 | P2.1-P2.5 regression | factory-payload، auth، provider-gateway، observability، install-from-scratch، local-first: كل منها PASS مرتين | PASS |

## حدود القبول

الـBLOCKED الوحيد هو اختبار Gemini الحقيقي الاختياري، لأن KAZ مصمم Local-First و`KAZ_ENABLE_GEMINI=false` ولا يوجد مفتاح. لا يُعد ذلك فشلًا في P2 المحلي، لكنه يعني أن اعتماد Gemini السحابي غير متحقق.

اختبار الحذف الفعلي لـ`.env/.data/node_modules` لم يُنفذ على النسخة الرسمية حمايةً للبيانات؛ تم تنفيذ install فعلي دون حذف، واختبار static آمن لمسار البناء من الصفر.

لم يُنفذ Commit أو Push، ولم يبدأ P3. اعتماد P2 من ناحية الكود والاختبارات المحلية يحتاج توقيع المالك قبل فتح P3.
