package com.kaz.appfactory.ui.simulator

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.ui.graphics.Color

object ComposeCodeParser {

    fun parse(code: String, fallbackTitle: String = "مشروع أندرويد"): ParsedComposeUi {
        val lowerCode = code.lowercase()

        // 1. Extract App Title
        val extractedTitle = extractAppTitle(code, fallbackTitle)

        // 2. Identify Domain Category
        val isEcommerce = lowerCode.contains("متجر") || lowerCode.contains("cart") || lowerCode.contains("منتج") || lowerCode.contains("product") || lowerCode.contains("شراء") || lowerCode.contains("سعر")
        val isFoodDelivery = lowerCode.contains("توصيل") || lowerCode.contains("وجب") || lowerCode.contains("طعام") || lowerCode.contains("مطعم") || lowerCode.contains("delivery") || lowerCode.contains("food")
        val isFintech = lowerCode.contains("محفظ") || lowerCode.contains("رصيد") || lowerCode.contains("بطاق") || lowerCode.contains("fintech") || lowerCode.contains("wallet") || lowerCode.contains("transaction") || lowerCode.contains("سداد")
        val isClinic = lowerCode.contains("طبيب") || lowerCode.contains("عياد") || lowerCode.contains("حجز") || lowerCode.contains("موعد") || lowerCode.contains("clinic") || lowerCode.contains("doctor") || lowerCode.contains("patient")
        val isTaskOrTodo = lowerCode.contains("مهم") || lowerCode.contains("todo") || lowerCode.contains("task") || lowerCode.contains("habit") || lowerCode.contains("إنجاز")

        // 3. Detect Components in Code
        val detectedComponents = mutableListOf<String>()
        val composeNodes = mutableListOf<ComposeNodeInfo>()

        if (code.contains("Scaffold")) {
            detectedComponents.add("Scaffold")
            composeNodes.add(
                ComposeNodeInfo(
                    name = "Scaffold",
                    type = "Layout Container",
                    details = "الهيكل الأساسي للشاشة متوافق مع معايير Material 3 لدعم TopAppBar و FAB و BottomBar",
                    codeSnippet = "Scaffold(topBar = { ... }, bottomBar = { ... }, floatingActionButton = { ... }) { padding -> ... }"
                )
            )
        }

        if (code.contains("TopAppBar") || code.contains("CenterAlignedTopAppBar")) {
            detectedComponents.add("TopAppBar")
            composeNodes.add(
                ComposeNodeInfo(
                    name = "TopAppBar",
                    type = "App Header",
                    details = "شريط التطبيق العلوي يحتوي على العنوان وإجراءات البحث والخيارات الإضافية",
                    codeSnippet = "TopAppBar(title = { Text(\"$extractedTitle\") }, navigationIcon = { ... }, actions = { ... })"
                )
            )
        }

        if (code.contains("FloatingActionButton") || code.contains("ExtendedFloatingActionButton")) {
            detectedComponents.add("FAB")
            composeNodes.add(
                ComposeNodeInfo(
                    name = "FloatingActionButton",
                    type = "Primary Action",
                    details = "زر العمل العائم لإضافة عناصر جديدة أو تنفيذ الإجراء الرئيسي",
                    codeSnippet = "FloatingActionButton(onClick = { ... }, containerColor = CyanNeon) { Icon(Icons.Default.Add, null) }"
                )
            )
        }

        if (code.contains("NavigationBar") || code.contains("BottomAppBar")) {
            detectedComponents.add("NavigationBar")
            composeNodes.add(
                ComposeNodeInfo(
                    name = "NavigationBar",
                    type = "Navigation",
                    details = "شريط التنقل السفلي يدعم التنقل بين أقسام التطبيق الرئيسية بأيقونات M3",
                    codeSnippet = "NavigationBar { NavigationBarItem(selected = true, onClick = { ... }, icon = { ... }) }"
                )
            )
        }

        if (code.contains("LazyColumn") || code.contains("LazyRow")) {
            detectedComponents.add("LazyColumn")
            composeNodes.add(
                ComposeNodeInfo(
                    name = "LazyColumn",
                    type = "List Container",
                    details = "قائمة ديناميكية عالية الأداء تدعم إعادة التدوير وعرض كميات كبيرة من البيانات",
                    codeSnippet = "LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) { items(itemsList) { item -> ... } }"
                )
            )
        }

        if (code.contains("Card") || code.contains("ElevatedCard")) {
            detectedComponents.add("Card (M3)")
            composeNodes.add(
                ComposeNodeInfo(
                    name = "Card",
                    type = "Content Presentation",
                    details = "بطاقات مستديرة الحواف مع تباين ألوان وظلال حديثة لتمثيل عناصر التطبيق",
                    codeSnippet = "Card(shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(...)) { ... }"
                )
            )
        }

        if (code.contains("TextField") || code.contains("OutlinedTextField")) {
            detectedComponents.add("OutlinedTextField")
            composeNodes.add(
                ComposeNodeInfo(
                    name = "OutlinedTextField",
                    type = "User Input",
                    details = "حقول إدخال نصوص عصرية تدعم التحقق وتغيير الحالة لحظيًا",
                    codeSnippet = "OutlinedTextField(value = text, onValueChange = { text = it }, label = { Text(...) })"
                )
            )
        }

        if (code.contains("Button") || code.contains("FilledTonalButton") || code.contains("ElevatedButton")) {
            detectedComponents.add("Button")
            composeNodes.add(
                ComposeNodeInfo(
                    name = "Button",
                    type = "Interactive Action",
                    details = "أزرار تفاعلية مع تأثير الارتداد والتموج (Material Ripple)",
                    codeSnippet = "Button(onClick = { ... }, shape = RoundedCornerShape(12.dp)) { Text(...) }"
                )
            )
        }

        if (code.contains("Room") || code.contains("@Entity") || code.contains("@Dao")) {
            detectedComponents.add("Room Database")
            composeNodes.add(
                ComposeNodeInfo(
                    name = "Room Entity & DAO",
                    type = "Data Persistence",
                    details = "تكامل قاعدة البيانات المحلية لحفظ البيانات ومزامنتها عبر Kotlin Coroutines و Flow",
                    codeSnippet = "@Entity(tableName = \"items\") data class Item(...) \n@Dao interface ItemDao { ... }"
                )
            )
        }

        if (code.contains("ViewModel") || code.contains("StateFlow") || code.contains("collectAsState")) {
            detectedComponents.add("ViewModel (StateFlow)")
            composeNodes.add(
                ComposeNodeInfo(
                    name = "ViewModel",
                    type = "State Management",
                    details = "إدارة الحالة وفصل المنطق البرمجي عن واجهة المستخدم وفق مبادئ Clean Architecture",
                    codeSnippet = "class AppViewModel : ViewModel() { val uiState: StateFlow<UiState> = ... }"
                )
            )
        }

        // 4. Build Domain-Specific Simulator Configuration
        return when {
            isEcommerce -> ParsedComposeUi(
                appTitle = extractedTitle,
                subtitle = "متجر إلكتروني متكامل • سلة ودفع فوري",
                primaryColor = Color(0xFF00E5FF),
                hasSearch = true,
                searchPlaceholder = "ابحث عن المنتجات والعروض...",
                hasFab = true,
                fabIcon = Icons.Default.ShoppingCart,
                fabLabel = "السلة",
                tabs = listOf("الكل", "الإلكترونيات", "الملابس", "العطور", "الأكثر طلبًا"),
                navItems = listOf(
                    SimulatorNavItem("home", "المتجر", Icons.Default.Storefront),
                    SimulatorNavItem("cart", "السلة", Icons.Default.ShoppingCart),
                    SimulatorNavItem("orders", "طلباتي", Icons.Default.ReceiptLong),
                    SimulatorNavItem("profile", "حسابي", Icons.Default.Person)
                ),
                initialItems = listOf(
                    SimulatorCardItem(1, "سماعات برو اللاسلكية", "عزل ضوضاء فائق وبطارية تدوم 36 ساعة", "خصم 25%", false, 1, "349 ر.س", "الإلكترونيات", Icons.Default.Headphones),
                    SimulatorCardItem(2, "ساعة ذكية رياضية 8", "مراقبة النبض وشاشة AMOLED ضد الماء", "جديد", false, 1, "599 ر.س", "الإلكترونيات", Icons.Default.Watch),
                    SimulatorCardItem(3, "حذاء الجري الترا لايت", "نعل هوائي مرن وتصميم خفيف الوزن", "مميز", false, 1, "280 ر.س", "الملابس", Icons.Default.DirectionsRun),
                    SimulatorCardItem(4, "عطر العود الملكي الفاخر", "مزيج دافئ من العود والعنبر الطبيعي", "الأكثر مبيعًا", false, 1, "420 ر.س", "العطور", Icons.Default.Spa)
                ),
                metricTitle = "إجمالي السلة والمشتريات",
                metricValue = "1,648 ر.س",
                formFields = listOf(
                    SimulatorFormField("name", "اسم المنتج", "أدخل اسم السلعة الجديدة..."),
                    SimulatorFormField("price", "السعر", "مثال: 199 ر.س"),
                    SimulatorFormField("category", "الفئة", "اختر فئة المنتج")
                ),
                primaryButtonLabel = "إتمام الطلب والدفع 💳",
                detectedComponents = detectedComponents,
                composeNodes = composeNodes
            )

            isFoodDelivery -> ParsedComposeUi(
                appTitle = extractedTitle,
                subtitle = "توصيل وجبات ومطاعم • تتبع مباشر",
                primaryColor = Color(0xFFFF9100),
                hasSearch = true,
                searchPlaceholder = "ابحث عن وجبتك المفضلة أو المطعم...",
                hasFab = true,
                fabIcon = Icons.Default.DeliveryDining,
                fabLabel = "تتبع الطلب",
                tabs = listOf("الكل", "برجر", "بيتزا", "شاورما", "مشروبات"),
                navItems = listOf(
                    SimulatorNavItem("menu", "القائمة", Icons.Default.RestaurantMenu),
                    SimulatorNavItem("track", "التتبع", Icons.Default.DeliveryDining),
                    SimulatorNavItem("orders", "الطلبات", Icons.Default.History),
                    SimulatorNavItem("account", "الحساب", Icons.Default.Person)
                ),
                initialItems = listOf(
                    SimulatorCardItem(1, "وجبة برجر سموكي دبل", "لحم أنجوس مشوي مع جبن الشيدر وصوص خاص", "شامل التوصيل", false, 1, "42 ر.س", "برجر", Icons.Default.LunchDining),
                    SimulatorCardItem(2, "بيتزا نابولي مارغريتا", "عجينة إيطالية مختمرة وجبن موزاريلا طازج", "الأكثر طلبًا", false, 1, "58 ر.س", "بيتزا", Icons.Default.LocalPizza),
                    SimulatorCardItem(3, "صحن شاورما عربي سوبر", "دجاج متبل مع ثومية وبطاطس مقرمشة", "عرض خاص", false, 1, "32 ر.س", "شاورما", Icons.Default.Fastfood),
                    SimulatorCardItem(4, "عصير ليمون ونعناع مثلج", "منعش وطبيعي 100% بدون سكر مضاف", "بارد", false, 1, "15 ر.س", "مشروبات", Icons.Default.LocalDrink)
                ),
                metricTitle = "حالة الطلب الحالي",
                metricValue = "🚗 الكابتن في الطريق (12 دقيقة)",
                formFields = listOf(
                    SimulatorFormField("dish", "اسم الوجبة", "مثال: وجبة كلاسيك"),
                    SimulatorFormField("notes", "ملاحظات إضافية", "بدون بصل، صوص إضافي...", isMultiline = true)
                ),
                primaryButtonLabel = "تأكيد الطلب الفوري 🍔",
                detectedComponents = detectedComponents,
                composeNodes = composeNodes
            )

            isFintech -> ParsedComposeUi(
                appTitle = extractedTitle,
                subtitle = "محفظة مالية رقمية • بطاقات وحوالات",
                primaryColor = Color(0xFF10B981),
                hasSearch = true,
                searchPlaceholder = "ابحث في المعاملات والحوالات...",
                hasFab = true,
                fabIcon = Icons.Default.Send,
                fabLabel = "تحويل",
                tabs = listOf("الكل", "المدفوعات", "الحوالات", "الفواتير", "الاستثمار"),
                navItems = listOf(
                    SimulatorNavItem("wallet", "المحفظة", Icons.Default.AccountBalanceWallet),
                    SimulatorNavItem("cards", "البطاقات", Icons.Default.CreditCard),
                    SimulatorNavItem("analytics", "التقارير", Icons.Default.Insights),
                    SimulatorNavItem("settings", "الإعدادات", Icons.Default.Settings)
                ),
                initialItems = listOf(
                    SimulatorCardItem(1, "تحويل وارد - شركة التقنية", "مستحقات المشروع البرمجي المستلمة", "+ مكتمل", false, 1, "+12,500 ر.س", "الحوالات", Icons.Default.ArrowDownward),
                    SimulatorCardItem(2, "سداد فاتورة الاتصالات", "سداد اشتراك الفايبر والخدمات", "مدفوع", false, 1, "-450 ر.س", "الفواتير", Icons.Default.Wifi),
                    SimulatorCardItem(3, "شراء من متجر الإلكترونيات", "دفع آمن عبر Apple Pay", "ناجح", false, 1, "-1,299 ر.س", "المدفوعات", Icons.Default.ShoppingBag),
                    SimulatorCardItem(4, "عائد استثماري للصندوق", "أرباح التوزيع الربع سنوية", "+ مضاف", false, 1, "+820 ر.س", "الاستثمار", Icons.Default.TrendingUp)
                ),
                metricTitle = "الرصيد الكلي المتاح",
                metricValue = "38,420.50 ر.س",
                formFields = listOf(
                    SimulatorFormField("beneficiary", "اسم المستفيد", "أدخل اسم أو رقم هاتف المستفيد"),
                    SimulatorFormField("amount", "المبلغ", "مثال: 500 ر.س")
                ),
                primaryButtonLabel = "إرسال الحوالة الآن 💸",
                detectedComponents = detectedComponents,
                composeNodes = composeNodes
            )

            isClinic -> ParsedComposeUi(
                appTitle = extractedTitle,
                subtitle = "حجز مواعيد أطباء • استشارات ورعاية",
                primaryColor = Color(0xFF00B0FF),
                hasSearch = true,
                searchPlaceholder = "ابحث عن طبيب أو تخصص أو عيادة...",
                hasFab = true,
                fabIcon = Icons.Default.Event,
                fabLabel = "حجز",
                tabs = listOf("الكل", "باطنية", "أطفال", "أسنان", "عيون", "جلدية"),
                navItems = listOf(
                    SimulatorNavItem("doctors", "الأطباء", Icons.Default.MedicalServices),
                    SimulatorNavItem("appointments", "مواعيدي", Icons.Default.EventAvailable),
                    SimulatorNavItem("records", "السجل الطبي", Icons.Default.FolderShared),
                    SimulatorNavItem("profile", "الملف", Icons.Default.Person)
                ),
                initialItems = listOf(
                    SimulatorCardItem(1, "د. أحمد المنصور", "استشاري أمراض باطنية وسكري • خبرة 15 سنة", "متاح اليوم", false, 1, "200 ر.س", "باطنية", Icons.Default.PersonSearch),
                    SimulatorCardItem(2, "د. سارة الكاظمي", "أخصائية طب الأطفال وحديثي الولادة", "تقييم 4.9 ★", false, 1, "180 ر.س", "أطفال", Icons.Default.ChildCare),
                    SimulatorCardItem(3, "د. طارق الجابري", "استشاري جراحة وزراعة الأسنان", "متاح غدًا", false, 1, "250 ر.س", "أسنان", Icons.Default.HealthAndSafety),
                    SimulatorCardItem(4, "د. نورة الهاشم", "أخصائية طب وجراحة العيون والليزر", "استشارة فورية", false, 1, "220 ر.س", "عيون", Icons.Default.Visibility)
                ),
                metricTitle = "الموعد القادم",
                metricValue = "الثلاثاء القادم • 04:30 م (د. أحمد)",
                formFields = listOf(
                    SimulatorFormField("patient", "اسم المريض", "أدخل الاسم الثلاثي للمريض"),
                    SimulatorFormField("phone", "رقم الجوال", "05xxxxxxxx")
                ),
                primaryButtonLabel = "تأكيد حجز الموعد 🩺",
                detectedComponents = detectedComponents,
                composeNodes = composeNodes
            )

            isTaskOrTodo -> ParsedComposeUi(
                appTitle = extractedTitle,
                subtitle = "إدارة المهام والإنتاجية • Room DB",
                primaryColor = Color(0xFF00E5FF),
                hasSearch = true,
                searchPlaceholder = "ابحث في قائمة المهام والملاحظات...",
                hasFab = true,
                fabIcon = Icons.Default.Add,
                fabLabel = "مهمة جديدة",
                tabs = listOf("الكل", "العمل", "شخصي", "مهم وعاجل", "مكتملة"),
                navItems = listOf(
                    SimulatorNavItem("tasks", "المهام", Icons.Default.TaskAlt),
                    SimulatorNavItem("calendar", "التقويم", Icons.Default.CalendarMonth),
                    SimulatorNavItem("stats", "الإحصائيات", Icons.Default.BarChart),
                    SimulatorNavItem("settings", "الإعدادات", Icons.Default.Settings)
                ),
                initialItems = listOf(
                    SimulatorCardItem(1, "إكمال بناء شاشة Compose التفاعلية", "تطبيق مبادئ Material 3 ودعم Dynamic Color", "عاجل", false, 1, null, "العمل", Icons.Default.CheckCircleOutline),
                    SimulatorCardItem(2, "دمج قاعدة بيانات Room وحفظ الحالات", "إنشاء Entity و DAO واستخدام Kotlin Coroutines", "تقني", false, 1, null, "العمل", Icons.Default.Storage),
                    SimulatorCardItem(3, "ممارسة التمارين الرياضية الصباحية", "جري لمدة 30 دقيقة وتمارين إحماء", "يومي", true, 1, null, "شخصي", Icons.Default.FitnessCenter),
                    SimulatorCardItem(4, "قراءة فصل من كتاب هندسة البرمجيات", "مراجعة أنماط التصميم المعمارية في أندرويد", "تطوير", false, 1, null, "شخصي", Icons.Default.MenuBook)
                ),
                metricTitle = "نسبة الإنجاز الأسبوعي",
                metricValue = "75% (9 من 12 مهمة مكتملة)",
                formFields = listOf(
                    SimulatorFormField("title", "عنوان المهمة", "اكتب اسم المهمة الجديدة..."),
                    SimulatorFormField("desc", "التفاصيل", "أضف ملاحظات أو تفاصيل إضافية...", isMultiline = true)
                ),
                primaryButtonLabel = "حفظ المهمة في Room 💾",
                detectedComponents = detectedComponents,
                composeNodes = composeNodes
            )

            else -> ParsedComposeUi(
                appTitle = extractedTitle,
                subtitle = "تطبيق Jetpack Compose احترافي",
                primaryColor = Color(0xFF00E5FF),
                hasSearch = true,
                searchPlaceholder = "بحث سريع في العناصر...",
                hasFab = true,
                fabIcon = Icons.Default.Add,
                fabLabel = "إضافة",
                tabs = listOf("الكل", "الرئيسية", "المفضلة", "الأرشيف"),
                navItems = listOf(
                    SimulatorNavItem("home", "الرئيسية", Icons.Default.Home),
                    SimulatorNavItem("explore", "استكشاف", Icons.Default.Explore),
                    SimulatorNavItem("saved", "المحفوظات", Icons.Default.Bookmark),
                    SimulatorNavItem("settings", "الإعدادات", Icons.Default.Settings)
                ),
                initialItems = listOf(
                    SimulatorCardItem(1, "العنصر الأول في التطبيق", "تم إنشاء هذا المكون بناءً على كود Compose المولد", "نشط", false, 1, null, "الرئيسية", Icons.Default.Widgets),
                    SimulatorCardItem(2, "بطاقة بيانات متكاملة مع الـ ViewModel", "تحديث الحالة التلقائي ومزامنة الـ StateFlow", "جاهز", false, 1, null, "الرئيسية", Icons.Default.Tune),
                    SimulatorCardItem(3, "تكامل قاعدة بيانات Room Database", "حفظ وتعديل البيانات محليًا دون الحاجة للإنترنت", "محلي", true, 1, null, "المفضلة", Icons.Default.Storage),
                    SimulatorCardItem(4, "مكونات وتصميم Material 3", "ألوان متناسقة وزوايا مستديرة وأزرار تفاعلية", "M3", false, 1, null, "الرئيسية", Icons.Default.Palette)
                ),
                metricTitle = "حالة التشغيل والأداء",
                metricValue = "60 FPS • جاهز للعمل 100%",
                formFields = listOf(
                    SimulatorFormField("title", "اسم العنصر", "أدخل العنوان المطلوب..."),
                    SimulatorFormField("desc", "الوصف", "أدخل الوصف التفصيلي...")
                ),
                primaryButtonLabel = "تنفيذ الإجراء الرئيسي 🚀",
                detectedComponents = detectedComponents,
                composeNodes = composeNodes
            )
        }
    }

    private fun extractAppTitle(code: String, fallback: String): String {
        // Look for Text("...") inside TopAppBar
        val topAppBarRegex = Regex("TopAppBar[\\s\\S]*?Text\\([\"'](.*?)[\"']\\)", RegexOption.IGNORE_CASE)
        val topAppBarMatch = topAppBarRegex.find(code)
        if (topAppBarMatch != null) {
            val title = topAppBarMatch.groupValues[1].trim()
            if (title.isNotEmpty() && !title.contains("$")) return title
        }

        // Look for title = { Text("...") }
        val titleTextRegex = Regex("title\\s*=\\s*\\{\\s*Text\\([\"'](.*?)[\"']\\)", RegexOption.IGNORE_CASE)
        val titleTextMatch = titleTextRegex.find(code)
        if (titleTextMatch != null) {
            val title = titleTextMatch.groupValues[1].trim()
            if (title.isNotEmpty() && !title.contains("$")) return title
        }

        // Look for fun NameScreen()
        val funRegex = Regex("fun\\s+([A-Za-z0-9_]+)Screen\\s*\\(", RegexOption.IGNORE_CASE)
        val funMatch = funRegex.find(code)
        if (funMatch != null) {
            val name = funMatch.groupValues[1]
            if (name.isNotEmpty()) return "تطبيق $name"
        }

        return fallback.ifBlank { "تطبيق KAZ الذكي" }
    }
}
