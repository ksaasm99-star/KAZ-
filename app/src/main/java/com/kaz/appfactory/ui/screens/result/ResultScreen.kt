package com.kaz.appfactory.ui.screens.result

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
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
import com.kaz.appfactory.data.remote.CodeExtractor
import com.kaz.appfactory.ui.components.LivePreviewDialog
import com.kaz.appfactory.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ResultScreen(
    projectId: Long,
    projectTitle: String,
    codeContent: String,
    onBackToProjects: () -> Unit,
    onOpenChat: (Long) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var isCopied by remember { mutableStateOf(false) }
    var showLivePreview by remember { mutableStateOf(false) }

    // Parse snippets if any, or wrap entire code
    val parsedSnippets = remember(codeContent) {
        val (_, snippets) = CodeExtractor.parseMarkdownResponse(codeContent)
        if (snippets.isNotEmpty()) snippets
        else listOf(
            CodeSnippet(
                title = "$projectTitle - كود أندرويد",
                code = codeContent.replace("```kotlin", "").replace("```", "").trim(),
                language = "kotlin"
            )
        )
    }

    var selectedSnippetIndex by remember { mutableIntStateOf(0) }
    val activeSnippet = parsedSnippets.getOrElse(selectedSnippetIndex) { parsedSnippets.first() }

    LaunchedEffect(isCopied) {
        if (isCopied) {
            kotlinx.coroutines.delay(2000)
            isCopied = false
        }
    }

    if (showLivePreview) {
        LivePreviewDialog(
            appName = projectTitle,
            onDismiss = { showLivePreview = false }
        )
    }

    Scaffold(
        modifier = modifier
            .fillMaxSize()
            .testTag("result_screen"),
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
                        Text(
                            text = "الكود البرمجي الكامل • جاهز للاستخدام",
                            fontSize = 11.sp,
                            color = CyanNeon
                        )
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
                    // Live Preview Button
                    IconButton(onClick = { showLivePreview = true }) {
                        Icon(
                            imageVector = Icons.Default.Preview,
                            contentDescription = "معاينة حية",
                            tint = CyanNeon
                        )
                    }

                    // Open Refinement Chat
                    IconButton(onClick = { onOpenChat(projectId) }) {
                        Icon(
                            imageVector = Icons.Default.Chat,
                            contentDescription = "محادثة وتعديل",
                            tint = MaterialTheme.colorScheme.onSurface
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
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding(),
                color = MaterialTheme.colorScheme.surface,
                tonalElevation = 8.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Copy Active Code Button
                    Button(
                        onClick = {
                            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                            val clip = ClipData.newPlainText("KAZ Code", activeSnippet.code)
                            clipboard.setPrimaryClip(clip)
                            isCopied = true
                            Toast.makeText(context, "تم نسخ الكود بنجاح إلى الحافظة!", Toast.LENGTH_SHORT).show()
                        },
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp)
                            .testTag("copy_result_code_button"),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isCopied) TealAccent else CyanNeon,
                            contentColor = Color.Black
                        ),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Icon(
                            imageVector = if (isCopied) Icons.Default.Check else Icons.Default.ContentCopy,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (isCopied) "تم نسخ الكود!" else "نسخ الكود البرمجي",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                    }

                    // Interactive Live Preview
                    OutlinedButton(
                        onClick = { showLivePreview = true },
                        modifier = Modifier.height(48.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = CyanNeon
                        )
                    ) {
                        Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("معاينة", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 14.dp)
        ) {
            // Snippet Tabs if multiple files
            if (parsedSnippets.size > 1) {
                ScrollableTabRow(
                    selectedTabIndex = selectedSnippetIndex,
                    edgePadding = 0.dp,
                    containerColor = MaterialTheme.colorScheme.background,
                    contentColor = CyanNeon,
                    indicator = { tabPositions ->
                        TabRowDefaults.SecondaryIndicator(
                            modifier = Modifier.tabIndicatorOffset(tabPositions[selectedSnippetIndex]),
                            color = CyanNeon
                        )
                    }
                ) {
                    parsedSnippets.forEachIndexed { index, snippet ->
                        Tab(
                            selected = selectedSnippetIndex == index,
                            onClick = { selectedSnippetIndex = index },
                            text = {
                                Text(
                                    text = snippet.title.take(24),
                                    fontSize = 12.sp,
                                    fontWeight = if (selectedSnippetIndex == index) FontWeight.Bold else FontWeight.Normal
                                )
                            }
                        )
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
            }

            // Code Container Header Info
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF161B22), RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp))
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFFF5F56))
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFFFBD2E))
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF27C93F))
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = activeSnippet.title,
                        color = Color(0xFFC9D1D9),
                        fontFamily = FontFamily.Monospace,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = Color(0xFF21262D)
                ) {
                    Text(
                        text = "Kotlin • Jetpack Compose",
                        color = CyanNeon,
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Monospace,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
            }

            // Scrollable Code Box
            val lines = remember(activeSnippet.code) { activeSnippet.code.lines() }
            val verticalScroll = rememberScrollState()
            val horizontalScroll = rememberScrollState()

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .border(1.dp, Color(0xFF30363D), RoundedCornerShape(bottomStart = 14.dp, bottomEnd = 14.dp)),
                shape = RoundedCornerShape(bottomStart = 14.dp, bottomEnd = 14.dp),
                colors = CardDefaults.cardColors(containerColor = CodeBg)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(8.dp)
                        .verticalScroll(verticalScroll)
                        .horizontalScroll(horizontalScroll)
                ) {
                    // Line Numbers
                    Column(
                        modifier = Modifier
                            .padding(end = 12.dp)
                            .padding(start = 4.dp)
                    ) {
                        lines.forEachIndexed { index, _ ->
                            Text(
                                text = "${index + 1}",
                                color = CodeLineNumber,
                                fontSize = 12.sp,
                                fontFamily = FontFamily.Monospace,
                                lineHeight = 18.sp
                            )
                        }
                    }

                    // Code Lines
                    Column {
                        lines.forEach { line ->
                            Text(
                                text = formatCodeSyntax(line),
                                fontSize = 12.sp,
                                fontFamily = FontFamily.Monospace,
                                lineHeight = 18.sp
                            )
                        }
                    }
                }
            }
        }
    }
}

private fun formatCodeSyntax(line: String): AnnotatedString {
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

        val annotationRegex = Regex("@[A-Za-z0-9_]+")
        annotationRegex.findAll(line).forEach { match ->
            addStyle(
                SpanStyle(color = CodeAnnotation, fontWeight = FontWeight.SemiBold),
                match.range.first,
                match.range.last + 1
            )
        }

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
