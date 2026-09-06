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
