package com.kaz.appfactory.data.remote.github

import kotlinx.serialization.Serializable

@Serializable
data class CreateRepoRequest(
    val name: String,
    val description: String = "",
    val private: Boolean = false,
    val auto_init: Boolean = true
)

@Serializable
data class UploadFileRequest(
    val message: String,
    val content: String, // Base64 encoded
    val branch: String = "main"
)

@Serializable
data class GitHubUserResponse(
    val login: String,
    val html_url: String? = null,
    val name: String? = null
)

@Serializable
data class GitHubRepoResponse(
    val name: String,
    val html_url: String,
    val full_name: String,
    val description: String? = null
)

@Serializable
data class GitHubContentResponse(
    val message: String? = null
)
