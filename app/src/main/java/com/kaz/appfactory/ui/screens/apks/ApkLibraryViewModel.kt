package com.kaz.appfactory.ui.screens.apks

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kaz.appfactory.KazApplication
import com.kaz.appfactory.data.model.GeneratedApkInfo
import com.kaz.appfactory.data.repository.ApkRepository
import com.kaz.appfactory.installer.ApkInstallerService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.File

sealed class ApkLibraryUiState {
    object Loading : ApkLibraryUiState()
    data class Success(val apks: List<GeneratedApkInfo>) : ApkLibraryUiState()
    object Empty : ApkLibraryUiState()
    data class Error(val message: String) : ApkLibraryUiState()
}

class ApkLibraryViewModel(
    private val apkRepository: ApkRepository = ApkRepository(KazApplication.instance)
) : ViewModel() {

    private val _uiState = MutableStateFlow<ApkLibraryUiState>(ApkLibraryUiState.Loading)
    val uiState: StateFlow<ApkLibraryUiState> = _uiState.asStateFlow()

    private val _selectedApk = MutableStateFlow<GeneratedApkInfo?>(null)
    val selectedApk: StateFlow<GeneratedApkInfo?> = _selectedApk.asStateFlow()

    private val _installingApk = MutableStateFlow<File?>(null)
    val installingApk: StateFlow<File?> = _installingApk.asStateFlow()

    init {
        loadApks()
    }

    fun loadApks() {
        viewModelScope.launch {
            _uiState.value = ApkLibraryUiState.Loading
            try {
                val apks = apkRepository.getLocalApks()
                if (apks.isEmpty()) {
                    _uiState.value = ApkLibraryUiState.Empty
                } else {
                    _uiState.value = ApkLibraryUiState.Success(apks)
                }
            } catch (e: Exception) {
                _uiState.value = ApkLibraryUiState.Error(e.localizedMessage ?: "حدث خطأ أثناء تحميل الحزم")
            }
        }
    }

    fun selectApk(apk: GeneratedApkInfo?) {
        _selectedApk.value = apk
    }

    fun installApk(context: Context, apkInfo: GeneratedApkInfo) {
        viewModelScope.launch {
            _installingApk.value = apkInfo.file
            ApkInstallerService.installApk(context, apkInfo.file)
            _installingApk.value = null
        }
    }

    fun shareApk(context: Context, apkInfo: GeneratedApkInfo) {
        ApkInstallerService.shareApk(context, apkInfo.file, apkInfo.name)
    }

    fun deleteApk(apkInfo: GeneratedApkInfo) {
        viewModelScope.launch {
            apkRepository.deleteApk(apkInfo.file)
            if (_selectedApk.value?.file?.absolutePath == apkInfo.file.absolutePath) {
                _selectedApk.value = null
            }
            loadApks()
        }
    }
}
