import SwiftUI
import AVFoundation

/// Thin AVFoundation QR reader — the traditional AVCaptureMetadataOutput
/// pattern rather than VisionKit's DataScannerViewController, since the
/// latter needs its own iOS-version availability gate for no real benefit
/// here (a single QR type, no need for its multi-symbology live-highlight
/// UI).
final class QRScannerController: UIViewController {
    var onScan: ((String) -> Void)?

    private let session = AVCaptureSession()
    private var didScan = false

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black

        guard let device = AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: device),
              session.canAddInput(input) else { return }
        session.addInput(input)

        let output = AVCaptureMetadataOutput()
        guard session.canAddOutput(output) else { return }
        session.addOutput(output)
        output.setMetadataObjectsDelegate(self, queue: .main)
        output.metadataObjectTypes = [.qr]

        let preview = AVCaptureVideoPreviewLayer(session: session)
        preview.videoGravity = .resizeAspectFill
        preview.frame = view.bounds
        view.layer.addSublayer(preview)
        previewLayer = preview
    }

    private var previewLayer: AVCaptureVideoPreviewLayer?

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = view.bounds
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        didScan = false
        DispatchQueue.global(qos: .userInitiated).async { [session] in
            if !session.isRunning { session.startRunning() }
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        DispatchQueue.global(qos: .userInitiated).async { [session] in
            if session.isRunning { session.stopRunning() }
        }
    }
}

extension QRScannerController: AVCaptureMetadataOutputObjectsDelegate {
    func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject], from connection: AVCaptureConnection) {
        guard !didScan,
              let object = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
              object.type == .qr,
              let value = object.stringValue else { return }
        didScan = true
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
        onScan?(value)
    }
}

struct QRScannerRepresentable: UIViewControllerRepresentable {
    let onScan: (String) -> Void

    func makeUIViewController(context: Context) -> QRScannerController {
        let controller = QRScannerController()
        controller.onScan = onScan
        return controller
    }

    func updateUIViewController(_ uiViewController: QRScannerController, context: Context) {}
}

/// Full scan-to-order flow: camera permission → live scanner → resolve the
/// scanned menu_shares token (same token the web's own table-QR ordering
/// flow uses, see app/api/portal/scan/[token]/route.ts) → open that
/// restaurant's profile. A code for a restaurant the customer isn't a
/// member of yet still works — RestaurantDetailView already handles that
/// (browse-only, "become a customer to order").
struct ScanToOrderView: View {
    @EnvironmentObject var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss

    /// True when presented as a sheet/fullScreenCover (MenuView's toolbar
    /// shortcut) — false when this is the Scanner tab's own root, where
    /// there's nothing to dismiss to and a "Fermer" button would do nothing
    /// useful sitting above four other tabs.
    var showsCloseButton: Bool = true

    @State private var cameraAuthorized = false
    @State private var permissionDenied = false
    @State private var isResolving = false
    @State private var resolveError: String?
    @State private var resolvedRestaurant: (id: String, name: String, branding: NativeTenantBranding?)?

    var body: some View {
        NavigationStack {
            ZStack {
                if cameraAuthorized {
                    QRScannerRepresentable(onScan: handleScan)
                        .ignoresSafeArea()

                    LinearGradient(
                        colors: [.black.opacity(0.58), .clear, .black.opacity(0.7)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    .ignoresSafeArea()

                    VStack {
                        Text("Scannez pour découvrir le menu")
                            .font(MinervaFont.display(25, weight: .semibold))
                            .foregroundStyle(.white)
                            .multilineTextAlignment(.center)
                            .padding(.top, 30)
                        Text("Placez le code dans le cadre")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(.white.opacity(0.8))
                        Spacer(minLength: 24)
                        scanFrame
                        Spacer(minLength: 24)
                        instructions
                    }
                    .padding(.horizontal, 22)
                } else if permissionDenied {
                    deniedState
                } else {
                    Color.black.ignoresSafeArea()
                }

                if isResolving {
                    Color.black.opacity(0.5).ignoresSafeArea()
                    ProgressView().tint(.white)
                }
            }
            .navigationTitle("Scanner un code")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                if showsCloseButton {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Fermer") { dismiss() }
                            .tint(.white)
                    }
                }
            }
            .alert("Code invalide", isPresented: Binding(
                get: { resolveError != nil },
                set: { if !$0 { resolveError = nil } }
            )) {
                Button("OK", role: .cancel) { resolveError = nil }
            } message: {
                Text(resolveError ?? "")
            }
            .fullScreenCover(item: Binding(
                get: { resolvedRestaurant.map(RestaurantIdentifier.init) },
                set: { _ in resolvedRestaurant = nil }
            )) { identifier in
                NavigationStack {
                    RestaurantDetailView(restaurantId: identifier.id, previewName: identifier.name)
                }
                .tint(MinervaColor.emeraldDark)
            }
            .task { await requestCameraPermission() }
        }
    }

    private struct RestaurantIdentifier: Identifiable {
        let id: String
        let name: String
        let branding: NativeTenantBranding?
        init(_ tuple: (id: String, name: String, branding: NativeTenantBranding?)) {
            id = tuple.id
            name = tuple.name
            branding = tuple.branding
        }
    }

    private var scanFrame: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 30)
                .fill(.clear)
                .frame(width: min(UIScreen.main.bounds.width - 42, 340), height: min(UIScreen.main.bounds.width - 42, 340))
                .overlay(RoundedRectangle(cornerRadius: 30).stroke(.white.opacity(0.25), lineWidth: 1))
            Image(systemName: "viewfinder")
                .font(.system(size: min(UIScreen.main.bounds.width - 42, 340), weight: .ultraLight))
                .foregroundStyle(MinervaColor.limeAccent)
        }
    }

    private var instructions: some View {
        Text("Pointez la caméra vers le code affiché par le restaurant.")
            .font(.system(size: 13, weight: .medium))
            .foregroundStyle(.white)
            .padding(14)
            .background(.black.opacity(0.55))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .padding(.bottom, 40)
    }

    private var deniedState: some View {
        VStack(spacing: 16) {
            Image(systemName: "camera.fill")
                .font(.system(size: 36))
                .foregroundStyle(.white.opacity(0.6))
            Text("Accès à l'appareil photo refusé")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(.white)
            Text("Activez l'accès dans Réglages pour scanner un code de restaurant.")
                .font(.system(size: 12.5))
                .foregroundStyle(.white.opacity(0.7))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            Button("Ouvrir Réglages") {
                if let url = URL(string: UIApplication.openSettingsURLString) {
                    UIApplication.shared.open(url)
                }
            }
            .font(.system(size: 13.5, weight: .semibold))
            .padding(.horizontal, 20)
            .padding(.vertical, 10)
            .background(MinervaColor.surface)
            .foregroundStyle(.black)
            .clipShape(Capsule())
        }
        .padding(28)
    }

    private func requestCameraPermission() async {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            cameraAuthorized = true
        case .notDetermined:
            let granted = await AVCaptureDevice.requestAccess(for: .video)
            cameraAuthorized = granted
            permissionDenied = !granted
        default:
            permissionDenied = true
        }
    }

    private func handleScan(_ value: String) {
        // The QR encodes the full web share URL (https://.../m/<token>) —
        // extract just the token, the last path component, so this keeps
        // working even if the domain or locale prefix in that URL changes.
        let token = value.split(separator: "/").last.map(String.init) ?? value
        Task {
            isResolving = true
            let result = await supabase.resolveScanToken(token)
            isResolving = false
            switch result {
            case .success(let restaurant, let branding):
                if let branding {
                    supabase.activateTenantBranding(branding)
                } else {
                    await supabase.fetchTenantBranding(for: restaurant.id)
                }
                resolvedRestaurant = (restaurant.id, restaurant.name, branding)
            case .failure(let message):
                resolveError = message
            }
        }
    }
}
