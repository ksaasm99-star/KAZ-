package com.kaz.appfactory.ui.screens.settings

import android.widget.Toast
import androidx.compose.foundation.border
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

    var keyInput by remember(customApiKey) { mutableStateOf(customApiKey) }
    var showKeySavedMessage by remember { mutableStateOf(false) }

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
