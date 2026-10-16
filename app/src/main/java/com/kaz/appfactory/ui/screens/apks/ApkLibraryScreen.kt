package com.kaz.appfactory.ui.screens.apks

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
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
import androidx.lifecycle.viewmodel.compose.viewModel
import com.kaz.appfactory.data.model.GeneratedApkInfo
import com.kaz.appfactory.ui.theme.CyanNeon
import com.kaz.appfactory.ui.theme.TealAccent

/**
 * APK Manager Screen:
 * Displays all locally generated APKs from internal storage,
 * showing App Name, Size, Creation Date, and a direct PackageInstaller trigger button.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ApkManagerScreen(
    onNavigateToBuild: () -> Unit,
    viewModel: ApkLibraryViewModel = viewModel(),
    modifier: Modifier = Modifier
) {
    ApkLibraryScreen(
        onNavigateToBuild = onNavigateToBuild,
        viewModel = viewModel,
        modifier = modifier
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ApkLibraryScreen(
    onNavigateToBuild: () -> Unit,
    viewModel: ApkLibraryViewModel = viewModel(),
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val selectedApk by viewModel.selectedApk.collectAsStateWithLifecycle()
    val installingFile by viewModel.installingApk.collectAsStateWithLifecycle()

    var searchQuery by remember { mutableStateOf("") }

    if (selectedApk != null) {
        ApkMetadataDialog(
            apkInfo = selectedApk!!,
            onInstall = {
                viewModel.installApk(context, selectedApk!!)
                Toast.makeText(context, "جاري تشغيل PackageInstaller لتثبيت ${selectedApk!!.name}...", Toast.LENGTH_SHORT).show()
            },
            onShare = {
                viewModel.shareApk(context, selectedApk!!)
            },
            onDelete = {
                viewModel.deleteApk(selectedApk!!)
                Toast.makeText(context, "تم حذف ملف APK بنجاح", Toast.LENGTH_SHORT).show()
            },
            onDismiss = {
                viewModel.selectApk(null)
            }
        )
    }

    Scaffold(
        modifier = modifier
            .fillMaxSize()
            .testTag("apk_manager_screen"),
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.InstallMobile,
                                contentDescription = null,
                                tint = CyanNeon,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "مدير حزم التطبيقات (APK)",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Text(
                            text = "تطبيقاتك المجمعة والموقعة محلياً على هاتفك",
                            fontSize = 11.sp,
                            color = CyanNeon
                        )
                    }
                },
                actions = {
                    IconButton(
                        onClick = { viewModel.loadApks() },
                        modifier = Modifier.testTag("refresh_apks_button")
                    ) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "تحديث",
                            tint = CyanNeon
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            // Summary Card
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f)
                )
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text(
                            text = "تثبيت فوري ومباشر على هاتفك",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "اختر أي تطبيق لتثبيته بنقرة واحدة عبر مثبت أندرويد الأصلي",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(CyanNeon.copy(alpha = 0.2f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.SecurityUpdateGood,
                            contentDescription = null,
                            tint = CyanNeon,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }

            // Search field
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("بحث في حزم APK المنشأة...", fontSize = 13.sp) },
                leadingIcon = {
                    Icon(Icons.Default.Search, contentDescription = null, tint = CyanNeon)
                },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(Icons.Default.Clear, contentDescription = "مسح")
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp)
                    .testTag("search_apk_input"),
                shape = RoundedCornerShape(12.dp),
                singleLine = true
            )

            when (val state = uiState) {
                is ApkLibraryUiState.Loading -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = CyanNeon)
                    }
                }

                is ApkLibraryUiState.Empty -> {
                    EmptyApkVaultView(onNavigateToBuild = onNavigateToBuild)
                }

                is ApkLibraryUiState.Error -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = state.message,
                            color = MaterialTheme.colorScheme.error,
                            fontSize = 13.sp
                        )
                    }
                }

                is ApkLibraryUiState.Success -> {
                    val filteredList = remember(state.apks, searchQuery) {
                        if (searchQuery.isBlank()) {
                            state.apks
                        } else {
                            state.apks.filter {
                                it.name.contains(searchQuery, ignoreCase = true) ||
                                it.packageName.contains(searchQuery, ignoreCase = true)
                            }
                        }
                    }

                    if (filteredList.isEmpty()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(32.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "لا توجد نتائج مطابقة للبحث",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontSize = 13.sp
                            )
                        }
                    } else {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            items(filteredList, key = { it.file.absolutePath }) { apkItem ->
                                ApkCardItem(
                                    apkInfo = apkItem,
                                    isInstalling = installingFile?.absolutePath == apkItem.file.absolutePath,
                                    onClick = { viewModel.selectApk(apkItem) },
                                    onInstall = {
                                        viewModel.installApk(context, apkItem)
                                        Toast.makeText(context, "جاري تشغيل PackageInstaller لتثبيت ${apkItem.name}...", Toast.LENGTH_SHORT).show()
                                    },
                                    onShare = {
                                        viewModel.shareApk(context, apkItem)
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ApkCardItem(
    apkInfo: GeneratedApkInfo,
    isInstalling: Boolean,
    onClick: () -> Unit,
    onInstall: () -> Unit,
    onShare: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .clickable { onClick() }
            .border(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f), RoundedCornerShape(16.dp))
            .testTag("apk_card_${apkInfo.name}"),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            // Row 1: Icon, App Name, Size Badge
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(46.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(CyanNeon.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Android,
                        contentDescription = null,
                        tint = CyanNeon,
                        modifier = Modifier.size(26.dp)
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = apkInfo.name,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        maxLines = 1
                    )
                    Text(
                        text = apkInfo.packageName,
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontFamily = FontFamily.Monospace,
                        maxLines = 1
                    )
                }

                // Size Badge
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = TealAccent.copy(alpha = 0.18f),
                    border = CardDefaults.outlinedCardBorder()
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Storage,
                            contentDescription = null,
                            tint = TealAccent,
                            modifier = Modifier.size(12.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = apkInfo.formattedSize,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = TealAccent
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
            Spacer(modifier = Modifier.height(10.dp))

            // Row 2: Date + PackageInstaller Action Button
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Schedule,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = apkInfo.formattedDate,
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    IconButton(
                        onClick = onShare,
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(
                            Icons.Default.Share,
                            contentDescription = "مشاركة",
                            tint = CyanNeon,
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    // Direct PackageInstaller Trigger Button
                    Button(
                        onClick = onInstall,
                        modifier = Modifier
                            .height(36.dp)
                            .testTag("card_install_button"),
                        enabled = !isInstalling,
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = CyanNeon,
                            contentColor = Color.Black
                        )
                    ) {
                        Icon(
                            Icons.Default.InstallMobile,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "تثبيت الآن 📲",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun EmptyApkVaultView(
    onNavigateToBuild: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(CircleShape)
                    .background(CyanNeon.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.FolderZip,
                    contentDescription = null,
                    tint = CyanNeon,
                    modifier = Modifier.size(40.dp)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "لا توجد حزم APK منشأة حالياً",
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp
            )

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = "عندما تقوم بإنشاء وتجميع أي تطبيق في KAZ، ستظهر حزمة الـ APK الموقعة هنا مع حجمها وتاريخها لتثبيتها بضغطة زر واحدة.",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                lineHeight = 18.sp
            )

            Spacer(modifier = Modifier.height(20.dp))

            Button(
                onClick = onNavigateToBuild,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = CyanNeon,
                    contentColor = Color.Black
                )
            ) {
                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("إنشاء تطبيق APK جديد 🚀", fontWeight = FontWeight.Bold, fontSize = 13.sp)
            }
        }
    }
}
