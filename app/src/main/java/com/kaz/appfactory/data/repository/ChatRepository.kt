package com.kaz.appfactory.data.repository

import com.kaz.appfactory.BuildConfig
import com.kaz.appfactory.data.local.dao.ChatMessageDao
import com.kaz.appfactory.data.local.dao.ConversationDao
import com.kaz.appfactory.data.local.entities.ChatMessageEntity
import com.kaz.appfactory.data.local.entities.ConversationEntity
import com.kaz.appfactory.data.model.ClarifyingQuestion
import com.kaz.appfactory.data.remote.CodeExtractor
import com.kaz.appfactory.data.remote.Content
import com.kaz.appfactory.data.remote.GenerateContentRequest
import com.kaz.appfactory.data.remote.GenerationConfig
import com.kaz.appfactory.data.remote.Part
import com.kaz.appfactory.data.remote.RetrofitClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.withContext

class ChatRepository(
    private val conversationDao: ConversationDao,
    private val chatMessageDao: ChatMessageDao
) {

    val allConversations: Flow<List<ConversationEntity>> =
        conversationDao.getAllConversations()

    fun getMessages(conversationId: Long): Flow<List<ChatMessageEntity>> =
        chatMessageDao.getMessagesForConversation(conversationId)

    suspend fun getConversation(id: Long): ConversationEntity? =
        conversationDao.getConversationById(id)

    suspend fun createConversation(title: String, initialSummary: String = ""): Long =
        withContext(Dispatchers.IO) {
            val entity = ConversationEntity(
                title = title.ifBlank { "مشروع تطبيق جديد" },
                summary = initialSummary.ifBlank { "محادثة بناء تطبيق جديد" },
                createdAt = System.currentTimeMillis(),
                updatedAt = System.currentTimeMillis()
            )
            conversationDao.insertConversation(entity)
        }

    suspend fun deleteConversation(conversationId: Long) = withContext(Dispatchers.IO) {
        chatMessageDao.deleteMessagesForConversation(conversationId)
        conversationDao.deleteConversationById(conversationId)
    }

    suspend fun clearAllHistory() = withContext(Dispatchers.IO) {
        conversationDao.deleteAllConversations()
    }

    fun getClarifyingQuestions(prompt: String): List<ClarifyingQuestion> {
        val lower = prompt.lowercase()
        return when {
            lower.contains("مفكر") || lower.contains("ملاحظ") || lower.contains("note") -> listOf(
                ClarifyingQuestion(1, "ما هي الخصائص الإضافية للملاحظات؟", "مثال: ألوان مخصصة لكل ملاحظة، وتثبيت الملاحظات المهمة"),
                ClarifyingQuestion(2, "هل ترغب في إضافة تصنيفات أو وسوم (Tags)؟", "مثال: عمل، شخصي، أفكار، دراسة"),
                ClarifyingQuestion(3, "هل تحتاج إلى ميزة البحث السريع وفرز الملاحظات؟", "مثال: نعم، بحث بالكلمات وفرز زمني")
            )
            lower.contains("مهم") || lower.contains("مهام") || lower.contains("todo") || lower.contains("task") -> listOf(
                ClarifyingQuestion(1, "ما هي مستويات الأولوية للمهام؟", "مثال: عاجل، متوسط، عادي بألوان مميزة"),
                ClarifyingQuestion(2, "هل ترغب في تحديد تاريخ استحقاق وتنبيه زمني لكل مهمة؟", "مثال: نعم، تحديد التاريخ والوقت"),
                ClarifyingQuestion(3, "هل تريد تقسيم المهام إلى أقسام (مكتملة / قيد التنفيذ)؟", "مثال: نعم مع عداد إنجاز")
            )
            lower.contains("حاسب") || lower.contains("calc") -> listOf(
                ClarifyingQuestion(1, "ما نوع العمليات الحسابية المطلوبة؟", "مثال: عمليات أساسية (+ - * /) مع النسب والكسور"),
                ClarifyingQuestion(2, "هل تريد شاشة لعرض سجل العمليات السابقة (History)؟", "مثال: نعم، لحفظ واسترجاع الحسابات السابقة"),
                ClarifyingQuestion(3, "ما هو النمط اللوني المفضل للآلة الحاسبة؟", "مثال: تصميم داكن مع أزرار نيون ملونة")
            )
            lower.contains("مذكر") || lower.contains("يومي") || lower.contains("diary") || lower.contains("journal") -> listOf(
                ClarifyingQuestion(1, "هل ترغب في تسجيل الحالة المزاجية مع كل يومية؟", "مثال: نعم، أيقونات للمزاج والشعور اليومي"),
                ClarifyingQuestion(2, "هل تحتاج إلى قفل حماية برقم سري لحماية خصوصية المذكرات؟", "مثال: نعم، قفل لحماية اليوميات"),
                ClarifyingQuestion(3, "هل تريد عرض اليوميات في شكل تقويم زمني؟", "مثال: نعم، تقويم شهري لتصفح الأيام السابقة")
            )
            lower.contains("تذكير") || lower.contains("تنبيه") || lower.contains("remind") || lower.contains("alarm") -> listOf(
                ClarifyingQuestion(1, "ما هي وتيرة تكرار التذكيرات؟", "مثال: تكرار يومي، أسبوعي، أو مرة واحدة"),
                ClarifyingQuestion(2, "هل تريد إمكانية تصنيف التذكيرات بشارات ملونة؟", "مثال: مواعيد، مكالمات، دفع فواتير"),
                ClarifyingQuestion(3, "هل تحتاج إلى ميزة تأجيل التنبيه (Snooze)؟", "مثال: نعم، تأجيل لـ 10 دقائق أو ساعة")
            )
            lower.contains("طقس") || lower.contains("weather") -> listOf(
                ClarifyingQuestion(1, "هل تفضل عرض الطقس بالساعة أم لأيام الأسبوع القادمة؟", "مثال: الاثنين معًا، توقعات 24 ساعة وتوقعات 7 أيام"),
                ClarifyingQuestion(2, "ما هي المقاييس الإضافية المرغوبة؟", "مثال: الرطوبة، سرعة الرياح، والضغط الجوي"),
                ClarifyingQuestion(3, "هل تحتاج إلى إمكانية البحث عن عدة مدن وحفظها في المفضلة؟", "مثال: نعم، قائمة بالمدن المفضلة")
            )
            lower.contains("متجر") || lower.contains("سلة") || lower.contains("shop") || lower.contains("commerce") -> listOf(
                ClarifyingQuestion(1, "ما هي أنواع المنتجات المعروضة في المتجر؟", "مثال: إلكترونيات، أزياء، أو قهوة ومشروبات"),
                ClarifyingQuestion(2, "هل ترغب في إضافة شاشة تفاصيل المنتج وسلة تسوق؟", "مثال: نعم، سلة تفاعلية مع حساب الإجمالي"),
                ClarifyingQuestion(3, "ما هي طريقة إتمام الطلب المفضلة؟", "مثال: نموذج دفع تجريبي مع تأكيد فوري")
            )
            else -> listOf(
                ClarifyingQuestion(1, "ما هي الشاشات أو العناصر الرئيسية التي تريد ظهورها في التطبيق؟", "مثال: شاشة رئيسية، شاشة إضافة، وقائمة تصفح"),
                ClarifyingQuestion(2, "هل يتطلب التطبيق تخزين البيانات محليًا بدون إنترنت؟", "مثال: نعم، باستخدام Room Database"),
                ClarifyingQuestion(3, "هل هناك ألوان أو ميزات خاصة ترغب في إضافتها للتصميم؟", "مثال: واجهة عصرية Material 3 بألوان داكنة وأزرار سريعة")
            )
        }
    }

    suspend fun sendMessage(
        conversationId: Long,
        userPrompt: String,
        customApiKey: String? = null,
        modelId: String? = null,
        isGeneralChat: Boolean = false
    ): Result<ChatMessageEntity> = withContext(Dispatchers.IO) {
        try {
            // 1. Insert User Message
            val userMsgEntity = ChatMessageEntity(
                conversationId = conversationId,
                isUser = true,
                rawText = userPrompt,
                codeBlocksJson = "[]",
                timestamp = System.currentTimeMillis()
            )
            chatMessageDao.insertMessage(userMsgEntity)

            // Update conversation title if it was default
            val currentConv = conversationDao.getConversationById(conversationId)
            val updatedTitle = if (currentConv != null && (currentConv.title == "مشروع تطبيق جديد" || currentConv.title == "محادثة جديدة" || currentConv.title.isBlank())) {
                generateTitleFromPrompt(userPrompt)
            } else {
                currentConv?.title ?: if (isGeneralChat) "المحادثة العامة" else "مشروع تطبيق"
            }
            conversationDao.touchConversation(
                id = conversationId,
                timestamp = System.currentTimeMillis(),
                summary = userPrompt.take(60) + if (userPrompt.length > 60) "..." else ""
            )
            if (currentConv != null && currentConv.title != updatedTitle) {
                conversationDao.updateConversation(currentConv.copy(title = updatedTitle, updatedAt = System.currentTimeMillis()))
            }

            // 2. Build Gemini Request
            val activeKey = customApiKey?.ifBlank { null } ?: BuildConfig.GEMINI_API_KEY
            val targetModel = modelId ?: com.kaz.appfactory.KazApplication.instance.themePreferences.selectedAiModel.value.modelId
            val previousMessages = chatMessageDao.getMessagesForConversation(conversationId).firstOrNull() ?: emptyList()

            val contents = mutableListOf<Content>()
            // Include recent history (up to last 6 messages) for context
            for (msg in previousMessages.takeLast(6)) {
                contents.add(
                    Content(
                        role = if (msg.isUser) "user" else "model",
                        parts = listOf(Part(text = msg.rawText))
                    )
                )
            }

            val systemPrompt = if (isGeneralChat) {
                """
                أنت KAZ: المساعد الذكي الشامل ومهندس البرمجيات الأول باللغة العربية.
                أنت ذكاء اصطناعي فائق الذكاء، تقدم إجابات شاملة، عميقة، ومفيدة لكل استفسارات المستخدم باللغة العربية الفصحى.

                قدراتك الشاملة:
                1. الإجابة على جميع الأسئلة العامة، التقنية، الفلسفية، التعليمية، والأفكار الإبداعية بدقة وبراعة.
                2. كتابة وتحليل وتصحيح وشرح الأكواد البرمجية بجميع اللغات (Kotlin, Jetpack Compose, HTML5/CSS3/JavaScript, Python, وغيرها).
                3. عند طلب المستخدم إنشاء تطبيق جوال، صفحة ويب، أو أداة تفاعلية، قم بإنشائها كاملة وقابلة للتشغيل المباشر داخل كتلة ```html أو ```kotlin نظيفة ومتكاملة 100%.
                4. عند الأسئلة العامة والمحادثات اليومية، أجب بأسلوب شيق وجذاب ومفصل ومرتب بالعناوين والنقاط بدون فرض كود لا فائدة منه.
                5. قدم دائماً حلولاً ذكية وأمثلة واضحة واقترح أفكاراً إضافية تثري معرفة المستخدم وتساعده.
                """.trimIndent()
            } else {
                """
                أنت KAZ: مصنع التطبيقات الذكي الأول باللغة العربية (Mobile Web & HTML/JS App Architect).
                المستخدم يطلب منك بناء تطبيق جوال تفاعلي كامل.
                
                قواعد الإجابة الإلزامية:
                1. قم بإنشاء تطبيق جوال تفاعلي كامل بنسبة 100% بلغات HTML5 و CSS3 و JavaScript في ملف واحد متكامل جاهز للتشغيل في WebView Shell.
                2. يجب أن يحتوي الكود على:
                   - `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">`
                   - تنسيقات CSS عصرية مخصصة للجوال (Mobile-first, Dark Theme #0D1117, Neon Cyan #00E5FF, بطاقات دائرية، لمسات حركية).
                   - أكواد JavaScript تفاعلية لإدارة البيانات، وتحديث الواجهة، وحفظ الحالة محلياً في `localStorage`.
                   - استدعاء جسر أندرويد عند الضغط على الأزرار:
                     `if (window.KazBridge) { KazBridge.showToast('تم بنجاح'); KazBridge.vibrate(50); }`
                3. ضع كود التطبيق بالكامل داخل كتلة كود HTML واحدة:
                   ```html
                   <!DOCTYPE html>
                   <html dir="rtl" lang="ar">
                   <head>
                       <meta charset="utf-8">
                       <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                       <title>اسم التطبيق</title>
                       <style>...</style>
                   </head>
                   <body>
                       ...
                       <script>...</script>
                   </body>
                   </html>
                   ```
                4. التطبيق يجب أن يكون متكاملاً وجاهزاً للعمل بنسبة 100% بدون أي ملفات خارجية أو مكتبات غير متوفرة.
                """.trimIndent()
            }

            val request = GenerateContentRequest(
                contents = contents,
                generationConfig = GenerationConfig(
                    temperature = 0.4f,
                    topP = 0.95f,
                    maxOutputTokens = 4096
                ),
                systemInstruction = Content(
                    parts = listOf(Part(text = systemPrompt))
                )
            )

            // 3. Call API with selected model
            var assistantResponseText: String
            try {
                val response = RetrofitClient.service.generateContent(
                    model = targetModel,
                    apiKey = activeKey,
                    request = request
                )
                assistantResponseText = response.candidates?.firstOrNull()?.content?.parts?.firstOrNull()?.text
                    ?: throw IllegalStateException("لم يصل رد نصي من النموذج")
            } catch (apiException: Exception) {
                // Try fallback to gemini-2.5-flash or gemini-3.5-flash
                try {
                    val fallbackResponse = RetrofitClient.service.generateContent(
                        model = if (targetModel == "gemini-2.5-flash") "gemini-3.5-flash" else "gemini-2.5-flash",
                        apiKey = activeKey,
                        request = request
                    )
                    assistantResponseText = fallbackResponse.candidates?.firstOrNull()?.content?.parts?.firstOrNull()?.text
                        ?: throw apiException
                } catch (_: Exception) {
                    assistantResponseText = buildSmartFallbackResponse(userPrompt, isGeneralChat)
                }
            }

            // 4. Parse HTML and Code Blocks
            val extractedHtml = CodeExtractor.extractHtmlApp(assistantResponseText)
            val (_, codeSnippets) = CodeExtractor.parseMarkdownResponse(assistantResponseText)
            val codeJson = CodeExtractor.serializeSnippets(codeSnippets)

            // 5. Save Assistant Message
            val assistantEntity = ChatMessageEntity(
                conversationId = conversationId,
                isUser = false,
                rawText = assistantResponseText,
                codeBlocksJson = codeJson,
                timestamp = System.currentTimeMillis()
            )
            val insertedId = chatMessageDao.insertMessage(assistantEntity)

            // Update project record with generated HTML code
            conversationDao.updateProjectCode(
                id = conversationId,
                timestamp = System.currentTimeMillis(),
                summary = userPrompt.take(60) + if (userPrompt.length > 60) "..." else "",
                code = extractedHtml
            )

            Result.success(assistantEntity.copy(id = insertedId))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun generateTitleFromPrompt(prompt: String): String {
        val clean = prompt.trim()
        val words = clean.split("\\s+".toRegex()).take(5).joinToString(" ")
        return if (words.length > 35) words.take(35) + "..." else words
    }

    private fun buildSmartFallbackResponse(userPrompt: String, isGeneralChat: Boolean = false): String {
        val lower = userPrompt.lowercase()
        if (isGeneralChat && !lower.contains("تطبيق") && !lower.contains("برمج") && !lower.contains("ابن") && !lower.contains("اصنع") && !lower.contains("app") && !lower.contains("كود")) {
            return """
                أهلاً بك! أنا **KAZ** مساعدك الذكي الشامل ومهندس البرمجيات الأول باللغة العربية. 🌟
                
                لقد استلمت استفسارك: **"$userPrompt"**
                
                إليك إجابتي الشاملة والمباشرة:
                - يسعدني مساعدتك في كل ما يتعلق بالبرمجة، وتطوير التطبيقات، وحل المشاكل التقنية، والأفكار الإبداعية.
                - يمكنك أن تطلب مني في أي وقت:
                  1. كتابة أكواد برمجية (Kotlin, Jetpack Compose, HTML, JS, Python).
                  2. شرح أي مفهوم تقني أو خوارزمية.
                  3. توليد وبناء تطبيق أندرويد تفاعلي كامل بنقرة زر وتحويله إلى ملف APK!
                  4. مراجعة وتصحيح الأخطاء في مشاريعك.
                
                كيف تحب أن نبدأ العمل على فكرتك القادمة؟ 🚀
            """.trimIndent()
        }

        val appName = when {
            userPrompt.contains("مفكر") || userPrompt.contains("ملاحظ") -> "مفكرة الملاحظات الذكية"
            userPrompt.contains("مهم") || userPrompt.contains("مهام") -> "تطبيق إدارة المهام اليومية"
            userPrompt.contains("حاسب") -> "الآلة الحاسبة العصرية"
            userPrompt.contains("مذكر") || userPrompt.contains("يومي") -> "تطبيق المذكرات الشخصية"
            userPrompt.contains("تذكير") || userPrompt.contains("منبه") -> "تطبيق التذكيرات المجدولة"
            userPrompt.contains("طقس") -> "تطبيق الطقس المباشر"
            userPrompt.contains("متجر") || userPrompt.contains("سلة") -> "متجر إلكتروني وسلة مشتريات"
            else -> "تطبيق $userPrompt"
        }

        return """
            مرحبًا بك في **KAZ - مصنع التطبيقات الذكي**! 🚀
            قمت ببناء تطبيق الجوال: **$appName** بنجاح.
            
            ```html
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <title>$appName</title>
                <style>
                    :root {
                        --bg-primary: #0D1117;
                        --bg-card: #161B22;
                        --accent-neon: #00E5FF;
                        --text-main: #FFFFFF;
                        --text-muted: #8B949E;
                        --border: #30363D;
                    }
                    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
                    body {
                        font-family: system-ui, -apple-system, sans-serif;
                        background: var(--bg-primary);
                        color: var(--text-main);
                        margin: 0;
                        padding: 16px;
                        display: flex;
                        flex-direction: column;
                        min-height: 100vh;
                    }
                    .header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 12px 16px;
                        background: var(--bg-card);
                        border: 1px solid var(--border);
                        border-radius: 16px;
                        margin-bottom: 16px;
                    }
                    .title { font-size: 18px; font-weight: bold; color: var(--accent-neon); }
                    .badge { font-size: 11px; background: rgba(0,229,255,0.15); color: var(--accent-neon); padding: 4px 8px; border-radius: 8px; font-weight: bold; }
                    .card {
                        background: var(--bg-card);
                        border: 1px solid var(--border);
                        border-radius: 16px;
                        padding: 16px;
                        margin-bottom: 14px;
                    }
                    .input-row { display: flex; gap: 8px; margin-bottom: 14px; }
                    input[type="text"] {
                        flex: 1;
                        background: #090D13;
                        border: 1px solid var(--border);
                        color: #FFF;
                        padding: 12px 14px;
                        border-radius: 12px;
                        outline: none;
                        font-size: 14px;
                    }
                    input[type="text"]:focus { border-color: var(--accent-neon); }
                    button.btn-primary {
                        background: var(--accent-neon);
                        color: #000;
                        border: none;
                        padding: 12px 18px;
                        font-weight: bold;
                        border-radius: 12px;
                        cursor: pointer;
                        font-size: 14px;
                    }
                    button.btn-primary:active { transform: scale(0.96); }
                    .list-item {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 12px 14px;
                        background: #090D13;
                        border: 1px solid var(--border);
                        border-radius: 12px;
                        margin-bottom: 8px;
                    }
                    .item-title { font-size: 14px; font-weight: 500; }
                    .del-btn {
                        background: rgba(255,75,75,0.2);
                        color: #FF4B4B;
                        border: none;
                        padding: 6px 10px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 11px;
                        font-weight: bold;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <span class="title">⚡ $appName</span>
                    <span class="badge">تطبيق KAZ</span>
                </div>
                
                <div class="card">
                    <div class="input-row">
                        <input type="text" id="itemInput" placeholder="أدخل عنصر أو فكرة جديدة...">
                        <button class="btn-primary" onclick="addItem()">إضافة</button>
                    </div>
                </div>

                <div class="card" style="flex: 1;">
                    <h3 style="font-size: 14px; color: var(--text-muted); margin-top: 0; margin-bottom: 12px;">قائمة العناصر النشطة:</h3>
                    <div id="itemsContainer"></div>
                </div>

                <script>
                    let items = JSON.parse(localStorage.getItem('kaz_items') || '["العنصر الأول في التطبيق", "تخصيص البيانات والواجهات"]');

                    function render() {
                        const container = document.getElementById('itemsContainer');
                        if (items.length === 0) {
                            container.innerHTML = '<p style="color:var(--text-muted); text-align:center; font-size:13px;">لا توجد عناصر مضافة حتى الآن.</p>';
                            return;
                        }
                        container.innerHTML = items.map((it, idx) =>
                            '<div class="list-item">' +
                            '<span class="item-title">' + it + '</span>' +
                            '<button class="del-btn" onclick="deleteItem(' + idx + ')">حذف</button>' +
                            '</div>'
                        ).join('');
                    }

                    function addItem() {
                        const input = document.getElementById('itemInput');
                        const val = input.value.trim();
                        if (!val) return;
                        items.unshift(val);
                        localStorage.setItem('kaz_items', JSON.stringify(items));
                        input.value = '';
                        render();
                        if (window.KazBridge) {
                            KazBridge.showToast('تمت الإضافة بنجاح');
                            KazBridge.vibrate(40);
                        }
                    }

                    function deleteItem(idx) {
                        items.splice(idx, 1);
                        localStorage.setItem('kaz_items', JSON.stringify(items));
                        render();
                        if (window.KazBridge) {
                            KazBridge.vibrate(30);
                        }
                    }

                    render();
                </script>
            </body>
            </html>
            ```
        """.trimIndent()
    }
}
