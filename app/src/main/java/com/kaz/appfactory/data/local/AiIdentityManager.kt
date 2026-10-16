package com.kaz.appfactory.data.local

import android.content.Context
import android.content.SharedPreferences
import com.kaz.appfactory.data.model.AiIdentity
import com.kaz.appfactory.data.model.AiModelParameters
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class AiIdentityManager(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("kaz_ai_identity_prefs", Context.MODE_PRIVATE)

    private val json = Json { ignoreUnknownKeys = true }

    private val _currentIdentity = MutableStateFlow(loadIdentity())
    val currentIdentity: StateFlow<AiIdentity> = _currentIdentity.asStateFlow()

    private val _modelParameters = MutableStateFlow(loadParameters())
    val modelParameters: StateFlow<AiModelParameters> = _modelParameters.asStateFlow()

    fun setIdentity(identity: AiIdentity) {
        val encoded = json.encodeToString(identity)
        prefs.edit().putString(KEY_ACTIVE_IDENTITY, encoded).apply()
        _currentIdentity.value = identity
    }

    fun updateIdentityFields(
        name: String,
        role: String,
        tone: String,
        customRules: String,
        signature: String,
        isEnabled: Boolean = true
    ) {
        val updated = _currentIdentity.value.copy(
            id = if (_currentIdentity.value.id in AiIdentity.PRESETS.map { it.id }.dropLast(1)) "custom_identity" else _currentIdentity.value.id,
            name = name.trim(),
            role = role.trim(),
            tone = tone.trim(),
            customRules = customRules.trim(),
            signature = signature.trim(),
            isEnabled = isEnabled
        )
        setIdentity(updated)
    }

    fun toggleIdentityEnabled(enabled: Boolean) {
        val updated = _currentIdentity.value.copy(isEnabled = enabled)
        setIdentity(updated)
    }

    fun selectPreset(presetId: String) {
        val preset = AiIdentity.PRESETS.find { it.id == presetId } ?: AiIdentity.PRESETS.first()
        setIdentity(preset)
    }

    fun updateParameters(
        temperature: Float = _modelParameters.value.temperature,
        topP: Float = _modelParameters.value.topP,
        topK: Int = _modelParameters.value.topK,
        maxOutputTokens: Int = _modelParameters.value.maxOutputTokens,
        strictPersonaEnforcement: Boolean = _modelParameters.value.strictPersonaEnforcement,
        autoFallbackOnRateLimit: Boolean = _modelParameters.value.autoFallbackOnRateLimit
    ) {
        val updated = AiModelParameters(
            temperature = temperature.coerceIn(0f, 2f),
            topP = topP.coerceIn(0.01f, 1f),
            topK = topK.coerceIn(1, 100),
            maxOutputTokens = maxOutputTokens.coerceIn(512, 32768),
            strictPersonaEnforcement = strictPersonaEnforcement,
            autoFallbackOnRateLimit = autoFallbackOnRateLimit
        )
        val encoded = json.encodeToString(updated)
        prefs.edit().putString(KEY_MODEL_PARAMETERS, encoded).apply()
        _modelParameters.value = updated
    }

    fun resetToDefaults() {
        selectPreset("super_coder")
        updateParameters(
            temperature = 0.4f,
            topP = 0.95f,
            topK = 40,
            maxOutputTokens = 8192,
            strictPersonaEnforcement = true,
            autoFallbackOnRateLimit = true
        )
    }

    /**
     * Builds the complete, strictly-enforced system prompt instructions
     * containing the persona identity, tone, rules, and formatting directives.
     */
    fun buildCustomSystemInstruction(baseCapabilityText: String): String {
        val identity = _currentIdentity.value
        val params = _modelParameters.value

        if (!identity.isEnabled) {
            return baseCapabilityText
        }

        return buildString {
            appendLine("=== تعليمات الهوية الإلزامية (STRICT SYSTEM IDENTITY & PERSONA) ===")
            appendLine("أنت: ${identity.name}")
            appendLine("دورك وتخصصك: ${identity.role}")
            appendLine("نبرتك وأسلوبك في الحديث: ${identity.tone}")
            appendLine()
            appendLine("--- القواعد والتوجيهات الصارمة الملزمة التي يجب أن تلتزم بها 100% في كل رد ---")
            appendLine(identity.customRules)
            appendLine()
            if (params.strictPersonaEnforcement) {
                appendLine("تحذير صارم: لا تخرج عن هذه الهوية أو النبرة المحددة إطلاقاً. خاطب المستخدم دائماً وفق هذا الأسلوب والقواعد.")
            }
            if (identity.signature.isNotBlank()) {
                appendLine("في نهاية كل رد، اختم دائماً بتوقيعك الرسمي التالي في سطر منفصل:")
                appendLine(identity.signature)
            }
            appendLine()
            appendLine("=== إمكانياتك التقنية والمعمارية الأساسية ===")
            appendLine(baseCapabilityText)
        }
    }

    private fun loadIdentity(): AiIdentity {
        val saved = prefs.getString(KEY_ACTIVE_IDENTITY, null)
        if (saved != null) {
            try {
                return json.decodeFromString<AiIdentity>(saved)
            } catch (_: Exception) { }
        }
        return AiIdentity.PRESETS.first()
    }

    private fun loadParameters(): AiModelParameters {
        val saved = prefs.getString(KEY_MODEL_PARAMETERS, null)
        if (saved != null) {
            try {
                return json.decodeFromString<AiModelParameters>(saved)
            } catch (_: Exception) { }
        }
        return AiModelParameters()
    }

    companion object {
        private const val KEY_ACTIVE_IDENTITY = "active_ai_identity_json"
        private const val KEY_MODEL_PARAMETERS = "model_parameters_json"
    }
}
