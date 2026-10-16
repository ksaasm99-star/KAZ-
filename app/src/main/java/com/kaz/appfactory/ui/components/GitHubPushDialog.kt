package com.kaz.appfactory.ui.components

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kaz.appfactory.KazApplication
import com.kaz.appfactory.data.model.CodeSnippet
import com.kaz.appfactory.data.repository.GitHubRepository
import com.kaz.appfactory.ui.theme.CyanNeon
import com.kaz.appfactory.ui.theme.IndigoRoyal
import com.kaz.appfactory.ui.theme.TealAccent
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GitHubPushDialog(
    projectName: String,
    snippets: List<CodeSnippet>,
    rawCode: String,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val themePrefs = remember { KazApplication.instance.themePreferences }
    val gitHubRepository = remember { GitHubRepository() }

    val savedToken by themePrefs.gitHubToken.collectAsState()

    var repoName by remember {
        mutableStateOf(
            projectName.replace(Regex("[^a-zA-Z0-9_\\-]"), "-").trim('-').lowercase().ifBlank { "kaz-project" }
        )
    }
    var repoDescription by remember { mutableStateOf("تم إنشاء وتطوير هذا التطبيق بواسطة KAZ - مصنع التطبيقات الذكي") }
    var tokenInput by remember(savedToken) { mutableStateOf(savedToken) }
    var isPrivate by remember { mutableStateOf(false) }
    var isPasswordVisible by remember { mutableStateOf(false) }
    var showHelp by remember { mutableStateOf(false) }

    var isPushing by remember { mutableStateOf(false) }
    var progressStep by remember { mutableStateOf("") }
    var createdRepoUrl by remember { mutableStateOf<String?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = MaterialTheme.colorScheme.surface,
        dragHandle = { BottomSheetDefaults.DragHandle() },
        modifier = Modifier
            .fillMaxHeight(0.9f)
            .testTag("github_push_dialog")
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 20.dp)
                .padding(bottom = 24.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(42.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF24292E)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.CloudUpload,
                            contentDescription = null,
                            tint = CyanNeon,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "رفع المشروع إلى GitHub",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "إنشاء مستودع مباشر ورفع كافة ملفات الكود والـ README",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "إغلاق")
                }
            }

            // Success State
            if (createdRepoUrl != null) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = TealAccent.copy(alpha = 0.15f)),
                    border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(TealAccent))
                ) {
                    Column(
                        modifier = Modifier.padding(18.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = TealAccent,
                            modifier = Modifier.size(44.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "تم إنشاء المستودع ورفع الملفات بنجاح! 🎉",
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                            color = TealAccent
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = createdRepoUrl!!,
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace,
                            color = MaterialTheme.colorScheme.onSurface
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Button(
                                onClick = {
                                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(createdRepoUrl))
                                    context.startActivity(intent)
                                },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = TealAccent, contentColor = Color.Black)
                            ) {
                                Icon(Icons.Default.OpenInBrowser, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("فتح في GitHub", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }

                            OutlinedButton(
                                onClick = {
                                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                    val clip = ClipData.newPlainText("GitHub Repo URL", createdRepoUrl)
                                    clipboard.setPrimaryClip(clip)
                                    Toast.makeText(context, "تم نسخ الرابط بنجاح!", Toast.LENGTH_SHORT).show()
                                },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("نسخ الرابط", fontSize = 12.sp)
                            }
                        }
                    }
                }
            } else {
                // Form Inputs

                // Repo Name Input
                Text(
                    text = "اسم المستودع (Repository Name):",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )

                OutlinedTextField(
                    value = repoName,
                    onValueChange = { repoName = it.replace(" ", "-") },
                    placeholder = { Text("my-kaz-app", fontSize = 12.sp) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("github_repo_name_input"),
                    shape = RoundedCornerShape(14.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = CyanNeon,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
                        focusedContainerColor = MaterialTheme.colorScheme.surfaceVariant,
                        unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant
                    ),
                    singleLine = true,
                    enabled = !isPushing
                )

                // Repo Description
                Text(
                    text = "وصف المستودع (Description):",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )

                OutlinedTextField(
                    value = repoDescription,
                    onValueChange = { repoDescription = it },
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("github_repo_desc_input"),
                    shape = RoundedCornerShape(14.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = CyanNeon,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
                        focusedContainerColor = MaterialTheme.colorScheme.surfaceVariant,
                        unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant
                    ),
                    maxLines = 2,
                    enabled = !isPushing
                )

                // Privacy Switch
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 14.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = if (isPrivate) Icons.Default.Lock else Icons.Default.Public,
                                contentDescription = null,
                                tint = if (isPrivate) CyanNeon else TealAccent,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(
                                    text = if (isPrivate) "مستودع خاص (Private)" else "مستودع عام (Public)",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp
                                )
                                Text(
                                    text = if (isPrivate) "لا يمكن لأحد رؤية الكود إلا أنت" else "متاح للجميع للقراءة والتحميل",
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }

                        Switch(
                            checked = isPrivate,
                            onCheckedChange = { isPrivate = it },
                            enabled = !isPushing,
                            colors = SwitchDefaults.colors(checkedThumbColor = CyanNeon, checkedTrackColor = IndigoRoyal)
                        )
                    }
                }

                // GitHub Personal Access Token (PAT)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "رمز الوصول (GitHub Token):",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )

                    TextButton(onClick = { showHelp = !showHelp }) {
                        Icon(Icons.Default.Help, contentDescription = null, modifier = Modifier.size(14.dp), tint = CyanNeon)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("كيف أحصل عليه؟", fontSize = 11.sp, color = CyanNeon)
                    }
                }

                AnimatedVisibility(visible = showHelp) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(
                                text = "خطوات استخراج رمز الوصول من GitHub:",
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp,
                                color = CyanNeon
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "1. افتح موقع GitHub > الإعدادات (Settings) > Developer Settings.\n2. اختر Personal access tokens > Tokens (classic).\n3. اضغط Generate new token وفعل صلاحية `repo`.\n4. انسخ الرمز والصقه هنا (يبدأ بـ ghp_).",
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                lineHeight = 17.sp
                            )
                        }
                    }
                }

                OutlinedTextField(
                    value = tokenInput,
                    onValueChange = { tokenInput = it },
                    placeholder = { Text("ghp_xxxxxxxxxxxxxxxxxxxx", fontSize = 12.sp) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("github_token_input"),
                    shape = RoundedCornerShape(14.dp),
                    visualTransformation = if (isPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    trailingIcon = {
                        IconButton(onClick = { isPasswordVisible = !isPasswordVisible }) {
                            Icon(
                                imageVector = if (isPasswordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = CyanNeon,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
                        focusedContainerColor = MaterialTheme.colorScheme.surfaceVariant,
                        unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant
                    ),
                    singleLine = true,
                    enabled = !isPushing
                )

                // Progress Indicator
                AnimatedVisibility(visible = isPushing) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = CyanNeon)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = progressStep,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = CyanNeon
                            )
                        }
                    }
                }

                // Error Message
                errorMessage?.let { error ->
                    Text(
                        text = error,
                        color = MaterialTheme.colorScheme.error,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }

                // Push Button
                Button(
                    onClick = {
                        if (repoName.isNotBlank() && tokenInput.isNotBlank() && !isPushing) {
                            isPushing = true
                            errorMessage = null
                            createdRepoUrl = null

                            // Save token for future use
                            themePrefs.setGitHubToken(tokenInput)

                            coroutineScope.launch {
                                val result = gitHubRepository.pushProjectToGitHub(
                                    token = tokenInput,
                                    repoName = repoName,
                                    repoDescription = repoDescription,
                                    isPrivate = isPrivate,
                                    snippets = snippets,
                                    rawCode = rawCode,
                                    onProgress = { step -> progressStep = step }
                                )

                                isPushing = false
                                result.onSuccess { url ->
                                    createdRepoUrl = url
                                    Toast.makeText(context, "تم رفع المشروع بنجاح إلى GitHub!", Toast.LENGTH_SHORT).show()
                                }.onFailure { exc ->
                                    errorMessage = exc.localizedMessage ?: "حدث خطأ أثناء الرفع"
                                }
                            }
                        } else if (tokenInput.isBlank()) {
                            errorMessage = "يرجى إدخال رمز الوصول الشخصي (GitHub Token)"
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp)
                        .testTag("github_push_submit_button"),
                    enabled = repoName.isNotBlank() && tokenInput.isNotBlank() && !isPushing,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = CyanNeon,
                        contentColor = Color.Black,
                        disabledContainerColor = MaterialTheme.colorScheme.surfaceVariant,
                        disabledContentColor = MaterialTheme.colorScheme.onSurfaceVariant
                    ),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    if (isPushing) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.Black, strokeWidth = 2.dp)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("جاري الرفع إلى GitHub...", fontWeight = FontWeight.Bold)
                    } else {
                        Icon(Icons.Default.CloudUpload, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("إنشاء المستودع ورفع الملفات (Push to GitHub)", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                }
            }
        }
    }
}
