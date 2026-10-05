import SwiftUI
import PassKit

/// The account-level view for customers who belong to more than one
/// restaurant. Each card is deliberately independent: points and visits are
/// never merged across establishments.
struct MembershipCardsView: View {
    /// True when pushed inside another NavigationStack (Compte): skip our own.
    var embedded = false
    @EnvironmentObject private var supabase: SupabaseManager
    @State private var selectedRestaurantID: String?

    @ViewBuilder
    private func container<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        if embedded { content() } else { NavigationStack { content() } }
    }

    var body: some View {
        container {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    header
                    if supabase.allMemberships.isEmpty {
                        emptyState
                    } else {
                        if supabase.allMemberships.count > 1 {
                            Picker("Carte active", selection: $selectedRestaurantID) {
                                ForEach(supabase.allMemberships) { membership in
                                    Text(membership.restaurantName).tag(Optional(membership.restaurantId))
                                }
                            }
                            .pickerStyle(.menu)
                            .tint(MinervaColor.emeraldDark)
                        }

                        if let selected = selectedMembership {
                            membershipCard(selected, emphasized: true)
                            AddToAppleWalletButton(customerId: selected.customerId)
                        }

                        if supabase.allMemberships.count > 1 {
                            Text("Toutes vos cartes")
                                .font(.mv(size: 13, weight: .semibold))
                                .foregroundStyle(MinervaColor.ink)
                            ForEach(supabase.allMemberships.filter { $0.restaurantId != selectedMembership?.restaurantId }) { membership in
                                membershipCard(membership, emphasized: false)
                            }
                        }
                    }
                }
                .padding(18)
            }
            .background(MinervaColor.cream.ignoresSafeArea())
            .navigationTitle("Mes cartes")
            .navigationBarTitleDisplayMode(.inline)
            .refreshable { await supabase.loadPortalData() }
        }
        .onAppear { selectDefaultMembershipIfNeeded() }
        .onChange(of: supabase.allMemberships.count) { _, _ in selectDefaultMembershipIfNeeded() }
    }

    private var selectedMembership: RestaurantMembership? {
        guard let selectedRestaurantID else { return supabase.allMemberships.first }
        return supabase.allMemberships.first { $0.restaurantId == selectedRestaurantID } ?? supabase.allMemberships.first
    }

    private func selectDefaultMembershipIfNeeded() {
        guard selectedRestaurantID == nil || !supabase.allMemberships.contains(where: { $0.restaurantId == selectedRestaurantID }) else { return }
        selectedRestaurantID = supabase.allMemberships.first?.restaurantId
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Une carte par établissement")
                .font(MinervaFont.display(24))
                .foregroundStyle(MinervaColor.ink)
            Text("Vos points, visites et récompenses restent séparés pour chaque restaurant ou café.")
                .font(.mv(size: 13))
                .foregroundStyle(MinervaColor.inkSoft)
        }
    }

    private func membershipCard(_ membership: RestaurantMembership, emphasized: Bool) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 10) {
                Image(systemName: "storefront.fill")
                    .font(.mv(size: 15, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 36, height: 36)
                    .background(MinervaColor.emerald)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                VStack(alignment: .leading, spacing: 2) {
                    Text(membership.restaurantName)
                        .font(.mv(size: 15, weight: .semibold))
                        .foregroundStyle(MinervaColor.ink)
                    Text("Carte fidélité active")
                        .font(.mv(size: 12))
                        .foregroundStyle(MinervaColor.inkFaint)
                }
                Spacer()
                Text("\(membership.loyaltyPoints) pts")
                    .font(.mv(size: 16, weight: .bold, design: .rounded))
                    .foregroundStyle(MinervaColor.emeraldDark)
            }
            HStack(spacing: 0) {
                metric(value: "\(membership.visitCount)", label: "visites")
                Divider().frame(height: 28)
                metric(value: currencyString(membership.totalSpent), label: "dépensés")
            }
        }
        .padding(emphasized ? 18 : 16)
        .background(MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: emphasized ? 20 : 18))
        .overlay(RoundedRectangle(cornerRadius: emphasized ? 20 : 18).stroke(emphasized ? MinervaColor.emerald.opacity(0.45) : MinervaColor.border, lineWidth: emphasized ? 1.5 : 1))
        .shadow(color: emphasized ? MinervaColor.emerald.opacity(0.10) : .clear, radius: 12, y: 5)
    }

    private func metric(value: String, label: String) -> some View {
        VStack(spacing: 3) {
            Text(value).font(.mv(size: 14, weight: .semibold)).foregroundStyle(MinervaColor.ink)
            Text(label).font(.mv(size: 12)).foregroundStyle(MinervaColor.inkFaint)
        }
        .frame(maxWidth: .infinity)
    }

    private func currencyString(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "CAD"
        formatter.locale = Locale(identifier: "fr_CA")
        return formatter.string(from: NSNumber(value: value)) ?? "0,00 $"
    }

    private var emptyState: some View {
        VStack(spacing: 10) {
            Image(systemName: "creditcard")
                .font(.mv(size: 30))
                .foregroundStyle(MinervaColor.emeraldDark)
            Text("Aucune carte pour le moment")
                .font(.mv(size: 15, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)
            Text("Rejoignez un restaurant depuis la découverte pour commencer à accumuler des points.")
                .font(.mv(size: 12.5))
                .multilineTextAlignment(.center)
                .foregroundStyle(MinervaColor.inkSoft)
        }
        .frame(maxWidth: .infinity)
        .padding(28)
        .background(MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: 18))
    }
}

struct WalletPassSheet: UIViewControllerRepresentable {
    let pass: PKPass

    func makeUIViewController(context: Context) -> UIViewController {
        // nil when this device cannot add passes: show nothing instead of crashing.
        PKAddPassesViewController(pass: pass) ?? UIViewController()
    }

    func updateUIViewController(_ controller: UIViewController, context: Context) {}
}


/// One obvious action: put this loyalty card into Apple Wallet. Shared by "Mes cartes" and "Ma carte".
/// Each outcome has its own plain message instead of one generic failure.
struct AddToAppleWalletButton: View {
    @EnvironmentObject private var supabase: SupabaseManager
    let customerId: String
    @State private var pass: PKPass?
    @State private var isAdding = false
    @State private var message: String?

    var body: some View {
        VStack(spacing: 6) {
            Button {
                guard !isAdding else { return }
                isAdding = true
                message = nil
                Task {
                    defer { isAdding = false }
                    switch await supabase.downloadAppleWalletPass(customerId: customerId) {
                    case .pass(let data):
                        if let built = try? PKPass(data: data), PKPassLibrary.isPassLibraryAvailable() {
                            pass = built
                        } else {
                            message = "Cette carte n’a pas pu être ajoutée à Wallet. Réessayez dans un instant."
                        }
                    case .notAvailable:
                        message = "L’ajout à Wallet sera bientôt disponible. En attendant, donnez votre numéro de téléphone à la caisse."
                    case .signedOut:
                        message = "Votre session a expiré. Reconnectez-vous puis réessayez."
                    case .failure:
                        message = "Impossible de préparer la carte. Vérifiez votre connexion et réessayez."
                    }
                }
            } label: {
                HStack(spacing: 8) {
                    if isAdding { ProgressView().tint(.white) }
                    Image(systemName: "wallet.pass.fill")
                    Text(isAdding ? "Préparation…" : "Ajouter à Apple Wallet")
                }
                .font(.mv(size: 14, weight: .semibold))
                .frame(maxWidth: .infinity, minHeight: 48)
            }
            .foregroundStyle(.white)
            .background(MinervaColor.ink)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .buttonStyle(PressableButtonStyle())
            .disabled(isAdding)

            if let message {
                Text(message)
                    .font(.mv(size: 12))
                    .foregroundStyle(MinervaColor.inkSoft)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .sheet(isPresented: Binding(get: { pass != nil }, set: { if !$0 { pass = nil } })) {
            if let pass { WalletPassSheet(pass: pass).ignoresSafeArea() }
        }
    }
}
