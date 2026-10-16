package com.kaz.appfactory.ui.screens.settings

import android.widget.Toast
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kaz.appfactory.BuildConfig
import com.kaz.appfactory.KazApplication
import com.kaz.appfactory.data.local.ThemeMode
import com.kaz.appfactory.data.model.AiModelType
import com.kaz.appfactory.ui.theme.CyanNeon
import com.kaz.appfactory.ui.theme.TealAccent

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val themePrefs = remember { KazApplication.instance.themePreferences }
    val currentTheme by themePrefs.themeMode.collectAsStateWithLifecycle()
    val customApiKey by themePrefs.customApiKey.collectAsStateWithLifecycle()
    val selectedModel by themePrefs.selectedAiModel.collectAsStateWithLifecycle()

    var keyInput by remember(customApiKey) { mutableStateOf(customApiKey) }
    var modelDropdownExpanded by remember { mutableStateOf(false) }

    Scaffold(
        modifier = modifier
            .fillMaxSize()
            .testTag("settings_screen"),
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "الإعدادات والتخصيص",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Theme Section
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.DarkMode,
                                contentDescription = null,
                                tint = CyanNeon
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                text = "مظهر التطبيق (الوضع الليلي والنهاري)",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // Theme Mode Options
                        val options = listOf(
                            Triple(ThemeMode.DARK, "الوضع الليلي (الداكن)", Icons.Default.DarkMode),
                            Triple(ThemeMode.LIGHT, "الوضع النهاري (الفاتح)", Icons.Default.LightMode),
                            Triple(ThemeMode.SYSTEM, "تلقائي حسب نظام الجهاز", Icons.Default.SettingsBrightness)
                        )

                        options.forEach { (mode, label, icon) ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                RadioButton(
                                    selected = currentTheme == mode,
                                    onClick = { themePrefs.setThemeMode(mode) },
                                    colors = RadioButtonDefaults.colors(
                                        selectedColor = CyanNeon
                                    )
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Icon(
                                    imageVector = icon,
                                    contentDescription = null,
                                    tint = if (currentTheme == mode) CyanNeon else MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = label,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = if (currentTheme == mode) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
                                    fontWeight = if (currentTheme == mode) FontWeight.Bold else FontWeight.Normal
                                )
                            }
                        }
                    }
                }
            }

            // Multiple AI Models Section (Dropdown Selection)
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.SmartToy,
                                    contentDescription = null,
                                    tint = CyanNeon
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text(
                                        text = "نموذج الذكاء الاصطناعي (AI Model)",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = "اختر المحرك لبناء وهندسة التطبيقات",
                                        fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }

                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = CyanNeon.copy(alpha = 0.2f)
                            ) {
                                Text(
                                    text = selectedModel.badge,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = CyanNeon,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // Exposed Dropdown Menu Box
                        ExposedDropdownMenuBox(
                            expanded = modelDropdownExpanded,
                            onExpandedChange = { modelDropdownExpanded = it },
                            modifier = Modifier.fillMaxWidth().testTag("ai_model_dropdown")
                        ) {
                            OutlinedTextField(
                                value = selectedModel.titleAr,
                                onValueChange = {},
                                readOnly = true,
                                trailingIcon = {
                                    ExposedDropdownMenuDefaults.TrailingIcon(expanded = modelDropdownExpanded)
                                },
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = CyanNeon,
                                    unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
                                    focusedContainerColor = MaterialTheme.colorScheme.surface,
                                    unfocusedContainerColor = MaterialTheme.colorScheme.surface
                                ),
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier
                                    .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                                    .fillMaxWidth()
                            )

                            ExposedDropdownMenu(
                                expanded = modelDropdownExpanded,
                                onDismissRequest = { modelDropdownExpanded = false }
                            ) {
                                AiModelType.entries.forEach { model ->
                                    DropdownMenuItem(
                                        text = {
                                            Column {
                                                Row(
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    modifier = Modifier.fillMaxWidth()
                                                ) {
                                                    Text(
                                                        text = model.titleAr,
                                                        fontWeight = if (selectedModel == model) FontWeight.Bold else FontWeight.Normal,
                                                        color = if (selectedModel == model) CyanNeon else MaterialTheme.colorScheme.onSurface
                                                    )
                                                    Text(
                                                        text = model.badge,
                                                        fontSize = 10.sp,
                                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                                    )
                                                }
                                                Text(
                                                    text = model.descriptionAr,
                                                    fontSize = 10.sp,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                                )
                                            }
                                        },
                                        onClick = {
                                            themePrefs.setSelectedAiModel(model)
                                            modelDropdownExpanded = false
                                            Toast.makeText(context, "تم اختيار: ${model.titleAr}", Toast.LENGTH_SHORT).show()
                                        },
                                        leadingIcon = {
                                            Icon(
                                                imageVector = if (model == AiModelType.FLASH) Icons.Default.Bolt else Icons.Default.AutoAwesome,
                                                contentDescription = null,
                                                tint = if (selectedModel == model) CyanNeon else MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        // Selected Model Explanation Card
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.surface.copy(alpha = 0.7f),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = if (selectedModel == AiModelType.FLASH) Icons.Default.Speed else Icons.Default.Psychology,
                                    contentDescription = null,
                                    tint = CyanNeon,
                                    modifier = Modifier.size(24.dp)
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text(
                                        text = selectedModel.titleEn,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp,
                                        color = CyanNeon
                                    )
                                    Text(
                                        text = selectedModel.descriptionAr,
                                        fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        lineHeight = 16.sp
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Gemini API Key Section
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.VpnKey,
                                    contentDescription = null,
                                    tint = CyanNeon
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Text(
                                    text = "حالة اتصال Gemini API",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                            }

                            val isConnected = BuildConfig.GEMINI_API_KEY.isNotBlank() || customApiKey.isNotBlank()
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = if (isConnected) TealAccent.copy(alpha = 0.2f) else MaterialTheme.colorScheme.errorContainer
                            ) {
                                Text(
                                    text = if (isConnected) "متصل وجاهز" else "غير مفعّل",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isConnected) TealAccent else MaterialTheme.colorScheme.error,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Text(
                            text = "يستخدم التطبيق مفتاح Gemini API المدمج تلقائيًا، ويمكنك إدخال مفتاح مخصص إذا رغبت في ذلك:",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        OutlinedTextField(
                            value = keyInput,
                            onValueChange = { keyInput = it },
                            placeholder = { Text("أدخل مفتاح Gemini API المخصص (اختياري)...", fontSize = 12.sp) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("api_key_input"),
                            shape = RoundedCornerShape(14.dp),
                            singleLine = true
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Button(
                            onClick = {
                                themePrefs.setCustomApiKey(keyInput)
                                Toast.makeText(context, "تم حفظ الإعدادات بنجاح!", Toast.LENGTH_SHORT).show()
                            },
                            modifier = Modifier
                                .align(Alignment.End)
                                .height(38.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = CyanNeon,
                                contentColor = Color.Black
                            )
                        ) {
                            Text("حفظ المفتاح", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            // GitHub Integration Section
            item {
                val savedGitToken by themePrefs.gitHubToken.collectAsStateWithLifecycle()
                var gitTokenInput by remember(savedGitToken) { mutableStateOf(savedGitToken) }
                val isGitConnected = savedGitToken.isNotBlank()

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.CloudUpload,
                                    contentDescription = null,
                                    tint = CyanNeon
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text(
                                        text = "ربط وتكامل GitHub",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = "لإنشاء المستودعات ورفع الأكواد تلقائياً",
                                        fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }

                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = if (isGitConnected) TealAccent.copy(alpha = 0.2f) else MaterialTheme.colorScheme.surface
                            ) {
                                Text(
                                    text = if (isGitConnected) "الرمز محفوظ ✓" else "لم يتم الربط",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isGitConnected) TealAccent else MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Text(
                            text = "أدخل رمز الوصول الشخصي (GitHub Personal Access Token) لتتمكن من إنشاء مستودعات جديدة ورفع ملفات مشاريعك مباشرة:",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        OutlinedTextField(
                            value = gitTokenInput,
                            onValueChange = { gitTokenInput = it },
                            placeholder = { Text("ghp_xxxxxxxxxxxxxxxxxxxx", fontSize = 12.sp) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("settings_github_token_input"),
                            shape = RoundedCornerShape(14.dp),
                            singleLine = true
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.End,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            if (isGitConnected) {
                                TextButton(
                                    onClick = {
                                        themePrefs.setGitHubToken("")
                                        gitTokenInput = ""
                                        Toast.makeText(context, "تم مسح رمز GitHub", Toast.LENGTH_SHORT).show()
                                    }
                                ) {
                                    Text("مسح الرمز", color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                                }
                                Spacer(modifier = Modifier.width(8.dp))
                            }

                            Button(
                                onClick = {
                                    themePrefs.setGitHubToken(gitTokenInput)
                                    Toast.makeText(context, "تم حفظ رمز GitHub بنجاح!", Toast.LENGTH_SHORT).show()
                                },
                                modifier = Modifier.height(38.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = CyanNeon,
                                    contentColor = Color.Black
                                )
                            ) {
                                Text("حفظ رمز GitHub", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            // About KAZ Card
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f), RoundedCornerShape(20.dp)),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Text(
                            text = "عن تطبيق KAZ (مصنع التطبيقات الذكي)",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = CyanNeon
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "تطبيق KAZ هو مساعد ذكي متخصص في توليد وبناء تطبيقات أندرويد الحديثة عبر الذكاء الاصطناعي التوليدي من Google Gemini. يقوم بإنشاء الأكواد البرمجية الكاملة بنسبة 100% مع واجهات Jetpack Compose و Clean Architecture وتخزين محلي مع Room Database.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            lineHeight = 22.sp
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "الإصدار 1.0 • صُنع بامتياز لأندرويد",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                        )
                    }
                }
            }
        }
    }
}
