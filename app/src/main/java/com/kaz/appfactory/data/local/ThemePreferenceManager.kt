package com.kaz.appfactory.data.local

import android.content.Context
import android.content.SharedPreferences
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

    fun setThemeMode(mode: ThemeMode) {
        prefs.edit().putString(KEY_THEME_MODE, mode.name).apply()
        _themeMode.value = mode
    }

    fun setCustomApiKey(key: String) {
        prefs.edit().putString(KEY_CUSTOM_API_KEY, key.trim()).apply()
        _customApiKey.value = key.trim()
    }

    private fun loadThemeMode(): ThemeMode {
        val saved = prefs.getString(KEY_THEME_MODE, ThemeMode.DARK.name) // Default to dark for sleek developer feel
        return try {
            ThemeMode.valueOf(saved ?: ThemeMode.DARK.name)
        } catch (_: Exception) {
            ThemeMode.DARK
        }
    }

    private fun loadCustomApiKey(): String {
        return prefs.getString(KEY_CUSTOM_API_KEY, "") ?: ""
    }

    companion object {
        private const val KEY_THEME_MODE = "theme_mode"
        private const val KEY_CUSTOM_API_KEY = "custom_api_key"
    }
}
