import SwiftUI

/// Real settings, matching the web portal's ProfileSettingsCard depth
/// (notification frequency, sign out) rather than a bare name-and-signout
/// stub — the account-management surface a production app actually needs,
/// not a placeholder.
struct ProfileView: View {
    @EnvironmentObject var supabase: SupabaseManager
    @State private var frequency = "all"
    @State private var isSavingFrequency = false
    @State private var savedTick = false
    @State private var showSignOutConfirm = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                if let customer = supabase.customer {
                    identityCard(for: customer)
                    notificationSection
                    aboutSection
                    signOutButton
                } else {
                    Text("Aucun profil trouvé.")
                        .font(.system(size: 13))
                        .foregroundStyle(MinervaColor.inkSoft)
                        .padding(.top, 40)
                }
            }
            .padding(18)
        }
        .background(MinervaColor.cream.ignoresSafeArea())
        .onAppear {
            if let f = supabase.customer?.notificationFrequency { frequency = f }
        }
        .confirmationDialog(
            "Se déconnecter ?",
            isPresented: $showSignOutConfirm,
            titleVisibility: .visible
        ) {
            Button("Se déconnecter", role: .destructive) {
                Task { await supabase.signOut() }
            }
            Button("Annuler", role: .cancel) {}
        }
    }

    // MARK: - Identity

    private func identityCard(for customer: Customer) -> some View {
        let tier = LoyaltyTier.resolve(totalSpent: customer.totalSpent)

        return VStack(spacing: 14) {
            ZStack {
                Circle().fill(tier.bannerColor).frame(width: 64, height: 64)
                Text(initials(for: customer.name))
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(tier.bannerForeground)
            }

            VStack(spacing: 2) {
                Text(customer.name)
                    .font(MinervaFont.display(19))
                    .foregroundStyle(MinervaColor.ink)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                if let restaurantName = supabase.restaurantName {
                    Text(restaurantName)
                        .font(.system(size: 12.5))
                        .foregroundStyle(MinervaColor.inkSoft)
                }
            }

            HStack(spacing: 22) {
                statTile(value: "\(customer.loyaltyPoints)", label: "points")
                statTile(value: "\(customer.visitCount)", label: "visites")
                statTile(value: tier.label, label: "statut")
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity)
        .background(MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: 20))
    }

    private func statTile(value: String, label: String) -> some View {
        VStack(spacing: 1) {
            Text(value)
                .font(.system(size: 15, weight: .bold, design: .rounded))
                .foregroundStyle(MinervaColor.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(label)
                .font(.system(size: 10.5))
                .foregroundStyle(MinervaColor.inkFaint)
        }
        .frame(minWidth: 56)
    }

    private func initials(for name: String) -> String {
        let parts = name.split(separator: " ")
        let letters = parts.prefix(2).compactMap { $0.first }
        return String(letters).uppercased()
    }

    // MARK: - Notifications

    private var notificationSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Notifications")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)

            VStack(spacing: 0) {
                frequencyRow(value: "all", title: "Tout", subtitle: "Offres, rappels de visite, anniversaire")
                Divider().padding(.leading, 16)
                frequencyRow(value: "important_only", title: "L'essentiel seulement", subtitle: "Anniversaire et récompenses prêtes")
            }
            .background(MinervaColor.creamSoft)
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
    }

    private func frequencyRow(value: String, title: String, subtitle: String) -> some View {
        Button {
            guard frequency != value else { return }
            frequency = value
            Task {
                isSavingFrequency = true
                let ok = await supabase.updateNotificationFrequency(value)
                isSavingFrequency = false
                if ok {
                    savedTick = true
                    try? await Task.sleep(nanoseconds: 1_500_000_000)
                    savedTick = false
                }
            }
        } label: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 1) {
                    Text(title)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(MinervaColor.ink)
                        .fixedSize(horizontal: false, vertical: true)
                    Text(subtitle)
                        .font(.system(size: 11))
                        .foregroundStyle(MinervaColor.inkFaint)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 8)
                if frequency == value {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(MinervaColor.emeraldDark)
                }
            }
            .padding(14)
        }
        .buttonStyle(.plain)
    }

    // MARK: - About / legal

    private var aboutSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("À propos")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)

            VStack(spacing: 0) {
                aboutRow(icon: "doc.text", title: "Conditions d'utilisation")
                Divider().padding(.leading, 44)
                aboutRow(icon: "lock", title: "Politique de confidentialité")
                Divider().padding(.leading, 44)
                aboutRow(icon: "info.circle", title: "Version", value: "1.0.0")
            }
            .background(MinervaColor.creamSoft)
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
    }

    private func aboutRow(icon: String, title: String, value: String? = nil) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundStyle(MinervaColor.inkSoft)
                .frame(width: 20)
            Text(title)
                .font(.system(size: 13))
                .foregroundStyle(MinervaColor.ink)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 8)
            if let value {
                Text(value)
                    .font(.system(size: 12.5))
                    .foregroundStyle(MinervaColor.inkFaint)
            } else {
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(MinervaColor.inkFaint)
            }
        }
        .padding(14)
    }

    // MARK: - Sign out

    private var signOutButton: some View {
        Button {
            showSignOutConfirm = true
        } label: {
            Text("Se déconnecter")
                .font(.system(size: 14, weight: .semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 13)
        }
        .foregroundStyle(.red)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(.red.opacity(0.3)))
    }
}
