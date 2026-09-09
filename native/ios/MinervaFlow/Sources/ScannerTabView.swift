import SwiftUI

/// The Scanner tab's real content, per explicit request: display-first,
/// not scan-first. A branded background behind the account's own
/// regenerating pairing QR + 6-digit code (moved here from MyCardView),
/// with the existing camera scan-to-browse capability (ScanToOrderView)
/// still reachable via the toolbar toggle — so nothing already shipped
/// regresses, it just isn't the tab's default face anymore.
struct ScannerTabView: View {
    @EnvironmentObject var supabase: SupabaseManager
    @State private var showCameraScan = false

    var body: some View {
        NavigationStack {
            ZStack {
                backgroundGradient

                ScrollView {
                    VStack(spacing: 24) {
                        Spacer(minLength: 20)

                        VStack(spacing: 4) {
                            Text(supabase.restaurantIdentityLabel)
                                .font(.system(size: 12.5, weight: .semibold))
                                .foregroundStyle(.white.opacity(0.85))
                            Text("Jumelage de compte")
                                .font(MinervaFont.display(22))
                                .foregroundStyle(.white)
                        }

                        pairingCodeCard

                        Text("Ce code identifie directement votre compte, sans avoir à scanner quoi que ce soit — le personnel l'entre dans son tableau de bord pour vous retrouver et enregistrer votre visite.")
                            .font(.system(size: 12))
                            .foregroundStyle(.white.opacity(0.75))
                            .multilineTextAlignment(.center)
                            .fixedSize(horizontal: false, vertical: true)
                            .padding(.horizontal, 32)

                        Spacer(minLength: 20)
                    }
                    .padding(.horizontal, 24)
                }
            }
            .navigationTitle("Scanner")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showCameraScan = true
                    } label: {
                        Image(systemName: "camera.viewfinder")
                    }
                    .tint(.white)
                    .accessibilityLabel("Scanner un code de restaurant")
                }
            }
            .task {
                if supabase.pairingCode == nil { await supabase.mintPairingCode() }
            }
            .fullScreenCover(isPresented: $showCameraScan) {
                ScanToOrderView(showsCloseButton: true)
            }
        }
    }

    private var backgroundGradient: some View {
        LinearGradient(
            colors: [MinervaColor.emerald, MinervaColor.emeraldDark],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
    }

    private var pairingCodeCard: some View {
        VStack(spacing: 14) {
            if let code = supabase.pairingCode {
                if let qrImage = QRCodeGenerator.image(for: URL(string: "https://minervaflow.app/pair/\(code)")!) {
                    Image(uiImage: qrImage)
                        .interpolation(.none)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 180, height: 180)
                        .padding(16)
                        .background(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 20))
                }

                Text(formattedCode(code))
                    .font(.system(size: 32, weight: .bold, design: .monospaced))
                    .tracking(5)
                    .foregroundStyle(.white)

                if let expiresAt = supabase.pairingCodeExpiresAt {
                    TimelineView(.periodic(from: .now, by: 1)) { context in
                        let remaining = Int(expiresAt.timeIntervalSince(context.date).rounded(.up))
                        if remaining > 0 {
                            Text("Valide encore \(remaining)s")
                                .font(.system(size: 12))
                                .foregroundStyle(.white.opacity(0.75))
                        } else {
                            Text("Code expiré — régénérez-en un.")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(.white)
                        }
                    }
                }
            } else if supabase.isMintingPairingCode {
                ProgressView().tint(.white).padding(.vertical, 40)
            } else {
                Text(supabase.pairingCodeError ?? "Code indisponible pour le moment.")
                    .font(.system(size: 12.5))
                    .foregroundStyle(.white.opacity(0.85))
                    .multilineTextAlignment(.center)
                    .padding(.vertical, 20)
            }

            Button {
                Task { await supabase.mintPairingCode() }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "arrow.clockwise")
                    Text("Régénérer")
                }
                .font(.system(size: 13, weight: .semibold))
                .padding(.horizontal, 18)
                .padding(.vertical, 9)
            }
            .foregroundStyle(MinervaColor.emeraldDark)
            .background(.white)
            .clipShape(Capsule())
            .buttonStyle(PressableButtonStyle())
            .disabled(supabase.isMintingPairingCode)
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .background(.white.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 28))
        .overlay(RoundedRectangle(cornerRadius: 28).stroke(.white.opacity(0.2), lineWidth: 1))
    }

    /// "123456" -> "123 456" for readability — purely cosmetic, the raw
    /// digits (not this spaced form) are what's actually transmitted/typed.
    private func formattedCode(_ code: String) -> String {
        guard code.count == 6 else { return code }
        let mid = code.index(code.startIndex, offsetBy: 3)
        return "\(code[..<mid]) \(code[mid...])"
    }
}
