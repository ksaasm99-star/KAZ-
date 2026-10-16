package com.kaz.appfactory.data.model

import java.io.File

data class GeneratedApkInfo(
    val file: File,
    val name: String,
    val packageName: String,
    val versionName: String,
    val versionCode: Long,
    val fileSizeBytes: Long,
    val formattedSize: String,
    val formattedDate: String,
    val lastModified: Long,
    val sha256: String,
    val minSdkVersion: Int = 21,
    val targetSdkVersion: Int = 35,
    val signatureStatus: String = "موقع بواسطة apksig v1+v2+v3 ✓"
)
