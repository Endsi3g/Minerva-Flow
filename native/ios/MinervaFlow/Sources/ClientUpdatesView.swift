import SwiftUI

/// What changed for customers — and only that. Reads the shared
/// `changelog_entries` source filtered to the client audience, so owner-facing
/// release notes never appear here. Deliberately plain: no versions, no
/// categories, no jargon.
struct ClientUpdatesView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage("appLanguage") private var storedLanguage = AppLanguage.fr.rawValue
    @State private var entries: [NativeChangelogEntry] = []
    @State private var isLoading = true
    @State private var hasError = false

    private var isFrench: Bool { storedLanguage != AppLanguage.en.rawValue }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(isFrench ? "Nouveautés" : "What’s new")
                        .font(MinervaFont.display(32, weight: .semibold))
                        .foregroundStyle(MinervaColor.ink)
                        .accessibilityAddTraits(.isHeader)
                    Text(isFrench ? "Ce qui change pour vous." : "What changes for you.")
                        .font(.mv(size: 16))
                        .foregroundStyle(MinervaColor.inkSoft)
                }

                if isLoading && entries.isEmpty {
                    loading
                } else if hasError && entries.isEmpty {
                    errorState
                } else if entries.isEmpty {
                    emptyState
                } else {
                    ForEach(entries) { entry in card(entry) }
                }
            }
            .frame(maxWidth: 640, alignment: .leading)
            .frame(maxWidth: .infinity)
            .padding(20)
        }
        .background(MinervaColor.cream.ignoresSafeArea())
        .navigationTitle(isFrench ? "Nouveautés" : "What’s new")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .refreshable { await load() }
    }

    private func card(_ entry: NativeChangelogEntry) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                if isRecent(entry.publishedAt) {
                    Text(isFrench ? "Nouveau" : "New")
                        .font(.mv(size: 11.5, weight: .semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8).padding(.vertical, 4)
                        .background(MinervaColor.emerald)
                        .clipShape(Capsule())
                }
                Text(formattedDate(entry.publishedAt))
                    .font(.mv(size: 13, weight: .medium, design: .rounded))
                    .foregroundStyle(MinervaColor.inkFaint)
            }
            Text(entry.title)
                .font(MinervaFont.display(21, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityAddTraits(.isHeader)
            VStack(alignment: .leading, spacing: 6) {
                ForEach(Array(Self.plainLines(entry.description).enumerated()), id: \.offset) { _, line in
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        if line.isBullet {
                            Circle().fill(MinervaColor.emerald).frame(width: 5, height: 5).offset(y: -2)
                        }
                        Text(line.text)
                            .font(.mv(size: 15.5))
                            .lineSpacing(4)
                            .foregroundStyle(MinervaColor.inkSoft)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(MinervaColor.surface)
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(MinervaColor.border, lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .accessibilityElement(children: .contain)
    }

    private var loading: some View {
        VStack(spacing: 14) {
            ForEach(0..<2, id: \.self) { _ in
                VStack(alignment: .leading, spacing: 10) {
                    SkeletonBlock(cornerRadius: 5).frame(width: 90, height: 12)
                    SkeletonBlock(cornerRadius: 5).frame(height: 22)
                    SkeletonBlock(cornerRadius: 5).frame(height: 48)
                }
                .padding(18)
                .background(MinervaColor.surface)
                .clipShape(RoundedRectangle(cornerRadius: 18))
            }
        }
        .accessibilityLabel(isFrench ? "Chargement" : "Loading")
    }

    private var emptyState: some View {
        ContentUnavailableView(
            isFrench ? "Rien de nouveau pour l’instant" : "Nothing new yet",
            systemImage: "sparkles",
            description: Text(isFrench
                ? "Quand quelque chose change pour vous, vous le verrez ici."
                : "When something changes for you, you’ll see it here.")
        )
        .foregroundStyle(MinervaColor.inkSoft)
        .padding(.top, 24)
    }

    private var errorState: some View {
        ContentUnavailableView {
            Label(isFrench ? "Impossible de charger" : "Couldn’t load", systemImage: "wifi.exclamationmark")
        } description: {
            Text(isFrench ? "Vérifiez votre connexion, puis réessayez." : "Check your connection and try again.")
        } actions: {
            Button(isFrench ? "Réessayer" : "Try again", systemImage: "arrow.clockwise") { Task { await load() } }
                .buttonStyle(.borderedProminent)
                .tint(MinervaColor.emeraldDark)
        }
        .foregroundStyle(MinervaColor.inkSoft)
        .padding(.top, 24)
    }

    @MainActor
    private func load() async {
        isLoading = true
        hasError = false
        defer { isLoading = false }
        do {
            entries = try await supabase.fetchNativeChangelog(audience: "client")
        } catch {
            AppLog.failure("fetchClientUpdates", error)
            hasError = true
        }
    }

    private func parsedDate(_ value: String) -> Date? {
        let plain = ISO8601DateFormatter()
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return plain.date(from: value) ?? fractional.date(from: value)
    }

    private func isRecent(_ value: String) -> Bool {
        guard let date = parsedDate(value) else { return false }
        return date > Date().addingTimeInterval(-14 * 24 * 3600)
    }

    private func formattedDate(_ value: String) -> String {
        guard let date = parsedDate(value) else { return value }
        return date.formatted(.dateTime.locale(Locale(identifier: isFrench ? "fr_CA" : "en_CA")).month(.wide).day().year())
    }

    struct Line: Equatable { let text: String; let isBullet: Bool }

    /// Release text is stored as light markdown. Show it as plain sentences:
    /// bullets stay bullets, bold/links/code marks are dropped.
    static func plainLines(_ markdown: String) -> [Line] {
        markdown.split(separator: "\n", omittingEmptySubsequences: true).compactMap { raw in
            var text = raw.trimmingCharacters(in: .whitespaces)
            let isBullet = text.hasPrefix("- ") || text.hasPrefix("* ")
            if isBullet { text = String(text.dropFirst(2)) }
            text = text.replacingOccurrences(of: #"\[([^\]]+)\]\([^)]*\)"#, with: "$1", options: .regularExpression)
            text = text.replacingOccurrences(of: "**", with: "").replacingOccurrences(of: "`", with: "")
            text = text.trimmingCharacters(in: .whitespaces)
            return text.isEmpty ? nil : Line(text: text, isBullet: isBullet)
        }
    }
}
