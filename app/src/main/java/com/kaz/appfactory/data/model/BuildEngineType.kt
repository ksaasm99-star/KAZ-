package com.kaz.appfactory.data.model

enum class BuildEngineType(
    val id: String,
    val titleAr: String,
    val subtitleAr: String,
    val descriptionAr: String,
    val badge: String
) {
    AUTO(
        id = "auto",
        titleAr = "تلقائي ذكي (Auto)",
        subtitleAr = "يحلل KAZ متطلبات التطبيق ويختار المحرك الأنسب تلقائيًا",
        descriptionAr = "يفحص KAZ تعقيد التطبيق تلقائيًا: التطبيقات الخفيفة تذهب لمحرك HTML/JS، وتطبيقات العتاد والخدمات الخلفية تذهب لمحرك Kotlin.",
        badge = "تلقائي 🤖"
    ),
    HTML_JS(
        id = "html_js",
        titleAr = "محرك الويب السريع (iappyxOS)",
        subtitleAr = "توليد فوري وتثبيت مباشر على الجهاز مع 37+ جسر لنظام أندرويد",
        descriptionAr = "توليد كود HTML5/CSS/JS وحقنه في قالب WebView Shell خفيف (أقل من 1MB) مع توقيع على الجهاز عبر apksig.",
        badge = "iappyxOS ⚡"
    ),
    KOTLIN(
        id = "kotlin",
        titleAr = "محرك كوتلن الأصلي (Hefesto)",
        subtitleAr = "بيئة تجميع متكاملة لـ Kotlin و Jetpack Compose داخل الهاتف",
        descriptionAr = "توليد وتجميع تطبيقات أندرويد أصلية مع Jetpack Compose مع تتبع فوري لسجل التجميع (Real-time Build Console).",
        badge = "Hefesto 🌟"
    )
}
