package com.kaz.appfactory.util

import android.content.Context
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.Locale

class KazSpeechManager(context: Context) {

    private var tts: TextToSpeech? = null
    private var isInitialized = false

    private val _speakingMessageId = MutableStateFlow<Long?>(null)
    val speakingMessageId: StateFlow<Long?> = _speakingMessageId.asStateFlow()

    init {
        tts = TextToSpeech(context.applicationContext) { status ->
            if (status == TextToSpeech.SUCCESS) {
                isInitialized = true
                val result = tts?.setLanguage(Locale("ar"))
                if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                    // Fallback to default locale if Arabic TTS engine not available
                    tts?.language = Locale.getDefault()
                }
                tts?.setSpeechRate(0.95f)
                tts?.setPitch(1.0f)
            } else {
                Log.e("KazSpeechManager", "TTS initialization failed with status $status")
            }
        }

        tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) {}

            override fun onDone(utteranceId: String?) {
                _speakingMessageId.value = null
            }

            override fun onError(utteranceId: String?) {
                _speakingMessageId.value = null
            }
        })
    }

    fun speak(messageId: Long, text: String) {
        if (!isInitialized || tts == null) return

        // If clicking on the same message that is speaking, stop it
        if (_speakingMessageId.value == messageId) {
            stop()
            return
        }

        // Clean text from markdown code blocks and special characters for natural speech
        val cleaned = text
            .replace(Regex("```[a-zA-Z0-9_-]*\\s*\\n[\\s\\S]*?```"), "يوجد هنا كود برمجي.")
            .replace(Regex("[#*`_~>\\[\\]()]"), " ")
            .trim()

        if (cleaned.isBlank()) return

        stop()
        _speakingMessageId.value = messageId
        tts?.speak(cleaned, TextToSpeech.QUEUE_FLUSH, null, "MSG_$messageId")
    }

    fun stop() {
        try {
            tts?.stop()
        } catch (e: Exception) {
            Log.e("KazSpeechManager", "Error stopping TTS", e)
        }
        _speakingMessageId.value = null
    }

    fun shutdown() {
        stop()
        try {
            tts?.shutdown()
        } catch (e: Exception) {
            Log.e("KazSpeechManager", "Error shutting down TTS", e)
        }
        tts = null
        isInitialized = false
    }
}
