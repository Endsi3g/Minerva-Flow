import SwiftUI

/// Small circular progress indicator matching the web dashboard's
/// RadialGauge widget (components/minerva/RadialGauge.tsx) — same visual
/// language (thin emerald ring, big centered value, small caption label)
/// so the customer app's metric tiles read as the same design system as
/// the owner's web Overview, just applied to loyalty data instead of
/// business metrics.
struct RadialGauge: View {
    let value: Double // 0...100
    let centerValue: String
    let centerLabel: String
    var color: Color = MinervaColor.emerald

    var body: some View {
        ZStack {
            Circle()
                .stroke(color.opacity(0.15), lineWidth: 6)
            Circle()
                .trim(from: 0, to: max(0.02, min(1, value / 100)))
                .stroke(color, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                .rotationEffect(.degrees(-90))
            VStack(spacing: 0) {
                Text(centerValue)
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundStyle(MinervaColor.ink)
                // An empty label string still reserves its own line height,
                // which pushes the value above true center — only lay out
                // a second line when there's real text to show.
                if !centerLabel.isEmpty {
                    Text(centerLabel)
                        .font(.system(size: 8.5, weight: .medium))
                        .foregroundStyle(MinervaColor.inkFaint)
                }
            }
        }
        .frame(width: 56, height: 56)
    }
}
