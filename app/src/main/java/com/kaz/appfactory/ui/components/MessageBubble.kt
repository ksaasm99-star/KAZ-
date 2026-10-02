package com.kaz.appfactory.ui.components

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
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
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val snippets = remember(message.codeBlocksJson) {
        CodeExtractor.deserializeSnippets(message.codeBlocksJson)
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
                    .fillMaxWidth(0.85f)
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
                    Text(
                        text = "أنت",
                        color = Color.White.copy(alpha = 0.8f),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = timeString,
                        color = Color.White.copy(alpha = 0.6f),
                        fontSize = 10.sp
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

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
            // Header: KAZ Identity
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(28.dp)
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
                            modifier = Modifier.size(16.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    Column {
                        Text(
                            text = "KAZ - مهندس التطبيقات",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "الذكاء الاصطناعي لتطوير أندرويد",
                            fontSize = 10.sp,
                            color = CyanNeon
                        )
                    }
                }

                Text(
                    text = timeString,
                    fontSize = 10.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Conversational response
            if (cleanText.isNotBlank()) {
                Text(
                    text = cleanText,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                    lineHeight = 22.sp
                )
            }

            // Generated Code Snippets
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
                            text = "نسخ كل الأكواد (${snippets.size})",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}
