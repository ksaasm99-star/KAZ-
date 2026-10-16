package com.kaz.appfactory.ui.screens.result

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kaz.appfactory.builder.AppBuilderService
import com.kaz.appfactory.data.model.BuildEngineType
import com.kaz.appfactory.data.remote.CodeExtractor
import com.kaz.appfactory.hefesto.HefestoEngine
import com.kaz.appfactory.hefesto.HefestoLog
import com.kaz.appfactory.installer.ApkInstallerService
import com.kaz.appfactory.ui.components.ExportBottomSheet
import com.kaz.appfactory.ui.components.GitHubPushDialog
import com.kaz.appfactory.ui.theme.*
import com.kaz.appfactory.webview.WebViewShell
import kotlinx.coroutines.launch
import java.io.File

enum class ResultViewTab {
    PREVIEW,
    CONSOLE,
    CODE
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ResultScreen(
    projectId: Long,
    projectTitle: String,
    codeContent: String,
    engineType: BuildEngineType = BuildEngineType.AUTO,
    onBackToProjects: () -> Unit,
    onOpenChat: (Long) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val hefestoEngine = remember { HefestoEngine() }
    val hefestoLogs by hefestoEngine.logs.collectAsStateWithLifecycle()

    val htmlAppCode = remember(codeContent) {
        CodeExtractor.extractHtmlApp(codeContent)
    }

    var selectedTab by remember { mutableStateOf(ResultViewTab.PREVIEW) }
    var reloadKey by remember { mutableIntStateOf(0) }
    var isBuildingApk by remember { mutableStateOf(false) }
    var buildProgressStep by remember { mutableStateOf("") }
    var cachedApkFile by remember { mutableStateOf<File?>(null) }

    var showExportSheet by remember { mutableStateOf(false) }
    var showGitHubDialog by remember { mutableStateOf(false) }

    if (showGitHubDialog) {
        GitHubPushDialog(
            projectName = projectTitle,
            snippets = emptyList(),
            rawCode = htmlAppCode,
            onDismiss = { showGitHubDialog = false }
        )
    }

    if (showExportSheet) {
        ExportBottomSheet(
            projectName = projectTitle,
            codeContent = htmlAppCode,
            snippets = emptyList(),
            onPushToGitHub = { showGitHubDialog = true },
            onDismiss = { showExportSheet = false }
        )
    }

    Scaffold(
        modifier = modifier
            .fillMaxSize()
            .testTag("app_preview_screen"),
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = projectTitle,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1
                        )
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .clip(CircleShape)
                                    .background(TealAccent)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "المحرك الهجين فائق السرعة • جاهز للتثبيت",
                                fontSize = 11.sp,
                                color = CyanNeon
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackToProjects) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "الرجوع"
                        )
                    }
                },
                actions = {
                    // Reload WebView
                    IconButton(
                        onClick = { reloadKey++ },
                        modifier = Modifier.testTag("reload_webview_button")
                    ) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "إعادة تحميل",
                            tint = CyanNeon
                        )
                    }

                    // Push to GitHub
                    IconButton(
                        onClick = { showGitHubDialog = true },
                        modifier = Modifier.testTag("github_push_top_button")
                    ) {
                        Icon(
                            imageVector = Icons.Default.CloudUpload,
                            contentDescription = "رفع إلى GitHub",
                            tint = CyanNeon
                        )
                    }

                    // Export Sheet
                    IconButton(onClick = { showExportSheet = true }) {
                        Icon(
                            imageVector = Icons.Default.Share,
                            contentDescription = "مشاركة وتصدير",
                            tint = CyanNeon
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        bottomBar = {
            Surface(
                color = MaterialTheme.colorScheme.surface,
                tonalElevation = 8.dp,
                border = CardDefaults.outlinedCardBorder()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Building Progress Indicator
                    AnimatedVisibility(visible = isBuildingApk) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    color = CyanNeon,
                                    strokeWidth = 2.dp
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                                Text(
                                    text = buildProgressStep,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = CyanNeon
                                )
                            }
                        }
                    }

                    // Action Buttons Row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        // 1. Install APK Button
                        Button(
                            onClick = {
                                if (isBuildingApk) return@Button
                                isBuildingApk = true
                                coroutineScope.launch {
                                    val apkFile = cachedApkFile ?: run {
                                        val result = if (engineType == BuildEngineType.KOTLIN) {
                                            selectedTab = ResultViewTab.CONSOLE
                                            hefestoEngine.buildKotlinProject(
                                                context = context,
                                                projectName = projectTitle,
                                                kotlinCode = codeContent,
                                                onProgress = { step -> buildProgressStep = step }
                                            )
                                        } else {
                                            AppBuilderService.buildApk(
                                                context = context,
                                                appName = projectTitle,
                                                htmlCode = htmlAppCode,
                                                onProgress = { step -> buildProgressStep = step }
                                            )
                                        }
                                        result.getOrNull()?.also { cachedApkFile = it }
                                    }

                                    isBuildingApk = false
                                    if (apkFile != null && apkFile.exists()) {
                                        Toast.makeText(context, "جاري فتح مثبت الحزم لتثبيت التطبيق...", Toast.LENGTH_SHORT).show()
                                        ApkInstallerService.installApk(context, apkFile)
                                    } else {
                                        Toast.makeText(context, "فشل إنشاء حزمة APK", Toast.LENGTH_LONG).show()
                                    }
                                }
                            },
                            modifier = Modifier
                                .weight(1.3f)
                                .height(50.dp)
                                .testTag("install_apk_button"),
                            enabled = !isBuildingApk,
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = CyanNeon,
                                contentColor = Color.Black
                            )
                        ) {
                            Icon(
                                imageVector = Icons.Default.InstallMobile,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "تثبيت التطبيق على الجهاز 🚀",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        // 2. Share APK Button
                        Button(
                            onClick = {
                                if (isBuildingApk) return@Button
                                isBuildingApk = true
                                coroutineScope.launch {
                                    val apkFile = cachedApkFile ?: run {
                                        val result = AppBuilderService.buildApk(
                                            context = context,
                                            appName = projectTitle,
                                            htmlCode = htmlAppCode,
                                            onProgress = { step -> buildProgressStep = step }
                                        )
                                        result.getOrNull()?.also { cachedApkFile = it }
                                    }

                                    isBuildingApk = false
                                    if (apkFile != null && apkFile.exists()) {
                                        ApkInstallerService.shareApk(context, apkFile, projectTitle)
                                    } else {
                                        Toast.makeText(context, "فشل تجهيز ملف APK للمشاركة", Toast.LENGTH_LONG).show()
                                    }
                                }
                            },
                            modifier = Modifier
                                .weight(1f)
                                .height(50.dp)
                                .testTag("share_apk_button"),
                            enabled = !isBuildingApk,
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.surfaceVariant,
                                contentColor = MaterialTheme.colorScheme.onSurface
                            )
                        ) {
                            Icon(
                                imageVector = Icons.Default.Share,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp),
                                tint = CyanNeon
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "مشاركة الملف",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 14.dp, vertical = 8.dp)
        ) {
            // View Mode Tab Navigation
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = selectedTab == ResultViewTab.PREVIEW,
                    onClick = { selectedTab = ResultViewTab.PREVIEW },
                    label = { Text("المعاينة التفاعلية") },
                    leadingIcon = {
                        Icon(Icons.Default.PlayCircle, contentDescription = null, modifier = Modifier.size(16.dp))
                    },
                    modifier = Modifier.weight(1f)
                )

                FilterChip(
                    selected = selectedTab == ResultViewTab.CONSOLE,
                    onClick = { selectedTab = ResultViewTab.CONSOLE },
                    label = { Text("سجل التجميع") },
                    leadingIcon = {
                        Icon(Icons.Default.Terminal, contentDescription = null, modifier = Modifier.size(16.dp))
                    },
                    modifier = Modifier.weight(1f)
                )

                FilterChip(
                    selected = selectedTab == ResultViewTab.CODE,
                    onClick = { selectedTab = ResultViewTab.CODE },
                    label = { Text("الكود البرمجي") },
                    leadingIcon = {
                        Icon(Icons.Default.Code, contentDescription = null, modifier = Modifier.size(16.dp))
                    },
                    modifier = Modifier.weight(1f)
                )
            }

            // Main Active View Container
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .clip(RoundedCornerShape(18.dp))
                    .border(1.5.dp, CyanNeon.copy(alpha = 0.4f), RoundedCornerShape(18.dp))
                    .background(Color(0xFF0D1117))
            ) {
                when (selectedTab) {
                    ResultViewTab.PREVIEW -> {
                        key(reloadKey) {
                            WebViewShell(
                                htmlContent = htmlAppCode,
                                modifier = Modifier.fillMaxSize()
                            )
                        }
                    }

                    ResultViewTab.CONSOLE -> {
                        HefestoConsoleView(
                            logs = hefestoLogs,
                            projectName = projectTitle
                        )
                    }

                    ResultViewTab.CODE -> {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(12.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "الكود البرمجي للتطبيق",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = CyanNeon
                                )
                                IconButton(onClick = {
                                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                    clipboard.setPrimaryClip(ClipData.newPlainText("KAZ App Code", htmlAppCode))
                                    Toast.makeText(context, "تم نسخ الكود!", Toast.LENGTH_SHORT).show()
                                }) {
                                    Icon(Icons.Default.ContentCopy, contentDescription = "نسخ", tint = CyanNeon, modifier = Modifier.size(18.dp))
                                }
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            OutlinedTextField(
                                value = htmlAppCode,
                                onValueChange = {},
                                readOnly = true,
                                modifier = Modifier.fillMaxSize(),
                                shape = RoundedCornerShape(12.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun HefestoConsoleView(
    logs: List<HefestoLog>,
    projectName: String,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(14.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Terminal,
                    contentDescription = null,
                    tint = CyanNeon,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "سجل تجميع Hefesto على الهاتف (On-Device Console)",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
            Surface(
                shape = RoundedCornerShape(6.dp),
                color = TealAccent.copy(alpha = 0.2f)
            ) {
                Text(
                    text = "apksig v1+v2+v3 ✓",
                    fontSize = 10.sp,
                    color = TealAccent,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        if (logs.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "اضغط على 'تثبيت التطبيق' لتشغيل بيئة تجميع Hefesto ورؤية سجل البناء اللحظي.",
                    fontSize = 12.sp,
                    color = Color(0xFF8B949E),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                items(logs) { log ->
                    val color = when (log.level) {
                        "TASK" -> Color(0xFF58A6FF)
                        "SUCCESS" -> Color(0xFF7EE787)
                        "WARN" -> Color(0xFFFFA657)
                        else -> Color(0xFFE6EDF3)
                    }
                    Row(modifier = Modifier.fillMaxWidth()) {
                        Text(
                            text = "[${log.timestamp}] ",
                            fontFamily = FontFamily.Monospace,
                            fontSize = 11.sp,
                            color = Color(0xFF8B949E)
                        )
                        Text(
                            text = log.message,
                            fontFamily = FontFamily.Monospace,
                            fontSize = 11.sp,
                            color = color
                        )
                    }
                }
            }
        }
    }
}
