import SwiftUI

struct OwnerMainTabView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @State private var selection = 0

    var body: some View {
        TabView(selection: $selection) {
            OwnerOverviewView()
                .tabItem { Label("Vue d'ensemble", systemImage: "rectangle.grid.2x2.fill") }
                .tag(0)
            OwnerModulePlaceholder(title: "Commandes", icon: "list.clipboard.fill", detail: "Suivez les commandes de vos établissements.")
                .tabItem { Label("Commandes", systemImage: "list.clipboard.fill") }
                .tag(1)
            OwnerModulePlaceholder(title: "Menu", icon: "fork.knife.circle.fill", detail: "Pilotez la carte et ses marges.")
                .tabItem { Label("Menu", systemImage: "fork.knife.circle.fill") }
                .tag(2)
            OwnerModulePlaceholder(title: "Fidélisation", icon: "heart.fill", detail: "Développez la rétention de vos clients.")
                .tabItem { Label("Fidélisation", systemImage: "heart.fill") }
                .tag(3)
            OwnerModulePlaceholder(title: "Plus", icon: "ellipsis.circle.fill", detail: "Finance, équipe, inventaire et marque blanche.")
                .tabItem { Label("Plus", systemImage: "ellipsis.circle.fill") }
                .tag(4)
        }
        .tint(MinervaColor.emeraldDark)
    }
}

private struct OwnerOverviewView: View {
    @EnvironmentObject private var supabase: SupabaseManager

    private var brandName: String { supabase.ownerBranding?.brandName ?? "Minerva Flow" }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    HStack(spacing: 12) {
                        if let logo = supabase.ownerBranding?.logoUrl, let url = URL(string: logo) {
                            AsyncImage(url: url) { image in image.resizable().scaledToFit() } placeholder: { Image(systemName: "building.2.fill") }
                                .frame(width: 44, height: 44).clipShape(RoundedRectangle(cornerRadius: 12))
                        } else {
                            Image(systemName: "building.2.fill").font(.title2).foregroundStyle(MinervaColor.emeraldDark)
                                .frame(width: 44, height: 44).background(MinervaColor.emerald.opacity(0.12)).clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                        VStack(alignment: .leading, spacing: 3) {
                            Text("Espace propriétaire").font(.caption.weight(.semibold)).foregroundStyle(MinervaColor.inkFaint)
                            Text(brandName).font(MinervaFont.display(27, weight: .semibold)).foregroundStyle(MinervaColor.ink)
                        }
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Vos établissements").font(MinervaFont.display(21, weight: .semibold))
                        Text("Passez d'une adresse à l'autre tout en gardant une identité de marque unifiée.").font(.subheadline).foregroundStyle(MinervaColor.inkSoft)
                    }
                    ForEach(supabase.ownerRestaurants) { restaurant in
                        HStack(spacing: 14) {
                            Image(systemName: "storefront.fill").foregroundStyle(MinervaColor.emeraldDark).frame(width: 38, height: 38).background(MinervaColor.emerald.opacity(0.1)).clipShape(Circle())
                            VStack(alignment: .leading, spacing: 3) {
                                Text(restaurant.name).font(.headline).foregroundStyle(MinervaColor.ink)
                                Text(restaurant.city ?? "Établissement").font(.caption).foregroundStyle(MinervaColor.inkFaint)
                            }
                            Spacer()
                            Image(systemName: "chevron.right").font(.caption.weight(.bold)).foregroundStyle(MinervaColor.inkFaint)
                        }
                        .padding(15).background(.white).clipShape(RoundedRectangle(cornerRadius: 16)).shadow(color: .black.opacity(0.04), radius: 8, y: 3)
                    }
                    HStack(spacing: 10) {
                        OwnerMetric(title: "Adresses", value: "\(supabase.ownerRestaurants.count)", icon: "building.2")
                        OwnerMetric(title: "Statut", value: "Actif", icon: "checkmark.seal")
                    }
                    Text("Propulsé par Minerva Flow").font(.caption2).foregroundStyle(MinervaColor.inkFaint).frame(maxWidth: .infinity, alignment: .center).padding(.top, 8)
                }
                .padding(20)
            }
            .background(MinervaColor.cream.ignoresSafeArea())
            .navigationBarHidden(true)
        }
    }
}

private struct OwnerMetric: View {
    let title: String; let value: String; let icon: String
    var body: some View { VStack(alignment: .leading, spacing: 8) { Image(systemName: icon).foregroundStyle(MinervaColor.emeraldDark); Text(value).font(.title3.bold()).foregroundStyle(MinervaColor.ink); Text(title).font(.caption).foregroundStyle(MinervaColor.inkFaint) }.frame(maxWidth: .infinity, alignment: .leading).padding(14).background(.white).clipShape(RoundedRectangle(cornerRadius: 14)) }
}

private struct OwnerModulePlaceholder: View {
    let title: String; let icon: String; let detail: String
    var body: some View { NavigationStack { VStack(spacing: 14) { Image(systemName: icon).font(.system(size: 42)).foregroundStyle(MinervaColor.emeraldDark); Text(title).font(MinervaFont.display(28, weight: .semibold)); Text(detail).multilineTextAlignment(.center).foregroundStyle(MinervaColor.inkSoft); Text("Écran natif en préparation").font(.caption).foregroundStyle(MinervaColor.inkFaint) }.padding(28).frame(maxWidth: .infinity, maxHeight: .infinity).background(MinervaColor.cream.ignoresSafeArea()) } }
}
