import SwiftUI

struct NativeChangelogView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss
    @AppStorage("appLanguage") private var storedLanguage = AppLanguage.fr.rawValue
    @State private var entries: [NativeChangelogEntry] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    private var isFrench: Bool { storedLanguage != AppLanguage.en.rawValue }
    private var appVersion: String {
        let info = Bundle.main.infoDictionary ?? [:]
        let version = info["CFBundleShortVersionString"] as? String ?? "—"
        let build = info["CFBundleVersion"] as? String
        return build.map { "\(version) (\($0))" } ?? version
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                header

                if let errorMessage, entries.isEmpty {
                    errorState(errorMessage)
                } else if isLoading && entries.isEmpty {
                    loadingState
                } else if entries.isEmpty {
                    emptyState
                } else {
                    if let errorMessage {
                        errorState(errorMessage)
                    }
                    LazyVStack(alignment: .leading, spacing: 0) {
                        ForEach(Array(entries.enumerated()), id: \.element.id) { index, entry in
                            changelogRow(entry, isLast: index == entries.count - 1)
                        }
                    }
                }
            }
            .frame(maxWidth: 720, alignment: .leading)
            .frame(maxWidth: .infinity, alignment: .top)
            .padding(20)
        }
        .background(MinervaColor.cream.ignoresSafeArea())
        .navigationTitle(isFrench ? "Mises à jour" : "Updates")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button(isFrench ? "Fermer" : "Close") { dismiss() }
                    .foregroundStyle(MinervaColor.emeraldDark)
            }
        }
        .task { await loadEntries() }
        .refreshable { await loadEntries() }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: "sparkles")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(MinervaColor.emeraldDark)
                Text(isFrench ? "JOURNAL PRODUIT" : "PRODUCT HISTORY")
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .tracking(1.1)
                    .foregroundStyle(MinervaColor.inkSoft)
            }

            Text(isFrench ? "Ce qui change." : "What’s changing.")
                .font(MinervaFont.display(32, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)
                .accessibilityAddTraits(.isHeader)

            Text(isFrench
                 ? "Les nouveautés et améliorations de Minerva Flow, au fil des versions."
                 : "New features and improvements in Minerva Flow, release by release.")
                .font(.system(size: 16))
                .lineSpacing(4)
                .foregroundStyle(MinervaColor.inkSoft)
                .fixedSize(horizontal: false, vertical: true)

            HStack(spacing: 7) {
                Circle().fill(MinervaColor.emerald).frame(width: 7, height: 7)
                Text((isFrench ? "Version installée · " : "Installed version · ") + appVersion)
                    .font(.system(size: 13, weight: .medium, design: .rounded))
                    .foregroundStyle(MinervaColor.ink)
            }
            .padding(.top, 2)
            .accessibilityElement(children: .combine)
        }
        .padding(.bottom, 4)
    }

    private var loadingState: some View {
        VStack(alignment: .leading, spacing: 16) {
            ForEach(0..<3, id: \.self) { _ in
                VStack(alignment: .leading, spacing: 10) {
                    SkeletonBlock(cornerRadius: 5).frame(width: 118, height: 12)
                    SkeletonBlock(cornerRadius: 5).frame(height: 21)
                    SkeletonBlock(cornerRadius: 5).frame(height: 54)
                }
                .padding(.vertical, 16)
            }
        }
        .accessibilityLabel(isFrench ? "Chargement des mises à jour" : "Loading updates")
    }

    private var emptyState: some View {
        ContentUnavailableView(
            isFrench ? "Aucune mise à jour" : "No updates yet",
            systemImage: "text.badge.plus",
            description: Text(isFrench
                ? "Les prochaines nouveautés de l’application apparaîtront ici."
                : "The next app updates will appear here.")
        )
        .foregroundStyle(MinervaColor.inkSoft)
        .padding(.vertical, 28)
    }

    private func errorState(_ message: String) -> some View {
        ContentUnavailableView {
            Label(isFrench ? "Historique indisponible" : "History unavailable", systemImage: "wifi.exclamationmark")
        } description: {
            Text(message)
        } actions: {
            Button(isFrench ? "Réessayer" : "Try again", systemImage: "arrow.clockwise") {
                Task { await loadEntries() }
            }
            .buttonStyle(.borderedProminent)
            .tint(MinervaColor.emeraldDark)
        }
        .foregroundStyle(MinervaColor.inkSoft)
        .padding(.vertical, 20)
    }

    private func changelogRow(_ entry: NativeChangelogEntry, isLast: Bool) -> some View {
        HStack(alignment: .top, spacing: 16) {
            VStack(spacing: 0) {
                Circle()
                    .fill(MinervaColor.emerald)
                    .frame(width: 11, height: 11)
                    .padding(.top, 5)
                if !isLast {
                    Rectangle()
                        .fill(MinervaColor.border)
                        .frame(width: 1)
                        .frame(maxHeight: .infinity)
                        .frame(minHeight: 32)
                }
            }
            .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 8) {
                    Text(formattedDate(entry.publishedAt))
                        .font(.system(size: 13, weight: .medium, design: .rounded))
                        .foregroundStyle(MinervaColor.inkFaint)
                    categoryBadge(entry.category)
                }

                Text(entry.title)
                    .font(MinervaFont.display(23, weight: .semibold))
                    .lineSpacing(2)
                    .foregroundStyle(MinervaColor.ink)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityAddTraits(.isHeader)

                Text(.init(entry.description))
                    .font(.system(size: 16))
                    .lineSpacing(5)
                    .foregroundStyle(MinervaColor.inkSoft)
                    .tint(MinervaColor.emeraldDark)
                    .fixedSize(horizontal: false, vertical: true)
                    .textSelection(.enabled)
            }
            .padding(.bottom, isLast ? 0 : 28)
        }
        .accessibilityElement(children: .contain)
    }

    private func categoryBadge(_ category: String) -> some View {
        let label: String
        switch category {
        case "fonctionnalite": label = isFrench ? "Nouveauté" : "Feature"
        case "amelioration": label = isFrench ? "Amélioration" : "Improvement"
        case "correctif": label = isFrench ? "Correctif" : "Fix"
        default: label = isFrench ? "Mise à jour" : "Update"
        }

        return Text(label)
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(MinervaColor.emeraldDark)
            .padding(.horizontal, 9)
            .padding(.vertical, 5)
            .background(MinervaColor.emerald.opacity(0.1))
            .clipShape(Capsule())
    }

    private func formattedDate(_ value: String) -> String {
        let date = ISO8601DateFormatter().date(from: value)
            ?? ISO8601DateFormatter.withFractionalSeconds.date(from: value)
        guard let date else { return value }
        return date.formatted(
            .dateTime
                .locale(Locale(identifier: isFrench ? "fr_CA" : "en_CA"))
                .month(.wide)
                .day()
                .year()
        )
    }

    @MainActor
    private func loadEntries() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            entries = try await supabase.fetchNativeChangelog()
        } catch {
            errorMessage = isFrench
                ? "Vérifiez votre connexion, puis réessayez. Votre compte reste intact."
                : "Check your connection and try again. Your account is unchanged."
        }
    }
}

private extension ISO8601DateFormatter {
    static let withFractionalSeconds: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
}
