package com.kaz.appfactory.ui.components

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.FullscreenExit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kaz.appfactory.data.model.CodeSnippet
import com.kaz.appfactory.ui.theme.*

@Composable
fun CodeBlockView(
    snippet: CodeSnippet,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var isCopied by remember { mutableStateOf(false) }
    var isExpanded by remember { mutableStateOf(false) }
    val lines = remember(snippet.code) { snippet.code.lines() }

    LaunchedEffect(isCopied) {
        if (isCopied) {
            kotlinx.coroutines.delay(2000)
            isCopied = false
        }
    }

    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp)
            .border(1.dp, Color(0xFF30363D), RoundedCornerShape(12.dp))
            .testTag("code_block_card_${snippet.id}"),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = CodeBg)
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // Header bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF161B22))
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Code,
                        contentDescription = null,
                        tint = CyanNeon,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = snippet.title,
                        color = Color(0xFFC9D1D9),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        fontFamily = FontFamily.Monospace,
                        maxLines = 1
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    // Expand/Collapse toggle for long code
                    if (lines.size > 20) {
                        IconButton(
                            onClick = { isExpanded = !isExpanded },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(
                                imageVector = if (isExpanded) Icons.Default.FullscreenExit else Icons.Default.Fullscreen,
                                contentDescription = if (isExpanded) "تصغير" else "توسيع",
                                tint = Color(0xFF8B949E),
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }

                    // Copy Code Button
                    FilledTonalButton(
                        onClick = {
                            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                            val clip = ClipData.newPlainText("KAZ App Code", snippet.code)
                            clipboard.setPrimaryClip(clip)
                            isCopied = true
                            Toast.makeText(context, "تم نسخ الكود بنجاح!", Toast.LENGTH_SHORT).show()
                        },
                        modifier = Modifier
                            .height(32.dp)
                            .testTag("copy_code_button_${snippet.id}"),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        colors = ButtonDefaults.filledTonalButtonColors(
                            containerColor = if (isCopied) TealAccent.copy(alpha = 0.2f) else CyanNeon.copy(alpha = 0.15f),
                            contentColor = if (isCopied) TealAccent else CyanNeon
                        )
                    ) {
                        Icon(
                            imageVector = if (isCopied) Icons.Default.Check else Icons.Default.ContentCopy,
                            contentDescription = "نسخ الكود",
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (isCopied) "تم النسخ" else "نسخ الكود",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            // Code Body with Syntax and Line Numbers
            val displayLines = if (isExpanded || lines.size <= 25) lines else lines.take(25)
            val scrollState = rememberScrollState()

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp)
                    .horizontalScroll(scrollState)
            ) {
                // Line Numbers
                Column(
                    modifier = Modifier
                        .padding(end = 12.dp)
                        .padding(start = 4.dp)
                ) {
                    displayLines.forEachIndexed { index, _ ->
                        Text(
                            text = "${index + 1}",
                            color = CodeLineNumber,
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace,
                            lineHeight = 18.sp
                        )
                    }
                }

                // Code text with basic syntax coloring
                Column {
                    displayLines.forEach { line ->
                        Text(
                            text = formatSyntax(line),
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace,
                            lineHeight = 18.sp
                        )
                    }
                }
            }

            if (!isExpanded && lines.size > 25) {
                TextButton(
                    onClick = { isExpanded = true },
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF161B22).copy(alpha = 0.5f))
                ) {
                    Text(
                        text = "عرض باقي الكود (${lines.size - 25} سطر إضافي)...",
                        color = CyanNeon,
                        fontSize = 12.sp
                    )
                }
            }
        }
    }
}

private fun formatSyntax(line: String): AnnotatedString {
    val trimmed = line.trim()
    if (trimmed.startsWith("//")) {
        return AnnotatedString(line, SpanStyle(color = CodeComment))
    }

    val keywords = listOf(
        "package", "import", "class", "data class", "fun", "val", "var",
        "return", "if", "else", "when", "for", "while", "true", "false",
        "null", "interface", "object", "companion", "private", "public",
        "suspend", "override"
    )

    return buildAnnotatedString {
        append(line)
        // Highlight keywords
        keywords.forEach { kw ->
            val regex = Regex("\\b$kw\\b")
            regex.findAll(line).forEach { match ->
                addStyle(
                    SpanStyle(color = CodeKeyword, fontWeight = FontWeight.Bold),
                    match.range.first,
                    match.range.last + 1
                )
            }
        }

        // Highlight Compose annotations
        val annotationRegex = Regex("@[A-Za-z0-9_]+")
        annotationRegex.findAll(line).forEach { match ->
            addStyle(
                SpanStyle(color = CodeAnnotation, fontWeight = FontWeight.SemiBold),
                match.range.first,
                match.range.last + 1
            )
        }

        // Highlight strings
        val stringRegex = Regex("\"[^\"]*\"")
        stringRegex.findAll(line).forEach { match ->
            addStyle(
                SpanStyle(color = CodeString),
                match.range.first,
                match.range.last + 1
            )
        }
    }
}
