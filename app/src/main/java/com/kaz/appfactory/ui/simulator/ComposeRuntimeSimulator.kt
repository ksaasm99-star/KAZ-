package com.kaz.appfactory.ui.simulator

import android.widget.Toast
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kaz.appfactory.ui.theme.CyanNeon
import com.kaz.appfactory.ui.theme.IndigoDeep
import com.kaz.appfactory.ui.theme.IndigoRoyal
import com.kaz.appfactory.ui.theme.TealAccent

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ComposeRuntimeSimulator(
    code: String,
    projectTitle: String,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val parsedUi = remember(code, projectTitle) {
        ComposeCodeParser.parse(code, projectTitle)
    }

    // Simulator Interactive States
    var itemsList by remember(parsedUi) { mutableStateOf(parsedUi.initialItems) }
    var searchQuery by remember { mutableStateOf("") }
    var selectedTabIndex by remember { mutableIntStateOf(0) }
    var selectedNavIndex by remember { mutableIntStateOf(0) }
    var showAddDialog by remember { mutableStateOf(false) }
    var simulatorDarkMode by remember { mutableStateOf(true) }
    var showDeviceFrame by remember { mutableStateOf(true) }
    var inspectorMode by remember { mutableStateOf(false) }
    var selectedNode by remember { mutableStateOf<ComposeNodeInfo?>(null) }

    // Dialog Input State
    var inputFieldTitle by remember { mutableStateOf("") }
    var inputFieldSubtitle by remember { mutableStateOf("") }

    val filteredItems = remember(itemsList, searchQuery, selectedTabIndex, parsedUi.tabs) {
        var result = itemsList
        if (searchQuery.isNotBlank()) {
            result = result.filter {
                it.title.contains(searchQuery, ignoreCase = true) ||
                        it.subtitle.contains(searchQuery, ignoreCase = true)
            }
        }
        if (parsedUi.tabs.isNotEmpty() && selectedTabIndex > 0) {
            val selectedCategory = parsedUi.tabs.getOrNull(selectedTabIndex)
            if (selectedCategory != null && selectedCategory != "الكل") {
                result = result.filter { it.category == selectedCategory }
            }
        }
        result
    }

    val simBg = if (simulatorDarkMode) Color(0xFF0F172A) else Color(0xFFF8FAFC)
    val simSurface = if (simulatorDarkMode) Color(0xFF1E293B) else Color(0xFFFFFFFF)
    val simText = if (simulatorDarkMode) Color(0xFFF8FAFC) else Color(0xFF0F172A)
    val simTextSecondary = if (simulatorDarkMode) Color(0xFF94A3B8) else Color(0xFF64748B)

    Column(
        modifier = modifier
            .fillMaxSize()
            .testTag("compose_runtime_simulator")
    ) {
        // Simulator Control Toolbar
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = MaterialTheme.colorScheme.surfaceVariant,
            tonalElevation = 4.dp
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Status Badge
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = TealAccent.copy(alpha = 0.2f)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(TealAccent)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Compose Runtime v1.7 • نشط",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = TealAccent
                        )
                    }
                }

                // Inspector Mode Toggle
                FilterChip(
                    selected = inspectorMode,
                    onClick = {
                        inspectorMode = !inspectorMode
                        if (!inspectorMode) selectedNode = null
                    },
                    label = { Text(if (inspectorMode) "مفتش Compose: مفعّل" else "مفتش الواجهة", fontSize = 11.sp) },
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.Search,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp)
                        )
                    },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = CyanNeon,
                        selectedLabelColor = Color.Black
                    )
                )

                // Dark/Light Theme Toggle
                IconButton(
                    onClick = { simulatorDarkMode = !simulatorDarkMode },
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(
                        imageVector = if (simulatorDarkMode) Icons.Default.LightMode else Icons.Default.DarkMode,
                        contentDescription = "تبديل المظهر",
                        tint = CyanNeon,
                        modifier = Modifier.size(18.dp)
                    )
                }

                // Phone Frame Bezel Toggle
                IconButton(
                    onClick = { showDeviceFrame = !showDeviceFrame },
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(
                        imageVector = if (showDeviceFrame) Icons.Default.Smartphone else Icons.Default.Fullscreen,
                        contentDescription = "تبديل إطار الهاتف",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(18.dp)
                    )
                }

                // Reset State
                IconButton(
                    onClick = {
                        itemsList = parsedUi.initialItems
                        searchQuery = ""
                        selectedTabIndex = 0
                        selectedNavIndex = 0
                        Toast.makeText(context, "تمت إعادة تعيين حالة المحاكي", Toast.LENGTH_SHORT).show()
                    },
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Refresh,
                        contentDescription = "إعادة ضبط",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }

        // Active Inspector Node Card
        AnimatedVisibility(visible = inspectorMode && selectedNode != null) {
            selectedNode?.let { node ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                        .border(1.dp, CyanNeon, RoundedCornerShape(12.dp)),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = IndigoDeep.copy(alpha = 0.5f))
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Surface(
                                    shape = RoundedCornerShape(6.dp),
                                    color = CyanNeon.copy(alpha = 0.2f)
                                ) {
                                    Text(
                                        text = node.type,
                                        fontSize = 10.sp,
                                        color = CyanNeon,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "<${node.name}>",
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = Color.White
                                )
                            }
                            IconButton(onClick = { selectedNode = null }, modifier = Modifier.size(24.dp)) {
                                Icon(Icons.Default.Close, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                            }
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = node.details,
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            lineHeight = 16.sp
                        )
                    }
                }
            }
        }

        // Simulated Mobile Viewport Area
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(if (showDeviceFrame) 12.dp else 0.dp),
            contentAlignment = Alignment.Center
        ) {
            Card(
                modifier = Modifier
                    .fillMaxSize()
                    .border(
                        width = if (showDeviceFrame) 3.dp else 0.dp,
                        color = if (showDeviceFrame) Color(0xFF334155) else Color.Transparent,
                        shape = if (showDeviceFrame) RoundedCornerShape(32.dp) else RoundedCornerShape(0.dp)
                    )
                    .clip(if (showDeviceFrame) RoundedCornerShape(32.dp) else RoundedCornerShape(0.dp)),
                colors = CardDefaults.cardColors(containerColor = simBg),
                elevation = CardDefaults.cardElevation(defaultElevation = if (showDeviceFrame) 8.dp else 0.dp)
            ) {
                Scaffold(
                    containerColor = simBg,
                    topBar = {
                        Column {
                            // Android Status Bar Simulation
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(simBg)
                                    .padding(horizontal = 18.dp, vertical = 6.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "09:41",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = simText
                                )

                                // Camera Punch Hole Pill
                                Box(
                                    modifier = Modifier
                                        .size(12.dp)
                                        .clip(CircleShape)
                                        .background(Color.Black)
                                )

                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(Icons.Default.Wifi, contentDescription = null, tint = simText, modifier = Modifier.size(13.dp))
                                    Icon(Icons.Default.SignalCellularAlt, contentDescription = null, tint = simText, modifier = Modifier.size(13.dp))
                                    Icon(Icons.Default.BatteryChargingFull, contentDescription = null, tint = simText, modifier = Modifier.size(14.dp))
                                }
                            }

                            // Simulated TopAppBar (Material 3)
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .then(
                                        if (inspectorMode) Modifier.clickable {
                                            selectedNode = parsedUi.composeNodes.firstOrNull { it.name == "TopAppBar" }
                                                ?: ComposeNodeInfo("TopAppBar", "App Bar", "شريط التطبيق الرئيسي", "TopAppBar(...)")
                                        } else Modifier
                                    ),
                                color = simSurface,
                                tonalElevation = 2.dp
                            ) {
                                Column(modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            IconButton(
                                                onClick = {
                                                    Toast.makeText(context, "قائمة التطبيق", Toast.LENGTH_SHORT).show()
                                                },
                                                modifier = Modifier.size(36.dp)
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Default.Menu,
                                                    contentDescription = null,
                                                    tint = simText,
                                                    modifier = Modifier.size(20.dp)
                                                )
                                            }
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Column {
                                                Text(
                                                    text = parsedUi.appTitle,
                                                    style = MaterialTheme.typography.titleMedium,
                                                    fontWeight = FontWeight.Bold,
                                                    color = simText,
                                                    maxLines = 1
                                                )
                                                Text(
                                                    text = parsedUi.subtitle,
                                                    fontSize = 10.sp,
                                                    color = parsedUi.primaryColor,
                                                    maxLines = 1
                                                )
                                            }
                                        }

                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            IconButton(
                                                onClick = {
                                                    Toast.makeText(context, "الإشعارات نشطة", Toast.LENGTH_SHORT).show()
                                                },
                                                modifier = Modifier.size(36.dp)
                                            ) {
                                                Icon(Icons.Default.Notifications, contentDescription = null, tint = simTextSecondary, modifier = Modifier.size(18.dp))
                                            }
                                            IconButton(
                                                onClick = {
                                                    Toast.makeText(context, "الخيارات الإضافية", Toast.LENGTH_SHORT).show()
                                                },
                                                modifier = Modifier.size(36.dp)
                                            ) {
                                                Icon(Icons.Default.MoreVert, contentDescription = null, tint = simTextSecondary, modifier = Modifier.size(18.dp))
                                            }
                                        }
                                    }

                                    // Real-Time Search Bar
                                    if (parsedUi.hasSearch) {
                                        Spacer(modifier = Modifier.height(6.dp))
                                        OutlinedTextField(
                                            value = searchQuery,
                                            onValueChange = { searchQuery = it },
                                            placeholder = {
                                                Text(
                                                    text = parsedUi.searchPlaceholder,
                                                    fontSize = 11.sp,
                                                    color = simTextSecondary
                                                )
                                            },
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .height(46.dp),
                                            shape = RoundedCornerShape(24.dp),
                                            leadingIcon = {
                                                Icon(
                                                    imageVector = Icons.Default.Search,
                                                    contentDescription = null,
                                                    tint = parsedUi.primaryColor,
                                                    modifier = Modifier.size(16.dp)
                                                )
                                            },
                                            trailingIcon = {
                                                if (searchQuery.isNotEmpty()) {
                                                    IconButton(onClick = { searchQuery = "" }) {
                                                        Icon(Icons.Default.Clear, contentDescription = null, tint = simTextSecondary, modifier = Modifier.size(16.dp))
                                                    }
                                                }
                                            },
                                            colors = OutlinedTextFieldDefaults.colors(
                                                focusedBorderColor = parsedUi.primaryColor,
                                                unfocusedBorderColor = simTextSecondary.copy(alpha = 0.3f),
                                                focusedContainerColor = simBg,
                                                unfocusedContainerColor = simBg
                                            ),
                                            singleLine = true
                                        )
                                    }

                                    // TabRow Simulation
                                    if (parsedUi.tabs.isNotEmpty()) {
                                        Spacer(modifier = Modifier.height(6.dp))
                                        ScrollableTabRow(
                                            selectedTabIndex = selectedTabIndex,
                                            edgePadding = 0.dp,
                                            containerColor = Color.Transparent,
                                            contentColor = parsedUi.primaryColor,
                                            divider = {},
                                            indicator = { tabPositions ->
                                                TabRowDefaults.SecondaryIndicator(
                                                    modifier = Modifier.tabIndicatorOffset(tabPositions[selectedTabIndex]),
                                                    color = parsedUi.primaryColor
                                                )
                                            }
                                        ) {
                                            parsedUi.tabs.forEachIndexed { index, tabTitle ->
                                                Tab(
                                                    selected = selectedTabIndex == index,
                                                    onClick = { selectedTabIndex = index },
                                                    text = {
                                                        Text(
                                                            text = tabTitle,
                                                            fontSize = 11.sp,
                                                            fontWeight = if (selectedTabIndex == index) FontWeight.Bold else FontWeight.Normal,
                                                            color = if (selectedTabIndex == index) parsedUi.primaryColor else simTextSecondary
                                                        )
                                                    }
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    bottomBar = {
                        if (parsedUi.navItems.isNotEmpty()) {
                            NavigationBar(
                                containerColor = simSurface,
                                tonalElevation = 6.dp,
                                modifier = Modifier
                                    .then(
                                        if (inspectorMode) Modifier.clickable {
                                            selectedNode = parsedUi.composeNodes.firstOrNull { it.name == "NavigationBar" }
                                                ?: ComposeNodeInfo("NavigationBar", "Bottom Nav", "شريط التنقل السفلي", "NavigationBar { ... }")
                                        } else Modifier
                                    )
                            ) {
                                parsedUi.navItems.forEachIndexed { index, item ->
                                    val isSelected = selectedNavIndex == index
                                    NavigationBarItem(
                                        selected = isSelected,
                                        onClick = { selectedNavIndex = index },
                                        icon = {
                                            Icon(
                                                imageVector = item.icon,
                                                contentDescription = item.title,
                                                modifier = Modifier.size(20.dp)
                                            )
                                        },
                                        label = { Text(item.title, fontSize = 10.sp) },
                                        colors = NavigationBarItemDefaults.colors(
                                            selectedIconColor = Color.Black,
                                            indicatorColor = parsedUi.primaryColor,
                                            selectedTextColor = parsedUi.primaryColor,
                                            unselectedIconColor = simTextSecondary,
                                            unselectedTextColor = simTextSecondary
                                        )
                                    )
                                }
                            }
                        }
                    },
                    floatingActionButton = {
                        if (parsedUi.hasFab) {
                            FloatingActionButton(
                                onClick = { showAddDialog = true },
                                containerColor = parsedUi.primaryColor,
                                contentColor = Color.Black,
                                shape = CircleShape,
                                modifier = Modifier
                                    .testTag("simulator_fab")
                                    .then(
                                        if (inspectorMode) Modifier.clickable {
                                            selectedNode = parsedUi.composeNodes.firstOrNull { it.name == "FloatingActionButton" }
                                                ?: ComposeNodeInfo("FloatingActionButton", "FAB", "زر العمل العائم", "FloatingActionButton(...)")
                                        } else Modifier
                                    )
                            ) {
                                Icon(
                                    imageVector = parsedUi.fabIcon,
                                    contentDescription = parsedUi.fabLabel,
                                    modifier = Modifier.size(22.dp)
                                )
                            }
                        }
                    }
                ) { innerPadding ->
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(innerPadding)
                            .padding(horizontal = 14.dp),
                        contentPadding = PaddingValues(top = 10.dp, bottom = 80.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        // Metric Banner (if available)
                        if (parsedUi.metricTitle != null && parsedUi.metricValue != null) {
                            item {
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .border(1.dp, parsedUi.primaryColor.copy(alpha = 0.3f), RoundedCornerShape(16.dp)),
                                    shape = RoundedCornerShape(16.dp),
                                    colors = CardDefaults.cardColors(containerColor = simSurface)
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(14.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Column {
                                            Text(
                                                text = parsedUi.metricTitle,
                                                fontSize = 11.sp,
                                                color = simTextSecondary
                                            )
                                            Spacer(modifier = Modifier.height(2.dp))
                                            Text(
                                                text = parsedUi.metricValue,
                                                style = MaterialTheme.typography.titleMedium,
                                                fontWeight = FontWeight.Bold,
                                                color = parsedUi.primaryColor
                                            )
                                        }

                                        parsedUi.primaryButtonLabel?.let { btnLabel ->
                                            Button(
                                                onClick = {
                                                    Toast.makeText(context, "تم تنفيذ الإجراء بنجاح!", Toast.LENGTH_SHORT).show()
                                                },
                                                colors = ButtonDefaults.buttonColors(
                                                    containerColor = parsedUi.primaryColor,
                                                    contentColor = Color.Black
                                                ),
                                                shape = RoundedCornerShape(10.dp),
                                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                                            ) {
                                                Text(btnLabel.take(16), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Simulated Items List
                        if (filteredItems.isEmpty()) {
                            item {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 40.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Icon(
                                            imageVector = Icons.Default.Inbox,
                                            contentDescription = null,
                                            tint = simTextSecondary.copy(alpha = 0.5f),
                                            modifier = Modifier.size(48.dp)
                                        )
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Text(
                                            text = "لا توجد عناصر مطابقة",
                                            style = MaterialTheme.typography.titleSmall,
                                            color = simTextSecondary
                                        )
                                        Spacer(modifier = Modifier.height(2.dp))
                                        Text(
                                            text = "اضغط على زر الإضافة (+) لإضافة عنصر جديد",
                                            fontSize = 11.sp,
                                            color = simTextSecondary.copy(alpha = 0.7f)
                                        )
                                    }
                                }
                            }
                        } else {
                            items(filteredItems, key = { it.id }) { cardItem ->
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .border(
                                            width = if (inspectorMode) 1.5.dp else 1.dp,
                                            color = if (inspectorMode) CyanNeon.copy(alpha = 0.6f) else simTextSecondary.copy(alpha = 0.15f),
                                            shape = RoundedCornerShape(16.dp)
                                        )
                                        .clickable {
                                            if (inspectorMode) {
                                                selectedNode = parsedUi.composeNodes.firstOrNull { it.name == "Card" }
                                                    ?: ComposeNodeInfo("Card", "M3 Card", "بطاقة عرض البيانات", "Card(shape = RoundedCornerShape(16.dp)) { ... }")
                                            } else {
                                                itemsList = itemsList.map {
                                                    if (it.id == cardItem.id) it.copy(isChecked = !it.isChecked) else it
                                                }
                                            }
                                        },
                                    shape = RoundedCornerShape(16.dp),
                                    colors = CardDefaults.cardColors(containerColor = simSurface)
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(14.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            modifier = Modifier.weight(1f)
                                        ) {
                                            // Check or Icon
                                            IconButton(
                                                onClick = {
                                                    itemsList = itemsList.map {
                                                        if (it.id == cardItem.id) it.copy(isChecked = !it.isChecked) else it
                                                    }
                                                },
                                                modifier = Modifier.size(36.dp)
                                            ) {
                                                Icon(
                                                    imageVector = if (cardItem.isChecked) Icons.Default.CheckCircle else cardItem.icon,
                                                    contentDescription = null,
                                                    tint = if (cardItem.isChecked) TealAccent else parsedUi.primaryColor,
                                                    modifier = Modifier.size(22.dp)
                                                )
                                            }

                                            Spacer(modifier = Modifier.width(8.dp))

                                            Column {
                                                Text(
                                                    text = cardItem.title,
                                                    style = MaterialTheme.typography.titleSmall,
                                                    fontWeight = FontWeight.Bold,
                                                    color = if (cardItem.isChecked) simTextSecondary else simText,
                                                    maxLines = 1
                                                )
                                                Spacer(modifier = Modifier.height(2.dp))
                                                Text(
                                                    text = cardItem.subtitle,
                                                    fontSize = 11.sp,
                                                    color = simTextSecondary,
                                                    maxLines = 2,
                                                    lineHeight = 16.sp
                                                )
                                            }
                                        }

                                        Column(
                                            horizontalAlignment = Alignment.End,
                                            verticalArrangement = Arrangement.spacedBy(4.dp)
                                        ) {
                                            cardItem.price?.let { priceTag ->
                                                Text(
                                                    text = priceTag,
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 12.sp,
                                                    color = parsedUi.primaryColor
                                                )
                                            }

                                            Surface(
                                                shape = RoundedCornerShape(6.dp),
                                                color = parsedUi.primaryColor.copy(alpha = 0.15f)
                                            ) {
                                                Text(
                                                    text = cardItem.badge,
                                                    fontSize = 10.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = parsedUi.primaryColor,
                                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
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
        }
    }

    // Dynamic Add Item Dialog
    if (showAddDialog) {
        AlertDialog(
            onDismissRequest = { showAddDialog = false },
            title = {
                Text(
                    text = "إضافة عنصر جديد (${parsedUi.appTitle})",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedTextField(
                        value = inputFieldTitle,
                        onValueChange = { inputFieldTitle = it },
                        label = { Text("العنوان الرئيسي") },
                        placeholder = { Text("أدخل عنوان العنصر...") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )

                    OutlinedTextField(
                        value = inputFieldSubtitle,
                        onValueChange = { inputFieldSubtitle = it },
                        label = { Text("التفاصيل / الوصف") },
                        placeholder = { Text("أدخل وصفًا تفصيليًا...") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (inputFieldTitle.isNotBlank()) {
                            val newItem = SimulatorCardItem(
                                id = System.currentTimeMillis(),
                                title = inputFieldTitle,
                                subtitle = inputFieldSubtitle.ifBlank { "تمت إضافته من المحاكي التفاعلي" },
                                badge = "مضاف حديثًا",
                                isChecked = false
                            )
                            itemsList = listOf(newItem) + itemsList
                            inputFieldTitle = ""
                            inputFieldSubtitle = ""
                            showAddDialog = false
                            Toast.makeText(context, "تمت الإضافة بنجاح إلى القائمة!", Toast.LENGTH_SHORT).show()
                        }
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = parsedUi.primaryColor,
                        contentColor = Color.Black
                    )
                ) {
                    Text("إضافة إلى التطبيق", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddDialog = false }) {
                    Text("إلغاء")
                }
            }
        )
    }
}
