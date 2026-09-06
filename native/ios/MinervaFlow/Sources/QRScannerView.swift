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

    @State private var cameraAuthorized = false
    @State private var permissionDenied = false
    @State private var isResolving = false
    @State private var resolveError: String?
    @State private var resolvedRestaurant: (id: String, name: String)?

    var body: some View {
        NavigationStack {
            ZStack {
                if cameraAuthorized {
                    QRScannerRepresentable(onScan: handleScan)
                        .ignoresSafeArea()

                    VStack {
                        Spacer()
                        scanFrame
                        Spacer()
                        instructions
                    }
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
                ToolbarItem(placement: .cancellationAction) {
                    Button("Fermer") { dismiss() }
                        .tint(.white)
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
            }
            .task { await requestCameraPermission() }
        }
    }

    private struct RestaurantIdentifier: Identifiable {
        let id: String
        let name: String
        init(_ tuple: (id: String, name: String)) { id = tuple.id; name = tuple.name }
    }

    private var scanFrame: some View {
        RoundedRectangle(cornerRadius: 24)
            .stroke(.white, lineWidth: 3)
            .frame(width: 240, height: 240)
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
            .background(.white)
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
            case .success(let restaurant):
                resolvedRestaurant = restaurant
            case .failure(let message):
                resolveError = message
            }
        }
    }
}
