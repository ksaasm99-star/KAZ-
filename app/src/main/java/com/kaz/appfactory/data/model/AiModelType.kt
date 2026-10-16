package com.kaz.appfactory.data.model

enum class AiModelType(
    val modelId: String,
    val titleAr: String,
    val titleEn: String,
    val descriptionAr: String,
    val badge: String
) {
    FLASH(
        modelId = "gemini-2.5-flash",
        titleAr = "Gemini 2.5 Flash (سريع ومجاني)",
        titleEn = "Gemini 2.5 Flash",
        descriptionAr = "سرعة استجابة فائقة، مثالي للمحادثة اليومية وتوليد الأكواد والواجهات الفورية.",
        badge = "سريع ⚡"
    ),
    FLASH_38(
        modelId = "gemini-3.8-flash",
        titleAr = "Gemini 3.8 Flash (الجيل الأحدث الذكي)",
        titleEn = "Gemini 3.8 Flash",
        descriptionAr = "أحدث وأقوى نموذج متعدد القدرات، يجمع بين السرعة الخارقة ودقة البرمجة الفائقة.",
        badge = "أحدث إصدار 🚀"
    ),
    PRO(
        modelId = "gemini-3.1-pro-preview",
        titleAr = "Gemini 3.1 Pro (تفكير عميق واحترافي)",
        titleEn = "Gemini 3.1 Pro",
        descriptionAr = "تفكير هندسي عميق، جودة معمارية متقدمة، وأكواد متكاملة للمشاريع المعقدة.",
        badge = "احترافي 🧠"
    ),
    PRO_25(
        modelId = "gemini-2.5-pro",
        titleAr = "Gemini 2.5 Pro (شامل ومستقر)",
        titleEn = "Gemini 2.5 Pro",
        descriptionAr = "قوة استدلال استثنائية لمعالجة الأكواد الطويلة والشاشات المعقدة بدقة متناهية.",
        badge = "شامل 💎"
    )
}
