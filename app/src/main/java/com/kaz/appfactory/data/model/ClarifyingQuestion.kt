package com.kaz.appfactory.data.model

data class ClarifyingQuestion(
    val id: Int,
    val question: String,
    val placeholder: String,
    var answer: String = ""
)
