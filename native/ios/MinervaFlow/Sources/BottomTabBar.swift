import SwiftUI

struct BottomTabItem<Tag: Hashable>: Identifiable {
    let tag: Tag
    let title: String
    let icon: String
    var badge: Int = 0
    var id: Tag { tag }
}

/// iPadOS 18 pins the system tab bar to the top of the screen and offers no
/// API to move it. On regular-width screens the system bar is hidden and this
/// floating bar replaces it at the bottom, so iPhone and iPad share one
/// navigation structure. On iPhone the native bar is kept untouched.
private struct BottomTabBarModifier<Tag: Hashable>: ViewModifier {
    @Environment(\.horizontalSizeClass) private var sizeClass
    let items: [BottomTabItem<Tag>]
    @Binding var selection: Tag

    func body(content: Content) -> some View {
        if sizeClass == .regular {
            content
                .safeAreaInset(edge: .bottom, spacing: 0) {
                    BottomTabBar(items: items, selection: $selection)
                        .padding(.horizontal, 24)
                        .padding(.bottom, 8)
                }
        } else {
            content
        }
    }
}

private struct HideSystemTabBarModifier: ViewModifier {
    @Environment(\.horizontalSizeClass) private var sizeClass

    func body(content: Content) -> some View {
        if sizeClass == .regular {
            content.toolbar(.hidden, for: .tabBar)
        } else {
            content
        }
    }
}

extension View {
    /// Apply to each tab's content so the system bar disappears on iPad.
    func hidesSystemTabBarOnRegular() -> some View { modifier(HideSystemTabBarModifier()) }

    func bottomTabBar<Tag: Hashable>(_ items: [BottomTabItem<Tag>], selection: Binding<Tag>) -> some View {
        modifier(BottomTabBarModifier(items: items, selection: selection))
    }
}

struct BottomTabBar<Tag: Hashable>: View {
    let items: [BottomTabItem<Tag>]
    @Binding var selection: Tag

    var body: some View {
        HStack(spacing: 4) {
            ForEach(items) { item in
                let active = item.tag == selection
                Button {
                    selection = item.tag
                } label: {
                    VStack(spacing: 3) {
                        Image(systemName: item.icon)
                            .font(.system(size: 20, weight: .semibold))
                            .frame(height: 24)
                            .overlay(alignment: .topTrailing) {
                                if item.badge > 0 {
                                    Text("\(min(item.badge, 99))")
                                        .font(.system(size: 11, weight: .bold))
                                        .foregroundStyle(.white)
                                        .padding(.horizontal, 5)
                                        .frame(minWidth: 18, minHeight: 18)
                                        .background(Capsule().fill(Color.red))
                                        .offset(x: 12, y: -8)
                                }
                            }
                        Text(item.title)
                            .font(.system(size: 12, weight: active ? .bold : .medium))
                    }
                    .foregroundStyle(active ? MinervaColor.emeraldDark : MinervaColor.inkSoft)
                    .frame(maxWidth: .infinity, minHeight: 52)
                    .background(
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .fill(active ? MinervaColor.emerald.opacity(0.14) : .clear)
                    )
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(item.title)
                .accessibilityAddTraits(active ? [.isButton, .isSelected] : .isButton)
            }
        }
        .padding(6)
        .frame(maxWidth: 640)
        .background(
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .fill(MinervaColor.surface)
                .shadow(color: .black.opacity(0.10), radius: 14, y: 4)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .stroke(MinervaColor.inkFaint.opacity(0.18), lineWidth: 1)
        )
        .frame(maxWidth: .infinity)
    }
}
