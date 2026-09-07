import WidgetKit
import SwiftUI

private let cream = Color(red: 0xF5 / 255, green: 0xF1 / 255, blue: 0xE6 / 255)
private let ink = Color(red: 0x1B / 255, green: 0x26 / 255, blue: 0x20 / 255)
private let inkFaint = Color(red: 0x8A / 255, green: 0x91 / 255, blue: 0x88 / 255)
private let emerald = Color(red: 0x16 / 255, green: 0x7F / 255, blue: 0x5B / 255)

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
                default:
                    compactContent(for: snapshot)
                }
            } else {
                emptyState
            }
        }
        .widgetURL(WidgetDeepLink.home)
    }

    // MARK: - Small / Medium (unchanged design, just renamed)

    private func compactContent(for snapshot: PointsSnapshot) -> some View {
        let tierColor = Color(hex: snapshot.tierColorHex) ?? emerald
        let foreground: Color = snapshot.tierIsLight ? ink : .white
        return VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(snapshot.restaurantName)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(foreground.opacity(0.75))
                    .lineLimit(1)
                Spacer()
                Text(snapshot.tierLabel.uppercased())
                    .font(.system(size: 8.5, weight: .bold))
                    .tracking(0.3)
                    .foregroundStyle(foreground.opacity(0.9))
            }
            Spacer(minLength: 2)
            Text("\(snapshot.points)")
                .font(.system(size: family == .systemSmall ? 34 : 40, weight: .bold, design: .rounded))
                .foregroundStyle(foreground)
            Text("points")
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(foreground.opacity(0.75))
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(tierColor)
    }

    // MARK: - Large

    private func largeContent(for snapshot: PointsSnapshot) -> some View {
        let tierColor = Color(hex: snapshot.tierColorHex) ?? emerald
        let foreground: Color = snapshot.tierIsLight ? ink : .white
        return VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(snapshot.restaurantName)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(foreground.opacity(0.75))
                    .lineLimit(1)
                Spacer()
                Text(snapshot.tierLabel.uppercased())
                    .font(.system(size: 9.5, weight: .bold))
                    .tracking(0.3)
                    .foregroundStyle(foreground.opacity(0.9))
            }

            Text("\(snapshot.points)")
                .font(.system(size: 44, weight: .bold, design: .rounded))
                .foregroundStyle(foreground)
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
                    .background(foreground.opacity(0.14))
                    .clipShape(RoundedRectangle(cornerRadius: 9))
                }
            }

            ForEach(snapshot.activeOfferTitles.prefix(2), id: \.self) { title in
                HStack(spacing: 6) {
                    Image(systemName: "tag.fill").font(.system(size: 9))
                    Text(title)
                        .font(.system(size: 10.5))
                        .lineLimit(1)
                }
                .foregroundStyle(foreground.opacity(0.85))
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(tierColor)
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
                VStack(spacing: 6) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 20))
                        .foregroundStyle(inkFaint)
                    Text("Ouvrez Minerva Flow\npour voir vos points")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(ink)
                        .multilineTextAlignment(.center)
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
        .description("Votre solde de points de fidélité Minerva Flow, à même l'écran d'accueil ou verrouillé.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
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
