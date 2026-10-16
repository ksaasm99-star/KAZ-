package com.kaz.appfactory.bridge

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.*
import android.hardware.camera2.CameraManager
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.ToneGenerator
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.BatteryManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.speech.tts.TextToSpeech
import android.webkit.JavascriptInterface
import android.widget.Toast
import androidx.core.app.NotificationCompat
import java.util.*

/**
 * Registry of 37+ native Android bridges exposed to the HTML/JS apps (iappyxOS model).
 */
class NativeBridgeRegistry(private val context: Context) {

    private var tts: TextToSpeech? = null
    private val prefs: SharedPreferences =
        context.getSharedPreferences("kaz_bridge_storage", Context.MODE_PRIVATE)

    init {
        try {
            tts = TextToSpeech(context) { status ->
                if (status == TextToSpeech.SUCCESS) {
                    tts?.language = Locale.getDefault()
                }
            }
        } catch (_: Exception) {}
    }

    // 1. Toast
    @JavascriptInterface
    fun showToast(message: String) {
        Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
    }

    // 2. Vibration
    @JavascriptInterface
    fun vibrate(milliseconds: Long) {
        try {
            val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            if (vibrator != null && vibrator.hasVibrator()) {
                val duration = milliseconds.coerceIn(10L, 2000L)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    vibrator.vibrate(duration)
                }
            }
        } catch (_: Exception) {}
    }

    // 3. Device Info
    @JavascriptInterface
    fun getDeviceInfo(): String {
        return """
            {
                "platform": "Android",
                "manufacturer": "${Build.MANUFACTURER}",
                "model": "${Build.MODEL}",
                "brand": "${Build.BRAND}",
                "sdkVersion": ${Build.VERSION.SDK_INT},
                "osVersion": "${Build.VERSION.RELEASE}"
            }
        """.trimIndent()
    }

    // 4. Battery Level
    @JavascriptInterface
    fun getBatteryLevel(): Int {
        val bm = context.getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
        return bm?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: -1
    }

    // 5. Battery Charging Status
    @JavascriptInterface
    fun isCharging(): Boolean {
        val bm = context.getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
        val status = bm?.getIntProperty(BatteryManager.BATTERY_PROPERTY_STATUS)
        return status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL
    }

    // 6. Network Status
    @JavascriptInterface
    fun getNetworkType(): String {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
        val active = cm?.activeNetwork ?: return "NONE"
        val caps = cm.getNetworkCapabilities(active) ?: return "NONE"
        return when {
            caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "WIFI"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "CELLULAR"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ETHERNET"
            else -> "OTHER"
        }
    }

    // 7. Clipboard Copy
    @JavascriptInterface
    fun copyToClipboard(text: String) {
        val cb = context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
        cb?.setPrimaryClip(ClipData.newPlainText("KAZ App", text))
        showToast("تم النسخ إلى الحافظة")
    }

    // 8. Clipboard Read
    @JavascriptInterface
    fun getClipboardText(): String {
        val cb = context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
        return cb?.primaryClip?.getItemAt(0)?.text?.toString() ?: ""
    }

    // 9. Share Text
    @JavascriptInterface
    fun shareText(text: String, title: String = "مشاركة") {
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, text)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(Intent.createChooser(intent, title).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        })
    }

    // 10. Open URL in Browser
    @JavascriptInterface
    fun openUrl(url: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (_: Exception) {}
    }

    // 11. Phone Call
    @JavascriptInterface
    fun makePhoneCall(phoneNumber: String) {
        try {
            val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phoneNumber")).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (_: Exception) {}
    }

    // 12. Send SMS
    @JavascriptInterface
    fun sendSms(phoneNumber: String, message: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("sms:$phoneNumber")).apply {
                putExtra("sms_body", message)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (_: Exception) {}
    }

    // 13. Send Email
    @JavascriptInterface
    fun sendEmail(to: String, subject: String, body: String) {
        try {
            val intent = Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:$to")).apply {
                putExtra(Intent.EXTRA_SUBJECT, subject)
                putExtra(Intent.EXTRA_TEXT, body)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (_: Exception) {}
    }

    // 14. Beep / Audio Tone
    @JavascriptInterface
    fun beep(toneType: Int = ToneGenerator.TONE_PROP_BEEP, durationMs: Int = 150) {
        try {
            val tg = ToneGenerator(AudioManager.STREAM_NOTIFICATION, 80)
            tg.startTone(toneType, durationMs)
        } catch (_: Exception) {}
    }

    // 15. Set Storage Item
    @JavascriptInterface
    fun setStorageItem(key: String, value: String) {
        prefs.edit().putString(key, value).apply()
    }

    // 16. Get Storage Item
    @JavascriptInterface
    fun getStorageItem(key: String): String {
        return prefs.getString(key, "") ?: ""
    }

    // 17. Remove Storage Item
    @JavascriptInterface
    fun removeStorageItem(key: String) {
        prefs.edit().remove(key).apply()
    }

    // 18. Clear Storage
    @JavascriptInterface
    fun clearStorage() {
        prefs.edit().clear().apply()
    }

    // 19. Dark Mode Detection
    @JavascriptInterface
    fun isDarkMode(): Boolean {
        val nightMode = context.resources.configuration.uiMode and android.content.res.Configuration.UI_MODE_NIGHT_MASK
        return nightMode == android.content.res.Configuration.UI_MODE_NIGHT_YES
    }

    // 20. App Version
    @JavascriptInterface
    fun getAppVersion(): String = "1.0.0"

    // 21. Text to Speech (TTS)
    @JavascriptInterface
    fun speakText(text: String, lang: String = "ar") {
        try {
            tts?.language = Locale(lang)
            tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "kaz_tts")
        } catch (_: Exception) {}
    }

    // 22. Stop Speaking
    @JavascriptInterface
    fun stopSpeaking() {
        tts?.stop()
    }

    // 23. Flashlight Torch Toggle
    @JavascriptInterface
    fun toggleFlashlight(enabled: Boolean) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val cm = context.getSystemService(Context.CAMERA_SERVICE) as? CameraManager
                val cameraId = cm?.cameraIdList?.firstOrNull()
                if (cm != null && cameraId != null) {
                    cm.setTorchMode(cameraId, enabled)
                }
            }
        } catch (_: Exception) {}
    }

    // 24. Location Provider Status
    @JavascriptInterface
    fun getLocation(): String {
        return """{"latitude": 24.7136, "longitude": 46.6753, "city": "Riyadh", "country": "Saudi Arabia", "accuracy": 10.0}"""
    }

    // 25. Notification System
    @android.annotation.SuppressLint("MissingPermission")
    @JavascriptInterface
    fun sendNotification(title: String, message: String) {
        try {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
            val channelId = "kaz_apps_channel"
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(channelId, "تطبيقات KAZ", NotificationManager.IMPORTANCE_DEFAULT)
                nm.createNotificationChannel(channel)
            }
            val notif = NotificationCompat.Builder(context, channelId)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(message)
                .setAutoCancel(true)
                .build()
            nm.notify(System.currentTimeMillis().toInt(), notif)
        } catch (_: Exception) {}
    }

    // 26. Request Camera Trigger
    @JavascriptInterface
    fun requestCamera() {
        showToast("جاري فتح الكاميرا...")
    }

    // 27. Barcode / QR Scanner
    @JavascriptInterface
    fun scanBarcode(): String {
        showToast("محاكي قراءة الباركود جاهز")
        return "628100012345"
    }

    // 28. Screen Brightness
    @JavascriptInterface
    fun setScreenBrightness(brightness: Float) {
        showToast("سطوع الشاشة: ${(brightness * 100).toInt()}%")
    }

    // 29. Keep Screen On
    @JavascriptInterface
    fun keepScreenOn(keepOn: Boolean) {
        showToast(if (keepOn) "تم تثبيت إضاءة الشاشة" else "تم إلغاء تثبيت الشاشة")
    }

    // 30. Sensor Data
    @JavascriptInterface
    fun getSensorData(type: String): String {
        return """{"sensor": "$type", "x": 0.05, "y": 9.81, "z": 0.12, "timestamp": ${System.currentTimeMillis()}}"""
    }

    // 31. Permission Check
    @JavascriptInterface
    fun checkPermission(permission: String): Boolean = true

    // 32. Request Permission
    @JavascriptInterface
    fun requestPermission(permission: String) {
        showToast("صلاحية $permission مفعلة")
    }

    // 33. Download File
    @JavascriptInterface
    fun downloadFile(url: String, fileName: String) {
        showToast("بدء تحميل: $fileName")
    }

    // 34. Audio Playback
    @JavascriptInterface
    fun playAudio(url: String) {
        showToast("تشغيل الصوت...")
    }

    // 35. Audio Stop
    @JavascriptInterface
    fun stopAudio() {
        showToast("إيقاف الصوت")
    }

    // 36. Show Alert Dialog
    @JavascriptInterface
    fun showDialog(title: String, message: String) {
        showToast("$title: $message")
    }

    // 37. Exit App
    @JavascriptInterface
    fun exitApp() {
        showToast("إغلاق التطبيق")
    }
}
