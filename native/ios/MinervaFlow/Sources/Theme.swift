import SwiftUI
import UIKit

enum AppLanguage: String, CaseIterable, Identifiable {
    case fr, en
    var id: String { rawValue }
    var label: String { self == .fr ? "FR" : "EN" }
    var localeIdentifier: String { self == .fr ? "fr_CA" : "en_CA" }
}

enum AppLanguagePreference {
    static let key = "appLanguage"

    /// Persist a French first-launch default so every @AppStorage-backed
    /// surface observes the same value from the app's first render. Preserve
    /// an explicit English choice across future launches and upgrades.
    static func ensureFrenchDefault(in defaults: UserDefaults = .standard) {
        guard defaults.object(forKey: key) == nil else { return }
        defaults.set(AppLanguage.fr.rawValue, forKey: key)
    }
}

enum AppAppearance: String, CaseIterable, Identifiable {
    case light, system, dark
    var id: String { rawValue }

    var colorScheme: ColorScheme? {
        switch self {
        case .light: .light
        case .system: nil
        case .dark: .dark
        }
    }

    func label(isFrench: Bool) -> String {
        switch self {
        case .light: isFrench ? "Clair" : "Light"
        case .system: isFrench ? "Système" : "System"
        case .dark: isFrench ? "Sombre" : "Dark"
        }
    }
}

struct LanguageMenu: View {
    @Binding var language: AppLanguage

    var body: some View {
        Menu {
            ForEach(AppLanguage.allCases) { option in
                Button {
                    language = option
                } label: {
                    Label(option == .fr ? "Français" : "English", systemImage: language == option ? "checkmark" : "")
                }
            }
        } label: {
            HStack(spacing: 5) {
                Image(systemName: "globe")
                Text(language.label)
            }
            .font(.system(size: 12, weight: .bold))
            .padding(.horizontal, 11)
            .padding(.vertical, 8)
            .background(.white.opacity(0.16))
            .clipShape(Capsule())
        }
        .foregroundStyle(.white)
        .accessibilityLabel(language == .fr ? "Langue: français" : "Language: English")
    }
}

/// Mirrors Minerva Flow's web brand (AGENTS.md): cream surfaces, emerald
/// accent, New York/Playfair serif for headings. Kept as static values
/// rather than an asset-catalog color set for the ones that never change
/// between light/dark (the wallet card is always dark-on-brand regardless
/// of system appearance, matching the web version).
enum MinervaColor {
    private static func rgb(_ hex: UInt32) -> UIColor {
        UIColor(
            red: CGFloat((hex >> 16) & 0xff) / 255,
            green: CGFloat((hex >> 8) & 0xff) / 255,
            blue: CGFloat(hex & 0xff) / 255,
            alpha: 1
        )
    }

    private static func adaptive(light: UInt32, dark: UInt32) -> Color {
        Color(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark ? rgb(dark) : rgb(light)
        })
    }

    private static func tenantAware(primaryKey: String, fallbackLight: UInt32, fallbackDark: UInt32) -> Color {
        guard let hex = UserDefaults.standard.string(forKey: primaryKey),
              hex.count == 7, hex.first == "#",
              let value = UInt32(hex.dropFirst(), radix: 16) else {
            return adaptive(light: fallbackLight, dark: fallbackDark)
        }
        return Color(uiColor: rgb(value))
    }

    // Semantic palette shared by every native screen. Wallet/brand artwork
    // may opt into fixed colors; application surfaces and copy must not.
    static let cream = adaptive(light: 0xF5F1E6, dark: 0x14170F)
    static let creamSoft = adaptive(light: 0xFAFAF5, dark: 0x1A1E14)
    static let surface = adaptive(light: 0xFFFEFA, dark: 0x1F2418)
    static let ink = adaptive(light: 0x1B2620, dark: 0xF3F2EA)
    static let inkSoft = adaptive(light: 0x56645A, dark: 0xB9C0B0)
    static let inkFaint = adaptive(light: 0x687367, dark: 0xA0A794)
    static var emerald: Color { tenantAware(primaryKey: "activeTenantPrimaryColor", fallbackLight: 0x167F5B, fallbackDark: 0x1C9A6F) }
    static var emeraldDark: Color { tenantAware(primaryKey: "activeTenantSecondaryColor", fallbackLight: 0x0E5A40, fallbackDark: 0x4ADE9B) }
    /// Web's --mv-lime — the Ambassadeur tier's banner color, matching
    /// Starbucks' Gold-status treatment.
    static var limeAccent: Color { tenantAware(primaryKey: "activeTenantAccentColor", fallbackLight: 0xDFFF5F, fallbackDark: 0xDFFF5F) }
    static let border = adaptive(light: 0xE6E0D0, dark: 0x33392A)
}

/// Every primary button in the app uses this — a bare Button with no
/// custom style gives zero tactile feedback on iOS beyond the system's
/// barely-there default, which reads as "the app has no animation at all"
/// even though the layout itself is fine. A slight scale + opacity dip on
/// press, animated, is what a native app actually feels like.
struct PressableButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .opacity(configuration.isPressed ? 0.9 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
            .onChange(of: configuration.isPressed) { _, pressed in
                guard pressed else { return }
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
            }
    }
}

enum MinervaFont {
    /// "New York" is the system serif on iOS 16+ — .serif design maps to it
    /// directly, matching the web's `"New York", "Playfair Display"` stack.
    static func display(_ size: CGFloat, weight: Font.Weight = .medium) -> Font {
        .system(size: size, weight: weight, design: .serif)
    }
}

/// Fades the leading/trailing edges of a horizontal ScrollView to the
/// surrounding background color — the visual cue that there's more to
/// scroll to, same language as the restaurant/menu-item carousels
/// throughout the app.
struct HorizontalEdgeFade: ViewModifier {
    var color: Color = MinervaColor.cream
    var width: CGFloat = 24

    func body(content: Content) -> some View {
        content.mask(
            LinearGradient(
                stops: [
                    .init(color: .black.opacity(0), location: 0),
                    .init(color: .black, location: 0.03),
                    .init(color: .black, location: 0.97),
                    .init(color: .black.opacity(0), location: 1),
                ],
                startPoint: .leading,
                endPoint: .trailing
            )
        )
    }
}

extension View {
    func horizontalEdgeFade(_ color: Color = MinervaColor.cream) -> some View {
        modifier(HorizontalEdgeFade(color: color))
    }
}

/// Shimmering placeholder block — same visual language as the web
/// dashboard's `.mv-skeleton` (a moving highlight sweeping across a
/// neutral shape) so loading states read as one consistent design system
/// across web and native, not a bare spinner on one platform and a
/// polished shimmer on the other.
struct SkeletonBlock: View {
    var cornerRadius: CGFloat = 8
    @State private var phase: CGFloat = -1

    var body: some View {
        RoundedRectangle(cornerRadius: cornerRadius)
            .fill(MinervaColor.ink.opacity(0.07))
            .overlay(
                GeometryReader { geo in
                    LinearGradient(
                        colors: [.clear, MinervaColor.ink.opacity(0.06), .clear],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: geo.size.width * 0.6)
                    .offset(x: phase * geo.size.width * 1.6)
                }
                .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
            )
            .onAppear {
                withAnimation(.linear(duration: 1.2).repeatForever(autoreverses: false)) {
                    phase = 1
                }
            }
    }
}

/// Pre-shaped skeletons for the app's recurring card/row layouts, so each
/// screen's loading state is shaped like its real content instead of a
/// generic centered spinner.
enum Skeletons {
    static func card(height: CGFloat = 90) -> some View {
        SkeletonBlock(cornerRadius: 16).frame(height: height)
    }

    static func row() -> some View {
        HStack(spacing: 12) {
            SkeletonBlock(cornerRadius: 12).frame(width: 56, height: 56)
            VStack(alignment: .leading, spacing: 6) {
                SkeletonBlock(cornerRadius: 4).frame(height: 13)
                SkeletonBlock(cornerRadius: 4).frame(width: 120, height: 11)
            }
        }
        .padding(12)
        .background(MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    static func list(count: Int = 4) -> some View {
        VStack(spacing: 10) {
            ForEach(0..<count, id: \.self) { _ in row() }
        }
    }

    static func tile() -> some View {
        VStack(alignment: .leading, spacing: 8) {
            SkeletonBlock(cornerRadius: 6).frame(width: 20, height: 20)
            SkeletonBlock(cornerRadius: 4).frame(height: 13)
            SkeletonBlock(cornerRadius: 4).frame(width: 60, height: 10)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: 18))
    }

    static func grid(count: Int = 4) -> some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            ForEach(0..<count, id: \.self) { _ in tile() }
        }
    }
}

/// A generic, reusable outcome banner for the "did this action succeed or
/// fail" states every form/mutation needs — same visual language
/// everywhere instead of each screen inventing its own error Text.
struct OutcomeBanner: View {
    enum Kind { case success, failure }
    let kind: Kind
    let message: String

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: kind == .success ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                .font(.system(size: 13))
                .padding(.top, 1)
            Text(message)
                .font(.system(size: 12.5))
                .fixedSize(horizontal: false, vertical: true)
        }
        .foregroundStyle(kind == .success ? MinervaColor.emeraldDark : .red)
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background((kind == .success ? MinervaColor.emerald : Color.red).opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

/// Shown wherever a tab needs `supabase.customer` but the load finished
/// with none (Home, Profile) — previously each screen just printed inert
/// text with no way out, stranding anyone who ends up here (a data issue,
/// a stale session) signed in with no visible way to retry or sign out.
/// Surfaces the real failure reason when loadPortalData() caught one
/// (supabase.lastError) instead of staying silent about it.
struct NoProfileFoundView: View {
    @EnvironmentObject var supabase: SupabaseManager
    @State private var isRetrying = false

    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: "person.crop.circle.badge.questionmark")
                .font(.system(size: 32))
                .foregroundStyle(MinervaColor.inkFaint)

            Text("Aucun profil de fidélité trouvé pour ce compte.")
                .font(.system(size: 13.5, weight: .medium))
                .foregroundStyle(MinervaColor.inkSoft)
                .multilineTextAlignment(.center)

            if let lastError = supabase.lastError {
                Text(lastError)
                    .font(.system(size: 12))
                    .foregroundStyle(MinervaColor.inkFaint)
                    .multilineTextAlignment(.center)
            }

            Button {
                isRetrying = true
                Task {
                    await supabase.loadPortalData()
                    isRetrying = false
                }
            } label: {
                HStack(spacing: 6) {
                    if isRetrying { ProgressView().tint(.white) }
                    Text(isRetrying ? "Nouvelle tentative…" : "Réessayer")
                        .font(.system(size: 13.5, weight: .semibold))
                }
                .frame(maxWidth: 200)
                .padding(.vertical, 11)
            }
            .background(MinervaColor.emerald)
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .buttonStyle(PressableButtonStyle())
            .disabled(isRetrying)

            Button("Se déconnecter") {
                Task { await supabase.signOut() }
            }
            .font(.system(size: 12.5, weight: .semibold))
            .foregroundStyle(MinervaColor.inkSoft)
        }
        .padding(28)
        .frame(maxWidth: .infinity)
    }
}

/// Keyword-matched SF Symbol per menu category name — every category
/// previously showed the same fork-knife icon regardless of content
/// (a "Boissons" tile looked identical to "Plats principaux"). Matches on
/// substrings so an owner's exact category naming ("Boissons chaudes",
/// "Nos boissons") doesn't need to hit an exact keyword list, falling back
/// to the generic fork-knife for anything unrecognized rather than
/// guessing wrong.
enum MenuCategoryIcon {
    static func symbolName(for category: String) -> String {
        let normalized = category.folding(options: .diacriticInsensitive, locale: .current).lowercased()

        if normalized.contains("boisson") || normalized.contains("café") || normalized.contains("cafe")
            || normalized.contains("thé") || normalized.contains("the ") || normalized.contains("jus")
            || normalized.contains("smoothie") || normalized.contains("latte") {
            return "cup.and.saucer.fill"
        }
        if normalized.contains("dessert") || normalized.contains("pâtisserie") || normalized.contains("patisserie")
            || normalized.contains("sucré") || normalized.contains("sucre") || normalized.contains("gâteau")
            || normalized.contains("gateau") {
            return "birthday.cake.fill"
        }
        if normalized.contains("pain") || normalized.contains("boulangerie") || normalized.contains("viennoiserie")
            || normalized.contains("sandwich") || normalized.contains("bagel") {
            return "takeoutbag.and.cup.and.straw.fill"
        }
        if normalized.contains("salade") || normalized.contains("légume") || normalized.contains("legume")
            || normalized.contains("végé") || normalized.contains("vege") {
            return "leaf.fill"
        }
        if normalized.contains("pizza") {
            return "flame.fill"
        }
        if normalized.contains("déjeuner") || normalized.contains("dejeuner") || normalized.contains("brunch")
            || normalized.contains("petit-déjeuner") {
            return "sun.max.fill"
        }
        if normalized.contains("soupe") || normalized.contains("potage") {
            return "flame"
        }
        return "fork.knife"
    }
}
