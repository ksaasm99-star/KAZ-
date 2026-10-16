package com.kaz.appfactory.ui.screens.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kaz.appfactory.KazApplication
import com.kaz.appfactory.domain.model.Project
import com.kaz.appfactory.domain.usecase.DeleteProjectUseCase
import com.kaz.appfactory.domain.usecase.GetProjectsUseCase
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

/**
 * UI State for the Home screen.
 */
data class HomeUiState(
    val projects: List<Project> = emptyList(),
    val searchQuery: String = "",
    val isLoading: Boolean = false,
    val projectToDelete: Project? = null,
    val projectToExport: Project? = null
)

/**
 * ViewModel for Home screen following Clean Architecture & MVVM.
 */
class HomeViewModel(
    private val getProjectsUseCase: GetProjectsUseCase = KazApplication.instance.getProjectsUseCase,
    private val deleteProjectUseCase: DeleteProjectUseCase = KazApplication.instance.deleteProjectUseCase
) : ViewModel() {

    private val _searchQuery = MutableStateFlow("")
    private val _projectToDelete = MutableStateFlow<Project?>(null)
    private val _projectToExport = MutableStateFlow<Project?>(null)

    val uiState: StateFlow<HomeUiState> = combine(
        _searchQuery.flatMapLatest { query -> getProjectsUseCase(query) },
        _searchQuery,
        _projectToDelete,
        _projectToExport
    ) { projects, query, toDelete, toExport ->
        HomeUiState(
            projects = projects,
            searchQuery = query,
            projectToDelete = toDelete,
            projectToExport = toExport
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = HomeUiState(isLoading = true)
    )

    fun onSearchQueryChanged(newQuery: String) {
        _searchQuery.value = newQuery
    }

    fun requestDeleteProject(project: Project) {
        _projectToDelete.value = project
    }

    fun dismissDeleteDialog() {
        _projectToDelete.value = null
    }

    fun confirmDeleteProject() {
        val target = _projectToDelete.value ?: return
        viewModelScope.launch {
            deleteProjectUseCase(target.id)
            _projectToDelete.value = null
        }
    }

    fun requestExportProject(project: Project) {
        _projectToExport.value = project
    }

    fun dismissExportSheet() {
        _projectToExport.value = null
    }
}
