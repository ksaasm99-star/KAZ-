package com.kaz.appfactory.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.kaz.appfactory.ui.screens.build.BuildScreen
import com.kaz.appfactory.ui.screens.chat.ChatScreen
import com.kaz.appfactory.ui.screens.chat.ChatViewModel
import com.kaz.appfactory.ui.screens.home.HomeScreen
import com.kaz.appfactory.ui.screens.result.ResultScreen
import com.kaz.appfactory.ui.screens.settings.SettingsScreen
import com.kaz.appfactory.ui.theme.CyanNeon

enum class AppDestination(
    val route: String,
    val titleAr: String,
    val selectedIcon: androidx.compose.ui.graphics.vector.ImageVector,
    val unselectedIcon: androidx.compose.ui.graphics.vector.ImageVector
) {
    HOME(
        route = "home",
        titleAr = "الرئيسية",
        selectedIcon = Icons.Filled.Folder,
        unselectedIcon = Icons.Outlined.Folder
    ),
    BUILD(
        route = "build",
        titleAr = "بناء تطبيق",
        selectedIcon = Icons.Filled.BuildCircle,
        unselectedIcon = Icons.Outlined.BuildCircle
    ),
    CHAT(
        route = "chat",
        titleAr = "المساعد KAZ",
        selectedIcon = Icons.Filled.Chat,
        unselectedIcon = Icons.Outlined.Chat
    ),
    SETTINGS(
        route = "settings",
        titleAr = "الإعدادات",
        selectedIcon = Icons.Filled.Settings,
        unselectedIcon = Icons.Outlined.Settings
    )
}

@Composable
fun MainApp(
    chatViewModel: ChatViewModel = viewModel()
) {
    var currentDestination by remember { mutableStateOf(AppDestination.HOME) }

    // Active project state for ResultScreen
    var activeProjectId by remember { mutableLongStateOf(0L) }
    var activeProjectTitle by remember { mutableStateOf("") }
    var activeProjectCode by remember { mutableStateOf("") }
    var isViewingResult by remember { mutableStateOf(false) }

    // Hardware back button navigation
    BackHandler(enabled = isViewingResult || currentDestination != AppDestination.HOME) {
        if (isViewingResult) {
            isViewingResult = false
        } else {
            currentDestination = AppDestination.HOME
        }
    }

    Scaffold(
        bottomBar = {
            NavigationBar(
                modifier = Modifier.testTag("main_navigation_bar"),
                containerColor = MaterialTheme.colorScheme.surface,
                tonalElevation = 8.dp
            ) {
                AppDestination.entries.forEach { destination ->
                    val isSelected = !isViewingResult && currentDestination == destination
                    NavigationBarItem(
                        selected = isSelected,
                        onClick = {
                            isViewingResult = false
                            currentDestination = destination
                        },
                        icon = {
                            Icon(
                                imageVector = if (isSelected) destination.selectedIcon else destination.unselectedIcon,
                                contentDescription = destination.titleAr
                            )
                        },
                        label = {
                            Text(
                                text = destination.titleAr,
                                fontSize = 11.sp
                            )
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MaterialTheme.colorScheme.onPrimaryContainer,
                            indicatorColor = CyanNeon.copy(alpha = 0.35f),
                            selectedTextColor = CyanNeon,
                            unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
                        ),
                        modifier = Modifier.testTag("nav_${destination.route}")
                    )
                }
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            if (isViewingResult) {
                ResultScreen(
                    projectId = activeProjectId,
                    projectTitle = activeProjectTitle,
                    codeContent = activeProjectCode,
                    onBackToProjects = { isViewingResult = false },
                    onOpenChat = { projectId ->
                        chatViewModel.selectConversation(projectId, activeProjectTitle)
                        isViewingResult = false
                        currentDestination = AppDestination.CHAT
                    }
                )
            } else {
                when (currentDestination) {
                    AppDestination.HOME -> {
                        HomeScreen(
                            onNewProjectClicked = {
                                currentDestination = AppDestination.BUILD
                            },
                            onOpenProject = { id, title, code ->
                                activeProjectId = id
                                activeProjectTitle = title
                                activeProjectCode = code
                                isViewingResult = true
                            }
                        )
                    }

                    AppDestination.BUILD -> {
                        BuildScreen(
                            onBuildComplete = { id, title, code ->
                                activeProjectId = id
                                activeProjectTitle = title
                                activeProjectCode = code
                                isViewingResult = true
                            }
                        )
                    }

                    AppDestination.CHAT -> {
                        ChatScreen(
                            viewModel = chatViewModel,
                            onNavigateToHistory = { currentDestination = AppDestination.HOME },
                            onNavigateToTemplates = { currentDestination = AppDestination.BUILD },
                            onNavigateToSettings = { currentDestination = AppDestination.SETTINGS }
                        )
                    }

                    AppDestination.SETTINGS -> {
                        SettingsScreen()
                    }
                }
            }
        }
    }
}
