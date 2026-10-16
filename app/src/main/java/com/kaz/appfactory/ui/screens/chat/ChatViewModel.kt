package com.kaz.appfactory.ui.screens.chat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kaz.appfactory.KazApplication
import com.kaz.appfactory.data.local.entities.ChatMessageEntity
import com.kaz.appfactory.data.local.entities.ConversationEntity
import com.kaz.appfactory.data.model.AiModelType
import com.kaz.appfactory.data.repository.ChatRepository
import com.kaz.appfactory.util.KazSpeechManager
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

enum class ChatTab(val titleAr: String, val badgeAr: String) {
    GENERAL(titleAr = "المحادثة العامة 🌐", badgeAr = "شامل وذكي"),
    PROJECTS(titleAr = "محادثات المشاريع 📱", badgeAr = "بناء تطبيقات")
}

data class ChatUiState(
    val selectedTab: ChatTab = ChatTab.GENERAL,
    val currentConversationId: Long = 0L,
    val conversationTitle: String = "المحادثة العامة الذكية",
    val generalConversationId: Long = 0L,
    val allConversations: List<ConversationEntity> = emptyList(),
    val messages: List<ChatMessageEntity> = emptyList(),
    val inputText: String = "",
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val showLivePreview: Boolean = false,
    val previewHtml: String? = null,
    val previewTitle: String = "معاينة التطبيق",
    val selectedAiModel: AiModelType = AiModelType.FLASH,
    val speakingMessageId: Long? = null,
    val showProjectPicker: Boolean = false
)

class ChatViewModel(
    private val repository: ChatRepository = KazApplication.instance.chatRepository
) : ViewModel() {

    private val speechManager = KazSpeechManager(KazApplication.instance)

    private val _uiState = MutableStateFlow(ChatUiState())
    val uiState: StateFlow<ChatUiState> = _uiState.asStateFlow()

    private var messageCollectionJob: Job? = null

    init {
        // Observe speech status
        viewModelScope.launch {
            speechManager.speakingMessageId.collect { id ->
                _uiState.update { it.copy(speakingMessageId = id) }
            }
        }

        // Observe AI Model from preferences
        viewModelScope.launch {
            KazApplication.instance.themePreferences.selectedAiModel.collect { model ->
                _uiState.update { it.copy(selectedAiModel = model) }
            }
        }

        // Observe all conversations
        viewModelScope.launch {
            repository.allConversations.collect { convs ->
                _uiState.update { it.copy(allConversations = convs) }
            }
        }

        // Initialize general chat vs projects
        initializeChats()
    }

    private fun initializeChats() {
        viewModelScope.launch {
            val convs = repository.allConversations.firstOrNull() ?: emptyList()
            // Look for existing General Chat conversation
            val existingGeneral = convs.firstOrNull { it.title.contains("المحادثة العامة") }

            val genId = if (existingGeneral != null) {
                existingGeneral.id
            } else {
                repository.createConversation(
                    title = "المحادثة العامة الذكية 🌐",
                    initialSummary = "محادثة عامة شاملة لكل الأسئلة والأفكار والبرمجة"
                )
            }

            _uiState.update {
                it.copy(
                    generalConversationId = genId,
                    currentConversationId = genId,
                    conversationTitle = "المحادثة العامة الذكية 🌐",
                    selectedTab = ChatTab.GENERAL
                )
            }

            listenToMessages(genId)
        }
    }

    fun switchTab(tab: ChatTab) {
        if (_uiState.value.selectedTab == tab) return

        viewModelScope.launch {
            if (tab == ChatTab.GENERAL) {
                val genId = _uiState.value.generalConversationId
                _uiState.update {
                    it.copy(
                        selectedTab = ChatTab.GENERAL,
                        currentConversationId = genId,
                        conversationTitle = "المحادثة العامة الذكية 🌐",
                        showProjectPicker = false
                    )
                }
                listenToMessages(genId)
            } else {
                // Switch to Projects: find most recent project conversation or create one
                val convs = repository.allConversations.firstOrNull() ?: emptyList()
                val projectConvs = convs.filter { !it.title.contains("المحادثة العامة") }
                val target = projectConvs.firstOrNull()

                if (target != null) {
                    _uiState.update {
                        it.copy(
                            selectedTab = ChatTab.PROJECTS,
                            currentConversationId = target.id,
                            conversationTitle = target.title,
                            showProjectPicker = false
                        )
                    }
                    listenToMessages(target.id)
                } else {
                    createNewProjectChat("مشروع تطبيق جديد 📱")
                }
            }
        }
    }

    fun selectConversation(conversationId: Long, title: String? = null) {
        viewModelScope.launch {
            val conv = repository.getConversation(conversationId)
            val isGen = conv?.title?.contains("المحادثة العامة") == true || conversationId == _uiState.value.generalConversationId
            val finalTab = if (isGen) ChatTab.GENERAL else ChatTab.PROJECTS
            val currentTitle = title ?: conv?.title ?: (if (isGen) "المحادثة العامة الذكية 🌐" else "مشروع تطبيق 📱")

            _uiState.update {
                it.copy(
                    selectedTab = finalTab,
                    currentConversationId = conversationId,
                    conversationTitle = currentTitle,
                    showProjectPicker = false,
                    errorMessage = null
                )
            }

            listenToMessages(conversationId)
        }
    }

    private fun listenToMessages(conversationId: Long) {
        messageCollectionJob?.cancel()
        messageCollectionJob = viewModelScope.launch {
            repository.getMessages(conversationId).collect { msgs ->
                _uiState.update { it.copy(messages = msgs) }
            }
        }
    }

    fun createNewProjectChat(initialTitle: String = "مشروع تطبيق جديد 📱") {
        viewModelScope.launch {
            val newId = repository.createConversation(
                title = initialTitle,
                initialSummary = "محادثة بناء مشروع جديد"
            )
            _uiState.update {
                it.copy(
                    selectedTab = ChatTab.PROJECTS,
                    showProjectPicker = false
                )
            }
            selectConversation(newId, initialTitle)
        }
    }

    fun deleteConversation(id: Long) {
        viewModelScope.launch {
            // Do not delete general chat permanently, just recreate if deleted
            if (id == _uiState.value.generalConversationId) {
                repository.deleteConversation(id)
                val newGenId = repository.createConversation(
                    title = "المحادثة العامة الذكية 🌐",
                    initialSummary = "محادثة عامة شاملة"
                )
                _uiState.update { it.copy(generalConversationId = newGenId) }
                selectConversation(newGenId, "المحادثة العامة الذكية 🌐")
            } else {
                repository.deleteConversation(id)
                switchTab(ChatTab.PROJECTS)
            }
        }
    }

    fun toggleProjectPicker(show: Boolean) {
        _uiState.update { it.copy(showProjectPicker = show) }
    }

    fun onInputTextChanged(text: String) {
        _uiState.update { it.copy(inputText = text) }
    }

    fun sendMessage(promptText: String? = null) {
        val textToSend = promptText ?: _uiState.value.inputText
        if (textToSend.isBlank() || _uiState.value.isLoading) return

        val convId = _uiState.value.currentConversationId
        val isGeneral = _uiState.value.selectedTab == ChatTab.GENERAL

        _uiState.update {
            it.copy(
                inputText = "",
                isLoading = true,
                errorMessage = null
            )
        }

        viewModelScope.launch {
            val customKey = KazApplication.instance.themePreferences.customApiKey.value.ifBlank { null }
            val activeModel = _uiState.value.selectedAiModel.modelId

            val result = repository.sendMessage(
                conversationId = convId,
                userPrompt = textToSend,
                customApiKey = customKey,
                modelId = activeModel,
                isGeneralChat = isGeneral
            )

            if (result.isFailure) {
                val errorMsg = result.exceptionOrNull()?.localizedMessage ?: "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي"
                _uiState.update { it.copy(errorMessage = errorMsg, isLoading = false) }
            } else {
                val currentConv = repository.getConversation(convId)
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        conversationTitle = currentConv?.title ?: it.conversationTitle
                    )
                }
            }
        }
    }

    fun regenerateMessage(prompt: String) {
        sendMessage(prompt)
    }

    fun setAiModel(model: AiModelType) {
        KazApplication.instance.themePreferences.setSelectedAiModel(model)
        _uiState.update { it.copy(selectedAiModel = model) }
    }

    fun toggleSpeech(messageId: Long, text: String) {
        speechManager.speak(messageId, text)
    }

    fun openLivePreview(title: String, htmlCode: String? = null) {
        _uiState.update {
            it.copy(
                showLivePreview = true,
                previewTitle = title.ifBlank { "معاينة التطبيق" },
                previewHtml = htmlCode
            )
        }
    }

    fun closeLivePreview() {
        _uiState.update { it.copy(showLivePreview = false, previewHtml = null) }
    }

    fun saveSnippetAsNewProject(title: String, code: String) {
        viewModelScope.launch {
            val newId = repository.createConversation(
                title = title.ifBlank { "مشروع مستخرج" },
                initialSummary = "مشروع تم حفظه مباشرة من المحادثة"
            )
            val conv = repository.getConversation(newId)
            if (conv != null) {
                KazApplication.instance.database.conversationDao().updateProjectCode(
                    id = newId,
                    timestamp = System.currentTimeMillis(),
                    summary = "مشروع جاهز للتشغيل",
                    code = code
                )
            }
            selectConversation(newId, title)
        }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }

    override fun onCleared() {
        super.onCleared()
        speechManager.shutdown()
    }
}
