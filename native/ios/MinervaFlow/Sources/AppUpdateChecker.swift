import SwiftUI

/// Asks the App Store whether a newer build than the installed one exists, so
/// the Updates screen can offer a one-tap "Update". Silent when the app is not
/// listed (TestFlight, development): no result means no banner.
@MainActor
final class AppUpdateChecker: ObservableObject {
    @Published private(set) var latestVersion: String?
    @Published private(set) var storeURL: URL?

    private struct Lookup: Decodable {
        struct Result: Decodable { let version: String; let trackViewUrl: String }
        let results: [Result]
    }

    var installedVersion: String { Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0" }

    var updateAvailable: Bool {
        guard let latestVersion else { return false }
        return latestVersion.compare(installedVersion, options: .numeric) == .orderedDescending
    }

    func check() async {
        guard let bundleId = Bundle.main.bundleIdentifier,
              let url = URL(string: "https://itunes.apple.com/lookup?bundleId=\(bundleId)&country=ca") else { return }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let result = try JSONDecoder().decode(Lookup.self, from: data).results.first
            latestVersion = result?.version
            storeURL = result.flatMap { URL(string: $0.trackViewUrl) }
        } catch {
            AppLog.failure("appUpdateCheck", error)
        }
    }
}

/// Banner shown on top of the Updates screen when a newer version is out.
struct AppUpdateBanner: View {
    @StateObject private var checker = AppUpdateChecker()
    @Environment(\.openURL) private var openURL
    let isFrench: Bool

    var body: some View {
        Group {
            if checker.updateAvailable, let version = checker.latestVersion, let url = checker.storeURL {
                HStack(spacing: 10) {
                    Image(systemName: "arrow.down.circle.fill").font(.mv(size: 18)).foregroundStyle(MinervaColor.emeraldDark)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(isFrench ? "Une nouvelle version est disponible" : "A new version is available").font(.mv(size: 14, weight: .semibold))
                        Text("\(isFrench ? "Version" : "Version") \(version)").font(.mv(size: 12)).foregroundStyle(MinervaColor.inkSoft)
                    }
                    Spacer(minLength: 6)
                    Button(isFrench ? "Mettre à jour" : "Update") { openURL(url) }
                        .font(.mv(size: 13, weight: .semibold)).foregroundStyle(.white)
                        .padding(.horizontal, 14).frame(minHeight: 34)
                        .background(MinervaColor.emeraldDark, in: Capsule())
                }
                .padding(12)
                .background(MinervaColor.emerald.opacity(0.1), in: RoundedRectangle(cornerRadius: 16))
            }
        }
        .task { await checker.check() }
    }
}
