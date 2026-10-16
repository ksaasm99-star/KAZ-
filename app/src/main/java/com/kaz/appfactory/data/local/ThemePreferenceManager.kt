package com.kaz.appfactory.data.local

import android.content.Context
import android.content.SharedPreferences
import com.kaz.appfactory.data.model.AiModelType
import com.kaz.appfactory.data.model.BuildEngineType
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

enum class ThemeMode {
    SYSTEM,
    DARK,
    LIGHT
}

class ThemePreferenceManager(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("kaz_preferences", Context.MODE_PRIVATE)

    private val _themeMode = MutableStateFlow(loadThemeMode())
    val themeMode: StateFlow<ThemeMode> = _themeMode.asStateFlow()

    private val _customApiKey = MutableStateFlow(loadCustomApiKey())
    val customApiKey: StateFlow<String> = _customApiKey.asStateFlow()

    private val _selectedAiModel = MutableStateFlow(loadAiModel())
    val selectedAiModel: StateFlow<AiModelType> = _selectedAiModel.asStateFlow()

    private val _selectedBuildEngine = MutableStateFlow(loadBuildEngine())
    val selectedBuildEngine: StateFlow<BuildEngineType> = _selectedBuildEngine.asStateFlow()

    private val _gitHubToken = MutableStateFlow(loadGitHubToken())
    val gitHubToken: StateFlow<String> = _gitHubToken.asStateFlow()

    fun setThemeMode(mode: ThemeMode) {
        prefs.edit().putString(KEY_THEME_MODE, mode.name).apply()
        _themeMode.value = mode
    }

    fun setCustomApiKey(key: String) {
        prefs.edit().putString(KEY_CUSTOM_API_KEY, key.trim()).apply()
        _customApiKey.value = key.trim()
    }

    fun setSelectedAiModel(model: AiModelType) {
        prefs.edit().putString(KEY_AI_MODEL, model.name).apply()
        _selectedAiModel.value = model
    }

    fun setSelectedBuildEngine(engine: BuildEngineType) {
        prefs.edit().putString(KEY_BUILD_ENGINE, engine.name).apply()
        _selectedBuildEngine.value = engine
    }

    fun setGitHubToken(token: String) {
        prefs.edit().putString(KEY_GITHUB_TOKEN, token.trim()).apply()
        _gitHubToken.value = token.trim()
    }

    private fun loadThemeMode(): ThemeMode {
        val saved = prefs.getString(KEY_THEME_MODE, ThemeMode.DARK.name)
        return try {
            ThemeMode.valueOf(saved ?: ThemeMode.DARK.name)
        } catch (_: Exception) {
            ThemeMode.DARK
        }
    }

    private fun loadCustomApiKey(): String {
        return prefs.getString(KEY_CUSTOM_API_KEY, "") ?: ""
    }

    private fun loadAiModel(): AiModelType {
        val saved = prefs.getString(KEY_AI_MODEL, AiModelType.FLASH.name)
        return try {
            AiModelType.valueOf(saved ?: AiModelType.FLASH.name)
        } catch (_: Exception) {
            AiModelType.FLASH
        }
    }

    private fun loadBuildEngine(): BuildEngineType {
        val saved = prefs.getString(KEY_BUILD_ENGINE, BuildEngineType.AUTO.name)
        return try {
            BuildEngineType.valueOf(saved ?: BuildEngineType.AUTO.name)
        } catch (_: Exception) {
            BuildEngineType.AUTO
        }
    }

    private fun loadGitHubToken(): String {
        return prefs.getString(KEY_GITHUB_TOKEN, "") ?: ""
    }

    companion object {
        private const val KEY_THEME_MODE = "theme_mode"
        private const val KEY_CUSTOM_API_KEY = "custom_api_key"
        private const val KEY_AI_MODEL = "ai_model_type"
        private const val KEY_BUILD_ENGINE = "build_engine_type"
        private const val KEY_GITHUB_TOKEN = "github_token"
    }
}
