package com.kaz.appfactory.ui.components

import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
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
import com.kaz.appfactory.KazApplication
import com.kaz.appfactory.data.model.AiIdentity
import com.kaz.appfactory.data.model.AiModelType
import com.kaz.appfactory.ui.theme.CyanNeon
import com.kaz.appfactory.ui.theme.TealAccent

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AiIdentityControlBottomSheet(
    onDismissRequest: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val identityManager = remember { KazApplication.instance.aiIdentityManager }
    val themePrefs = remember { KazApplication.instance.themePreferences }

    val currentIdentity by identityManager.currentIdentity.collectAsStateWithLifecycle()
    val modelParams by identityManager.modelParameters.collectAsStateWithLifecycle()
    val selectedModel by themePrefs.selectedAiModel.collectAsStateWithLifecycle()

    var activeTab by remember { mutableIntStateOf(0) } // 0: Identity, 1: Model Control

    // Local state for editing identity
    var nameInput by remember(currentIdentity) { mutableStateOf(currentIdentity.name) }
    var roleInput by remember(currentIdentity) { mutableStateOf(currentIdentity.role) }
    var toneInput by remember(currentIdentity) { mutableStateOf(currentIdentity.tone) }
    var rulesInput by remember(currentIdentity) { mutableStateOf(currentIdentity.customRules) }
    var signatureInput by remember(currentIdentity) { mutableStateOf(currentIdentity.signature) }
    var isEnabled by remember(currentIdentity) { mutableStateOf(currentIdentity.isEnabled) }

    // Local state for editing parameters
    var tempVal by remember(modelParams) { mutableFloatStateOf(modelParams.temperature) }
    var topPVal by remember(modelParams) { mutableFloatStateOf(modelParams.topP) }
    var maxTokensVal by remember(modelParams) { mutableIntStateOf(modelParams.maxOutputTokens) }
    var strictPersonaVal by remember(modelParams) { mutableStateOf(modelParams.strictPersonaEnforcement) }
    var autoFallbackVal by remember(modelParams) { mutableStateOf(modelParams.autoFallbackOnRateLimit) }

    ModalBottomSheet(
        onDismissRequest = onDismissRequest,
        modifier = modifier.testTag("ai_identity_control_sheet"),
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
        containerColor = MaterialTheme.colorScheme.surface
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 24.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = CyanNeon.copy(alpha = 0.15f),
                        modifier = Modifier.size(44.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Default.Tune,
                                contentDescription = null,
                                tint = CyanNeon,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "استوديو التحكم بالهوية والنماذج",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "تخصيص شخصية الذكاء الاصطناعي والتحكم الكامل في المعايير",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                IconButton(onClick = onDismissRequest) {
                    Icon(imageVector = Icons.Default.Close, contentDescription = "إغلاق")
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Tabs Switcher
            TabRow(
                selectedTabIndex = activeTab,
                containerColor = MaterialTheme.colorScheme.surfaceVariant,
                contentColor = CyanNeon,
                indicator = {},
                divider = {},
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.15f), RoundedCornerShape(16.dp))
            ) {
                Tab(
                    selected = activeTab == 0,
                    onClick = { activeTab = 0 },
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Face,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("الهوية والشخصية", fontWeight = FontWeight.Bold)
                        }
                    }
                )
                Tab(
                    selected = activeTab == 1,
                    onClick = { activeTab = 1 },
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.SmartToy,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("التحكم بالنماذج", fontWeight = FontWeight.Bold)
                        }
                    }
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Tab Content
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f, fill = false),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                if (activeTab == 0) {
                    // Identity Enable Switch
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                            shape = RoundedCornerShape(18.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Default.Security,
                                        contentDescription = null,
                                        tint = if (isEnabled) CyanNeon else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Column {
                                        Text(
                                            text = "تفعيل الالتزام بالهوية المخصصة",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 14.sp
                                        )
                                        Text(
                                            text = if (isEnabled) "النموذج ملتزم حرفياً بالهوية والقواعد" else "النموذج يعمل بالوضع الافتراضي",
                                            fontSize = 11.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }
                                Switch(
                                    checked = isEnabled,
                                    onCheckedChange = { isEnabled = it },
                                    colors = SwitchDefaults.colors(checkedThumbColor = CyanNeon)
                                )
                            }
                        }
                    }

                    // Presets Selection
                    item {
                        Text(
                            text = "هويات جاهزة بنقرة واحدة (اختر أو خصص):",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            items(AiIdentity.PRESETS) { preset ->
                                val isSelected = currentIdentity.id == preset.id
                                Surface(
                                    shape = RoundedCornerShape(14.dp),
                                    color = if (isSelected) CyanNeon.copy(alpha = 0.2f) else MaterialTheme.colorScheme.surfaceVariant,
                                    border = if (isSelected) androidx.compose.foundation.BorderStroke(1.5.dp, CyanNeon) else null,
                                    modifier = Modifier.clickable {
                                        identityManager.selectPreset(preset.id)
                                        Toast.makeText(context, "تم تطبيق هوية: ${preset.name}", Toast.LENGTH_SHORT).show()
                                    }
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = preset.name,
                                            fontSize = 12.sp,
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                            color = if (isSelected) CyanNeon else MaterialTheme.colorScheme.onSurface
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // Identity Details Input
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                            shape = RoundedCornerShape(18.dp)
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Text(
                                    text = "تخصيص تفاصيل الهوية الملزمة ✍️",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = CyanNeon
                                )

                                OutlinedTextField(
                                    value = nameInput,
                                    onValueChange = { nameInput = it },
                                    label = { Text("اسم الهوية (Persona Name)", fontSize = 12.sp) },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    singleLine = true
                                )

                                OutlinedTextField(
                                    value = roleInput,
                                    onValueChange = { roleInput = it },
                                    label = { Text("الدور والتخصص (Role & Specialty)", fontSize = 12.sp) },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    singleLine = true
                                )

                                OutlinedTextField(
                                    value = toneInput,
                                    onValueChange = { toneInput = it },
                                    label = { Text("نبرة الصوت وأسلوب الحديث (Tone & Style)", fontSize = 12.sp) },
                                    placeholder = { Text("مثال: مباشر، احترافي، ودود، عفوي...") },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    singleLine = true
                                )

                                OutlinedTextField(
                                    value = rulesInput,
                                    onValueChange = { rulesInput = it },
                                    label = { Text("القواعد الصارمة والملزمة (التي يلتزم بها في كل شيء)", fontSize = 12.sp) },
                                    placeholder = { Text("اكتب القواعد التي تريده أن يلتزم بها...") },
                                    modifier = Modifier.fillMaxWidth(),
                                    minLines = 3,
                                    maxLines = 6,
                                    shape = RoundedCornerShape(12.dp)
                                )

                                OutlinedTextField(
                                    value = signatureInput,
                                    onValueChange = { signatureInput = it },
                                    label = { Text("التوقيع الدائم في نهاية كل رد", fontSize = 12.sp) },
                                    placeholder = { Text("مثال: ⚡ كود نقي، أداء فائق.") },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    singleLine = true
                                )
                            }
                        }
                    }
                } else {
                    // Model Selection Cards
                    item {
                        Text(
                            text = "اختر نموذج الذكاء الاصطناعي الفعّال:",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(8.dp))

                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            AiModelType.entries.forEach { model ->
                                val isSelected = selectedModel == model
                                Card(
                                    colors = CardDefaults.cardColors(
                                        containerColor = if (isSelected) CyanNeon.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant
                                    ),
                                    shape = RoundedCornerShape(14.dp),
                                    border = if (isSelected) androidx.compose.foundation.BorderStroke(1.5.dp, CyanNeon) else null,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            themePrefs.setSelectedAiModel(model)
                                            Toast.makeText(context, "تم اختيار: ${model.titleAr}", Toast.LENGTH_SHORT).show()
                                        }
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(14.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            RadioButton(
                                                selected = isSelected,
                                                onClick = { themePrefs.setSelectedAiModel(model) },
                                                colors = RadioButtonDefaults.colors(selectedColor = CyanNeon)
                                            )
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Column {
                                                Text(
                                                    text = model.titleAr,
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 13.sp,
                                                    color = if (isSelected) CyanNeon else MaterialTheme.colorScheme.onSurface
                                                )
                                                Text(
                                                    text = model.descriptionAr,
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
                                                text = model.badge,
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = CyanNeon,
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Model Tuning Parameters (Temperature, Top-P, Max Tokens)
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                            shape = RoundedCornerShape(18.dp)
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(14.dp)
                            ) {
                                Text(
                                    text = "التحكم الدقيق بالمعايير الهندسية 🎛️",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = CyanNeon
                                )

                                // Temperature Slider
                                Column {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(text = "مستوى الالتزام والإبداع (Temperature):", fontSize = 12.sp)
                                        Text(
                                            text = "%.2f (%s)".format(
                                                tempVal,
                                                when {
                                                    tempVal <= 0.2f -> "صارم ومبرمج"
                                                    tempVal <= 0.5f -> "متوازن وهندسي"
                                                    tempVal <= 0.8f -> "إبداعي"
                                                    else -> "تجريبي حر"
                                                }
                                            ),
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = CyanNeon
                                        )
                                    }
                                    Slider(
                                        value = tempVal,
                                        onValueChange = { tempVal = it },
                                        valueRange = 0.0f..1.5f,
                                        colors = SliderDefaults.colors(
                                            thumbColor = CyanNeon,
                                            activeTrackColor = CyanNeon
                                        )
                                    )
                                }

                                // Top-P Slider
                                Column {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(text = "مجال المفردات (Top-P Sampling):", fontSize = 12.sp)
                                        Text(
                                            text = "%.2f".format(topPVal),
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = CyanNeon
                                        )
                                    }
                                    Slider(
                                        value = topPVal,
                                        onValueChange = { topPVal = it },
                                        valueRange = 0.1f..1.0f,
                                        colors = SliderDefaults.colors(
                                            thumbColor = CyanNeon,
                                            activeTrackColor = CyanNeon
                                        )
                                    )
                                }

                                // Max Tokens Selection
                                Column {
                                    Text(text = "الحد الأقصى لطول الكود والإجابة (Max Tokens):", fontSize = 12.sp)
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Row(
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        listOf(2048, 4096, 8192, 16384).forEach { tokens ->
                                            val isSelected = maxTokensVal == tokens
                                            Surface(
                                                shape = RoundedCornerShape(10.dp),
                                                color = if (isSelected) CyanNeon.copy(alpha = 0.25f) else MaterialTheme.colorScheme.surface,
                                                border = if (isSelected) androidx.compose.foundation.BorderStroke(1.dp, CyanNeon) else null,
                                                modifier = Modifier
                                                    .weight(1f)
                                                    .clickable { maxTokensVal = tokens }
                                            ) {
                                                Box(
                                                    contentAlignment = Alignment.Center,
                                                    modifier = Modifier.padding(vertical = 8.dp)
                                                ) {
                                                    Text(
                                                        text = "$tokens",
                                                        fontSize = 12.sp,
                                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                                        color = if (isSelected) CyanNeon else MaterialTheme.colorScheme.onSurface
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }

                                // Strict Persona Enforcement Switch
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "فرض الهوية الصارمة في كل الردود",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 13.sp
                                        )
                                        Text(
                                            text = "منع النموذج من الخروج عن شخصيته أو قواعده المحددة",
                                            fontSize = 11.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                    Switch(
                                        checked = strictPersonaVal,
                                        onCheckedChange = { strictPersonaVal = it },
                                        colors = SwitchDefaults.colors(checkedThumbColor = CyanNeon)
                                    )
                                }

                                // Auto Fallback Switch
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "التبديل التلقائي الذكي عند الضغط",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 13.sp
                                        )
                                        Text(
                                            text = "التحويل لنموذج بديل تلقائياً في حال انتهاء الكوتا أو حدوث خطأ",
                                            fontSize = 11.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                    Switch(
                                        checked = autoFallbackVal,
                                        onCheckedChange = { autoFallbackVal = it },
                                        colors = SwitchDefaults.colors(checkedThumbColor = CyanNeon)
                                    )
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Action Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedButton(
                    onClick = {
                        identityManager.resetToDefaults()
                        Toast.makeText(context, "تمت استعادة الإعدادات الافتراضية", Toast.LENGTH_SHORT).show()
                    },
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(
                        imageVector = Icons.Default.Refresh,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("إعادة الضبط", fontSize = 12.sp)
                }

                Button(
                    onClick = {
                        // Save Identity
                        identityManager.updateIdentityFields(
                            name = nameInput,
                            role = roleInput,
                            tone = toneInput,
                            customRules = rulesInput,
                            signature = signatureInput,
                            isEnabled = isEnabled
                        )
                        // Save Model Parameters
                        identityManager.updateParameters(
                            temperature = tempVal,
                            topP = topPVal,
                            maxOutputTokens = maxTokensVal,
                            strictPersonaEnforcement = strictPersonaVal,
                            autoFallbackOnRateLimit = autoFallbackVal
                        )
                        Toast.makeText(context, "تم حفظ وتطبيق الهوية والتحكم بالنماذج بنجاح! 🚀", Toast.LENGTH_SHORT).show()
                        onDismissRequest()
                    },
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = CyanNeon,
                        contentColor = Color.Black
                    ),
                    modifier = Modifier.weight(1.3f)
                ) {
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("حفظ وتطبيق فوراً", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }
            }
        }
    }
}
