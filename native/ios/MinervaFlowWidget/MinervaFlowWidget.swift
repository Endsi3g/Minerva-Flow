import WidgetKit
import SwiftUI

private let cream = Color(red: 0xF5 / 255, green: 0xF1 / 255, blue: 0xE6 / 255)
private let ink = Color(red: 0x1B / 255, green: 0x26 / 255, blue: 0x20 / 255)
private let inkFaint = Color(red: 0x8A / 255, green: 0x91 / 255, blue: 0x88 / 255)
private let emerald = Color(red: 0x16 / 255, green: 0x7F / 255, blue: 0x5B / 255)

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
        if let snapshot = entry.snapshot {
            content(for: snapshot)
        } else {
            emptyState
        }
    }

    private func content(for snapshot: PointsSnapshot) -> some View {
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

    private var emptyState: some View {
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

struct MinervaFlowWidget: Widget {
    let kind = "MinervaFlowPointsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PointsTimelineProvider()) { entry in
            MinervaFlowWidgetEntryView(entry: entry)
                .containerBackground(for: .widget) { Color.clear }
        }
        .configurationDisplayName("Solde de points")
        .description("Votre solde de points de fidélité Minerva Flow, à même l'écran d'accueil.")
        .supportedFamilies([.systemSmall, .systemMedium])
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
