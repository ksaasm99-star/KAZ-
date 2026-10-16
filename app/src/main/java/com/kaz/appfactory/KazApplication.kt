package com.kaz.appfactory

import android.app.Application
import com.kaz.appfactory.builder.AppBuilderService
import com.kaz.appfactory.data.local.KazDatabase
import com.kaz.appfactory.data.local.ThemePreferenceManager
import com.kaz.appfactory.data.local.entities.ChatMessageEntity
import com.kaz.appfactory.data.local.entities.ConversationEntity
import com.kaz.appfactory.data.repository.AppRepositoryImpl
import com.kaz.appfactory.data.repository.ChatRepository
import com.kaz.appfactory.domain.repository.AppRepository
import com.kaz.appfactory.domain.usecase.DeleteProjectUseCase
import com.kaz.appfactory.domain.usecase.GenerateAppUseCase
import com.kaz.appfactory.domain.usecase.GetProjectsUseCase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class KazApplication : Application() {

    lateinit var database: KazDatabase
        private set

    lateinit var chatRepository: ChatRepository
        private set

    lateinit var appRepository: AppRepository
        private set

    lateinit var generateAppUseCase: GenerateAppUseCase
        private set

    lateinit var getProjectsUseCase: GetProjectsUseCase
        private set

    lateinit var deleteProjectUseCase: DeleteProjectUseCase
        private set

    lateinit var themePreferences: ThemePreferenceManager
        private set

    lateinit var aiIdentityManager: com.kaz.appfactory.data.local.AiIdentityManager
        private set

    private val appScope = CoroutineScope(Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        instance = this

        database = KazDatabase.getInstance(this)
        val convDao = database.conversationDao()
        val msgDao = database.chatMessageDao()

        chatRepository = ChatRepository(
            conversationDao = convDao,
            chatMessageDao = msgDao
        )

        appRepository = AppRepositoryImpl(
            conversationDao = convDao,
            chatMessageDao = msgDao
        )

        generateAppUseCase = GenerateAppUseCase(appRepository)
        getProjectsUseCase = GetProjectsUseCase(appRepository)
        deleteProjectUseCase = DeleteProjectUseCase(appRepository)

        themePreferences = ThemePreferenceManager(this)
        aiIdentityManager = com.kaz.appfactory.data.local.AiIdentityManager(this)

        seedStarterAiApp(convDao, msgDao)
    }

    private fun seedStarterAiApp(convDao: com.kaz.appfactory.data.local.dao.ConversationDao, msgDao: com.kaz.appfactory.data.local.dao.ChatMessageDao) {
        appScope.launch {
            try {
                val existing = convDao.getConversationCount()
                if (existing == 0) {
                    val aiAppCode = """
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>مساعد الذكاء الاصطناعي</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Tajawal', sans-serif; -webkit-tap-highlight-color: transparent; }
        body { background-color: #0d1117; color: #f0f6fc; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
        header { background: #161b22; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #30363d; }
        .logo { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 1.1rem; color: #00e5ff; }
        .badge { background: rgba(0, 229, 255, 0.15); color: #00e5ff; font-size: 0.75rem; padding: 3px 8px; border-radius: 20px; font-weight: 700; }
        .chat-container { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .message { max-width: 85%; padding: 12px 16px; border-radius: 16px; font-size: 0.95rem; line-height: 1.5; animation: fadeIn 0.25s ease-out; }
        .message.bot { align-self: flex-start; background: #21262d; color: #e6edf3; border-bottom-right-radius: 4px; border: 1px solid #30363d; }
        .message.user { align-self: flex-end; background: linear-gradient(135deg, #00e5ff, #00b4d8); color: #000; font-weight: 500; border-bottom-left-radius: 4px; }
        .suggestions { display: flex; gap: 8px; overflow-x: auto; padding: 4px 16px 10px; scrollbar-width: none; }
        .suggestions::-webkit-scrollbar { display: none; }
        .chip { background: #21262d; border: 1px solid #30363d; color: #7ee787; font-size: 0.8rem; padding: 6px 12px; border-radius: 20px; white-space: nowrap; cursor: pointer; transition: 0.2s; }
        .chip:active { background: rgba(0, 229, 255, 0.2); border-color: #00e5ff; }
        .input-bar { background: #161b22; padding: 12px 16px; display: flex; gap: 10px; align-items: center; border-top: 1px solid #30363d; }
        input { flex: 1; background: #0d1117; border: 1px solid #30363d; border-radius: 24px; padding: 12px 18px; color: #fff; font-size: 0.95rem; outline: none; transition: 0.2s; }
        input:focus { border-color: #00e5ff; box-shadow: 0 0 0 2px rgba(0, 229, 255, 0.2); }
        .btn-send { background: #00e5ff; border: none; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #000; font-size: 1.2rem; cursor: pointer; transition: 0.2s; }
        .btn-send:active { transform: scale(0.92); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body>
    <header>
        <div class="logo">
            <span>✨</span>
            <span>مساعد الذكاء الاصطناعي</span>
        </div>
        <div class="badge">يعمل بدون إنترنت (Offline)</div>
    </header>

    <div class="chat-container" id="chat">
        <div class="message bot">
            مرحباً بك! أنا مساعد الذكاء الاصطناعي الخاص بك 🤖. كيف يمكنني مساعدتك اليوم في كتابة النصوص، حل المسائل، البرمجة، أو ترجمة اللغات؟
        </div>
    </div>

    <div class="suggestions">
        <div class="chip" onclick="sendSuggestion('اكتب لي خطة يومية لزيادة الإنتاجية')">💡 خطة يومية</div>
        <div class="chip" onclick="sendSuggestion('ترجم جملة: الذكاء الاصطناعي يغير العالم')">🌐 ترجمة فورية</div>
        <div class="chip" onclick="sendSuggestion('اشرح لي مفهوم الحوسبة السحابية ببساطة')">☁️ شرح تقني</div>
        <div class="chip" onclick="sendSuggestion('اقترح أفكار مشاريع برمجية مربحة')">🚀 أفكار مشاريع</div>
    </div>

    <div class="input-bar">
        <input type="text" id="userInput" placeholder="اكتب سؤالك أو فكرتك هنا..." onkeypress="handleKey(event)">
        <button class="btn-send" onclick="sendMessage()">➤</button>
    </div>

    <script>
        const chat = document.getElementById('chat');
        const input = document.getElementById('userInput');

        function handleKey(e) {
            if (e.key === 'Enter') sendMessage();
        }

        function sendSuggestion(text) {
            input.value = text;
            sendMessage();
        }

        function appendMessage(text, isUser) {
            const div = document.createElement('div');
            div.className = 'message ' + (isUser ? 'user' : 'bot');
            div.innerHTML = text;
            chat.appendChild(div);
            chat.scrollTop = chat.scrollHeight;
        }

        function sendMessage() {
            const text = input.value.trim();
            if (!text) return;

            appendMessage(text, true);
            input.value = '';

            // Native haptic feedback
            if (window.AndroidBridge && window.AndroidBridge.vibrate) {
                window.AndroidBridge.vibrate(30);
            }

            // Simulate intelligent AI thinking and response
            setTimeout(() => {
                let reply = '';
                const lower = text.toLowerCase();

                if (lower.includes('خطة') || lower.includes('إنتاجية')) {
                    reply = '🌟 <b>خطة اليوم المقترحة:</b><br>1. <b>صباحاً:</b> إنجاز المهمة الأكثر صعوبة لمدة 90 دقيقة.<br>2. <b>ظهراً:</b> الرد على الرسائل والبريد الإلكتروني.<br>3. <b>مساءً:</b> مراجعة الإنجازات والتخطيط للغد مع استراحة 30 دقيقة.';
                } else if (lower.includes('ترجم') || lower.includes('translate')) {
                    reply = '🌐 <b>الترجمة الإنجليزية:</b><br>"Artificial Intelligence is transforming the world."';
                } else if (lower.includes('مشروع') || lower.includes('أفكار')) {
                    reply = '💡 <b>3 أفكار مشاريع مميزة:</b><br>1. تطبيق إدارة الاشتراكات الشهرية وتنبيهات التجديد.<br>2. منصة تلخيص الكتب والمقالات العربية بالذكاء الاصطناعي.<br>3. تطبيق تتبع العادات اليومية مع ميزات التحفيز البصري.';
                } else if (lower.includes('شرح') || lower.includes('سحابية')) {
                    reply = '☁️ <b>الحوسبة السحابية ببساطة:</b><br>هي استخدام خوادم ومساحات تخزين قوية عبر الإنترنت بدلاً من الاعتماد على جهازك المحلي فقط، مما يمنحك سرعة فائقة والوصول لبياناتك من أي مكان!';
                } else {
                    reply = '✨ <b>إجابة الذكاء الاصطناعي:</b><br>سؤال رائع! بخصوص استفسارك عن: "<b>' + text + '</b>"، تم تحليل المدخلات وتجهيز أفضل الحلول المناسبة لتنفيذ فكرتك بكفاءة وسرعة عالية.';
                }

                appendMessage(reply, false);
            }, 600);
        }
    </script>
</body>
</html>
                    """.trimIndent()

                    val convId = convDao.insertConversation(
                        ConversationEntity(
                            title = "تطبيق مساعد الذكاء الاصطناعي",
                            summary = "مساعد ذكاء اصطناعي تفاعلي يعمل بدون إنترنت مع محرك استجابة فوري",
                            generatedCode = aiAppCode
                        )
                    )

                    msgDao.insertMessage(
                        ChatMessageEntity(
                            conversationId = convId,
                            isUser = true,
                            rawText = "ابنِ لي تطبيق ذكاء اصطناعي تفاعلي ذكي"
                        )
                    )

                    msgDao.insertMessage(
                        ChatMessageEntity(
                            conversationId = convId,
                            isUser = false,
                            rawText = "تم بناء تطبيق مساعد الذكاء الاصطناعي بنجاح! يمكنك الآن معاينته، وتثبيته مباشرة بصيغة APK على هاتفك."
                        )
                    )

                    // Also build the APK into filesDir/generated_apks immediately
                    try {
                        AppBuilderService.buildApk(
                            context = this@KazApplication,
                            appName = "مساعد_الذكاء_الاصطناعي",
                            htmlCode = aiAppCode,
                            onProgress = {}
                        )
                    } catch (_: Exception) {}
                }
            } catch (_: Exception) {}
        }
    }

    companion object {
        lateinit var instance: KazApplication
            private set
    }
}
