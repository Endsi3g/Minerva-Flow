import SwiftUI

/// The account-level view for customers who belong to more than one
/// restaurant. Each card is deliberately independent: points and visits are
/// never merged across establishments.
struct MembershipCardsView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @State private var selectedRestaurantID: String?

    var body: some View {
        NavigationStack {
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
                        }

                        if supabase.allMemberships.count > 1 {
                            Text("Toutes vos cartes")
                                .font(.system(size: 13, weight: .semibold))
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
                .font(.system(size: 13))
                .foregroundStyle(MinervaColor.inkSoft)
        }
    }

    private func membershipCard(_ membership: RestaurantMembership, emphasized: Bool) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 10) {
                Image(systemName: "storefront.fill")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 36, height: 36)
                    .background(MinervaColor.emerald)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                VStack(alignment: .leading, spacing: 2) {
                    Text(membership.restaurantName)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(MinervaColor.ink)
                    Text("Carte fidélité active")
                        .font(.system(size: 11.5))
                        .foregroundStyle(MinervaColor.inkFaint)
                }
                Spacer()
                Text("\(membership.loyaltyPoints) pts")
                    .font(.system(size: 16, weight: .bold, design: .rounded))
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
            Text(value).font(.system(size: 14, weight: .semibold)).foregroundStyle(MinervaColor.ink)
            Text(label).font(.system(size: 10.5)).foregroundStyle(MinervaColor.inkFaint)
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
                .font(.system(size: 30))
                .foregroundStyle(MinervaColor.emeraldDark)
            Text("Aucune carte pour le moment")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)
            Text("Rejoignez un restaurant depuis la découverte pour commencer à accumuler des points.")
                .font(.system(size: 12.5))
                .multilineTextAlignment(.center)
                .foregroundStyle(MinervaColor.inkSoft)
        }
        .frame(maxWidth: .infinity)
        .padding(28)
        .background(MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: 18))
    }
}
