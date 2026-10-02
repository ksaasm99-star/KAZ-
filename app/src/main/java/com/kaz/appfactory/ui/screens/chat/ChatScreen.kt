package com.kaz.appfactory.ui.screens.chat

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kaz.appfactory.ui.components.ChatInputBar
import com.kaz.appfactory.ui.components.LivePreviewDialog
import com.kaz.appfactory.ui.components.MessageBubble
import com.kaz.appfactory.ui.theme.CyanNeon
import com.kaz.appfactory.ui.theme.IndigoDeep
import com.kaz.appfactory.ui.theme.IndigoRoyal
import com.kaz.appfactory.ui.theme.TealAccent

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    viewModel: ChatViewModel,
    onNavigateToHistory: () -> Unit,
    onNavigateToTemplates: () -> Unit,
    onNavigateToSettings: () -> Unit,
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val listState = rememberLazyListState()

    // Auto-scroll to bottom on new message
    LaunchedEffect(state.messages.size, state.isLoading) {
        if (state.messages.isNotEmpty()) {
            listState.animateScrollToItem(state.messages.size - 1)
        }
    }

    if (state.showLivePreview) {
        LivePreviewDialog(
            appName = state.conversationTitle,
            onDismiss = { viewModel.toggleLivePreview(false) }
        )
    }

    Scaffold(
        modifier = modifier
            .fillMaxSize()
            .testTag("chat_screen"),
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(34.dp)
                                .clip(CircleShape)
                                .background(
                                    Brush.linearGradient(listOf(CyanNeon, IndigoRoyal))
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.SmartToy,
                                contentDescription = null,
                                tint = Color.Black,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                text = "KAZ - مصنع التطبيقات",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                maxLines = 1
                            )
                            Text(
                                text = state.conversationTitle,
                                fontSize = 11.sp,
                                color = CyanNeon,
                                maxLines = 1
                            )
                        }
                    }
                },
                actions = {
                    // Live Preview Button
                    IconButton(
                        onClick = { viewModel.toggleLivePreview(true) },
                        modifier = Modifier.testTag("live_preview_button")
                    ) {
                        Icon(
                            imageVector = Icons.Default.Preview,
                            contentDescription = "معاينة حية للتطبيق",
                            tint = CyanNeon
                        )
                    }

                    // New Chat Button
                    IconButton(
                        onClick = { viewModel.createNewChat() },
                        modifier = Modifier.testTag("new_chat_button")
                    ) {
                        Icon(
                            imageVector = Icons.Default.AddComment,
                            contentDescription = "محادثة جديدة",
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
            ChatInputBar(
                inputText = state.inputText,
                onInputChanged = viewModel::onInputTextChanged,
                onSendClicked = { viewModel.sendMessage() },
                isLoading = state.isLoading,
                onQuickPromptSelected = { prompt ->
                    viewModel.sendMessage(prompt)
                }
            )
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            if (state.messages.isEmpty()) {
                // Empty state: Welcoming onboarding hero
                WelcomeHero(
                    onSelectPrompt = { prompt ->
                        viewModel.sendMessage(prompt)
                    },
                    onOpenTemplates = onNavigateToTemplates
                )
            } else {
                LazyColumn(
                    state = listState,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 14.dp),
                    contentPadding = PaddingValues(vertical = 12.dp)
                ) {
                    items(state.messages, key = { it.id }) { message ->
                        MessageBubble(message = message)
                    }

                    if (state.isLoading) {
                        item {
                            KAZGeneratingIndicator()
                        }
                    }
                }
            }

            // Error Snackbar
            state.errorMessage?.let { error ->
                Snackbar(
                    modifier = Modifier
                        .align(Alignment.TopCenter)
                        .padding(16.dp),
                    action = {
                        TextButton(onClick = viewModel::clearError) {
                            Text("إغلاق", color = CyanNeon)
                        }
                    }
                ) {
                    Text(error)
                }
            }
        }
    }
}

@Composable
fun WelcomeHero(
    onSelectPrompt: (String) -> Unit,
    onOpenTemplates: () -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, CyanNeon.copy(alpha = 0.4f), RoundedCornerShape(24.dp)),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(
                    containerColor = IndigoDeep.copy(alpha = 0.35f)
                )
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .clip(CircleShape)
                            .background(
                                Brush.linearGradient(listOf(CyanNeon, IndigoRoyal))
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Engineering,
                            contentDescription = null,
                            tint = Color.Black,
                            modifier = Modifier.size(36.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Text(
                        text = "مرحبًا بك في KAZ 🚀",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = CyanNeon,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = "مصنع التطبيقات الذكي باللغة العربية. صف فكرة تطبيقك، وسأقوم بكتابة الكود كاملًا جاهزًا للنسخ والتشغيل في Android Studio.",
                        style = MaterialTheme.typography.bodyMedium,
                        textAlign = TextAlign.Center,
                        color = MaterialTheme.colorScheme.onSurface,
                        lineHeight = 22.sp
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    // Tech Stack Badges
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center
                    ) {
                        TechBadge("Kotlin")
                        Spacer(modifier = Modifier.width(6.dp))
                        TechBadge("Jetpack Compose")
                        Spacer(modifier = Modifier.width(6.dp))
                        TechBadge("Room Database")
                        Spacer(modifier = Modifier.width(6.dp))
                        TechBadge("Material 3")
                    }
                }
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "أفكار مقترحة للبدء السريع:",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                TextButton(onClick = onOpenTemplates) {
                    Text(
                        text = "تصفح النماذج الجاهزة",
                        color = CyanNeon,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        val quickStarters = listOf(
            Pair("🛒 متجر إلكتروني وسلة تسوق", "ابنِ لي متجر إلكتروني في أندرويد مع بطاقات المنتجات وسلة الشراء والطلب."),
            Pair("🍔 تطبيق توصيل طعام ومطاعم", "ابنِ لي تطبيق توصيل وجبات مع تتبع حالة الطلب واختيار الوجبات."),
            Pair("📝 تطبيق مهام وملاحظات ذكي", "ابنِ لي تطبيق إدارة مهام شخصي مع تصنيفات وأولويات وقاعدة بيانات Room."),
            Pair("💳 محفظة رقمية وبطاقات دفع", "ابنِ لي تطبيق محفظة رقمية يعرض البطاقات الائتمانية والعمليات المالية.")
        )

        items(quickStarters) { (title, prompt) ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onSelectPrompt(prompt) }
                    .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f), RoundedCornerShape(16.dp)),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                )
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = title,
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = prompt,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    Icon(
                        imageVector = Icons.Default.ArrowForwardIos,
                        contentDescription = null,
                        tint = CyanNeon,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun TechBadge(name: String) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.7f)
    ) {
        Text(
            text = name,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onPrimaryContainer,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
        )
    }
}

@Composable
fun KAZGeneratingIndicator() {
    Card(
        modifier = Modifier
            .fillMaxWidth(0.85f)
            .padding(vertical = 8.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            CircularProgressIndicator(
                modifier = Modifier.size(20.dp),
                strokeWidth = 2.5.dp,
                color = CyanNeon
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = "KAZ يقوم ببرمجة التطبيق الآن...",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = CyanNeon
                )
                Text(
                    text = "كتابة كود Kotlin و Jetpack Compose وتجهيز البنية المعمارية",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
