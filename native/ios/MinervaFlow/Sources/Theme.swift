import SwiftUI

/// Mirrors Minerva Flow's web brand (AGENTS.md): cream surfaces, emerald
/// accent, New York/Playfair serif for headings. Kept as static values
/// rather than an asset-catalog color set for the ones that never change
/// between light/dark (the wallet card is always dark-on-brand regardless
/// of system appearance, matching the web version).
enum MinervaColor {
    static let cream = Color(red: 0xF5 / 255, green: 0xF1 / 255, blue: 0xE6 / 255)
    static let creamSoft = Color(red: 0xFA / 255, green: 0xFA / 255, blue: 0xF5 / 255)
    static let ink = Color(red: 0x1B / 255, green: 0x26 / 255, blue: 0x20 / 255)
    static let inkSoft = Color(red: 0x56 / 255, green: 0x64 / 255, blue: 0x5A / 255)
    static let inkFaint = Color(red: 0x8A / 255, green: 0x91 / 255, blue: 0x88 / 255)
    static let emerald = Color(red: 0x16 / 255, green: 0x7F / 255, blue: 0x5B / 255)
    static let emeraldDark = Color(red: 0x0E / 255, green: 0x5A / 255, blue: 0x40 / 255)
    /// Web's --mv-lime — the Ambassadeur tier's banner color, matching
    /// Starbucks' Gold-status treatment.
    static let limeAccent = Color(red: 0xDF / 255, green: 0xFF / 255, blue: 0x5F / 255)
    static let border = Color(red: 0x1B / 255, green: 0x26 / 255, blue: 0x20 / 255).opacity(0.1)
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
    }
}

enum MinervaFont {
    /// "New York" is the system serif on iOS 16+ — .serif design maps to it
    /// directly, matching the web's `"New York", "Playfair Display"` stack.
    static func display(_ size: CGFloat, weight: Font.Weight = .medium) -> Font {
        .system(size: size, weight: weight, design: .serif)
    }
}
