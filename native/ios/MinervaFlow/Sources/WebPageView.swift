import SwiftUI
import WebKit

/// Thin WKWebView wrapper used for anything that should show the real web
/// app's own page rather than a native reimplementation — currently the
/// legal documents (Terms, Privacy), reusing app/[locale]/legal/* verbatim
/// so there is exactly one place those ever need editing.
///
/// A bare WKWebView shows nothing at all when a load fails (DNS, timeout,
/// a bad host) — indistinguishable, to whoever's looking at it, from "this
/// page doesn't exist." That ambiguity is exactly what caused real
/// confusion over whether the legal pages had ever been written, so this
/// now surfaces load state explicitly: a spinner while loading, a real
/// error with a retry action if it fails, never a silent blank screen.
struct WebPageView: View {
    let url: URL
    @State private var isLoading = true
    @State private var loadError: String?
    @State private var reloadToken = UUID()

    var body: some View {
        ZStack {
            WebPageRepresentable(url: url, reloadToken: reloadToken, isLoading: $isLoading, loadError: $loadError)

            if isLoading && loadError == nil {
                ProgressView()
            }

            if let errorMessage = loadError {
                VStack(spacing: 12) {
                    Image(systemName: "wifi.exclamationmark")
                        .font(.system(size: 28))
                        .foregroundStyle(MinervaColor.inkFaint)
                    Text("Impossible de charger cette page")
                        .font(.system(size: 13.5, weight: .semibold))
                        .foregroundStyle(MinervaColor.ink)
                    Text(errorMessage)
                        .font(.system(size: 11.5))
                        .foregroundStyle(MinervaColor.inkSoft)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                        .fixedSize(horizontal: false, vertical: true)
                    Button {
                        loadError = nil
                        isLoading = true
                        reloadToken = UUID()
                    } label: {
                        Text("Réessayer")
                            .font(.system(size: 13, weight: .semibold))
                            .padding(.horizontal, 18)
                            .padding(.vertical, 9)
                    }
                    .foregroundStyle(.white)
                    .background(MinervaColor.emerald)
                    .clipShape(Capsule())
                }
                .padding(24)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(MinervaColor.cream)
            }
        }
    }
}

private struct WebPageRepresentable: UIViewRepresentable {
    let url: URL
    let reloadToken: UUID
    @Binding var isLoading: Bool
    @Binding var loadError: String?

    func makeCoordinator() -> Coordinator {
        Coordinator(isLoading: $isLoading, loadError: $loadError, reloadToken: reloadToken)
    }

    func makeUIView(context: Context) -> WKWebView {
        let view = WKWebView()
        view.navigationDelegate = context.coordinator
        view.load(URLRequest(url: url, timeoutInterval: 15))
        return view
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        guard context.coordinator.lastReloadToken != reloadToken else { return }
        context.coordinator.lastReloadToken = reloadToken
        uiView.load(URLRequest(url: url, timeoutInterval: 15))
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        let isLoading: Binding<Bool>
        let loadError: Binding<String?>
        var lastReloadToken: UUID

        init(isLoading: Binding<Bool>, loadError: Binding<String?>, reloadToken: UUID) {
            self.isLoading = isLoading
            self.loadError = loadError
            self.lastReloadToken = reloadToken
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            isLoading.wrappedValue = true
            loadError.wrappedValue = nil
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            isLoading.wrappedValue = false
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            isLoading.wrappedValue = false
            loadError.wrappedValue = (error as NSError).localizedDescription
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            isLoading.wrappedValue = false
            loadError.wrappedValue = (error as NSError).localizedDescription
        }
    }
}
