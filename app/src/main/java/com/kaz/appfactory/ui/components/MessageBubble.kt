package com.kaz.appfactory.ui.components

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kaz.appfactory.data.local.entities.ChatMessageEntity
import com.kaz.appfactory.data.remote.CodeExtractor
import com.kaz.appfactory.ui.theme.CyanNeon
import com.kaz.appfactory.ui.theme.IndigoDeep
import com.kaz.appfactory.ui.theme.IndigoRoyal
import com.kaz.appfactory.ui.theme.TealAccent
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun MessageBubble(
    message: ChatMessageEntity,
    isSpeaking: Boolean = false,
    onToggleSpeech: (messageId: Long, text: String) -> Unit = { _, _ -> },
    onLivePreview: (title: String, code: String) -> Unit = { _, _ -> },
    onSaveAsProject: (title: String, code: String) -> Unit = { _, _ -> },
    onRegenerate: (prompt: String) -> Unit = {},
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val snippets = remember(message.codeBlocksJson) {
        CodeExtractor.deserializeSnippets(message.codeBlocksJson)
    }

    val extractedHtml = remember(message.rawText) {
        CodeExtractor.extractHtmlApp(message.rawText)
    }

    val timeString = remember(message.timestamp) {
        SimpleDateFormat("hh:mm a", Locale("ar")).format(Date(message.timestamp))
    }

    val cleanText = remember(message.rawText, snippets) {
        if (snippets.isEmpty()) {
            message.rawText
        } else {
            // Strip out raw backtick code blocks from conversational text for clean reading
            message.rawText.replace(Regex("```[a-zA-Z0-9_-]*\\s*\\n[\\s\\S]*?```"), "").trim()
        }
    }

    // Determine primary app code for APK and Preview
    val primaryCode = remember(extractedHtml, snippets) {
        when {
            extractedHtml.isNotBlank() -> extractedHtml
            snippets.isNotEmpty() -> snippets.first().code
            else -> ""
        }
    }

    val appTitle = remember(cleanText, message.id) {
        val firstLine = cleanText.lines().firstOrNull { it.isNotBlank() } ?: "تطبيق KAZ الذكي"
        firstLine.replace("#", "").replace("*", "").take(25).trim().ifBlank { "تطبيق KAZ الذكي" }
    }

    if (message.isUser) {
        // User Message (End aligned)
        Row(
            modifier = modifier
                .fillMaxWidth()
                .padding(vertical = 4.dp),
            horizontalArrangement = Arrangement.End
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth(0.88f)
                    .clip(RoundedCornerShape(topStart = 18.dp, topEnd = 4.dp, bottomStart = 18.dp, bottomEnd = 18.dp))
                    .background(
                        Brush.linearGradient(
                            listOf(IndigoRoyal, IndigoDeep)
                        )
                    )
                    .padding(14.dp)
                    .testTag("user_message_${message.id}")
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(24.dp)
                                .clip(CircleShape)
                                .background(Color.White.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Person,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(14.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "أنت",
                            color = Color.White.copy(alpha = 0.9f),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = timeString,
                            color = Color.White.copy(alpha = 0.6f),
                            fontSize = 10.sp
                        )

                        Spacer(modifier = Modifier.width(4.dp))

                        // User Copy Button
                        IconButton(
                            onClick = {
                                val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                val clip = ClipData.newPlainText("رسالة المستخدم", message.rawText)
                                clipboard.setPrimaryClip(clip)
                                Toast.makeText(context, "تم نسخ رسالتك بنجاح! 📋", Toast.LENGTH_SHORT).show()
                            },
                            modifier = Modifier
                                .size(28.dp)
                                .testTag("copy_user_msg_${message.id}")
                        ) {
                            Icon(
                                imageVector = Icons.Default.ContentCopy,
                                contentDescription = "نسخ رسالتي",
                                tint = Color.White.copy(alpha = 0.85f),
                                modifier = Modifier.size(15.dp)
                            )
                        }

                        // User Share Button
                        IconButton(
                            onClick = {
                                val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                    type = "text/plain"
                                    putExtra(Intent.EXTRA_TEXT, message.rawText)
                                }
                                context.startActivity(Intent.createChooser(shareIntent, "مشاركة رسالتي عبر:"))
                            },
                            modifier = Modifier.size(28.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Share,
                                contentDescription = "مشاركة رسالتي",
                                tint = Color.White.copy(alpha = 0.85f),
                                modifier = Modifier.size(15.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(6.dp))

                Text(
                    text = message.rawText,
                    color = Color.White,
                    fontSize = 14.sp,
                    lineHeight = 22.sp
                )
            }
        }
    } else {
        // KAZ Assistant Message
        Column(
            modifier = modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp)
                .clip(RoundedCornerShape(18.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f), RoundedCornerShape(18.dp))
                .padding(14.dp)
                .testTag("kaz_message_${message.id}")
        ) {
            // Header: KAZ Identity + Top Quick Actions (Copy, Share, Speech)
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    Box(
                        modifier = Modifier
                            .size(30.dp)
                            .clip(CircleShape)
                            .background(
                                Brush.linearGradient(listOf(CyanNeon, IndigoRoyal))
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.AutoAwesome,
                            contentDescription = null,
                            tint = Color.Black,
                            modifier = Modifier.size(17.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    Column {
                        Text(
                            text = "KAZ - المساعد الذكي",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "ذكاء اصطناعي شامل وهندسة تطبيقات",
                            fontSize = 10.sp,
                            color = CyanNeon
                        )
                    }
                }

                // Header Action Buttons: Copy, Share, Speech
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = timeString,
                        fontSize = 10.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.width(4.dp))

                    // TTS Speech Button
                    IconButton(
                        onClick = {
                            onToggleSpeech(message.id, cleanText)
                        },
                        modifier = Modifier
                            .size(32.dp)
                            .testTag("tts_msg_${message.id}")
                    ) {
                        Icon(
                            imageVector = if (isSpeaking) Icons.Default.Stop else Icons.Default.VolumeUp,
                            contentDescription = if (isSpeaking) "إيقاف الصوت" else "قراءة صوتية للرد",
                            tint = if (isSpeaking) TealAccent else MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    // Copy Full Response Button
                    IconButton(
                        onClick = {
                            val textToCopy = if (snippets.isNotEmpty()) message.rawText else cleanText
                            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                            val clip = ClipData.newPlainText("رد KAZ", textToCopy)
                            clipboard.setPrimaryClip(clip)
                            Toast.makeText(context, "تم نسخ الرد بالكامل بنجاح! 📋", Toast.LENGTH_SHORT).show()
                        },
                        modifier = Modifier
                            .size(32.dp)
                            .testTag("copy_kaz_msg_${message.id}")
                    ) {
                        Icon(
                            imageVector = Icons.Default.ContentCopy,
                            contentDescription = "نسخ الرد",
                            tint = CyanNeon,
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    // Share Full Response Button
                    IconButton(
                        onClick = {
                            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(Intent.EXTRA_TEXT, message.rawText)
                            }
                            context.startActivity(Intent.createChooser(shareIntent, "مشاركة رد KAZ عبر:"))
                        },
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Share,
                            contentDescription = "مشاركة الرد",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Conversational text
            if (cleanText.isNotBlank()) {
                Text(
                    text = cleanText,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                    lineHeight = 22.sp
                )
            }

            // Code Snippets
            if (snippets.isNotEmpty()) {
                Spacer(modifier = Modifier.height(10.dp))

                snippets.forEach { snippet ->
                    CodeBlockView(snippet = snippet)
                }

                // Copy All Codes Quick Button
                if (snippets.size > 1) {
                    OutlinedButton(
                        onClick = {
                            val allCode = snippets.joinToString("\n\n// ====================================\n\n") {
                                "// ${it.title}\n${it.code}"
                            }
                            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                            val clip = ClipData.newPlainText("All KAZ Code", allCode)
                            clipboard.setPrimaryClip(clip)
                            Toast.makeText(context, "تم نسخ جميع الأكواد البرمجية!", Toast.LENGTH_SHORT).show()
                        },
                        modifier = Modifier
                            .align(Alignment.End)
                            .padding(top = 6.dp),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = CyanNeon
                        )
                    ) {
                        Icon(
                            imageVector = Icons.Default.ContentCopy,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "نسخ كل الأكواد (${snippets.size}) 📋",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            // Interactive APK Card embedded directly inside chat if app code is present
            if (primaryCode.isNotBlank()) {
                Spacer(modifier = Modifier.height(12.dp))
                ApkChatBubbleCard(
                    appName = appTitle,
                    codeContent = primaryCode,
                    onPreview = {
                        onLivePreview(appTitle, primaryCode)
                    }
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Bottom Full Superpower Action Bar ("تاكل من كل شي")
            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                // 1. Copy Response Button with text
                FilledTonalButton(
                    onClick = {
                        val textToCopy = if (snippets.isNotEmpty()) message.rawText else cleanText
                        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                        val clip = ClipData.newPlainText("رد KAZ", textToCopy)
                        clipboard.setPrimaryClip(clip)
                        Toast.makeText(context, "تم نسخ الرد بالكامل بنجاح! 📋", Toast.LENGTH_SHORT).show()
                    },
                    modifier = Modifier.height(34.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                    colors = ButtonDefaults.filledTonalButtonColors(
                        containerColor = CyanNeon.copy(alpha = 0.15f),
                        contentColor = CyanNeon
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.ContentCopy,
                        contentDescription = "نسخ الرد",
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(text = "نسخ", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }

                // 2. Share Button
                OutlinedButton(
                    onClick = {
                        val shareIntent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_TEXT, message.rawText)
                        }
                        context.startActivity(Intent.createChooser(shareIntent, "مشاركة الرد عبر:"))
                    },
                    modifier = Modifier.height(34.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Share,
                        contentDescription = "مشاركة",
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(text = "مشاركة", fontSize = 11.sp)
                }

                // 3. Listen / TTS Button
                OutlinedButton(
                    onClick = { onToggleSpeech(message.id, cleanText) },
                    modifier = Modifier.height(34.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = if (isSpeaking) TealAccent else MaterialTheme.colorScheme.onSurface
                    )
                ) {
                    Icon(
                        imageVector = if (isSpeaking) Icons.Default.Stop else Icons.Default.VolumeUp,
                        contentDescription = if (isSpeaking) "إيقاف" else "استماع",
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = if (isSpeaking) "إيقاف" else "استماع",
                        fontSize = 11.sp
                    )
                }

                // 4. Live Preview or Save as Project (if code exists)
                if (primaryCode.isNotBlank()) {
                    OutlinedButton(
                        onClick = { onLivePreview(appTitle, primaryCode) },
                        modifier = Modifier.height(34.dp),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = CyanNeon
                        )
                    ) {
                        Icon(
                            imageVector = Icons.Default.PlayCircle,
                            contentDescription = "معاينة",
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(text = "معاينة", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }

                    OutlinedButton(
                        onClick = {
                            onSaveAsProject(appTitle, primaryCode)
                            Toast.makeText(context, "تم حفظ المشروع في قائمة المشاريع! 💾", Toast.LENGTH_SHORT).show()
                        },
                        modifier = Modifier.height(34.dp),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.BookmarkAdd,
                            contentDescription = "حفظ كمشروع",
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(text = "حفظ", fontSize = 11.sp)
                    }
                }
            }
        }
    }
}
