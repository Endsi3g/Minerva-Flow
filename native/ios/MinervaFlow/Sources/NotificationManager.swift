import UIKit
import UserNotifications

/// Handles the permission prompt, remote-notification registration, and
/// device token capture. Actually delivering a push to this token still
/// requires a real APNs auth key configured server-side (see
/// native/ios/build-status.html) — this half of the pipeline works
/// regardless of that, and a local confirmation notification fires
/// immediately on grant so the person sees proof the toggle did something
/// instead of a silent permission dialog and nothing else.
@MainActor
final class NotificationManager: NSObject, ObservableObject, UNUserNotificationCenterDelegate {
    static let shared = NotificationManager()

    @Published var authorizationStatus: UNAuthorizationStatus = .notDetermined

    override init() {
        super.init()
        UNUserNotificationCenter.current().delegate = self
        Task { await refreshStatus() }
    }

    func refreshStatus() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        authorizationStatus = settings.authorizationStatus
    }

    /// Requests permission, and on grant registers for remote
    /// notifications (the resulting APNs token arrives via
    /// AppDelegate.didRegisterForRemoteNotificationsWithDeviceToken →
    /// SupabaseManager.registerPushToken) and fires a local confirmation
    /// notification.
    func requestPermission() async -> Bool {
        do {
            let granted = try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound])
            await refreshStatus()
            if granted {
                UIApplication.shared.registerForRemoteNotifications()
                await sendConfirmationNotification()
            }
            return granted
        } catch {
            print("Notification permission error: \(error)")
            return false
        }
    }

    private func sendConfirmationNotification() async {
        let content = UNMutableNotificationContent()
        content.title = "Notifications activées"
        content.body = "Vous recevrez une notification à chaque nouvelle offre de votre restaurant."
        content.sound = .default
        let request = UNNotificationRequest(identifier: "notifications-enabled-confirmation", content: content, trigger: UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false))
        try? await UNUserNotificationCenter.current().add(request)
    }

    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
        [.banner, .sound, .list]
    }

    // MARK: - "Viewed but didn't order" reminder

    /// Schedules a purely local, on-device reminder for 2 hours out when
    /// someone views a menu item's detail page but doesn't add it to a
    /// cart during that view — the "menu consulté sans commande" case.
    /// Deliberately local rather than server-driven: no WhatsApp Business
    /// API or extra backend trigger design needed, works entirely off the
    /// permission already granted for order confirmations, and is
    /// trivially cancelled (see cancelMenuViewReminder) the moment the
    /// person actually adds the item to a cart or leaves the app's normal
    /// flow, so it never fires for someone who already acted.
    func scheduleMenuViewReminder(itemName: String, restaurantName: String) {
        guard authorizationStatus == .authorized else { return }
        let content = UNMutableNotificationContent()
        content.title = "Toujours envie de \(itemName) ?"
        content.body = "\(restaurantName) vous attend — votre article est encore au menu."
        content.sound = .default
        let identifier = "menu-view-reminder-\(itemName)"
        let request = UNNotificationRequest(
            identifier: identifier,
            content: content,
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: 2 * 60 * 60, repeats: false)
        )
        UNUserNotificationCenter.current().add(request)
    }

    /// Cancels a pending reminder for this item — call the instant the
    /// item is actually added to a cart, so someone who already acted on
    /// the menu view never gets a "did you forget" nudge.
    func cancelMenuViewReminder(itemName: String) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["menu-view-reminder-\(itemName)"])
    }
}

/// UIKit AppDelegate bridge — SwiftUI's App protocol has no direct hook for
/// didRegisterForRemoteNotificationsWithDeviceToken, so this is the
/// standard way to still receive it in a SwiftUI-lifecycle app.
final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Task { @MainActor in
            await SupabaseManager.shared.registerPushToken(deviceToken)
        }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("Remote notification registration failed: \(error)")
    }
}
