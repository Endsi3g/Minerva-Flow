import SwiftUI

struct NativeRealtimeStatusPill: View {
    @EnvironmentObject private var supabase: SupabaseManager
    let isFrench: Bool

    private var title: String {
        switch supabase.realtimeStatus {
        case "live": return isFrench ? "En direct" : "Live"
        case "connecting": return isFrench ? "Connexion…" : "Connecting…"
        case "reconnecting": return isFrench ? "Reconnexion…" : "Reconnecting…"
        case "offline": return isFrench ? "Hors ligne" : "Offline"
        default: return isFrench ? "En attente" : "Waiting"
        }
    }

    private var color: Color {
        switch supabase.realtimeStatus {
        case "live": return MinervaColor.emeraldDark
        case "offline": return .red
        case "connecting", "reconnecting": return .orange
        default: return MinervaColor.inkFaint
        }
    }

    var body: some View {
        HStack(spacing: 5) {
            Circle().fill(color).frame(width: 6, height: 6)
            Text(title).font(.mv(size: 10, weight: .medium))
        }
        .foregroundStyle(color)
        .padding(.horizontal, 8)
        .padding(.vertical, 5)
        .background(color.opacity(0.08), in: Capsule())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(isFrench ? "État de la connexion temps réel : \(title)" : "Realtime connection: \(title)")
    }
}
