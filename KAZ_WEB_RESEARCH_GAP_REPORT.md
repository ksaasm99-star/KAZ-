# تقرير فجوات KAZ: الحالة المثبتة، النواقص، والأولوية التنفيذية

## القرار التنفيذي

KAZ يملك أساسًا حقيقيًا ومختبرًا جزئيًا: مساحة مشروع RTL، عقد `ProjectManifest`، ذاكرة SQLite/FTS5 مع عزل بالمشروع، وكيل قراءة فقط، منفذ تعديل يعرض Diff ويطلب موافقة، وقالب Android وWorkflow يبنيان APK WebView/‏Shell ويرفعان artifact مع SHA و`verification.json`. لكن الأدلة لا تثبت بعد مصنع تطبيقات كاملًا، ولا تشغيلًا خارجيًا ناجحًا على commit معروف، ولا تطبيقًا مولدًا متعدد الملفات، ولا اختبارات Android/محاكي، ولا دورة نموذج محلي فعلية.

**القرار:** لا يُعلن KAZ مصنع تطبيقات أو نظام تنفيذ موثوقًا بعد. الأولوية ليست إضافة واجهة جديدة أو embeddings أو تنفيذ وكيل كاتب؛ الأولوية هي إغلاق حلقة المصنع القابلة للإثبات من مواصفة منظمة إلى خطة ملفات إلى Diff وموافقة إلى توليد/build/test/evidence، مع إبقاء التنفيذ عالي الأثر خلف موافقة بشرية.

## تصنيف الحالة

### مثبت وموجود

- شاشة تجهيز تحفظ مسودة المشروع وتتحقق من المدخلات، وعقد مشروع منظم يشمل النوع والمنصات والتقنية والأوامر ومعايير القبول.
- مزود سحابي مقفول افتراضيًا، ومزود محلي يرفض التشغيل بدل إرجاع نتيجة وهمية؛ سجل نماذج محلية وبيانات SHA/الحجم/المسار، لكن دون تنزيل أو تشغيل فعلي.
- ذاكرة SQLite مع WAL وجداول للمشاريع والمصادر والمعرفة والرسائل وسجل أحداث، وفهرس FTS5 وعزل استعلامات حسب `projectId`؛ توجد أدلة نجاح للبحث العربي والاستمرار بعد إعادة التشغيل.
- `projectEditGateway` يتحقق من المسار والحجم وSHA، يعرض Diff، يطلب اعتمادًا صريحًا، ويستخدم كتابة ذرية مع rollback best-effort؛ اختبارات السياسة تثبت الاحتواء ومنع المسارات المطلقة وsymlink وتعارض SHA.
- AgentTask قراءة فقط حاليًا: قراءة manifest والبحث في ذاكرة المشروع، مع مهلة وإلغاء وسجل أدلة وحارس هوية؛ لا يوجد ربط مثبت بينه وبين توليد ملفات أو `/api/project-edit`.
- قالب Android داخل `web/factory-template` وWorkflow `build-apk.yml` يحقن الاسم والوصف والمصادر والمعرفة في HTML و`strings.xml`، ثم يشغل compile وassemble ويرفع APK وSHA و`verification.json` وينشئ Release. هذا يثبت تصميم المسار، لا نجاح تشغيل خارجي فعلي.
- واجهة RTL وmobile-first، إدخال صوتي عربي افتراضيًا مع fallback كتابي، حالات تجهيز/build/error، تشخيص وروابط artifact، وDiff قبل الكتابة.
- فحوص TypeScript/build واختبارات agent-runtime وworkspace-policy ناجحة بحسب نتائج المراجعة، لكن لا توجد suite دائمة تغطي المصنع كاملًا أو UI/Android/model runtime.

### ناقص أو غير مثبت

1. الناتج الحالي Shell/WebView ثابت، وليس مشروعًا مولدًا كاملًا بملفات واجهة ومنطق وبيانات واختبارات مرتبطة بالمواصفة.
2. لا توجد سلسلة موحدة ومخرجات typed من `AgentTask` إلى `file plan` ثم generation وDiff وapproval وvalidation.
3. لا يثبت القالب اكتمال بنية Android القابلة لإعادة البناء: Wrapper ونسخ مقفلة وsource sets وresources وManifest واختبارات.
4. لا توجد بوابة تحقق شاملة تشمل schema وlint/compile وunit/integration/UI/device، ولا تقارير JUnit/coverage موحدة.
5. لا توجد دورة إصلاح محدودة بعد الفشل، ولا rollback transaction/snapshot دائم؛ rollback الحالي best-effort.
6. لا يوجد تشغيل GitHub Actions منشور يمكن فحصه على commit معروف، ولا attestation/SBOM/provenance تشفيري، ونتيجة Debug APK ليست إصدارًا إنتاجيًا موقّعًا.
7. لا توجد اختبارات emulator/device أو smoke test أو تثبيت APK أو Logcat؛ `assembleDebug` وحده غير كافٍ.
8. RAG نصي FTS5 فقط دون ingestion فعلي للروابط/الملفات، chunking أو embeddings/hybrid retrieval أو freshness أو citations قابلة للنقر وربط claim-to-source.
9. الثقة heuristic؛ لا توجد سياسة تمنع المصدر القديم/المجهول أو إجابة بلا دليل، ولا benchmark لـrecall/precision/groundedness/citation coverage.
10. دورة النموذج المحلي غير موجودة: لا DownloadManager أو Range/If-Range أو إلغاء/استئناف/ملف `.part` أو GGUF verification أو llama.cpp/ExecuTorch load/first-token/تقدير ذاكرة فعلي.
11. الحماية الأمنية جزئية: حارس أنماط لا يمنع الحقن غير المباشر بنيويًا، ولا authorization/session/CSRF/replay protection لمسار الموافقة، ويمكن لمحتوى محادثة أن يطلق dispatch البناء دون موافقة مستقلة.
12. لا توجد observability تشغيلية كاملة أو state machines واختبارات property/fault injection/replay أو Playwright E2E، ولا سجل تدقيق دائم غني بالفاعل والسبب وbefore/after وcorrelation IDs.
13. دعم الصوت والمتصفحات وإتاحة RTL غير مثبت باختبارات أجهزة/قارئ شاشة؛ لا إفصاح مستمر كافٍ عن احتمال إرسال الصوت لخدمة خارجية، ولا حالات خطأ صوتية مفصلة.

## ترتيب الأولويات

### P0 — يجب إغلاقه قبل ادعاء الجاهزية

- عقد typed للمواصفة يتضمن `spec`, `manifest`, `filePlan`, acceptance criteria، أوامر build/test، input hash، وprovenance؛ مع ربط AgentTask بخطة ملفات لا بنص حر.
- إبقاء الوكيل قراءة/خطة/اقتراح فقط، وإبقاء Diff والموافقة البشرية خارج النموذج. إيقاف dispatch التلقائي من المحادثة وإضافة تأكيد مستقل للـworkflow عالي الأثر.
- إضافة integration suite لمسار المشروع والمصنع والتعديل: propose/approve/reject، SHA conflict، عدة ملفات، فشل منتصف التطبيق، rollback، restart، وعزل المشاريع.
- استبدال rollback best-effort بمعاملة/نسخة snapshot ذات حالات واضحة (`APPLIED`, `ROLLED_BACK`, `ROLLBACK_REVIEW_REQUIRED`) وسجل دائم.
- تنفيذ ingestion للمصادر مع hash ووقت الجلب وحالة الفهرسة وعقد citation/provenance، ثم freshness قبل أي تعقيد دلالي.
- تشغيل Workflow فعليًا على commit معروف وحفظ APK وevidence، مع Gradle Wrapper وأقل صلاحيات؛ لا تُعد الخطة دليل تنفيذ.

### P1 — بعد إغلاق P0

- تحويل القالب إلى مشروع Android كامل قابل لإعادة البناء، وإضافة lint/unit/integration ثم emulator smoke test.
- إضافة structured verification وattestation/SBOM وتوقيع Release منفصل عن Debug، وربط project/request/input digest بالـrun/artifact.
- بوابة تحقق تمنع الإعلان أو Release عند فشل أي شرط، وحلقة إصلاح محدودة بموافقة وحد محاولات.
- تحسين FTS5 baseline بالعربية عبر chunking وBM25/snippet/highlight، وإظهار citations وروابط/مواضع المصدر وثقة مفصولة عن freshness.
- تثبيت state machines وfault injection وaudit envelope وmetrics/traces وPlaywright RTL/mobile E2E.
- تقوية authorization/CSRF/idempotency/secret redaction وفصل البيانات غير الموثوقة عن تعليمات النموذج.

### P2 — مؤجل حتى قياس الأساس

- embeddings وhybrid retrieval وreranking.
- دعم منصات وقوالب Web/Hybrid متعددة بعد نجاح Android الكامل.
- تنزيل/تشغيل نماذج محلية واسعة وfallback محلي؛ يبدأ أولًا بـartifact GGUF واحد موثوق ومحرك واحد قابل للقياس.
- تحسين قاموس الصوت والبدائل والتعرف المحلي بعد تثبيت الخصوصية والتوافق.
- تعدد المستأجرين والصلاحيات الحسابية إذا تغير قرار المنتج من مستخدم واحد.

## الخطوة التنفيذية الوحيدة ذات الأولوية

**بناء Vertical Slice واحد قابل للإثبات باسم `typed factory request → approved multi-file diff → validated build evidence`:** عرّف عقدًا versioned للمواصفة وخطة الملفات، اجعل AgentTask ينتج الخطة والـDiff فقط، اعرضها مع SHA وتتطلب اعتمادًا صريحًا، طبّقها ذريًا في workspace مع snapshot، ثم شغّل compile/lint/unit وولّد `verification.json` يربط project/request/input hash وcommit والملفات ونتائج الاختبار وSHA للـAPK. أضف اختبارات API تغطي النجاح والرفض والتعارض والفشل والrollback وإعادة التشغيل. لا توسّع إلى emulator أو embeddings أو agent write قبل نجاح هذا المسار على مشروع نموذجي واحد.

هذه الخطوة تغلق أكبر فجوة مشتركة بين المحاور: تحول KAZ من واجهات وعقود ومسارات منفصلة إلى مصنع يمكن تدقيقه وإعادة تشغيله، وتنتج دليلًا صريحًا على ما نُفّذ وما لم يُنفّذ.

## مصادر الادعاءات

- بنية Android وGradle: [Android build structure](https://developer.android.com/build/android-build-structure)، [command-line build](https://developer.android.com/build/building-cmdline)، [app signing](https://developer.android.com/studio/publish/app-signing)، [apksigner](https://developer.android.com/tools/apksigner).
- الاختبارات والبناء والأدلة: [Gradle Java testing](https://docs.gradle.org/current/userguide/java_testing.html)، [GitHub artifacts](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts)، [artifact attestations](https://docs.github.com/en/actions/concepts/security/artifact-attestations)، [actions/attest](https://github.com/actions/attest).
- الوكلاء والحوكمة: [Anthropic effective agents](https://www.anthropic.com/research/building-effective-agents)، [OpenAI agent guide](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/)، [OWASP excessive agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)، [MCP security](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices).
- الذاكرة وRAG: [SQLite FTS5](https://sqlite.org/fts5.html)، [NIST RAG](https://csrc.nist.gov/glossary/term/retrieval_augmented_generation)، [Google citation annotations](https://ai.google.dev/gemini-api/docs/google-search)، [NIST AI RMF generative profile](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf).
- النماذج المحلية: [HTTP Range](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Range_requests)، [AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)، [llama.cpp Android](https://github.com/ggml-org/llama.cpp/blob/master/docs/android.md)، [GGUF](https://huggingface.co/docs/hub/en/gguf)، [GGUF llama.cpp](https://huggingface.co/docs/hub/en/gguf-llamacpp).
- الأمان والوصول: [OWASP prompt injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)، [OWASP path traversal](https://community.owasp.org/attacks/Path_Traversal)، [AI Agent Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html)، [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)، [WCAG 2.2](https://www.w3.org/TR/WCAG22/).
- المراقبة والاختبارات: [OpenTelemetry primer](https://opentelemetry.io/docs/concepts/observability-primer/)، [AWS Fault Injection Service](https://docs.aws.amazon.com/fis/latest/userguide/what-is.html)، [Hypothesis data](https://hypothesis.readthedocs.io/en/latest/data.html)، [Playwright retries](https://playwright.dev/docs/test-retries).
- مستودع KAZ المشار إليه في نتائج المحاور: [KAZ GitHub repository](https://github.com/ksaasm99-star/KAZ-.git).

**ملاحظة منهجية:** الروابط أعلاه هي المصادر المذكورة في نتائج المحاور، بينما عبارات "موجود" و"غير مثبت" تعكس تقارير وقراءة ملفات KAZ التي وردت في المدخلات، لا تدقيقًا تشغيليًا جديدًا لـGitHub Actions أو Android Emulator.
