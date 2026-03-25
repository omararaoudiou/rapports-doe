
import WebKit
import UIKit

final class NativeBridge: NSObject, WKScriptMessageHandler {
    weak var webView: WKWebView?

    init(webView: WKWebView) {
        self.webView = webView
        super.init()
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        // Stub iOS bridge:
        // - getLiveSignal
        // - ocrText
        // - pickPhoto
        // - exportFile
        // À compléter dans le projet iOS.
    }
}
