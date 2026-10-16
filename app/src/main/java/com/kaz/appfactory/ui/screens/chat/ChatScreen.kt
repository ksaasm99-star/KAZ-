package com.kaz.appfactory.ui.screens.chat

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kaz.appfactory.data.model.AiModelType
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

    var showModelMenu by remember { mutableStateOf(false) }

    // Auto-scroll to bottom on new message or loading state change
    LaunchedEffect(state.messages.size, state.isLoading) {
        if (state.messages.isNotEmpty()) {
            listState.animateScrollToItem(state.messages.size - 1)
        }
    }

    // Live Preview Dialog
    if (state.showLivePreview) {
        LivePreviewDialog(
            appName = state.previewTitle,
            htmlContent = state.previewHtml,
            onDismiss = { viewModel.closeLivePreview() }
        )
    }

    // Project Switcher Dialog
    if (state.showProjectPicker) {
        ProjectPickerSheet(
            conversations = state.allConversations,
            activeId = state.currentConversationId,
            onSelect = { id, title -> viewModel.selectConversation(id, title) },
            onCreateNew = { viewModel.createNewProjectChat() },
            onDelete = { id -> viewModel.deleteConversation(id) },
            onDismiss = { viewModel.toggleProjectPicker(false) }
        )
    }

    Scaffold(
        modifier = modifier
            .fillMaxSize()
            .testTag("chat_screen"),
        topBar = {
            Column {
                TopAppBar(
                    title = {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.clickable {
                                if (state.selectedTab == ChatTab.PROJECTS) {
                                    viewModel.toggleProjectPicker(true)
                                }
                            }
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(
                                        Brush.linearGradient(
                                            if (state.selectedTab == ChatTab.GENERAL)
                                                listOf(CyanNeon, TealAccent)
                                            else
                                                listOf(CyanNeon, IndigoRoyal)
                                        )
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = if (state.selectedTab == ChatTab.GENERAL) Icons.Default.Public else Icons.Default.Android,
                                    contentDescription = null,
                                    tint = Color.Black,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = state.conversationTitle,
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    if (state.selectedTab == ChatTab.PROJECTS) {
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Icon(
                                            imageVector = Icons.Default.ArrowDropDown,
                                            contentDescription = "قائمة المشاريع",
                                            tint = CyanNeon,
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                }
                                Text(
                                    text = if (state.selectedTab == ChatTab.GENERAL)
                                        "المحادثة العامة الذكية الشاملة"
                                    else
                                        "محادثة مشروع أندرويد (توليد APK)",
                                    fontSize = 11.sp,
                                    color = CyanNeon,
                                    maxLines = 1
                                )
                            }
                        }
                    },
                    actions = {
                        // AI Model Selector Chip / Dropdown
                        Box {
                            AssistChip(
                                onClick = { showModelMenu = true },
                                label = {
                                    Text(
                                        text = state.selectedAiModel.badge,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                },
                                leadingIcon = {
                                    Icon(
                                        imageVector = Icons.Default.AutoAwesome,
                                        contentDescription = null,
                                        tint = CyanNeon,
                                        modifier = Modifier.size(14.dp)
                                    )
                                },
                                modifier = Modifier.testTag("model_selector_button")
                            )

                            DropdownMenu(
                                expanded = showModelMenu,
                                onDismissRequest = { showModelMenu = false }
                            ) {
                                Text(
                                    text = "اختر النموذج الذكي:",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = CyanNeon,
                                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp)
                                )
                                HorizontalDivider()
                                AiModelType.entries.forEach { model ->
                                    DropdownMenuItem(
                                        text = {
                                            Column {
                                                Row(verticalAlignment = Alignment.CenterVertically) {
                                                    Text(
                                                        text = model.titleAr,
                                                        fontWeight = if (state.selectedAiModel == model) FontWeight.Bold else FontWeight.Normal,
                                                        fontSize = 13.sp
                                                    )
                                                    if (state.selectedAiModel == model) {
                                                        Spacer(modifier = Modifier.width(6.dp))
                                                        Icon(
                                                            imageVector = Icons.Default.Check,
                                                            contentDescription = null,
                                                            tint = CyanNeon,
                                                            modifier = Modifier.size(16.dp)
                                                        )
                                                    }
                                                }
                                                Text(
                                                    text = model.descriptionAr,
                                                    fontSize = 10.sp,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                                )
                                            }
                                        },
                                        onClick = {
                                            viewModel.setAiModel(model)
                                            showModelMenu = false
                                        }
                                    )
                                }
                            }
                        }

                        // Live Preview Action
                        IconButton(
                            onClick = {
                                viewModel.openLivePreview(state.conversationTitle)
                            },
                            modifier = Modifier.testTag("live_preview_button")
                        ) {
                            Icon(
                                imageVector = Icons.Default.Preview,
                                contentDescription = "معاينة حية",
                                tint = CyanNeon
                            )
                        }

                        // Switcher / New Chat Button
                        IconButton(
                            onClick = {
                                if (state.selectedTab == ChatTab.GENERAL) {
                                    viewModel.sendMessage("ابدأ جلسة جديدة وأخبرني بأبرز ما يمكنك تقديمه لي اليوم!")
                                } else {
                                    viewModel.createNewProjectChat()
                                }
                            },
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

                // Navigation Tabs: General Chat vs Project Chats
                TabRow(
                    selectedTabIndex = if (state.selectedTab == ChatTab.GENERAL) 0 else 1,
                    containerColor = MaterialTheme.colorScheme.surface,
                    contentColor = CyanNeon,
                    indicator = { tabPositions ->
                        val index = if (state.selectedTab == ChatTab.GENERAL) 0 else 1
                        TabRowDefaults.SecondaryIndicator(
                            modifier = Modifier.tabIndicatorOffset(tabPositions[index]),
                            color = CyanNeon
                        )
                    }
                ) {
                    Tab(
                        selected = state.selectedTab == ChatTab.GENERAL,
                        onClick = { viewModel.switchTab(ChatTab.GENERAL) },
                        text = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.Public,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp),
                                    tint = if (state.selectedTab == ChatTab.GENERAL) CyanNeon else MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = ChatTab.GENERAL.titleAr,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp,
                                    color = if (state.selectedTab == ChatTab.GENERAL) CyanNeon else MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        },
                        modifier = Modifier.testTag("tab_general_chat")
                    )

                    Tab(
                        selected = state.selectedTab == ChatTab.PROJECTS,
                        onClick = { viewModel.switchTab(ChatTab.PROJECTS) },
                        text = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.PhoneAndroid,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp),
                                    tint = if (state.selectedTab == ChatTab.PROJECTS) CyanNeon else MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = ChatTab.PROJECTS.titleAr,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp,
                                    color = if (state.selectedTab == ChatTab.PROJECTS) CyanNeon else MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        },
                        modifier = Modifier.testTag("tab_projects_chat")
                    )
                }
            }
        },
        bottomBar = {
            Column {
                // Quick Suggestion Pills above input bar
                QuickSuggestionsRow(
                    isGeneral = state.selectedTab == ChatTab.GENERAL,
                    onSelect = { prompt -> viewModel.sendMessage(prompt) }
                )

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
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            if (state.messages.isEmpty()) {
                // Empty state tailored for General or Project Mode
                if (state.selectedTab == ChatTab.GENERAL) {
                    GeneralWelcomeHero(
                        onSelectPrompt = { prompt -> viewModel.sendMessage(prompt) }
                    )
                } else {
                    ProjectWelcomeHero(
                        onSelectPrompt = { prompt -> viewModel.sendMessage(prompt) },
                        onOpenTemplates = onNavigateToTemplates
                    )
                }
            } else {
                LazyColumn(
                    state = listState,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 14.dp),
                    contentPadding = PaddingValues(vertical = 12.dp)
                ) {
                    items(state.messages, key = { it.id }) { message ->
                        MessageBubble(
                            message = message,
                            isSpeaking = (state.speakingMessageId == message.id),
                            onToggleSpeech = viewModel::toggleSpeech,
                            onLivePreview = { title, code ->
                                viewModel.openLivePreview(title, code)
                            },
                            onSaveAsProject = { title, code ->
                                viewModel.saveSnippetAsNewProject(title, code)
                            },
                            onRegenerate = { prompt ->
                                viewModel.regenerateMessage(prompt)
                            }
                        )
                    }

                    if (state.isLoading) {
                        item {
                            KAZGeneratingIndicator(
                                isGeneral = state.selectedTab == ChatTab.GENERAL
                            )
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
fun QuickSuggestionsRow(
    isGeneral: Boolean,
    onSelect: (String) -> Unit
) {
    val items = if (isGeneral) {
        listOf(
            "💡 أفكار تطبيقات نادرة",
            "🔍 شرح هيكلية Clean Architecture",
            "🛠️ كود دالة Room Database",
            "🎨 تصميم واجهة مستخدم نيون",
            "❓ استفسار عام في البرمجة",
            "🚀 تجهيز تطبيق لجوجل بلاي"
        )
    } else {
        listOf(
            "📱 تطبيق مهام مع Room",
            "🌦️ تطبيق طقس متطور",
            "🛒 متجر إلكتروني وسلة",
            "⏱️ مؤقت زمني ومفكرة",
            "📊 رسوم بيانية تفاعلية",
            "⚡ بناء ملف APK فوري"
        )
    }

    LazyRow(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface)
            .padding(horizontal = 10.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(items) { suggestion ->
            SuggestionChip(
                onClick = { onSelect(suggestion) },
                label = { Text(suggestion, fontSize = 11.sp) },
                colors = SuggestionChipDefaults.suggestionChipColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                ),
                border = SuggestionChipDefaults.suggestionChipBorder(
                    enabled = true,
                    borderColor = CyanNeon.copy(alpha = 0.35f)
                )
            )
        }
    }
}

@Composable
fun GeneralWelcomeHero(
    onSelectPrompt: (String) -> Unit
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
                    .border(1.5.dp, CyanNeon.copy(alpha = 0.5f), RoundedCornerShape(24.dp)),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(
                    containerColor = IndigoDeep.copy(alpha = 0.45f)
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
                                Brush.linearGradient(listOf(CyanNeon, TealAccent))
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Public,
                            contentDescription = null,
                            tint = Color.Black,
                            modifier = Modifier.size(36.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Text(
                        text = "المحادثة العامة الذكية 🌐",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = CyanNeon,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = "مساعدك الذكي الشامل باللغة العربية! اسألني عن أي شيء: أفكار إبداعية، كتابة وشرح الأكواد، حل المشاكل التقنية، أو بناء تطبيقات جوال وتحويلها إلى APK مباشرة.",
                        style = MaterialTheme.typography.bodyMedium,
                        textAlign = TextAlign.Center,
                        color = MaterialTheme.colorScheme.onSurface,
                        lineHeight = 22.sp
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center
                    ) {
                        TechBadge("ذكاء اصطناعي شامل")
                        Spacer(modifier = Modifier.width(6.dp))
                        TechBadge("أكواد نظيفة")
                        Spacer(modifier = Modifier.width(6.dp))
                        TechBadge("توليد APK فوري")
                        Spacer(modifier = Modifier.width(6.dp))
                        TechBadge("قراءة صوتية TTS")
                    }
                }
            }
        }

        item {
            Text(
                text = "ابدأ بسؤال أو تجربة سريعة:",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.fillMaxWidth()
            )
        }

        val generalPrompts = listOf(
            Pair("💡 أفكار مشاريع مبتكرة", "اقترح لي 5 أفكار لتطبيقات أندرويد نادرة وعصرية مع شرح ميزاتها الرئيسية."),
            Pair("🔍 شرح معمارية أندرويد الحديثة", "اشرح لي أفضل الممارسات لبناء تطبيق أندرويد باستخدام Jetpack Compose و MVVM."),
            Pair("🛠️ كتابة كود تفاعلي", "اكتب لي كود دالة Kotlin مع StateFlow و Coroutines لإدارة حالة البيانات بسلاسة."),
            Pair("📱 بناء تطبيق آلة حاسبة وتحميل APK", "ابنِ لي تطبيق آلة حاسبة تفاعلية متطورة جاهزة للتشغيل وتصدير APK.")
        )

        items(generalPrompts) { (title, prompt) ->
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
fun ProjectWelcomeHero(
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
                            imageVector = Icons.Default.PhoneAndroid,
                            contentDescription = null,
                            tint = Color.Black,
                            modifier = Modifier.size(36.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Text(
                        text = "محادثات بناء المشاريع 📱",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = CyanNeon,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = "مصنع التطبيقات الذكي: كل محادثة هنا تمثل مشروع تطبيق مستقل، يقوم KAZ ببرمجته وبناء حزمة APK موقّعة قابلة للتثبيت والمشاركة فوراً.",
                        style = MaterialTheme.typography.bodyMedium,
                        textAlign = TextAlign.Center,
                        color = MaterialTheme.colorScheme.onSurface,
                        lineHeight = 22.sp
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center
                    ) {
                        TechBadge("Kotlin")
                        Spacer(modifier = Modifier.width(6.dp))
                        TechBadge("Compose & Web")
                        Spacer(modifier = Modifier.width(6.dp))
                        TechBadge("توليد APK موقّع")
                        Spacer(modifier = Modifier.width(6.dp))
                        TechBadge("حفظ المشروع")
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
                    text = "أفكار مقترحة لمشروعك الجديد:",
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

        val projectStarters = listOf(
            Pair("🛒 متجر إلكتروني وسلة تسوق", "ابنِ لي متجر إلكتروني متكامل مع بطاقات المنتجات وسلة الشراء والطلب."),
            Pair("🍔 تطبيق توصيل طعام ومطاعم", "ابنِ لي تطبيق توصيل وجبات مع تتبع حالة الطلب وقائمة الوجبات."),
            Pair("📝 تطبيق مهام وملاحظات ذكي", "ابنِ لي تطبيق إدارة مهام شخصي مع تصنيفات وأولويات وتخزين محلي."),
            Pair("💳 محفظة رقمية وبطاقات دفع", "ابنِ لي تطبيق محفظة رقمية يعرض البطاقات الائتمانية والعمليات المالية.")
        )

        items(projectStarters) { (title, prompt) ->
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
fun KAZGeneratingIndicator(isGeneral: Boolean = false) {
    Card(
        modifier = Modifier
            .fillMaxWidth(0.88f)
            .padding(vertical = 8.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            CircularProgressIndicator(
                modifier = Modifier.size(22.dp),
                strokeWidth = 2.5.dp,
                color = CyanNeon
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = if (isGeneral) "KAZ يقوم بالتفكير وصياغة الرد..." else "KAZ يقوم ببرمجة التطبيق الآن...",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = CyanNeon
                )
                Text(
                    text = if (isGeneral) "معالجة الطلب بالذكاء الاصطناعي وتجهيز الأكواد" else "كتابة الأكواد وتجهيز البنية المعمارية للـ APK",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProjectPickerSheet(
    conversations: List<com.kaz.appfactory.data.local.entities.ConversationEntity>,
    activeId: Long,
    onSelect: (Long, String) -> Unit,
    onCreateNew: () -> Unit,
    onDelete: (Long) -> Unit,
    onDismiss: () -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = MaterialTheme.colorScheme.surface
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "اختر مشروع التطبيق 📁",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )

                Button(
                    onClick = {
                        onCreateNew()
                        onDismiss()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = CyanNeon, contentColor = Color.Black)
                ) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("مشروع جديد", fontWeight = FontWeight.Bold)
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            val projectConvs = conversations.filter { !it.title.contains("المحادثة العامة") }

            if (projectConvs.isEmpty()) {
                Text(
                    text = "لا توجد مشاريع سابقة، ابدأ بإنشاء مشروعك الأول!",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(vertical = 20.dp)
                )
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 400.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(projectConvs, key = { it.id }) { conv ->
                        val isSelected = conv.id == activeId
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    onSelect(conv.id, conv.title)
                                    onDismiss()
                                }
                                .border(
                                    width = if (isSelected) 2.dp else 1.dp,
                                    color = if (isSelected) CyanNeon else MaterialTheme.colorScheme.outline.copy(alpha = 0.2f),
                                    shape = RoundedCornerShape(14.dp)
                                ),
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = if (isSelected) IndigoRoyal.copy(alpha = 0.25f) else MaterialTheme.colorScheme.surfaceVariant
                            )
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Folder,
                                        contentDescription = null,
                                        tint = if (isSelected) CyanNeon else MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.size(24.dp)
                                    )
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Column {
                                        Text(
                                            text = conv.title,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 14.sp
                                        )
                                        Text(
                                            text = conv.summary.ifBlank { "مشروع تطبيق أندرويد" },
                                            fontSize = 11.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                }

                                IconButton(
                                    onClick = { onDelete(conv.id) }
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Delete,
                                        contentDescription = "حذف",
                                        tint = MaterialTheme.colorScheme.error.copy(alpha = 0.8f),
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
