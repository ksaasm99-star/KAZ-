package com.kaz.appfactory.ui.components

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kaz.appfactory.data.model.CodeSnippet
import com.kaz.appfactory.ui.theme.CyanNeon
import com.kaz.appfactory.ui.theme.IndigoRoyal
import com.kaz.appfactory.ui.theme.TealAccent
import com.kaz.appfactory.util.CodeExporter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExportBottomSheet(
    projectName: String,
    codeContent: String,
    snippets: List<CodeSnippet>,
    onPushToGitHub: (() -> Unit)? = null,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = MaterialTheme.colorScheme.surface,
        dragHandle = { BottomSheetDefaults.DragHandle() },
        modifier = Modifier.testTag("export_bottom_sheet")
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(42.dp)
                        .clip(CircleShape)
                        .background(CyanNeon.copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.FolderZip,
                        contentDescription = null,
                        tint = CyanNeon,
                        modifier = Modifier.size(24.dp)
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = "تصدير ومشاركة المشروع",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = projectName,
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))

            // Option 0: Push to GitHub
            if (onPushToGitHub != null) {
                ExportOptionCard(
                    icon = Icons.Default.CloudUpload,
                    iconTint = CyanNeon,
                    title = "رفع المشروع إلى GitHub (Push to GitHub)",
                    description = "إنشاء مستودع مباشر على حسابك ورفع كافة الأكواد وREADME بدون تحميل يدوي",
                    tag = "GitHub 🚀",
                    onClick = {
                        onDismiss()
                        onPushToGitHub()
                    }
                )
            }

            // Option 1: Save Zip to Device Storage
            ExportOptionCard(
                icon = Icons.Default.SaveAlt,
                iconTint = CyanNeon,
                title = "حفظ في وحدة تخزين الجهاز (.zip)",
                description = "حفظ ملف المشروع المضغوط مباشرة في مجلد التنزيلات (Downloads) بجهازك",
                tag = "حفظ محلي",
                onClick = {
                    onDismiss()
                    CodeExporter.saveZipToDeviceStorage(
                        context = context,
                        projectName = projectName,
                        snippets = snippets,
                        rawCode = codeContent
                    )
                }
            )

            // Option 2: Share via WhatsApp
            ExportOptionCard(
                icon = Icons.Default.Chat,
                iconTint = Color(0xFF25D366),
                title = "مشاركة عبر واتساب (WhatsApp)",
                description = "إرسال ملف المشروع المضغوط .zip مباشرة إلى محادثات وجهات اتصال واتساب",
                tag = "واتساب",
                onClick = {
                    onDismiss()
                    CodeExporter.shareZipViaWhatsApp(
                        context = context,
                        projectName = projectName,
                        snippets = snippets,
                        rawCode = codeContent
                    )
                }
            )

            // Option 3: Share via Email
            ExportOptionCard(
                icon = Icons.Default.Email,
                iconTint = Color(0xFFEA4335),
                title = "مشاركة عبر البريد الإلكتروني (Email)",
                description = "إرسال ملف ZIP كمرفق بريدي مع نص توضيحي وتعليمات التشغيل",
                tag = "إيميل",
                onClick = {
                    onDismiss()
                    CodeExporter.shareZipViaEmail(
                        context = context,
                        projectName = projectName,
                        snippets = snippets,
                        rawCode = codeContent
                    )
                }
            )

            // Option 4: Export as Zip Archive (System Chooser)
            ExportOptionCard(
                icon = Icons.Default.Share,
                iconTint = TealAccent,
                title = "مشاركة عامة لملف ZIP",
                description = "فتح قائمة المشاركة لاختيار أي تطبيق آخر (Drive, Telegram, Slack...)",
                tag = ".zip",
                onClick = {
                    onDismiss()
                    CodeExporter.exportAsZipArchive(
                        context = context,
                        projectName = projectName,
                        snippets = snippets,
                        rawCode = codeContent
                    )
                }
            )

            // Option 5: Export as Kotlin .kt File
            ExportOptionCard(
                icon = Icons.Default.Description,
                iconTint = IndigoRoyal,
                title = "تصدير كملف Kotlin (.kt)",
                description = "حفظ ومشاركة الكود كملف برمجي مستقل جاهز للتشغيل مباشرة في Android Studio",
                tag = ".kt",
                onClick = {
                    onDismiss()
                    CodeExporter.exportAsKotlinFile(
                        context = context,
                        fileName = projectName,
                        code = codeContent
                    )
                }
            )

            // Option 6: Copy Code to Clipboard
            ExportOptionCard(
                icon = Icons.Default.ContentCopy,
                iconTint = Color.White,
                title = "نسخ الكود إلى الحافظة",
                description = "نسخ النص البرمجي الكامل للصقه السريع في محرر الأكواد",
                tag = "نسخ",
                onClick = {
                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                    val clip = ClipData.newPlainText("KAZ App Code", codeContent)
                    clipboard.setPrimaryClip(clip)
                    Toast.makeText(context, "تم نسخ الكود بنجاح!", Toast.LENGTH_SHORT).show()
                    onDismiss()
                }
            )
        }
    }
}

@Composable
fun ExportOptionCard(
    icon: ImageVector,
    iconTint: Color,
    title: String,
    description: String,
    tag: String,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f), RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(iconTint.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = iconTint,
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.6f)
                    ) {
                        Text(
                            text = tag,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(3.dp))
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    lineHeight = 16.sp
                )
            }
        }
    }
}
