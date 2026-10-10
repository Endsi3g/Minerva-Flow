import SwiftUI
import UserNotifications

/// Shown on the order-success screen: the one moment the value of a
/// notification ("your order is ready") is obvious, so the permission prompt
/// is asked here instead of at first launch.
struct OrderPushOptInCard: View {
    @ObservedObject private var notifications = NotificationManager.shared
    @Environment(\.openURL) private var openURL
    let isFrench: Bool

    var body: some View {
        Group {
            switch notifications.authorizationStatus {
            case .notDetermined:
                card(
                    icon: "bell.badge.fill",
                    title: isFrench ? "Soyez prévenu dès que c'est prêt" : "Get told the moment it's ready",
                    detail: isFrench ? "Une seule notification, quand votre commande est prête." : "One notification, when your order is ready.",
                    action: isFrench ? "Activer" : "Turn on"
                ) { Task { _ = await notifications.requestPermission() } }
            case .denied:
                card(
                    icon: "bell.slash.fill",
                    title: isFrench ? "Notifications désactivées" : "Notifications are off",
                    detail: isFrench ? "Activez-les dans Réglages pour savoir quand votre commande est prête." : "Turn them on in Settings to know when your order is ready.",
                    action: isFrench ? "Réglages" : "Settings"
                ) {
                    if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
                }
            default:
                EmptyView()
            }
        }
        .task { await notifications.refreshStatus() }
    }

    private func card(icon: String, title: String, detail: String, action: String, perform: @escaping () -> Void) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(MinervaColor.emeraldDark)
                .frame(width: 38, height: 38)
                .background(MinervaColor.emerald.opacity(0.14), in: Circle())
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.mv(size: 14, weight: .bold)).foregroundStyle(MinervaColor.ink)
                Text(detail).font(.mv(size: 12)).foregroundStyle(MinervaColor.inkSoft)
            }
            Spacer(minLength: 6)
            Button(action: perform) {
                Text(action)
                    .font(.mv(size: 13, weight: .semibold))
                    .padding(.horizontal, 14).padding(.vertical, 9)
                    .foregroundStyle(.white)
                    .background(MinervaColor.emeraldDark, in: Capsule())
            }
            .buttonStyle(.plain)
        }
        .padding(14)
        .background(MinervaColor.surface, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(MinervaColor.emerald.opacity(0.2), lineWidth: 1))
        .padding(.horizontal, 24)
    }
}
