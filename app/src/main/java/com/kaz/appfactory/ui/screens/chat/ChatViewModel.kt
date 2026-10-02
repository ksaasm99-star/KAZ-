package com.kaz.appfactory.ui.screens.chat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kaz.appfactory.KazApplication
import com.kaz.appfactory.data.local.entities.ChatMessageEntity
import com.kaz.appfactory.data.local.entities.ConversationEntity
import com.kaz.appfactory.data.repository.ChatRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class ChatUiState(
    val currentConversationId: Long = 0L,
    val conversationTitle: String = "مشروع جديد",
    val messages: List<ChatMessageEntity> = emptyList(),
    val inputText: String = "",
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val showLivePreview: Boolean = false
)

class ChatViewModel(
    private val repository: ChatRepository = KazApplication.instance.chatRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ChatUiState())
    val uiState: StateFlow<ChatUiState> = _uiState.asStateFlow()

    init {
        initializeInitialChat()
    }

    private fun initializeInitialChat() {
        viewModelScope.launch {
            val conversations = repository.allConversations.firstOrNull() ?: emptyList()
            if (conversations.isNotEmpty()) {
                val latest = conversations.first()
                selectConversation(latest.id, latest.title)
            } else {
                createNewChat()
            }
        }
    }

    fun selectConversation(conversationId: Long, title: String? = null) {
        viewModelScope.launch {
            val conv = repository.getConversation(conversationId)
            val currentTitle = title ?: conv?.title ?: "مشروع تطبيق"

            _uiState.update {
                it.copy(
                    currentConversationId = conversationId,
                    conversationTitle = currentTitle,
                    errorMessage = null
                )
            }

            // Observe messages for this conversation reactively
            repository.getMessages(conversationId)
                .collect { messagesList ->
                    _uiState.update { it.copy(messages = messagesList) }
                }
        }
    }

    fun createNewChat(initialTitle: String = "مشروع تطبيق جديد") {
        viewModelScope.launch {
            val newId = repository.createConversation(initialTitle)
            selectConversation(newId, initialTitle)
        }
    }

    fun onInputTextChanged(text: String) {
        _uiState.update { it.copy(inputText = text) }
    }

    fun sendMessage(promptText: String? = null) {
        val textToSend = promptText ?: _uiState.value.inputText
        if (textToSend.isBlank() || _uiState.value.isLoading) return

        val convId = _uiState.value.currentConversationId
        _uiState.update {
            it.copy(
                inputText = "",
                isLoading = true,
                errorMessage = null
            )
        }

        viewModelScope.launch {
            // Read custom API key if set in preferences
            val customKey = KazApplication.instance.themePreferences.customApiKey.value.ifBlank { null }
            val result = repository.sendMessage(convId, textToSend, customKey)

            if (result.isFailure) {
                val errorMsg = result.exceptionOrNull()?.localizedMessage ?: "حدث خطأ أثناء معالجة الطلب"
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

    fun toggleLivePreview(show: Boolean) {
        _uiState.update { it.copy(showLivePreview = show) }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }
}
