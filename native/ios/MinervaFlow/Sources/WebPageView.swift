import SwiftUI
import WebKit

/// Thin WKWebView wrapper used for anything that should show the real web
/// app's own page rather than a native reimplementation — currently the
/// legal documents (Terms, Privacy), reusing app/[locale]/legal/* verbatim
/// so there is exactly one place those ever need editing.
struct WebPageView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> WKWebView {
        let view = WKWebView()
        view.load(URLRequest(url: url))
        return view
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
