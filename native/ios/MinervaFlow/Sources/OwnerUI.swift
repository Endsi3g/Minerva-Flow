import SwiftUI

// Shared building blocks for every owner screen. They reuse the client app's
// visual language (cream ground, serif titles, deep-emerald hero card, soft
// rounded white cards) so both spaces feel like one product.

/// Tiny bilingual helper: `L("Aperçu", "Overview")`.
struct Lx {
    let fr: Bool
    init(_ language: String) { fr = language != AppLanguage.en.rawValue }
    func callAsFunction(_ french: String, _ english: String) -> String { fr ? french : english }
}

enum OwnerTone {
    case good, warn, bad, neutral, info

    var color: Color {
        switch self {
        case .good: return MinervaColor.emeraldDark
        case .warn: return Color(red: 0.70, green: 0.42, blue: 0.0)
        case .bad: return Color(red: 0.72, green: 0.20, blue: 0.16)
        case .info: return MinervaColor.emerald
        case .neutral: return MinervaColor.inkSoft
        }
    }
}

struct OwnerPill: View {
    let text: String
    var tone: OwnerTone = .neutral
    var icon: String?

    var body: some View {
        HStack(spacing: 4) {
            if let icon { Image(systemName: icon).font(.mv(size: 10, weight: .bold)) }
            Text(text).font(.mv(size: 11.5, weight: .semibold)).lineLimit(1)
        }
        .foregroundStyle(tone.color)
        .padding(.horizontal, 9).padding(.vertical, 4)
        .background(tone.color.opacity(0.12), in: Capsule())
    }
}

/// Soft white surface used for lists and grouped content.
struct OwnerCard<Content: View>: View {
    var padding: CGFloat = 14
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(MinervaColor.creamSoft, in: RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(MinervaColor.border.opacity(0.7), lineWidth: 1))
    }
}

struct OwnerSectionHeader: View {
    let title: String
    var actionTitle: String?
    var action: (() -> Void)?

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title).font(.mv(size: 15.5, weight: .semibold)).foregroundStyle(MinervaColor.ink)
                .accessibilityAddTraits(.isHeader)
            Spacer()
            if let actionTitle, let action {
                Button(actionTitle, action: action)
                    .font(.mv(size: 14, weight: .semibold)).foregroundStyle(MinervaColor.emeraldDark)
                    .frame(minHeight: 44)
            }
        }
    }
}

struct OwnerIconTile: View {
    let icon: String
    var tint: Color = MinervaColor.emeraldDark
    var size: CGFloat = 34

    var body: some View {
        Image(systemName: icon)
            .font(.mv(size: size * 0.42, weight: .semibold))
            .foregroundStyle(tint)
            .frame(width: size, height: size)
            .background(tint.opacity(0.12), in: Circle())
            .accessibilityHidden(true)
    }
}

/// Row inside a card: icon, title, optional subtitle, trailing content.
struct OwnerRow<Trailing: View>: View {
    let icon: String
    let title: String
    var subtitle: String?
    var tint: Color = MinervaColor.emeraldDark
    @ViewBuilder var trailing: Trailing

    var body: some View {
        HStack(spacing: 10) {
            OwnerIconTile(icon: icon, tint: tint)
            VStack(alignment: .leading, spacing: 1) {
                Text(title).font(.mv(size: 14.5, weight: .semibold)).foregroundStyle(MinervaColor.ink).lineLimit(2)
                if let subtitle {
                    Text(subtitle).font(.mv(size: 12)).foregroundStyle(MinervaColor.inkSoft).lineLimit(3)
                }
            }
            Spacer(minLength: 8)
            trailing
        }
        .frame(minHeight: 42)
        .contentShape(Rectangle())
    }
}

extension OwnerRow where Trailing == AnyView {
    init(icon: String, title: String, subtitle: String? = nil, tint: Color = MinervaColor.emeraldDark, chevron: Bool) {
        self.init(icon: icon, title: title, subtitle: subtitle, tint: tint) {
            AnyView(chevron ? AnyView(Image(systemName: "chevron.right").font(.mv(size: 12, weight: .semibold)).foregroundStyle(MinervaColor.inkFaint)) : AnyView(EmptyView()))
        }
    }
}

struct OwnerDivider: View {
    var body: some View { Rectangle().fill(MinervaColor.border.opacity(0.8)).frame(height: 1).padding(.leading, 46) }
}

struct OwnerPrimaryButtonStyle: ButtonStyle {
    var tint: Color = MinervaColor.emeraldDark
    var compact = false
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.mv(size: compact ? 13 : 15, weight: .semibold))
            .foregroundStyle(.white)
            .frame(maxWidth: compact ? nil : .infinity, minHeight: compact ? 34 : 44)
            .padding(.horizontal, compact ? 14 : 0)
            .background(tint, in: Capsule())
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .opacity(configuration.isPressed ? 0.9 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

struct OwnerSecondaryButtonStyle: ButtonStyle {
    var tint: Color = MinervaColor.emeraldDark
    var compact = false
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.mv(size: compact ? 13 : 15, weight: .semibold))
            .foregroundStyle(tint)
            .frame(maxWidth: compact ? nil : .infinity, minHeight: compact ? 34 : 44)
            .padding(.horizontal, compact ? 14 : 0)
            .background(tint.opacity(0.10), in: Capsule())
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

struct OwnerEmptyState: View {
    let icon: String
    let title: String
    let message: String
    var actionTitle: String?
    var action: (() -> Void)?

    var body: some View {
        VStack(spacing: 12) {
            OwnerIconTile(icon: icon, size: 46)
            Text(title).font(.mv(size: 15.5, weight: .semibold)).foregroundStyle(MinervaColor.ink).multilineTextAlignment(.center)
            Text(message).font(.mv(size: 13)).foregroundStyle(MinervaColor.inkSoft).multilineTextAlignment(.center)
            if let actionTitle, let action {
                Button(actionTitle, action: action).buttonStyle(OwnerPrimaryButtonStyle(compact: true)).padding(.top, 4)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20).padding(.horizontal, 16)
    }
}

/// Deep-emerald summary card, same treatment as the client's points balance.
struct OwnerHeroCard<Footer: View>: View {
    let eyebrow: String
    let value: String
    var caption: String?
    @ViewBuilder var footer: Footer

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(eyebrow).font(.mv(size: 13, weight: .medium)).foregroundStyle(.white.opacity(0.82))
            Text(value).font(MinervaFont.display(30, weight: .semibold)).foregroundStyle(.white)
                .lineLimit(1).minimumScaleFactor(0.6)
            if let caption {
                Text(caption).font(.mv(size: 13)).foregroundStyle(.white.opacity(0.78))
            }
            footer
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(MinervaColor.emeraldDeep, in: RoundedRectangle(cornerRadius: 24))
    }
}

struct OwnerStatTile: View {
    let icon: String
    let value: String
    let label: String
    var tone: OwnerTone = .good

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            OwnerIconTile(icon: icon, tint: tone.color, size: 28)
            Text(value).font(MinervaFont.display(20, weight: .semibold)).foregroundStyle(MinervaColor.ink)
                .lineLimit(1).minimumScaleFactor(0.7)
            Text(label).font(.mv(size: 12)).foregroundStyle(MinervaColor.inkSoft).lineLimit(2)
        }
        .padding(12)
        .frame(maxWidth: .infinity, minHeight: 88, alignment: .leading)
        .background(MinervaColor.creamSoft, in: RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(MinervaColor.border.opacity(0.7), lineWidth: 1))
        .accessibilityElement(children: .combine)
    }
}

/// One location switcher for the whole owner space. Shown in the toolbar of
/// root screens only, and only when the owner has more than one location.
/// The restaurant line under a screen title. With several locations it is
/// the switcher itself: plain text with a small chevron, no pill, so the
/// header stays quiet. With one location it is just text.
struct OwnerLocationMenu: View {
    @EnvironmentObject private var supabase: SupabaseManager
    let name: String

    var body: some View {
        if supabase.ownerRestaurants.count > 1 {
            Menu {
                ForEach(supabase.ownerRestaurants) { restaurant in
                    Button {
                        Task { await supabase.selectOwnerRestaurant(restaurant.id) }
                    } label: {
                        if restaurant.id == supabase.selectedOwnerRestaurantId {
                            Label(restaurant.name, systemImage: "checkmark")
                        } else {
                            Text(restaurant.name)
                        }
                    }
                }
            } label: {
                HStack(spacing: 3) {
                    Text(name).font(.mv(size: 13.5)).lineLimit(1)
                    Image(systemName: "chevron.down").font(.mv(size: 9, weight: .bold))
                }
                .foregroundStyle(MinervaColor.inkSoft)
                .fixedSize()
            }
            .accessibilityLabel(Text("Emplacement : \(name)"))
            .accessibilityHint(Text("Changer de restaurant"))
        } else {
            Text(name).font(.mv(size: 13.5)).foregroundStyle(MinervaColor.inkSoft)
        }
    }
}

/// Scroll scaffold: big serif title in the content (like the client's
/// Récompenses page), pull-to-refresh, cream ground, single location menu.
struct OwnerScreen<Content: View>: View {
    @EnvironmentObject private var supabase: SupabaseManager
    let title: String
    var subtitle: String?
    var showsLocationMenu = true
    var refreshable = true
    @ViewBuilder var content: Content

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(MinervaFont.display(30, weight: .semibold)).foregroundStyle(MinervaColor.ink)
                        .lineLimit(2).minimumScaleFactor(0.7)
                        .accessibilityAddTraits(.isHeader)
                    if let subtitle {
                        if showsLocationMenu, subtitle == supabase.selectedOwnerRestaurant?.name {
                            OwnerLocationMenu(name: subtitle)
                        } else {
                            Text(subtitle).font(.mv(size: 15)).foregroundStyle(MinervaColor.inkSoft)
                        }
                    }
                }
                content
            }
            .padding(.horizontal, 16).padding(.top, 4).padding(.bottom, 28)
            .frame(maxWidth: 760).frame(maxWidth: .infinity)
        }
        .background(MinervaColor.cream.ignoresSafeArea())
        .foregroundStyle(MinervaColor.ink)
        .scrollDismissesKeyboard(.interactively)
        .modifier(OwnerRefresh(enabled: refreshable))
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct OwnerRefresh: ViewModifier {
    @EnvironmentObject private var supabase: SupabaseManager
    let enabled: Bool
    func body(content: Content) -> some View {
        if enabled { content.refreshable { await supabase.refreshOwnerOperations() } } else { content }
    }
}

/// Consistent look for form sheets (add / edit): cream ground, serif title.
struct OwnerFormSheet<Content: View>: View {
    @Environment(\.dismiss) private var dismiss
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    let title: String
    var saveTitle: String?
    var canSave = true
    var isSaving = false
    var errorMessage: String?
    let onSave: () -> Void
    @ViewBuilder var content: Content

    var body: some View {
        let L = Lx(storedLanguage)
        NavigationStack {
            Form {
                content
                if let errorMessage {
                    Section { Label(errorMessage, systemImage: "exclamationmark.triangle.fill").foregroundStyle(OwnerTone.warn.color).font(.mv(size: 14)) }
                }
            }
            .scrollContentBackground(.hidden)
            .background(MinervaColor.cream.ignoresSafeArea())
            .font(.mv(size: 15))
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button(L("Annuler", "Cancel")) { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isSaving ? L("Enregistrement…", "Saving…") : (saveTitle ?? L("Enregistrer", "Save")), action: onSave)
                        .disabled(!canSave || isSaving)
                }
            }
        }
        .tint(MinervaColor.emeraldDark)
    }
}

extension Date {
    /// "il y a 5 min" / "5 min ago" in the app language.
    func ownerRelative(_ language: String) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.locale = Locale(identifier: language == AppLanguage.en.rawValue ? "en_CA" : "fr_CA")
        formatter.unitsStyle = .short
        return formatter.localizedString(for: self, relativeTo: Date())
    }
}

extension String {
    var ownerDate: Date? {
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return withFraction.date(from: self) ?? ISO8601DateFormatter().date(from: self)
    }
}
