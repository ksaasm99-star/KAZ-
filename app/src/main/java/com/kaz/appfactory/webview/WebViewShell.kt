package com.kaz.appfactory.webview

import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import com.kaz.appfactory.bridge.NativeBridgeRegistry

@SuppressLint("SetJavaScriptEnabled", "JavascriptInterface")
@Composable
fun WebViewShell(
    htmlContent: String,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val bridge: NativeBridgeRegistry = remember(context) { NativeBridgeRegistry(context) }

    AndroidView(
        factory = { ctx ->
            WebView(ctx).apply {
                setBackgroundColor(0)
                settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    databaseEnabled = true
                    allowFileAccess = true
                    loadWithOverviewMode = true
                    useWideViewPort = true
                    cacheMode = WebSettings.LOAD_NO_CACHE
                }

                webChromeClient = WebChromeClient()
                webViewClient = WebViewClient()

                addJavascriptInterface(bridge, "KazBridge")
                addJavascriptInterface(bridge, "AndroidBridge")

                // Ensure viewport meta tag exists if missing
                val formattedHtml = if (!htmlContent.contains("<meta name=\"viewport\"", ignoreCase = true)) {
                    val viewportTag = "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no\">\n"
                    if (htmlContent.contains("<head>", ignoreCase = true)) {
                        htmlContent.replace("<head>", "<head>\n$viewportTag", ignoreCase = true)
                    } else {
                        viewportTag + htmlContent
                    }
                } else {
                    htmlContent
                }

                loadDataWithBaseURL("https://kaz.local/", formattedHtml, "text/html", "UTF-8", null)
            }
        },
        update = { webView ->
            val formattedHtml = if (!htmlContent.contains("<meta name=\"viewport\"", ignoreCase = true)) {
                val viewportTag = "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no\">\n"
                if (htmlContent.contains("<head>", ignoreCase = true)) {
                    htmlContent.replace("<head>", "<head>\n$viewportTag", ignoreCase = true)
                } else {
                    viewportTag + htmlContent
                }
            } else {
                htmlContent
            }
            webView.loadDataWithBaseURL("https://kaz.local/", formattedHtml, "text/html", "UTF-8", null)
        },
        modifier = modifier.fillMaxSize()
    )
}

class KazJavaScriptBridge(private val context: Context) {

    @JavascriptInterface
    fun showToast(message: String) {
        Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
    }

    @JavascriptInterface
    fun vibrate(milliseconds: Long) {
        try {
            val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            if (vibrator != null && vibrator.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(milliseconds.coerceIn(10, 1000), VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    vibrator.vibrate(milliseconds.coerceIn(10, 1000))
                }
            }
        } catch (_: Exception) {}
    }

    @JavascriptInterface
    fun getDeviceInfo(): String {
        return """{"platform":"Android","manufacturer":"${Build.MANUFACTURER}","model":"${Build.MODEL}","sdk":${Build.VERSION.SDK_INT}}"""
    }
}
