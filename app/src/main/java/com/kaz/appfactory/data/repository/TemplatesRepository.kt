package com.kaz.appfactory.data.repository

import com.kaz.appfactory.data.model.AppTemplate

object TemplatesRepository {

    val templates: List<AppTemplate> = listOf(
        AppTemplate(
            id = "ecommerce",
            titleAr = "متجر إلكتروني وسلة تسوق",
            titleEn = "E-Commerce & Storefront",
            categoryAr = "تجارة إلكترونية",
            descriptionAr = "تطبيق متجر متكامل مع عرض المنتجات، تصفية الفئات، سلة الشراء، وشاشة الدفع الفوري.",
            prompt = "ابنِ لي تطبيق متجر إلكتروني (E-Commerce) في أندرويد باستخدام Jetpack Compose. يتضمن شاشة تصفح المنتجات وشريط بحث وفئات وسلة مشتريات مع حساب الإجمالي، واستخدام Room Database لحفظ السلة، مع كود Kotlin كامل.",
            iconName = "shopping_bag",
            sampleFeatures = listOf("عرض المنتجات", "سلة التسوق", "حفظ محلي Room", "Material 3 Cards")
        ),
        AppTemplate(
            id = "delivery",
            titleAr = "تطبيق توصيل وجبات ومطاعم",
            titleEn = "Food Delivery & Tracker",
            categoryAr = "توصيل وخدمات",
            descriptionAr = "تطبيق طلب طعام مع قائمة وجبات شهية، تخصيص الإضافات، ومتابعة حالة الطلب مرحلة بمرحلة.",
            prompt = "ابنِ لي تطبيق توصيل طعام ومطاعم (Food Delivery) بلغة Kotlin و Jetpack Compose مع تتبع حالة الطلب (قيد التحضير، في الطريق، تم التوصيل)، وتحديد العنوان وقائمة الأصناف مع كود كامل جاهز.",
            iconName = "delivery_dining",
            sampleFeatures = listOf("قائمة الوجبات", "تتبع الطلب مباشرة", "بطاقات تفاعلية", "ViewModel StateFlow")
        ),
        AppTemplate(
            id = "task_manager",
            titleAr = "إدارة المهام والإنتاجية الذكية",
            titleEn = "Smart Tasks & Habits",
            categoryAr = "إنتاجية",
            descriptionAr = "نظام مهام شخصي مع أولويات، تصنيف حسب المشروع، إشعارات، وإحصائيات إنجاز أسبوعية.",
            prompt = "ابنِ لي تطبيق إدارة مهام وملاحظات ذكي (Task & Todo App) باستخدام Jetpack Compose و Room Database. يدعم إضافة مهمة جديدة مع تحديد الأولوية والتاريخ، وحذف المهام وتحديث حالتها، مع واجهة Material 3 جذابة.",
            iconName = "task_alt",
            sampleFeatures = listOf("قاعدة بيانات Room", "إضافة وتعديل مهام", "أولويات ملونة", "بحث وفلترة")
        ),
        AppTemplate(
            id = "clinic",
            titleAr = "حجز مواعيد العيادات والأطباء",
            titleEn = "Doctor & Clinic Booking",
            categoryAr = "صحة ورعاية",
            descriptionAr = "منصة حجز أطباء مع اختيار التخصص، حجز الموعد الزمني، واستعراض ملف الطبيب والتقييمات.",
            prompt = "ابنِ لي تطبيق حجز مواعيد طبية وعيادات (Clinic Booking) باستخدام Kotlin و Jetpack Compose. يحتوي على قائمة الأطباء حسب التخصص واختيار الوقت والتاريخ مع تأكيد الحجز وإدارة المواعيد السابقة.",
            iconName = "medical_services",
            sampleFeatures = listOf("تقويم المواعيد", "ملفات الأطباء", "تأكيد فوري", "تصميم نظيف هادئ")
        ),
        AppTemplate(
            id = "fintech",
            titleAr = "محفظة رقمية وبطاقات مالية",
            titleEn = "Fintech Digital Wallet",
            categoryAr = "مالية وبنوك",
            descriptionAr = "محفظة نقدية ذكية، متابعة المصاريف والتحويلات، عرض البطاقات البنكية، ورسوم بيانية شهرية.",
            prompt = "ابنِ لي تطبيق محفظة مالية وبطاقات دفع (Fintech Wallet) باستخدام Jetpack Compose. يعرض بطاقات ائتمانية متدرجة الألوان، رصيد الحساب، سجل المعاملات الأخيرة، وتحويل الأموال بكود كامل.",
            iconName = "account_balance_wallet",
            sampleFeatures = listOf("عرض البطاقات المالية", "سجل المعاملات", "إحصائيات الصرف", "ألوان متدرجة فاخرة")
        ),
        AppTemplate(
            id = "learning",
            titleAr = "منصة دورات وتعليم تفاعلي",
            titleEn = "Online Learning Academy",
            categoryAr = "تعليم",
            descriptionAr = "تطبيق كورسات ودورات تدريبية مع مسارات تعلم، دروس فيديو، واختبارات قصيرة مع تقدم الإنجاز.",
            prompt = "ابنِ لي تطبيق منصة تعليمية ودورات تدريبية (E-Learning App) باستخدام Jetpack Compose مع قائمة الدروس، شريط تقدم المشاهدة، أسئلة تفاعلية، وشاشة الدورة بكود Kotlin احترافي كامل.",
            iconName = "school",
            sampleFeatures = listOf("مسارات التعلم", "شريط التقدم", "واجهة سلسة", "Clean Architecture")
        )
    )
}
