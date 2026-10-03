import SwiftUI

/// Shared building blocks for the Compte tab so every row, tile and card has
/// one look: a rounded icon tile, a title with optional subtitle, an optional
/// trailing value, and a chevron on the far right.
struct CompteRowLabel: View {
    let icon: String
    let title: String
    var subtitle: String?
    var trailing: String?
    var tint: Color = MinervaColor.emeraldDark
    var showsChevron = true

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(tint)
                .frame(width: 34, height: 34)
                .background(tint.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(MinervaColor.ink)
                if let subtitle {
                    Text(subtitle)
                        .font(.system(size: 12))
                        .foregroundStyle(MinervaColor.inkSoft)
                        .lineLimit(2)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            Spacer(minLength: 8)
            if let trailing {
                Text(trailing)
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundStyle(MinervaColor.inkSoft)
            }
            if showsChevron {
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(MinervaColor.inkFaint)
                    .accessibilityHidden(true)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentShape(Rectangle())
    }
}

/// Rounded surface that groups rows with hairline separators.
struct CompteGroup<Content: View>: View {
    var title: String?
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let title {
                Text(title)
                    .font(.system(size: 12, weight: .semibold))
                    .tracking(0.6)
                    .foregroundStyle(MinervaColor.inkFaint)
                    .padding(.horizontal, 4)
                    .accessibilityAddTraits(.isHeader)
            }
            VStack(spacing: 0) { content }
                .background(MinervaColor.creamSoft)
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(MinervaColor.border, lineWidth: 1))
                .clipShape(RoundedRectangle(cornerRadius: 16))
        }
    }
}

struct CompteSeparator: View {
    var body: some View {
        Rectangle().fill(MinervaColor.border).frame(height: 1).padding(.leading, 60)
    }
}

/// A navigation row used inside a CompteGroup.
struct CompteLink: View {
    let route: CompteRoute
    let icon: String
    let title: String
    var subtitle: String?
    var trailing: String?
    var tint: Color = MinervaColor.emeraldDark

    var body: some View {
        NavigationLink(value: route) {
            CompteRowLabel(icon: icon, title: title, subtitle: subtitle, trailing: trailing, tint: tint)
        }
        .buttonStyle(.plain)
    }
}
