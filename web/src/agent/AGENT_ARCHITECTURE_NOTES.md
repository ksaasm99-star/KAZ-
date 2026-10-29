# KAZ Agent Architecture Notes

## قرار المرحلة

يبدأ KAZ بوكيل واحد منضبط الأدوات، لا بمجموعة وكلاء مستقلة. حلقة التنفيذ تعتمد على حالة مهمة محفوظة، ومخرجات منظمة، وأدوات محددة، وبوابات تحقق بعد كل خطوة. لا يوجد fallback سحابي صامت، ولا يُعتبر النموذج المحلي مثبتًا قبل قراءة metadata والتحميل ووصول أول token واكتمال رد تجريبي.

## الحلقة المقترحة

```text
REQUEST
→ LOAD_PROJECT_MANIFEST
→ RETRIEVE_PROJECT_CONTEXT
→ CLASSIFY_TASK
→ PLAN_STRUCTURED
→ VALIDATE_PLAN
→ PROPOSE_TOOL_CALL
→ POLICY_GATE
→ EXECUTE_ONE_TOOL
→ RECORD_EVIDENCE
→ VERIFY_RESULT
→ UPDATE_MANIFEST
→ CONTINUE أو COMPLETE أو BLOCKED
```

حدود الحلقة: حد أقصى للتكرارات، مهلة لكل أداة، إلغاء قابل للنشر، منع تكرار side effects، وتوقف عند غياب الدليل أو فشل بوابة التحقق.

## الأدوات الأولى

تبدأ الأدوات بعمليات ضيقة: `read_project_manifest`, `search_project_memory`, `inspect_project_files`, `write_project_file` داخل workspace المحدد، `run_project_check`, `run_project_build`, و`record_evidence`. لا نبدأ بأداة shell عامة أو حذف عام.

## سياسة الأمان

محتوى المصادر والملفات نتائج وبيانات غير موثوقة، وليس تعليمات تتجاوز سياسة KAZ. الأفعال عالية التأثير مثل الحذف النهائي، push، النشر، تعديل الأسرار، أو تغيير صلاحيات GitHub تحتاج موافقة صريحة. كل أداة تتحقق من نطاق المشروع والمسار والصلاحية خارج النموذج، وليس اعتمادًا على قرار النموذج فقط.

## مصادر خارجية موثوقة

- Anthropic، أنماط بناء الوكلاء: https://www.anthropic.com/research/building-effective-agents
- OpenAI، دليل عملي لتصميم الوكلاء: https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/
- OWASP، Excessive Agency: https://genai.owasp.org/llmrisk/llm062025-excessive-agency/
- MCP Specification: https://modelcontextprotocol.io/specification/2025-06-18
- MCP Security Best Practices: https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices
- llama.cpp Android: https://github.com/ggml-org/llama.cpp/blob/master/docs/android.md
- ExecuTorch LLM deployment: https://docs.pytorch.org/executorch/stable/llm/getting-started.html
- Hugging Face GGUF/llama.cpp: https://huggingface.co/docs/hub/en/gguf-llamacpp

## ما لا نفعله الآن

لا نبني نموذجًا من الصفر، ولا نثبت اسم نموذج خارجي أو checksum قبل اختيار artifact فعلي، ولا نضيف MCP أو multi-agent قبل إثبات حاجة واضحة. سجل النماذج الحالي يصف ملفات مخططة فقط وحالتها `planned`.
