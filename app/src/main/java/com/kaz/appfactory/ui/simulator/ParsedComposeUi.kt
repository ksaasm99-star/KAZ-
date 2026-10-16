package com.kaz.appfactory.ui.simulator

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector

data class SimulatorCardItem(
    val id: Long,
    val title: String,
    val subtitle: String,
    val badge: String = "جديد",
    val isChecked: Boolean = false,
    val count: Int = 1,
    val price: String? = null,
    val category: String = "الرئيسية",
    val icon: ImageVector = Icons.Default.Widgets
)

data class SimulatorNavItem(
    val id: String,
    val title: String,
    val icon: ImageVector
)

data class SimulatorFormField(
    val key: String,
    val label: String,
    val placeholder: String,
    val isMultiline: Boolean = false
)

data class ComposeNodeInfo(
    val name: String,
    val type: String,
    val details: String,
    val codeSnippet: String
)

data class ParsedComposeUi(
    val appTitle: String,
    val subtitle: String = "تطبيق Jetpack Compose جاهز",
    val primaryColor: Color = Color(0xFF00E5FF),
    val hasSearch: Boolean = true,
    val searchPlaceholder: String = "ابحث هنا...",
    val hasFab: Boolean = true,
    val fabIcon: ImageVector = Icons.Default.Add,
    val fabLabel: String = "إضافة",
    val tabs: List<String> = emptyList(),
    val navItems: List<SimulatorNavItem> = emptyList(),
    val initialItems: List<SimulatorCardItem> = emptyList(),
    val metricTitle: String? = null,
    val metricValue: String? = null,
    val formFields: List<SimulatorFormField> = emptyList(),
    val primaryButtonLabel: String? = null,
    val detectedComponents: List<String> = emptyList(),
    val composeNodes: List<ComposeNodeInfo> = emptyList()
)
