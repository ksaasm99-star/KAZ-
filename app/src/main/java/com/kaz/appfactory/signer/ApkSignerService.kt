package com.kaz.appfactory.signer

import android.content.Context
import com.android.apksig.ApkSigner
import java.io.ByteArrayInputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.math.BigInteger
import java.security.*
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate
import java.util.*

object ApkSignerService {

    private const val KEYSTORE_FILE = "kaz_release.p12"
    private const val ALIAS = "kaz_app_key"
    private val PASSWORD = "kaz_signing_password_2026".toCharArray()

    /**
     * Signs the unsigned APK using Google's official apksig library (com.android.apksig).
     * Produces APK with v1 (JAR), v2, and v3 signatures compliant with modern Android.
     */
    fun signApk(context: Context, unsignedApk: File, signedApk: File): Boolean {
        return try {
            val keyStore = getOrCreateKeyStore(context)
            val privateKey = keyStore.getKey(ALIAS, PASSWORD) as PrivateKey
            val cert = keyStore.getCertificate(ALIAS) as X509Certificate

            val signerConfig = ApkSigner.SignerConfig.Builder(
                "KAZ_KEY",
                privateKey,
                listOf(cert)
            ).build()

            val apkSigner = ApkSigner.Builder(listOf(signerConfig))
                .setInputApk(unsignedApk)
                .setOutputApk(signedApk)
                .setV1SigningEnabled(true)
                .setV2SigningEnabled(true)
                .setV3SigningEnabled(true)
                .build()

            apkSigner.sign()
            signedApk.exists() && signedApk.length() > 0
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    private fun getOrCreateKeyStore(context: Context): KeyStore {
        val ksFile = File(context.filesDir, KEYSTORE_FILE)
        val keyStore = KeyStore.getInstance("PKCS12")

        if (ksFile.exists()) {
            FileInputStream(ksFile).use { fis ->
                keyStore.load(fis, PASSWORD)
            }
        } else {
            keyStore.load(null, null)
            val keyPairGen = KeyPairGenerator.getInstance("RSA")
            keyPairGen.initialize(2048)
            val keyPair = keyPairGen.generateKeyPair()

            val cert = generateCertificate(keyPair)
            keyStore.setKeyEntry(ALIAS, keyPair.private, PASSWORD, arrayOf(cert))

            FileOutputStream(ksFile).use { fos ->
                keyStore.store(fos, PASSWORD)
            }
        }
        return keyStore
    }

    private fun generateCertificate(keyPair: KeyPair): X509Certificate {
        // Build self-signed X.509 v3 certificate
        return SelfSignedCertHelper.create(keyPair)
    }

    private object SelfSignedCertHelper {
        fun create(keyPair: KeyPair): X509Certificate {
            // Encode minimal X509 certificate DER bytes
            val certDer = generateMinimalCertDer(keyPair)
            val cf = CertificateFactory.getInstance("X.509")
            return cf.generateCertificate(ByteArrayInputStream(certDer)) as X509Certificate
        }

        private fun generateMinimalCertDer(keyPair: KeyPair): ByteArray {
            val now = System.currentTimeMillis()
            val notBefore = Date(now - 86400000L) // yesterday
            val notAfter = Date(now + 315360000000L) // 10 years

            // Create TBSCertificate
            val serial = BigInteger.valueOf(Math.abs(Random().nextLong()))
            val sigAlgOid = "1.2.840.113549.1.1.11" // SHA256withRSA

            val tbsBytes = buildTbsCertificate(serial, keyPair.public, notBefore, notAfter)

            val signer = Signature.getInstance("SHA256withRSA")
            signer.initSign(keyPair.private)
            signer.update(tbsBytes)
            val sigBytes = signer.sign()

            // Outer SEQUENCE: TBSCertificate, AlgorithmIdentifier, BitString(Signature)
            val algId = byteArrayOf(
                0x30, 0x0D,
                0x06, 0x09, 0x2A, 0x86.toByte(), 0x48, 0x86.toByte(), 0xF7.toByte(), 0x0D, 0x01, 0x01, 0x0B,
                0x05, 0x00
            )

            val bitStringSig = ByteArray(sigBytes.size + 1).apply {
                this[0] = 0x00 // no unused bits
                System.arraycopy(sigBytes, 0, this, 1, sigBytes.size)
            }

            return encodeDerSequence(listOf(tbsBytes, algId, encodeDer(0x03, bitStringSig)))
        }

        private fun buildTbsCertificate(serial: BigInteger, pubKey: PublicKey, notBefore: Date, notAfter: Date): ByteArray {
            val version = byteArrayOf(0xA0.toByte(), 0x03, 0x02, 0x01, 0x02) // v3
            val serialDer = encodeDer(0x02, serial.toByteArray())
            val sigAlg = byteArrayOf(
                0x30, 0x0D,
                0x06, 0x09, 0x2A, 0x86.toByte(), 0x48, 0x86.toByte(), 0xF7.toByte(), 0x0D, 0x01, 0x01, 0x0B,
                0x05, 0x00
            )

            // Issuer & Subject: CN=KAZ App Factory
            val nameBytes = byteArrayOf(
                0x30, 0x1B, 0x31, 0x19, 0x30, 0x17, 0x06, 0x03, 0x55, 0x04, 0x03,
                0x0C, 0x10, 'K'.code.toByte(), 'A'.code.toByte(), 'Z'.code.toByte(), ' '.code.toByte(),
                'A'.code.toByte(), 'p'.code.toByte(), 'p'.code.toByte(), ' '.code.toByte(),
                'F'.code.toByte(), 'a'.code.toByte(), 'c'.code.toByte(), 't'.code.toByte(),
                'o'.code.toByte(), 'r'.code.toByte(), 'y'.code.toByte(), '!'.code.toByte()
            )

            // Validity
            val validity = buildValidity(notBefore, notAfter)

            val pubKeyDer = pubKey.encoded

            return encodeDerSequence(listOf(version, serialDer, sigAlg, nameBytes, validity, nameBytes, pubKeyDer))
        }

        private fun buildValidity(notBefore: Date, notAfter: Date): ByteArray {
            val format = java.text.SimpleDateFormat("yyMMddHHmmss'Z'", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }
            val b1 = format.format(notBefore).toByteArray(Charsets.US_ASCII)
            val b2 = format.format(notAfter).toByteArray(Charsets.US_ASCII)
            return encodeDerSequence(listOf(encodeDer(0x17, b1), encodeDer(0x17, b2)))
        }

        private fun encodeDer(tag: Int, bytes: ByteArray): ByteArray {
            val lenBytes = encodeDerLength(bytes.size)
            val result = ByteArray(1 + lenBytes.size + bytes.size)
            result[0] = tag.toByte()
            System.arraycopy(lenBytes, 0, result, 1, lenBytes.size)
            System.arraycopy(bytes, 0, result, 1 + lenBytes.size, bytes.size)
            return result
        }

        private fun encodeDerSequence(parts: List<ByteArray>): ByteArray {
            val totalLen = parts.sumOf { it.size }
            val lenBytes = encodeDerLength(totalLen)
            val result = ByteArray(1 + lenBytes.size + totalLen)
            result[0] = 0x30 // SEQUENCE
            System.arraycopy(lenBytes, 0, result, 1, lenBytes.size)
            var offset = 1 + lenBytes.size
            for (p in parts) {
                System.arraycopy(p, 0, result, offset, p.size)
                offset += p.size
            }
            return result
        }

        private fun encodeDerLength(len: Int): ByteArray {
            return when {
                len < 128 -> byteArrayOf(len.toByte())
                len < 256 -> byteArrayOf(0x81.toByte(), len.toByte())
                else -> byteArrayOf(0x82.toByte(), (len shr 8).toByte(), (len and 0xFF).toByte())
            }
        }
    }
}
