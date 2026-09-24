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
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("VOTRE COMPTE")
                            .font(.system(size: 11, weight: .bold))
                            .tracking(1.2)
                            .foregroundStyle(MinervaColor.emeraldDark)
                        Text("Présentez votre code")
                            .font(MinervaFont.display(28, weight: .semibold))
                            .foregroundStyle(MinervaColor.ink)
                        Text("Le personnel peut l’utiliser pour retrouver votre compte et enregistrer votre visite.")
                            .font(.system(size: 15))
                            .foregroundStyle(MinervaColor.inkSoft)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    pairingCodeCard

                    Button {
                        showCameraScan = true
                    } label: {
                        Label("Scanner le code d’un restaurant", systemImage: "camera.viewfinder")
                            .font(.system(size: 15, weight: .semibold))
                            .frame(maxWidth: .infinity, minHeight: 48)
                    }
                    .buttonStyle(.bordered)
                    .tint(MinervaColor.emeraldDark)
                }
                .padding(.horizontal, 20)
                .padding(.top, 24)
                .padding(.bottom, 32)
                .frame(maxWidth: 560)
                .frame(maxWidth: .infinity, alignment: .top)
            }
            .background(MinervaColor.cream.ignoresSafeArea())
            .navigationTitle("Scanner")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showCameraScan = true
                    } label: {
                        Image(systemName: "camera.viewfinder")
                    }
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

    private var pairingCodeCard: some View {
        VStack(spacing: 18) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Carte de fidélité")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.8))
                    Text(supabase.restaurantIdentityLabel)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(.white)
                }
                Spacer()
                Image(systemName: "qrcode")
                    .font(.system(size: 20, weight: .medium))
                    .foregroundStyle(.white.opacity(0.9))
                    .accessibilityHidden(true)
            }

            if let code = supabase.pairingCode {
                if let qrImage = QRCodeGenerator.image(for: URL(string: "https://minervaflow.app/pair/\(code)")!) {
                    Image(uiImage: qrImage)
                        .interpolation(.none)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 208, height: 208)
                        .padding(12)
                        .background(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .frame(maxWidth: .infinity)
                        .accessibilityLabel("Code QR temporaire de votre compte")
                }

                VStack(spacing: 6) {
                    Text(formattedCode(code))
                        .font(.system(size: 32, weight: .bold, design: .monospaced))
                        .tracking(4)
                        .foregroundStyle(.white)
                        .accessibilityLabel("Code \(code)")
                    expiryLabel
                }
            } else if supabase.isMintingPairingCode {
                VStack(spacing: 12) {
                    ProgressView().tint(.white)
                    Text("Préparation de votre code…")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(.white.opacity(0.9))
                }
                .frame(maxWidth: .infinity, minHeight: 250)
            } else {
                ContentUnavailableView {
                    Label("Code indisponible", systemImage: "qrcode")
                } description: {
                    Text(supabase.pairingCodeError ?? "Réessayez dans un instant.")
                } actions: {
                    Button("Réessayer") { Task { await supabase.mintPairingCode() } }
                        .buttonStyle(.borderedProminent)
                }
                .tint(MinervaColor.emeraldDark)
                .frame(maxWidth: .infinity, minHeight: 230)
                .background(MinervaColor.surface)
                .clipShape(RoundedRectangle(cornerRadius: 18))
            }

            Button {
                Task { await supabase.mintPairingCode() }
            } label: {
                Label("Renouveler le code", systemImage: "arrow.clockwise")
                    .font(.system(size: 14, weight: .semibold))
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
            .buttonStyle(.bordered)
            .tint(.white)
            .disabled(supabase.isMintingPairingCode)
        }
        .padding(20)
        .frame(maxWidth: .infinity)
        .background(MinervaColor.emeraldDark)
        .clipShape(RoundedRectangle(cornerRadius: 24))
        .accessibilityElement(children: .contain)
    }

    @ViewBuilder
    private var expiryLabel: some View {
        if let expiresAt = supabase.pairingCodeExpiresAt {
            TimelineView(.periodic(from: .now, by: 1)) { context in
                let remaining = Int(expiresAt.timeIntervalSince(context.date).rounded(.up))
                HStack(spacing: 6) {
                    Image(systemName: remaining > 0 ? "clock" : "exclamationmark.triangle")
                        .accessibilityHidden(true)
                    Text(remaining > 0 ? "Valide encore \(remaining) s" : "Code expiré — renouvelez-le")
                }
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(.white.opacity(0.85))
                .accessibilityElement(children: .combine)
            }
        }
    }

    /// "123456" -> "123 456" for readability — purely cosmetic, the raw
    /// digits (not this spaced form) are what's actually transmitted/typed.
    private func formattedCode(_ code: String) -> String {
        guard code.count == 6 else { return code }
        let mid = code.index(code.startIndex, offsetBy: 3)
        return "\(code[..<mid]) \(code[mid...])"
    }
}
