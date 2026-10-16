package com.kaz.appfactory.data.repository

import com.kaz.appfactory.data.model.AppTemplate

object TemplatesRepository {

    val templates: List<AppTemplate> = listOf(
        // 1. Notes App (مفكرة)
        AppTemplate(
            id = "notes",
            titleAr = "تطبيق المفكرة والملاحظات (Notes App)",
            titleEn = "Notes & Quick Memo",
            categoryAr = "أدوات وملاحظات",
            descriptionAr = "مفكرة ذكية لتدوين الملاحظات مع عناوين ملونة، بحث فوري، تصنيفات، وتخزين محلي مع localStorage.",
            prompt = "ابنِ لي تطبيق مفكرة وملاحظات ذكي (Notes App) للجوال بلغات HTML5 و CSS3 و JavaScript في ملف واحد متكامل. يدعم إنشاء الملاحظات وتعديلها وحذفها، وتحديد لون البطاقة والبحث السريع في النصوص، وحفظ الملاحظات محلياً في localStorage مع تصميم داكن عصري واهتزازات خفيفة عبر KazBridge عند النقر.",
            iconName = "edit_note",
            sampleFeatures = listOf("تخزين محلي localStorage", "بحث فوري في الملاحظات", "بطاقات ملونة", "واجهة جوال تفاعلية")
        ),

        // 2. Tasks App (مهام)
        AppTemplate(
            id = "tasks",
            titleAr = "تطبيق إدارة المهام (Tasks App)",
            titleEn = "Tasks & To-Do List",
            categoryAr = "إنتاجية وعمل",
            descriptionAr = "نظام مهام شخصي مع مستويات أولوية، تواريخ استحقاق، مربعات اختيار، وإحصائيات إنجاز سريعة.",
            prompt = "ابنِ لي تطبيق إدارة مهام وقائمة مهام ذكي (Tasks & To-Do List) كـ HTML5 و CSS3 و JavaScript متكامل للجوال. يدعم إضافة مهمة جديدة مع تحديد الأولوية، وتأشير المهام المكتملة وحذفها، مع إحصائيات إنجاز وواجهة داكنة أنيقة تعمل مباشرة في WebView.",
            iconName = "task_alt",
            sampleFeatures = listOf("تأشير الإنجاز", "أولويات ملونة", "تخزين دائم", "فلترة سريعة")
        ),

        // 3. Calculator (آلة حاسبة)
        AppTemplate(
            id = "calculator",
            titleAr = "الآلة الحاسبة العصرية (Calculator)",
            titleEn = "Modern Calculator",
            categoryAr = "حسابات وأدوات",
            descriptionAr = "آلة حاسبة أنيقة مع لوحة مفاتيح رقمية عصرية، حساب المعادلات، دعم النسب المئوية، وسجل العمليات الحسابية السابقة.",
            prompt = "ابنِ لي تطبيق آلة حاسبة عصرية وذكية (Calculator App) كملف HTML/CSS/JS متكامل مع لوحة أزرار رقمية تفاعلية، وشاشة عرض المعادلات الحسابية السابقة والنتيجة الفورية، وتأثيرات أزرار نيون رائعة وتفاعل صوتي/اهتزازي عند النقر.",
            iconName = "calculate",
            sampleFeatures = listOf("حساب العمليات الرياضية", "شاشة عرض مزدوجة", "أزرار تفاعلية سلسة", "تصميم نيون داكن")
        ),

        // 4. Diary (مذكرات)
        AppTemplate(
            id = "diary",
            titleAr = "تطبيق المذكرات واليوميات (Diary App)",
            titleEn = "Personal Diary & Journal",
            categoryAr = "يوميات وشخصي",
            descriptionAr = "مذكرات شخصية لحفظ الذكريات والأفكار اليومية، مع تسجيل الحالة المزاجية، وقفل حماية محلي، وعرض تقويم الأيام.",
            prompt = "ابنِ لي تطبيق مذكرات ويوميات شخصية (Diary & Journal App) كملف HTML/JS تفاعلي متكامل. يتضمن واجهة لكتابة مذكرات اليوم، واختيار الحالة المزاجية بالأيقونات التعبيرية، وتصفح الذكريات السابقة المحفوظة محلياً في الهاتف مع تصميم دافئ وأنيق.",
            iconName = "book",
            sampleFeatures = listOf("تسجيل الحالة المزاجية", "حفظ محلي فوري", "بطاقات ذكريات", "واجهة هادئة")
        ),

        // 5. Reminders (تذكيرات)
        AppTemplate(
            id = "reminders",
            titleAr = "تطبيق التنبيهات والتذكيرات (Reminders)",
            titleEn = "Reminders & Alarms",
            categoryAr = "تنبيهات ومواعيد",
            descriptionAr = "تطبيق تذكيرات مجدولة مع تحديد وقت وتاريخ التنبيه، تصنيفات للعمل والشخصي، وشارات تنبيه عاجلة.",
            prompt = "ابنِ لي تطبيق تذكيرات وتنبيهات مجدولة (Reminders App) كملف HTML/JS تفاعلي للجوال. يتيح إضافة تذكير مع ضبط الوقت والتاريخ، وتحديد التصنيف (عاجل، عمل، شخصي)، وعرض بطاقات التنبيهات القادمة مع إمكانية الإنجاز وتنبيهات صوتية واهتزازية.",
            iconName = "alarm",
            sampleFeatures = listOf("تحديد الوقت والتاريخ", "تصنيفات مخصصة", "تنبيهات KazBridge", "تصميم سريع")
        ),

        // 6. Weather App (طقس)
        AppTemplate(
            id = "weather",
            titleAr = "تطبيق الطقس والمناخ (Weather App)",
            titleEn = "Live Weather & Forecast",
            categoryAr = "طقس ومعلومات",
            descriptionAr = "تطبيق طقس يعرض درجات الحرارة الحالية، توقعات الأيام القادمة، سرعة الرياح، ورسوم توضيحية لحالة الجو.",
            prompt = "ابنِ لي تطبيق طقس ومناخ مباشر (Weather App) تفاعلي بلغات HTML/CSS/JS. يعرض بطاقة الطقس للمدينة الحالية، درجات الحرارة العظمى والصغرى، وتوقعات الطقس بالساعة وللأيام القادمة، مع مؤشرات بيانية وواجهة جذابة ذات تدرجات لونية سماوية.",
            iconName = "wb_sunny",
            sampleFeatures = listOf("طقس فوري", "توقعات 7 أيام", "واجهة ملونة ديناميكية", "بحث بالمدينة")
        ),

        // 7. E-Commerce (متجر)
        AppTemplate(
            id = "ecommerce",
            titleAr = "متجر إلكتروني وسلة تسوق",
            titleEn = "E-Commerce & Storefront",
            categoryAr = "تجارة إلكترونية",
            descriptionAr = "تطبيق متجر متكامل مع عرض المنتجات، تصفية الفئات، سلة الشراء، وشاشة الدفع الفوري.",
            prompt = "ابنِ لي تطبيق متجر إلكتروني (E-Commerce) كـ HTML/JS للجوال. يتضمن تصفح المنتجات وشريط بحث وفئات وسلة مشتريات مع حساب الإجمالي، وتأكيد الطلب الفوري مع تأثيرات احترافية وحفظ السلة في localStorage.",
            iconName = "shopping_bag",
            sampleFeatures = listOf("عرض المنتجات", "سلة التسوق", "حفظ محلي", "تأكيد الطلب")
        ),

        // 8. Fintech Wallet (محفظة رقمية)
        AppTemplate(
            id = "fintech",
            titleAr = "محفظة رقمية وبطاقات مالية",
            titleEn = "Fintech Digital Wallet",
            categoryAr = "مالية وبنوك",
            descriptionAr = "محفظة نقدية ذكية، متابعة المصاريف والتحويلات، عرض البطاقات البنكية، ورسوم بيانية شهرية.",
            prompt = "ابنِ لي تطبيق محفظة مالية وبطاقات دفع (Fintech Wallet) كملف HTML/CSS/JS للجوال. يعرض بطاقات ائتمانية متدرجة الألوان، رصيد الحساب، سجل المعاملات الأخيرة، وتحويل الأموال التفاعلي بكود كامل.",
            iconName = "account_balance_wallet",
            sampleFeatures = listOf("عرض البطاقات المالية", "سجل المعاملات", "إحصائيات الصرف", "ألوان متدرجة فاخرة")
        )
    )
}
