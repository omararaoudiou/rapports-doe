package com.example.bouyguesrapport

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import android.telephony.*
import android.util.Base64
import android.webkit.*
import android.view.View
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import com.google.gson.Gson
import kotlinx.coroutines.*
import java.net.HttpURLConnection
import java.net.URL
import androidx.core.content.FileProvider
import java.io.File
import java.util.Locale

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var cameraPhotoUri: Uri? = null
    
    // Système moderne pour le résultat du sélecteur de fichiers
    private val fileChooserLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        val cb = filePathCallback ?: return@registerForActivityResult
        filePathCallback = null
        
        val uri = if (result.resultCode == RESULT_OK) {
            result.data?.data ?: cameraPhotoUri
        } else {
            null
        }
        
        cb.onReceiveValue(if (uri != null) arrayOf(uri) else null)
        cameraPhotoUri = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        setContentView(webView)

        // ── Edge-to-edge (sous les barres système) ──────
        WindowCompat.setDecorFitsSystemWindows(window, false)
        
        // Injection CSS des hauteurs système pour la PWA
        ViewCompat.setOnApplyWindowInsetsListener(webView) { _, insets ->
            val navBar = insets.getInsets(WindowInsetsCompat.Type.navigationBars())
            val status = insets.getInsets(WindowInsetsCompat.Type.statusBars())
            webView.post {
                webView.evaluateJavascript(
                    "document.documentElement.style.setProperty('--safe-bottom','${navBar.bottom}px');" +
                            "document.documentElement.style.setProperty('--status-bar','${status.top}px');" +
                            "document.documentElement.style.setProperty('--tab-height','${56 + navBar.bottom}px');",
                    null
                )
            }
            insets
        }

        // ── Paramètres WebView ──────────────────────────────────────────────────
        webView.settings.apply {
            @Suppress("SetJavaScriptEnabled")
            javaScriptEnabled    = true
            domStorageEnabled    = true
            allowFileAccess      = true
            allowContentAccess   = true
            loadWithOverviewMode = true
            useWideViewPort      = true
        }

        // ── Gestion de l'input type file (Photos/Galerie) ──
        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                wv: WebView,
                filePathCb: ValueCallback<Array<Uri>>,
                params: FileChooserParams
            ): Boolean {
                filePathCallback?.onReceiveValue(null)
                filePathCallback = filePathCb

                try {
                    val photoFile = File(cacheDir, "camera_${System.currentTimeMillis()}.jpg")
                    cameraPhotoUri = FileProvider.getUriForFile(
                        this@MainActivity,
                        "${packageName}.fileprovider",
                        photoFile
                    )
                } catch (e: Exception) {
                    cameraPhotoUri = null
                }

                val galleryIntent = Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "image/*"
                    addCategory(Intent.CATEGORY_OPENABLE)
                }

                val cameraIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
                    cameraPhotoUri?.let { putExtra(MediaStore.EXTRA_OUTPUT, it) }
                    addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
                }

                val chooser = Intent.createChooser(galleryIntent, "Source")
                chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(cameraIntent))
                fileChooserLauncher.launch(chooser)
                return true
            }
        }

        webView.webViewClient = WebViewClient()
        webView.addJavascriptInterface(AndroidBridge(), "AndroidBridge")
        webView.loadUrl("https://c-it.fr")
        checkPermissions()
    }

    private fun checkPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.READ_PHONE_STATE,
            Manifest.permission.INTERNET,
            Manifest.permission.CAMERA
        )
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.S_V2) {
            @Suppress("DEPRECATION")
            permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE)
        }
        val missing = permissions.filter {
            ActivityCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, missing.toTypedArray(), 101)
        }
    }

    // ── Envoi JSON asynchrone sécurisé via Base64 ──
    private fun sendToJS(data: Map<String, Any>) {
        val json    = Gson().toJson(data)
        val encoded = Base64.encodeToString(json.toByteArray(Charsets.UTF_8), Base64.NO_WRAP)
        runOnUiThread {
            webView.evaluateJavascript(
                "(function(){ try { var j=atob('$encoded'); window.onSignalReceived && window.onSignalReceived(j); } catch(e){} })()",
                null
            )
        }
    }

    // ── Bridge Android → JavaScript ───────────────────────────────────────────
    inner class AndroidBridge {

        @JavascriptInterface
        fun getLiveSignal() {
            // Lancement asynchrone pour ne pas bloquer l'UI
            CoroutineScope(Dispatchers.IO).launch {
                val data = collectRadioData()
                sendToJS(data)
            }
        }

        @JavascriptInterface
        fun startScan() = getLiveSignal()

        private fun collectRadioData(): MutableMap<String, Any> {
            val result = mutableMapOf<String, Any>("type" to "Inconnu")
            val tm = getSystemService(TELEPHONY_SERVICE) as TelephonyManager

            if (ActivityCompat.checkSelfPermission(
                    this@MainActivity, Manifest.permission.ACCESS_FINE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED) {
                
                // Accumulateurs de données pour éviter les pertes lors de la collecte
                val g4data = mutableMapOf<String, Any>()
                val g5data = mutableMapOf<String, Any>()
                
                tm.allCellInfo?.forEach { info ->
                    val tmp = mutableMapOf<String, Any>()
                    parseCellInfo(info, tmp)
                    val techType = tmp["type"]?.toString() ?: ""
                    
                    when {
                        techType.contains("5G") -> {
                            // On stocke les infos 5G (priorité aux cellules enregistrées)
                            if (g5data.isEmpty() || info.isRegistered) g5data.putAll(tmp)
                        }
                        techType.contains("4G") && info.isRegistered -> {
                            // On stocke les infos 4G enregistrées
                            g4data.putAll(tmp)
                        }
                    }
                }
                
                // Fusion des données sans écrasement destructif
                // 1. Données 4G explicites
                if (g4data.isNotEmpty()) {
                    g4data.forEach { (k, v) -> result["4g_$k"] = v }
                    result["rsrp4g"] = g4data["rsrp"] ?: ""
                    result["rsrq4g"] = g4data["rsrq"] ?: ""
                    result["band4g"] = g4data["band"] ?: ""
                }
                
                // 2. Données 5G explicites
                if (g5data.isNotEmpty()) {
                    g5data.forEach { (k, v) -> result["5g_$k"] = v }
                    result["rsrp5g"] = g5data["rsrp"] ?: ""
                    result["rsrq5g"] = g5data["rsrq"] ?: ""
                    result["snr5g"]  = g5data["snr"] ?: ""
                    result["band5g"] = g5data["band"] ?: ""
                }

                // 3. Détermination des valeurs "maîtres" pour l'affichage principal
                if (g5data.isNotEmpty()) {
                    result.putAll(g5data) // Priorité NR pour les clés rsrp, band, etc.
                    if (g4data.isNotEmpty()) result["type"] = "5G (NSA)"
                } else if (g4data.isNotEmpty()) {
                    result.putAll(g4data)
                }
                
                result["operator"] = result["operateur"] ?: operatorName()
            }

            // Diagnostic réseau (Ping)
            try {
                val start = System.currentTimeMillis()
                (URL("https://www.google.com").openConnection() as HttpURLConnection).apply {
                    connectTimeout = 1500
                    connect()
                    result["ping"] = (System.currentTimeMillis() - start).toString()
                    disconnect()
                }
            } catch (e: Exception) { result["ping"] = "0" }

            // Diagnostic réseau (Débit estimé)
            try {
                val cm   = getSystemService(CONNECTIVITY_SERVICE) as ConnectivityManager
                val caps = cm.getNetworkCapabilities(cm.activeNetwork)
                if (caps != null) {
                    val dl = caps.linkDownstreamBandwidthKbps
                    val ul = caps.linkUpstreamBandwidthKbps
                    if (dl > 0) result["dl"] = String.format(Locale.US, "%.1f", dl / 1000.0)
                    if (ul > 0) result["ul"] = String.format(Locale.US, "%.1f", ul / 1000.0)
                }
            } catch (e: Exception) {}

            return result
        }

        private fun parseCellInfo(info: CellInfo, result: MutableMap<String, Any>) {
            when {
                info is CellInfoLte -> {
                    val id  = info.cellIdentity
                    val sig = info.cellSignalStrength
                    result["type"]      = "4G (LTE)"
                    result["operateur"] = operatorName()
                    result["band"]      = get4GBand(id.earfcn)
                    result["rsrp"]      = sig.dbm.toString()
                    result["rsrq"]      = sig.rsrq.toString()
                    result["snr"]       = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) sig.rssnr.toString() else ""
                    result["lcid"]      = if (id.ci != Int.MAX_VALUE) id.ci.toString() else ""
                    result["enb"]       = if (id.ci != Int.MAX_VALUE) (id.ci / 256).toString() else ""
                }
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && info is CellInfoNr -> {
                    val id  = info.cellIdentity as CellIdentityNr
                    val sig = info.cellSignalStrength as CellSignalStrengthNr
                    result["type"]      = "5G (NR)"
                    result["operateur"] = operatorName()
                    result["band"]      = get5GBand(id.nrarfcn)
                    
                    val ssRsrp  = sig.ssRsrp
                    val ssRsrq  = sig.ssRsrq
                    val ssSinr  = try { sig.ssSinr } catch (e: Exception) { Int.MIN_VALUE }
                    // Fallback csiRsrp si ssRsrp invalide (Samsung NSA)
                    val csiRsrp = try { sig.csiRsrp } catch (e: Exception) { Int.MIN_VALUE }
                    val bestRsrp = when {
                        ssRsrp  in -156..-31 -> ssRsrp   // plage 5G 3GPP
                        csiRsrp in -140..-44 -> csiRsrp  // CSI fallback
                        else -> Int.MIN_VALUE
                    }
                    result["rsrp"] = if (bestRsrp != Int.MIN_VALUE) bestRsrp.toString() else ""
                    result["rsrq"] = if (ssRsrq in -43..0) ssRsrq.toString() else ""
                    result["snr"]  = if (ssSinr != Int.MIN_VALUE && ssSinr > -30) ssSinr.toString() else ""
                    result["lcid"] = if (id.nci != Long.MAX_VALUE) id.nci.toString() else ""
                    result["enb"]  = if (id.nci != Long.MAX_VALUE) (id.nci shr 14).toString() else ""
                }
            }
        }

        private fun operatorName(): String {
            val raw = try {
                (getSystemService(TELEPHONY_SERVICE) as TelephonyManager).networkOperatorName ?: ""
            } catch (e: Exception) { "" }
            return when {
                raw.lowercase().contains("bouygues") -> "Bouygues"
                raw.lowercase().contains("free")     -> "Free"
                raw.lowercase().contains("orange")   -> "Orange"
                raw.lowercase().contains("sfr")      -> "SFR"
                else -> raw
            }
        }

        private fun get4GBand(earfcn: Int): String = when (earfcn) {
            in 0..599       -> "B1 (2100MHz)"
            in 600..1199    -> "B3 (1800MHz)"
            in 1200..1949   -> "B7 (2600MHz)"
            in 2750..3449   -> "B8 (900MHz)"
            in 6150..6599   -> "B20 (800MHz)"
            in 9210..9359   -> "B28 (700MHz)"
            else            -> if (earfcn > 0) "B? ($earfcn)" else ""
        }

        private fun get5GBand(nrarfcn: Int): String = when (nrarfcn) {
            in 422000..434000 -> "n28 (700MHz)"
            in 627000..647000 -> "n78 (3500MHz)"
            in 151600..160600 -> "n1 (2100MHz)"
            in 361000..376000 -> "n3 (1800MHz)"
            else              -> if (nrarfcn > 0) "n? ($nrarfcn)" else ""
        }
    }
}
