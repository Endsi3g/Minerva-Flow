import SwiftUI

/// "Aide" — did not exist before; a customer previously had no in-app path
/// to reach the restaurant or find the legal documents other than digging
/// through "À propos". Phone is read-only, sourced from restaurants.phone
/// via the /api/portal/restaurant bridge (no customer RLS on `restaurants`
/// directly — see fetchRestaurantInfo's own comment).
struct SupportView: View {
    @EnvironmentObject var supabase: SupabaseManager
    @AppStorage("appLanguage") private var storedLanguage = AppLanguage.fr.rawValue
    @State private var legalSheet: AuthView.LegalDocument?
    private var isFrench: Bool { storedLanguage != AppLanguage.en.rawValue }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                if let phone = supabase.restaurantPhone, let url = URL(string: "tel://\(phone.filter(\.isNumber))") {
                    section(title: isFrench ? "Contacter le restaurant" : "Contact the restaurant") {
                        Link(destination: url) {
                            row(icon: "phone.fill", title: phone, value: nil)
                        }
                        .buttonStyle(.plain)
                    }
                }

                section(title: isFrench ? "Support Minerva Flow" : "Minerva Flow support") {
                    Link(destination: SupportContact.emailURL) {
                        row(icon: "envelope.fill", title: "support@minervaflow.app", value: nil)
                    }
                    .buttonStyle(.plain)
                }

                section(title: isFrench ? "Documents légaux" : "Legal documents") {
                    Button { legalSheet = .terms } label: {
                        row(icon: "doc.text", title: isFrench ? "Conditions d'utilisation" : "Terms of use", value: nil)
                    }
                    .buttonStyle(.plain)
                    Divider().padding(.leading, 44)
                    Button { legalSheet = .privacy } label: {
                        row(icon: "lock", title: isFrench ? "Politique de confidentialité" : "Privacy policy", value: nil)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(18)
        }
        .background(MinervaColor.cream.ignoresSafeArea())
        .navigationTitle(isFrench ? "Aide" : "Help")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $legalSheet) { doc in
            LegalDocumentSheet(document: doc)
        }
    }

    private func section<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)
            VStack(spacing: 0) {
                content()
            }
            .background(MinervaColor.creamSoft)
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
    }

    private func row(icon: String, title: String, value: String?) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundStyle(MinervaColor.emeraldDark)
                .frame(width: 20)
            Text(title)
                .font(.system(size: 13))
                .foregroundStyle(MinervaColor.ink)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 8)
            if let value {
                Text(value).font(.system(size: 12.5)).foregroundStyle(MinervaColor.inkFaint)
            } else {
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(MinervaColor.inkFaint)
            }
        }
        .padding(14)
        .contentShape(Rectangle())
    }
}
