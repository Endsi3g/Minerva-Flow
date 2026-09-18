import WidgetKit
import SwiftUI

private let cream = Color(red: 0xF5 / 255, green: 0xF1 / 255, blue: 0xE6 / 255)
private let ink = Color(red: 0x1B / 255, green: 0x26 / 255, blue: 0x20 / 255)
private let inkFaint = Color(red: 0x8A / 255, green: 0x91 / 255, blue: 0x88 / 255)
private let emerald = Color(red: 0x16 / 255, green: 0x7F / 255, blue: 0x5B / 255)
private enum MinervaColorFallback {
    static let emeraldDark = Color(red: 0x0E / 255, green: 0x5A / 255, blue: 0x40 / 255)
}

/// Deep-link targets handled by RootView's .onOpenURL — "home" is the
/// default tap target everywhere in this widget (points/tier live on
/// Home), "rewards" is used only by the large widget's own "prochaine
/// récompense" row so that one specific element opens somewhere more
/// relevant than the rest of the widget.
private enum WidgetDeepLink {
    static let home = URL(string: "minervaflow://home")!
    static let rewards = URL(string: "minervaflow://rewards")!
}

struct PointsEntry: TimelineEntry {
    let date: Date
    let snapshot: PointsSnapshot?
}

/// No network call here — widgets get a tight execution budget, so this
/// only ever reads whatever SupabaseManager last wrote to the shared App
/// Group container (see Shared/PointsSnapshot.swift's own comment). A
/// fresh app open naturally keeps the widget current since that's exactly
/// when loadPortalData() runs and re-saves the snapshot.
struct PointsTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> PointsEntry {
        PointsEntry(date: Date(), snapshot: PointsSnapshot(
            customerName: "Vous",
            restaurantName: "Votre restaurant",
            points: 180,
            tierLabel: "Habitué",
            tierColorHex: "167F5B",
            tierIsLight: false,
            nextTierProgress: 0.6,
            nextRewardName: "Café ou thé offert",
            nextRewardPointsCost: 50,
            activeOfferTitles: ["Café gratuit à l'achat d'une pâtisserie"],
            updatedAt: Date()
        ))
    }

    func getSnapshot(in context: Context, completion: @escaping (PointsEntry) -> Void) {
        completion(PointsEntry(date: Date(), snapshot: PointsSnapshot.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PointsEntry>) -> Void) {
        let entry = PointsEntry(date: Date(), snapshot: PointsSnapshot.load())
        // Widgets can't push their own updates — this just asks the
        // system to re-render (re-reading the App Group) roughly hourly,
        // a reasonable cadence for a loyalty points balance.
        let nextRefresh = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date().addingTimeInterval(3600)
        completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
    }
}

struct MinervaFlowWidgetEntryView: View {
    var entry: PointsTimelineProvider.Entry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        Group {
            if let snapshot = entry.snapshot {
                switch family {
                case .systemLarge:
                    largeContent(for: snapshot)
                case .accessoryCircular:
                    circularAccessory(for: snapshot)
                case .accessoryRectangular:
                    rectangularAccessory(for: snapshot)
                case .accessoryInline:
                    inlineAccessory(for: snapshot)
                case .systemMedium:
                    mediumContent(for: snapshot)
                default:
                    smallContent(for: snapshot)
                }
            } else {
                emptyState
            }
        }
        .widgetURL(WidgetDeepLink.home)
    }

    // MARK: - Home screen sizes

    private func smallContent(for snapshot: PointsSnapshot) -> some View {
        let tierColor = Color(hex: snapshot.tierColorHex) ?? emerald
        let foreground: Color = snapshot.tierIsLight ? ink : .white
        return VStack(alignment: .leading, spacing: 6) {
            brandHeader(for: snapshot, foreground: foreground, compact: true)
            Spacer(minLength: 8)
            Text("\(snapshot.points)")
                .font(.system(size: 38, weight: .bold, design: .rounded))
                .foregroundStyle(foreground)
                .minimumScaleFactor(0.75)
                .privacySensitive()
            Text("points")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(foreground.opacity(0.75))
            Spacer(minLength: 0)
            Text("Voir mes récompenses")
                .font(.system(size: 9.5, weight: .semibold))
                .foregroundStyle(foreground.opacity(0.85))
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: [tierColor, MinervaColorFallback.emeraldDark],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
    }

    private func mediumContent(for snapshot: PointsSnapshot) -> some View {
        let tierColor = Color(hex: snapshot.tierColorHex) ?? emerald
        let foreground: Color = snapshot.tierIsLight ? ink : .white
        return HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 3) {
                brandHeader(for: snapshot, foreground: foreground, compact: false)
                Spacer(minLength: 5)
                Text("\(snapshot.points)")
                    .font(.system(size: 40, weight: .bold, design: .rounded))
                    .foregroundStyle(foreground)
                    .minimumScaleFactor(0.7)
                    .privacySensitive()
                Text("points disponibles")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(foreground.opacity(0.75))
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Rectangle()
                .fill(foreground.opacity(0.2))
                .frame(width: 1)

            VStack(alignment: .leading, spacing: 7) {
                Text("PROCHAINE RÉCOMPENSE")
                    .font(.system(size: 8, weight: .bold))
                    .tracking(0.35)
                    .foregroundStyle(foreground.opacity(0.68))
                if let rewardName = snapshot.nextRewardName, let cost = snapshot.nextRewardPointsCost {
                    HStack(spacing: 5) {
                        Image(systemName: "gift.fill").font(.system(size: 10))
                        Text(rewardName)
                            .font(.system(size: 11, weight: .semibold))
                            .lineLimit(2)
                    }
                    .foregroundStyle(foreground)
                    Text("\(cost) pts pour l'obtenir")
                        .font(.system(size: 9.5, weight: .medium))
                        .foregroundStyle(foreground.opacity(0.72))
                } else {
                    Text("Continuez à visiter votre restaurant")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(foreground.opacity(0.8))
                        .lineLimit(2)
                }
                if let progress = snapshot.nextTierProgress {
                    ProgressView(value: progress)
                        .tint(foreground)
                    Text("\(snapshot.activeOfferTitles.count) offre\(snapshot.activeOfferTitles.count == 1 ? "" : "s") active\(snapshot.activeOfferTitles.count == 1 ? "" : "s")")
                        .font(.system(size: 9.5, weight: .semibold))
                        .foregroundStyle(foreground.opacity(0.75))
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(
            LinearGradient(colors: [tierColor, MinervaColorFallback.emeraldDark], startPoint: .topLeading, endPoint: .bottomTrailing)
        )
    }

    private func brandHeader(for snapshot: PointsSnapshot, foreground: Color, compact: Bool) -> some View {
        HStack(spacing: 6) {
            Image(systemName: "sparkles")
                .font(.system(size: compact ? 10 : 11, weight: .bold))
                .foregroundStyle(foreground.opacity(0.9))
            VStack(alignment: .leading, spacing: 1) {
                Text("MINERVA FLOW")
                    .font(.system(size: compact ? 7.5 : 8, weight: .bold))
                    .tracking(0.55)
                    .foregroundStyle(foreground.opacity(0.68))
                Text(snapshot.restaurantName)
                    .font(.system(size: compact ? 10 : 10.5, weight: .semibold))
                    .foregroundStyle(foreground.opacity(0.9))
                    .lineLimit(1)
            }
            Spacer(minLength: 4)
            Text(snapshot.tierLabel.uppercased())
                .font(.system(size: compact ? 8 : 8.5, weight: .bold))
                .tracking(0.3)
                .foregroundStyle(foreground)
                .padding(.horizontal, 6)
                .padding(.vertical, 4)
                .background(foreground.opacity(0.14))
                .clipShape(Capsule())
        }
    }

    // MARK: - Large

    private func largeContent(for snapshot: PointsSnapshot) -> some View {
        let tierColor = Color(hex: snapshot.tierColorHex) ?? emerald
        let foreground: Color = snapshot.tierIsLight ? ink : .white
        return VStack(alignment: .leading, spacing: 10) {
            brandHeader(for: snapshot, foreground: foreground, compact: false)
            Text("VOTRE CARTE FIDÉLITÉ")
                .font(.system(size: 9, weight: .bold))
                .tracking(0.7)
                .foregroundStyle(foreground.opacity(0.65))

            Text("\(snapshot.points)")
                .font(.system(size: 44, weight: .bold, design: .rounded))
                .foregroundStyle(foreground)
                .widgetAccentable()
                .privacySensitive()
            Text("points")
                .font(.system(size: 11.5, weight: .medium))
                .foregroundStyle(foreground.opacity(0.75))

            if let progress = snapshot.nextTierProgress {
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule().fill(foreground.opacity(0.2))
                        Capsule().fill(foreground).frame(width: max(geo.size.width * 0.04, geo.size.width * progress))
                    }
                }
                .frame(height: 5)
                .padding(.top, 2)
            }

            Spacer(minLength: 4)

            if let rewardName = snapshot.nextRewardName, let cost = snapshot.nextRewardPointsCost {
                Link(destination: WidgetDeepLink.rewards) {
                    HStack(spacing: 6) {
                        Image(systemName: "gift.fill").font(.system(size: 10))
                        Text("\(rewardName) · \(cost) pts")
                            .font(.system(size: 11, weight: .semibold))
                            .lineLimit(1)
                        Spacer(minLength: 0)
                        Image(systemName: "chevron.right").font(.system(size: 9, weight: .semibold))
                    }
                    .foregroundStyle(foreground)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 7)
                    .background(foreground.opacity(0.16))
                    .clipShape(RoundedRectangle(cornerRadius: 9))
                }
            }

            if !snapshot.activeOfferTitles.isEmpty {
                Text("OFFRES ACTIVES")
                    .font(.system(size: 8.5, weight: .bold))
                    .tracking(0.55)
                    .foregroundStyle(foreground.opacity(0.6))
                ForEach(snapshot.activeOfferTitles.prefix(2), id: \.self) { title in
                    HStack(spacing: 6) {
                        Image(systemName: "tag.fill").font(.system(size: 9))
                        Text(title)
                            .font(.system(size: 10.5, weight: .medium))
                            .lineLimit(1)
                    }
                    .foregroundStyle(foreground.opacity(0.85))
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(
            LinearGradient(colors: [tierColor, MinervaColorFallback.emeraldDark], startPoint: .topLeading, endPoint: .bottomTrailing)
        )
    }

    // MARK: - Lock Screen (accessory families)
    // These render in the system's own monochrome tint on the lock
    // screen — the widget's brand colors never actually show here, by
    // design of the platform, so these deliberately use plain text/shape
    // primitives rather than the tierColor backgrounds above.

    private func circularAccessory(for snapshot: PointsSnapshot) -> some View {
        Gauge(value: snapshot.nextTierProgress ?? 1) {
            Text("pts")
        } currentValueLabel: {
            Text("\(snapshot.points)")
                .font(.system(size: 14, weight: .bold, design: .rounded))
        }
        .gaugeStyle(.accessoryCircularCapacity)
    }

    private func rectangularAccessory(for snapshot: PointsSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            Text("\(snapshot.points) pts")
                .font(.system(size: 15, weight: .bold, design: .rounded))
                .widgetAccentable()
            Text(snapshot.tierLabel)
                .font(.system(size: 11))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func inlineAccessory(for snapshot: PointsSnapshot) -> some View {
        Text("\(snapshot.points) pts · \(snapshot.tierLabel)")
    }

    private var emptyState: some View {
        Group {
            switch family {
            case .accessoryCircular:
                Image(systemName: "sparkles")
            case .accessoryRectangular:
                Text("Ouvrez Minerva Flow")
                    .font(.system(size: 12))
            case .accessoryInline:
                Text("Minerva Flow")
            default:
                VStack(spacing: 8) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundStyle(emerald)
                    Text("Vos points apparaîtront ici")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(ink)
                        .multilineTextAlignment(.center)
                    Text("Ouvrez Minerva Flow pour synchroniser votre carte")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(inkFaint)
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(cream)
            }
        }
    }
}

struct MinervaFlowWidget: Widget {
    let kind = "MinervaFlowPointsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PointsTimelineProvider()) { entry in
            MinervaFlowWidgetEntryView(entry: entry)
                .containerBackground(for: .widget) { Color.clear }
        }
        .configurationDisplayName("Solde de points")
        .description("Votre solde, votre niveau et votre prochaine récompense, toujours à portée de main.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

#Preview("Accueil — petit", as: .systemSmall) {
    MinervaFlowWidget()
} timeline: {
    PointsEntry.preview
}

#Preview("Accueil — moyen", as: .systemMedium) {
    MinervaFlowWidget()
} timeline: {
    PointsEntry.preview
}

#Preview("Accueil — grand", as: .systemLarge) {
    MinervaFlowWidget()
} timeline: {
    PointsEntry.preview
}

#Preview("Écran verrouillé — circulaire", as: .accessoryCircular) {
    MinervaFlowWidget()
} timeline: {
    PointsEntry.preview
}

#Preview("Écran verrouillé — rectangulaire", as: .accessoryRectangular) {
    MinervaFlowWidget()
} timeline: {
    PointsEntry.preview
}

#Preview("Écran verrouillé — ligne", as: .accessoryInline) {
    MinervaFlowWidget()
} timeline: {
    PointsEntry.preview
}

private extension PointsEntry {
    static let preview = PointsEntry(date: .now, snapshot: PointsSnapshot(
        customerName: "Alex",
        restaurantName: "Café Minerva",
        points: 280,
        tierLabel: "Privilégié",
        tierColorHex: "167F5B",
        tierIsLight: false,
        nextTierProgress: 0.72,
        nextRewardName: "Café offert",
        nextRewardPointsCost: 50,
        activeOfferTitles: ["10 % sur votre prochaine visite", "Doublez vos points ce week-end"],
        updatedAt: .now
    ))
}

@main
struct MinervaFlowWidgetBundle: WidgetBundle {
    var body: some Widget {
        MinervaFlowWidget()
    }
}

private extension Color {
    init?(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")
        guard hexSanitized.count == 6, let rgb = UInt64(hexSanitized, radix: 16) else { return nil }
        self.init(
            red: Double((rgb & 0xFF0000) >> 16) / 255,
            green: Double((rgb & 0x00FF00) >> 8) / 255,
            blue: Double(rgb & 0x0000FF) / 255
        )
    }
}
