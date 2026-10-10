import SwiftUI
import Charts

private let ownerSelectionFeedback = UISelectionFeedbackGenerator()

/// "▲ 12 %" chip. Green up, red down, neutral when there is nothing to compare.
struct OwnerDeltaChip: View {
    let percent: Double?
    var onDark = false

    var body: some View {
        if let percent {
            let up = percent >= 0
            HStack(spacing: 3) {
                Image(systemName: up ? "arrow.up.right" : "arrow.down.right").font(.mv(size: 10, weight: .bold))
                Text(abs(percent) > 999 ? ">999 %" : "\(Int(abs(percent).rounded())) %").font(.mv(size: 12, weight: .bold))
            }
            .foregroundStyle(onDark ? .white : (up ? OwnerTone.good.color : OwnerTone.bad.color))
            .padding(.horizontal, 8).padding(.vertical, 3)
            .background((onDark ? Color.white.opacity(0.18) : (up ? OwnerTone.good.color : OwnerTone.bad.color).opacity(0.12)), in: Capsule())
            .accessibilityLabel(Text(up ? "En hausse de \(Int(percent.rounded())) pour cent" : "En baisse de \(Int(abs(percent).rounded())) pour cent"))
        }
    }
}

/// Emerald hero: sales for the chosen window, drag along the line to read any
/// day. The comparison is with the window of equal length just before.
struct OwnerSalesHeroCard: View {
    /// Full series (oldest first, today last). A day still at zero revenue is
    /// treated as "service in progress" and left out of the line, so the chart
    /// never dives to zero just because tonight's sales are not in yet.
    let rawDaily: [OwnerDailySales]
    let monthOrders: Int
    let todayOrders: Int
    let isRefreshing: Bool
    let L: Lx

    @State private var range: OwnerSalesRange = .week
    @State private var selectedDate: Date?
    @State private var showExplainer = false

    private var daily: [OwnerDailySales] {
        guard let last = rawDaily.last, last.revenue == 0, Calendar.current.isDateInToday(last.day) else { return rawDaily }
        return Array(rawDaily.dropLast())
    }

    private var points: [OwnerDailySales] { range.current(in: daily) }
    private var total: Double { points.reduce(0) { $0 + $1.revenue } }
    private var previousTotal: Double { range.previous(in: daily).reduce(0) { $0 + $1.revenue } }
    private var orderCount: Int { points.reduce(0) { $0 + $1.orders } }

    private var selectedPoint: OwnerDailySales? {
        guard let selectedDate else { return nil }
        return points.min { abs($0.day.timeIntervalSince(selectedDate)) < abs($1.day.timeIntervalSince(selectedDate)) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(selectedPoint.map { $0.day.formatted(.dateTime.weekday(.wide).day().month(.abbreviated)).capitalized } ?? range.caption(L))
                    .font(.mv(size: 12.5, weight: .medium)).foregroundStyle(.white.opacity(0.85)).lineLimit(1)
                Button { showExplainer = true } label: {
                    Image(systemName: "info.circle").font(.mv(size: 13, weight: .semibold)).foregroundStyle(.white.opacity(0.75))
                }
                .buttonStyle(.plain)
                .accessibilityLabel(Text(L("À quoi sert ce graphique ?", "What is this chart for?")))
                Spacer(minLength: 8)
                rangePicker
            }

            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text((selectedPoint?.revenue ?? total).cad)
                    .font(MinervaFont.display(30, weight: .semibold)).foregroundStyle(.white)
                    .lineLimit(1).minimumScaleFactor(0.6)
                    .contentTransition(.numericText())
                if selectedPoint == nil {
                    OwnerDeltaChip(percent: ownerPercentChange(current: total, previous: previousTotal), onDark: true)
                }
            }
            if selectedPoint == nil, ownerPercentChange(current: total, previous: previousTotal) != nil {
                Text(range.previousLabel(L)).font(.mv(size: 12)).foregroundStyle(.white.opacity(0.7))
            } else if let selectedPoint {
                Text(L("\(selectedPoint.orders) \(selectedPoint.orders > 1 ? "commandes" : "commande")", "\(selectedPoint.orders) \(selectedPoint.orders == 1 ? "order" : "orders")"))
                    .font(.mv(size: 12)).foregroundStyle(.white.opacity(0.7))
            }

            chart
                .frame(height: 120)
                .padding(.top, 4)

            HStack(spacing: 6) {
                Text(L("\(orderCount) \(orderCount > 1 ? "commandes" : "commande") · \(todayOrders) aujourd'hui", "\(orderCount) \(orderCount == 1 ? "order" : "orders") · \(todayOrders) today"))
                    .font(.mv(size: 12.5)).foregroundStyle(.white.opacity(0.78))
                if isRefreshing { ProgressView().controlSize(.mini).tint(.white) }
            }
            if let insight = ownerWeekdayInsight(rawDaily) {
                Text(insightText(insight))
                    .font(.mv(size: 12)).foregroundStyle(.white.opacity(0.78))
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .sheet(isPresented: $showExplainer) { OwnerChartExplainerSheet(L: L) }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(MinervaColor.emeraldDeep, in: RoundedRectangle(cornerRadius: 28))
        .animation(.easeOut(duration: 0.18), value: selectedPoint?.day)
    }

    private func insightText(_ insight: OwnerWeekdayInsight) -> String {
        let best = ownerWeekdayName(insight.best.weekday, french: L.fr)
        var text = L("Votre meilleur jour : \(best) (≈ \(insight.best.average.cad) en moyenne).", "Your best day: \(best) (≈ \(insight.best.average.cad) on average).")
        if let weakest = insight.weakest {
            let quiet = ownerWeekdayName(weakest.weekday, french: L.fr)
            text += L(" Le plus calme : \(quiet) (≈ \(weakest.average.cad)).", " Quietest: \(quiet) (≈ \(weakest.average.cad)).")
        }
        return text
    }

    private var rangePicker: some View {
        HStack(spacing: 2) {
            ForEach(OwnerSalesRange.allCases, id: \.self) { option in
                Button {
                    selectedDate = nil
                    withAnimation(.easeInOut(duration: 0.25)) { range = option }
                } label: {
                    Text(option.title(L))
                        .font(.mv(size: 11.5, weight: .semibold))
                        .foregroundStyle(option == range ? MinervaColor.emeraldDeep : .white.opacity(0.8))
                        .padding(.horizontal, 8).frame(minHeight: 24)
                        .background(option == range ? Color.white : Color.clear, in: Capsule())
                        .contentShape(Capsule())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(2)
        .background(Color.white.opacity(0.12), in: Capsule())
    }

    private var chart: some View {
        Chart {
            ForEach(points) { point in
                AreaMark(x: .value("Jour", point.day, unit: .day), y: .value("Ventes", point.revenue))
                    .interpolationMethod(.catmullRom)
                    .foregroundStyle(LinearGradient(colors: [.white.opacity(0.30), .white.opacity(0.0)], startPoint: .top, endPoint: .bottom))
                LineMark(x: .value("Jour", point.day, unit: .day), y: .value("Ventes", point.revenue))
                    .interpolationMethod(.catmullRom)
                    .lineStyle(StrokeStyle(lineWidth: 2.5, lineCap: .round))
                    .foregroundStyle(.white)
            }
            if let selectedPoint {
                RuleMark(x: .value("Jour", selectedPoint.day, unit: .day))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [3, 3]))
                    .foregroundStyle(.white.opacity(0.55))
                PointMark(x: .value("Jour", selectedPoint.day, unit: .day), y: .value("Ventes", selectedPoint.revenue))
                    .symbolSize(70).foregroundStyle(.white)
            }
        }
        .chartXSelection(value: $selectedDate)
        .chartYScale(domain: .automatic(includesZero: true))
        .chartYAxis(.hidden)
        .chartXAxis {
            AxisMarks(values: .stride(by: .day, count: range == .week ? 1 : 7)) { _ in
                AxisValueLabel(format: range == .week ? .dateTime.weekday(.narrow) : .dateTime.day().month(.abbreviated), anchor: .top)
                    .font(.mv(size: 10.5)).foregroundStyle(.white.opacity(0.65))
            }
        }
        .onChange(of: selectedPoint?.day) { _, new in
            if new != nil { ownerSelectionFeedback.selectionChanged() }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text(L("Graphique des ventes. Total \(total.cad).", "Sales chart. Total \(total.cad).")))
    }
}

/// Today at a glance: three figures, each compared with the same weekday last
/// week (the fairest comparison for a restaurant).
struct OwnerTodayCard: View {
    let daily: [OwnerDailySales]
    let liveOrdersToday: Int
    let L: Lx

    private var today: OwnerDailySales? { daily.last }
    private var sameWeekdayLastWeek: OwnerDailySales? { daily.count >= 8 ? daily[daily.count - 8] : nil }
    private var orders: Int { max(today?.orders ?? 0, liveOrdersToday) }
    private var revenue: Double { today?.revenue ?? 0 }

    var body: some View {
        OwnerCard(padding: 14) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text(L("Aujourd'hui", "Today")).font(.mv(size: 13, weight: .semibold)).foregroundStyle(MinervaColor.inkSoft)
                    Spacer()
                    Text(L("vs même jour la sem. dernière", "vs same day last week")).font(.mv(size: 11)).foregroundStyle(MinervaColor.inkFaint)
                }
                HStack(alignment: .top, spacing: 0) {
                    figure(L("Ventes", "Sales"), revenue > 0 ? revenue.cad : "—",
                           delta: revenue > 0 ? ownerPercentChange(current: revenue, previous: sameWeekdayLastWeek?.revenue ?? 0) : nil)
                    divider
                    figure(L("Commandes", "Orders"), "\(orders)",
                           delta: orders > 0 ? ownerPercentChange(current: Double(orders), previous: Double(sameWeekdayLastWeek?.orders ?? 0)) : nil)
                    divider
                    figure(L("Panier moyen", "Avg. basket"), (revenue > 0 && orders > 0) ? (revenue / Double(orders)).cad : "—", delta: nil)
                }
            }
        }
    }

    private var divider: some View {
        Rectangle().fill(MinervaColor.border.opacity(0.8)).frame(width: 1, height: 44).padding(.horizontal, 10)
    }

    private func figure(_ label: String, _ value: String, delta: Double?) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label).font(.mv(size: 11.5)).foregroundStyle(MinervaColor.inkSoft).lineLimit(1)
            Text(value).font(MinervaFont.display(21, weight: .semibold)).foregroundStyle(MinervaColor.ink)
                .lineLimit(1).minimumScaleFactor(0.6)
            if delta != nil { OwnerDeltaChip(percent: delta) } else { Color.clear.frame(height: 20) }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }
}

/// Four compact loyalty/reputation figures for the last 7 days.
struct OwnerWeekCard: View {
    let week: OwnerInsights.Week
    let L: Lx

    var body: some View {
        OwnerCard(padding: 14) {
            VStack(alignment: .leading, spacing: 14) {
                Text(L("Fidélité · 7 derniers jours", "Loyalty · last 7 days")).font(.mv(size: 13, weight: .semibold)).foregroundStyle(MinervaColor.inkSoft)
                LazyVGrid(columns: [GridItem(.flexible(), spacing: 16), GridItem(.flexible(), spacing: 16)], alignment: .leading, spacing: 16) {
                    metric("person.badge.plus", "\(week.newCustomers)", L("Nouveaux clients", "New customers"),
                           detail: week.members > 0 ? "\(week.members) " + L("au total", "in total") : nil)
                    metric("arrow.triangle.2.circlepath", week.returningPct.map { "\($0) %" } ?? "—", L("Clients qui reviennent", "Returning customers"), detail: nil)
                    metric("heart.text.square.fill", "\(week.creditedVisits)", L("Visites créditées", "Visits credited"),
                           detail: week.redemptions > 0 ? "\(week.redemptions) " + L(week.redemptions > 1 ? "échangées" : "échangée", "redeemed") : nil)
                    metric("star.fill", week.reviewAvg.map { String(format: "%.1f", $0) } ?? "—", L("Note moyenne", "Average rating"),
                           detail: week.reviewCount > 0 ? "\(week.reviewCount) " + L(week.reviewCount > 1 ? "avis" : "avis", week.reviewCount == 1 ? "review" : "reviews") : nil)
                }
            }
        }
    }

    private func metric(_ icon: String, _ value: String, _ label: String, detail: String?) -> some View {
        HStack(alignment: .top, spacing: 10) {
            OwnerIconTile(icon: icon, tint: OwnerTone.good.color, size: 32)
            VStack(alignment: .leading, spacing: 2) {
                Text(value).font(MinervaFont.display(22, weight: .semibold)).foregroundStyle(MinervaColor.ink).lineLimit(1).minimumScaleFactor(0.7)
                Text(label).font(.mv(size: 11.5)).foregroundStyle(MinervaColor.inkSoft).lineLimit(2)
                if let detail { Text(detail).font(.mv(size: 11, weight: .semibold)).foregroundStyle(OwnerTone.good.color).lineLimit(1) }
            }
            Spacer(minLength: 0)
        }
        .accessibilityElement(children: .combine)
    }
}

/// Best sellers of the week as quiet horizontal bars.
struct OwnerTopItemsCard: View {
    let items: [OwnerInsights.Item]
    let L: Lx

    var body: some View {
        let maxQty = max(items.map(\.quantity).max() ?? 1, 1)
        OwnerCard(padding: 14) {
            VStack(alignment: .leading, spacing: 12) {
                Text(L("Ce qui se vend · 7 jours", "Best sellers · 7 days")).font(.mv(size: 13, weight: .semibold)).foregroundStyle(MinervaColor.inkSoft)
                ForEach(Array(items.prefix(4).enumerated()), id: \.element.id) { index, item in
                    VStack(alignment: .leading, spacing: 5) {
                        HStack {
                            Text(item.name).font(.mv(size: 14, weight: .medium)).foregroundStyle(MinervaColor.ink).lineLimit(1)
                            Spacer(minLength: 8)
                            Text("\(item.quantity)").font(.mv(size: 13, weight: .semibold)).foregroundStyle(MinervaColor.inkSoft).monospacedDigit()
                        }
                        GeometryReader { proxy in
                            Capsule().fill(MinervaColor.emerald.opacity(index == 0 ? 0.95 : 0.35))
                                .frame(width: max(8, proxy.size.width * CGFloat(item.quantity) / CGFloat(maxQty)))
                        }
                        .frame(height: 6)
                    }
                    .accessibilityElement(children: .combine)
                }
            }
        }
    }
}

/// When orders arrive (last 30 days, restaurant time): the peak hour stands out.
struct OwnerPeakHoursCard: View {
    let hourly: [OwnerInsights.Hour]
    let L: Lx

    private var peak: OwnerInsights.Hour? { hourly.max { $0.orders < $1.orders } }

    var body: some View {
        OwnerCard(padding: 14) {
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .firstTextBaseline) {
                    Text(L("Heures de pointe · 30 jours", "Busiest hours · 30 days")).font(.mv(size: 13, weight: .semibold)).foregroundStyle(MinervaColor.inkSoft)
                    Spacer()
                    if let peak {
                        Text(L("Pointe à \(peak.hour) h", "Peak at \(peak.hour):00")).font(.mv(size: 12, weight: .semibold)).foregroundStyle(OwnerTone.good.color)
                    }
                }
                Chart {
                    ForEach(hourly, id: \.hour) { entry in
                        BarMark(x: .value("Heure", entry.hour), y: .value("Commandes", entry.orders), width: .fixed(8))
                            .cornerRadius(3)
                            .foregroundStyle(entry.hour == peak?.hour ? MinervaColor.emerald : MinervaColor.emerald.opacity(0.3))
                    }
                }
                .chartXScale(domain: 0...23)
                .chartYAxis(.hidden)
                .chartXAxis {
                    AxisMarks(values: [0, 6, 12, 18]) { value in
                        AxisValueLabel { if let hour = value.as(Int.self) { Text("\(hour) h") } }
                            .font(.mv(size: 10.5)).foregroundStyle(MinervaColor.inkFaint)
                    }
                }
                .frame(height: 84)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(Text(peak.map { L("Heure de pointe : \($0.hour) h", "Peak hour: \($0.hour):00") } ?? ""))
                Text(L("Préparez l'équipe avant cette heure : c'est là que l'attente coûte le plus cher.", "Prepare your team before this hour: that's where waiting costs the most."))
                    .font(.mv(size: 11.5)).foregroundStyle(MinervaColor.inkFaint)
            }
        }
    }
}

/// "What is this for?" sheet behind the ⓘ on the sales chart.
struct OwnerChartExplainerSheet: View {
    @Environment(\.dismiss) private var dismiss
    let L: Lx

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    block("eye.fill", L("Ce que vous voyez", "What you see"),
                          L("Vos ventes jour après jour. Glissez le doigt sur la courbe pour lire un jour précis. La pastille compare la période avec la précédente, de même durée.",
                            "Your sales day by day. Drag along the line to read a single day. The badge compares the period with the previous one of the same length."))
                    block("lightbulb.fill", L("Pourquoi c'est utile", "Why it matters"),
                          L("Vous repérez vos jours forts et faibles pour planifier l'équipe et les achats, et vous voyez si une action (offre, nouveau plat) a vraiment fait bouger vos ventes.",
                            "You spot your strong and weak days to plan staff and purchasing, and you see whether an action (offer, new dish) really moved your sales."))
                    block("bolt.fill", L("Quoi en faire", "What to do next"),
                          L("Jour faible : lancez une offre ce jour-là (onglet Fidélité).\nHausse après une offre : elle fonctionne, relancez-la.\nBaisse inhabituelle : vérifiez le menu, le stock et les avis.",
                            "Weak day: run an offer that day (Loyalty tab).\nRise after an offer: it works, repeat it.\nUnusual drop: check the menu, stock and reviews."))
                    Text(L("Les ventes viennent du journal de service (caisse synchronisée ou saisie). Un jour encore à 0 $ n'est pas tracé tant que le service est en cours.",
                           "Sales come from the service log (synced POS or manual entry). A day still at $0 is not plotted while service is in progress."))
                        .font(.mv(size: 12)).foregroundStyle(MinervaColor.inkFaint)
                }
                .padding(20)
            }
            .background(MinervaColor.cream.ignoresSafeArea())
            .navigationTitle(L("À propos de ce graphique", "About this chart"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button(L("OK", "OK")) { dismiss() } } }
        }
        .presentationDetents([.medium, .large])
    }

    private func block(_ icon: String, _ title: String, _ text: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            OwnerIconTile(icon: icon, size: 30)
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.mv(size: 14.5, weight: .semibold)).foregroundStyle(MinervaColor.ink)
                Text(text).font(.mv(size: 13.5)).foregroundStyle(MinervaColor.inkSoft).fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}

/// Dedicated statistics page: everything the home no longer carries, each
/// block with one line saying why it matters and what to do with it.
struct OwnerStatisticsScreen: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @EnvironmentObject private var insights: OwnerInsightsStore
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    private var L: Lx { Lx(storedLanguage) }

    var body: some View {
        OwnerScreen(title: L("Statistiques", "Statistics"), subtitle: supabase.selectedOwnerRestaurant?.name) {
            if let data = insights.insights {
                section(L("Clients et fidélité", "Customers and loyalty"),
                        why: L("Combien de clients rejoignent et reviennent. Un taux de retour qui baisse : relancez avec une offre.",
                               "How many customers join and come back. A falling return rate: re-engage with an offer.")) {
                    OwnerWeekCard(week: data.week, L: L)
                }
                if !data.topItems.isEmpty {
                    section(L("Ce qui se vend", "Best sellers"),
                            why: L("Mettez ces plats en avant. Un plat qui ne se vend jamais : à revoir ou à retirer.",
                                   "Feature these dishes. A dish that never sells: rework or remove it.")) {
                        OwnerTopItemsCard(items: data.topItems, L: L)
                    }
                }
                if !data.hourly.isEmpty {
                    section(L("Heures de pointe", "Busiest hours"),
                            why: L("Planifiez l'équipe et la préparation avant la pointe pour réduire l'attente.",
                                   "Schedule staff and prep before the rush to cut waiting time.")) {
                        OwnerPeakHoursCard(hourly: data.hourly, L: L)
                    }
                }
            } else if insights.failed {
                OwnerCard { OwnerEmptyState(icon: "wifi.exclamationmark", title: L("Statistiques indisponibles", "Statistics unavailable"),
                                            message: L("Vérifiez votre connexion, puis tirez pour actualiser.", "Check your connection, then pull to refresh.")) }
            } else {
                ProgressView().frame(maxWidth: .infinity).padding(.top, 60)
            }
        }
        .refreshable { await insights.load(supabase) }
    }

    private func section<Content: View>(_ title: String, why: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            OwnerSectionHeader(title: title)
            content()
            Text(why).font(.mv(size: 12)).foregroundStyle(MinervaColor.inkSoft).padding(.horizontal, 4)
        }
    }
}
