import SwiftUI
import Charts

/// Data behind the Finances screen (`owner_finance_summary`, migration 0188).
struct OwnerFinanceSummary: Decodable, Equatable {
    struct Day: Identifiable, Equatable {
        let day: Date
        let income: Double
        let expense: Double
        /// Running net since the start of the window: the "money line".
        var cumulativeNet: Double
        var id: Date { day }
    }
    struct Category: Decodable, Identifiable, Equatable {
        let category: String
        let amount: Double
        var id: String { category }
    }
    struct Transaction: Decodable, Identifiable, Equatable {
        let id: String
        let date: String
        let description: String
        let amount: Double
        let direction: String
        let category: String
    }

    let daily: [Day]
    let categories: [Category]
    let income: Double
    let expense: Double
    let prevIncome: Double
    let prevExpense: Double
    let recent: [Transaction]

    var net: Double { income - expense }
    var prevNet: Double { prevIncome - prevExpense }

    enum CodingKeys: String, CodingKey {
        case daily, categories, income, expense, recent
        case prevIncome = "prev_income", prevExpense = "prev_expense"
    }
    private struct RawDay: Decodable { let day: String; let income: Double; let expense: Double }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = .current
        formatter.dateFormat = "yyyy-MM-dd"
        var running = 0.0
        daily = try container.decode([RawDay].self, forKey: .daily).compactMap { raw in
            guard let date = formatter.date(from: raw.day) else { return nil }
            running += raw.income - raw.expense
            return Day(day: date, income: raw.income, expense: raw.expense, cumulativeNet: running)
        }
        categories = try container.decode([Category].self, forKey: .categories)
        income = try container.decode(Double.self, forKey: .income)
        expense = try container.decode(Double.self, forKey: .expense)
        prevIncome = try container.decode(Double.self, forKey: .prevIncome)
        prevExpense = try container.decode(Double.self, forKey: .prevExpense)
        recent = try container.decode([Transaction].self, forKey: .recent)
    }
}

enum OwnerFinanceRange: Int, CaseIterable {
    case month = 30, quarter = 90, year = 365

    func title(_ L: Lx) -> String {
        switch self {
        case .month: return L("30 j", "30d")
        case .quarter: return L("90 j", "90d")
        case .year: return L("12 mois", "12 mo")
        }
    }
    func caption(_ L: Lx) -> String {
        switch self {
        case .month: return L("Net · 30 derniers jours", "Net · last 30 days")
        case .quarter: return L("Net · 90 derniers jours", "Net · last 90 days")
        case .year: return L("Net · 12 derniers mois", "Net · last 12 months")
        }
    }
    func previousLabel(_ L: Lx) -> String {
        switch self {
        case .month: return L("vs 30 j précédents", "vs previous 30d")
        case .quarter: return L("vs 90 j précédents", "vs previous 90d")
        case .year: return L("vs 12 mois précédents", "vs previous 12 mo")
        }
    }
}

@MainActor
final class OwnerFinanceStore: ObservableObject {
    @Published private(set) var summary: OwnerFinanceSummary?
    @Published private(set) var failed = false
    private struct Params: Encodable { let p_restaurant_id: String; let p_days: Int }

    func load(_ supabase: SupabaseManager, range: OwnerFinanceRange) async {
        guard let restaurantId = supabase.selectedOwnerRestaurantId else { return }
        do {
            let value: OwnerFinanceSummary = try await supabase.client
                .rpc("owner_finance_summary", params: Params(p_restaurant_id: restaurantId, p_days: range.rawValue))
                .execute().value
            guard restaurantId == supabase.selectedOwnerRestaurantId else { return }
            summary = value
            failed = false
        } catch {
            AppLog.failure("ownerFinanceSummary", error)
            failed = summary == nil
        }
    }
}

struct OwnerFinanceView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    @StateObject private var store = OwnerFinanceStore()
    @State private var range: OwnerFinanceRange = .month
    @State private var selectedDate: Date?
    private var L: Lx { Lx(storedLanguage) }

    var body: some View {
        OwnerScreen(title: L("Finances", "Finance"), subtitle: supabase.selectedOwnerRestaurant?.name) {
            if let summary = store.summary {
                if summary.daily.isEmpty || (summary.income == 0 && summary.expense == 0 && summary.recent.isEmpty && summary.prevIncome == 0 && summary.prevExpense == 0) {
                    netHero(summary)
                    OwnerCard {
                        OwnerEmptyState(icon: "dollarsign.circle", title: L("Aucune transaction", "No transactions"),
                                        message: L("Les revenus et dépenses de ce lieu apparaîtront ici.", "Revenue and expenses for this location will appear here."))
                    }
                } else {
                    netHero(summary)
                    flowCards(summary)
                    if !summary.categories.isEmpty { categoryCard(summary) }
                    transactionsCard(summary)
                }
            } else if store.failed {
                OwnerCard {
                    OwnerEmptyState(icon: "wifi.exclamationmark", title: L("Finances indisponibles", "Finance unavailable"),
                                    message: L("Vérifiez votre connexion, puis tirez pour actualiser.", "Check your connection, then pull to refresh."))
                }
            } else {
                ProgressView().frame(maxWidth: .infinity).padding(.top, 60)
            }
        }
        .task(id: "\(supabase.selectedOwnerRestaurantId ?? "")-\(range.rawValue)") { await store.load(supabase, range: range) }
        .refreshable { await store.load(supabase, range: range) }
    }

    // MARK: Hero

    private func selectedDay(_ summary: OwnerFinanceSummary) -> OwnerFinanceSummary.Day? {
        guard let selectedDate else { return nil }
        return summary.daily.min { abs($0.day.timeIntervalSince(selectedDate)) < abs($1.day.timeIntervalSince(selectedDate)) }
    }

    private func netHero(_ summary: OwnerFinanceSummary) -> some View {
        let picked = selectedDay(summary)
        let net = picked?.cumulativeNet ?? summary.net
        let change = summary.prevNet != 0 ? (summary.net - summary.prevNet) / abs(summary.prevNet) * 100 : nil
        return VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(picked.map { $0.day.formatted(.dateTime.weekday(.wide).day().month(.abbreviated)).capitalized } ?? range.caption(L))
                    .font(.mv(size: 13.5, weight: .medium)).foregroundStyle(.white.opacity(0.85)).lineLimit(1)
                Spacer(minLength: 8)
                rangePicker
            }
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(net.cad).font(MinervaFont.display(30, weight: .semibold)).foregroundStyle(.white)
                    .lineLimit(1).minimumScaleFactor(0.6).contentTransition(.numericText())
                if picked == nil { OwnerDeltaChip(percent: change, onDark: true) }
            }
            if picked == nil, change != nil {
                Text(range.previousLabel(L)).font(.mv(size: 12)).foregroundStyle(.white.opacity(0.7))
            } else if let picked {
                Text(L("Revenus \(picked.income.cad) · Dépenses \(picked.expense.cad)", "Revenue \(picked.income.cad) · Expenses \(picked.expense.cad)"))
                    .font(.mv(size: 12)).foregroundStyle(.white.opacity(0.7)).lineLimit(1)
            }
            Chart {
                ForEach(summary.daily) { day in
                    AreaMark(x: .value("Jour", day.day, unit: .day), y: .value("Net", day.cumulativeNet))
                        .interpolationMethod(.monotone)
                        .foregroundStyle(LinearGradient(colors: [.white.opacity(0.26), .white.opacity(0)], startPoint: .top, endPoint: .bottom))
                    LineMark(x: .value("Jour", day.day, unit: .day), y: .value("Net", day.cumulativeNet))
                        .interpolationMethod(.monotone)
                        .lineStyle(StrokeStyle(lineWidth: 2.5, lineCap: .round))
                        .foregroundStyle(.white)
                }
                RuleMark(y: .value("Zéro", 0)).lineStyle(StrokeStyle(lineWidth: 1, dash: [2, 4])).foregroundStyle(.white.opacity(0.35))
                if let picked {
                    RuleMark(x: .value("Jour", picked.day, unit: .day)).lineStyle(StrokeStyle(lineWidth: 1, dash: [3, 3])).foregroundStyle(.white.opacity(0.55))
                    PointMark(x: .value("Jour", picked.day, unit: .day), y: .value("Net", picked.cumulativeNet)).symbolSize(70).foregroundStyle(.white)
                }
            }
            .chartXSelection(value: $selectedDate)
            .chartYAxis(.hidden)
            .chartXAxis {
                AxisMarks(values: .automatic(desiredCount: 4)) { _ in
                    AxisValueLabel(format: .dateTime.day().month(.abbreviated), anchor: .top).font(.mv(size: 10.5)).foregroundStyle(.white.opacity(0.65))
                }
            }
            .frame(height: 120)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(Text(L("Graphique du net cumulé. Net \(summary.net.cad).", "Cumulative net chart. Net \(summary.net.cad).")))
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(MinervaColor.emeraldDeep, in: RoundedRectangle(cornerRadius: 28))
        .animation(.easeOut(duration: 0.18), value: picked?.day)
    }

    private var rangePicker: some View {
        HStack(spacing: 2) {
            ForEach(OwnerFinanceRange.allCases, id: \.self) { option in
                Button {
                    selectedDate = nil
                    withAnimation(.easeInOut(duration: 0.25)) { range = option }
                } label: {
                    Text(option.title(L)).font(.mv(size: 11.5, weight: .semibold))
                        .foregroundStyle(option == range ? MinervaColor.emeraldDeep : .white.opacity(0.8))
                        .padding(.horizontal, 8).frame(minHeight: 24)
                        .background(option == range ? Color.white : Color.clear, in: Capsule())
                        .contentShape(Capsule())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(2).background(Color.white.opacity(0.12), in: Capsule())
    }

    // MARK: Revenue / expenses

    private func flowCards(_ summary: OwnerFinanceSummary) -> some View {
        HStack(spacing: 12) {
            flowCard(icon: "arrow.down.circle.fill", label: L("Revenus", "Revenue"), value: summary.income,
                     change: ownerPercentChange(current: summary.income, previous: summary.prevIncome), goodWhenUp: true)
            flowCard(icon: "arrow.up.circle.fill", label: L("Dépenses", "Expenses"), value: summary.expense,
                     change: ownerPercentChange(current: summary.expense, previous: summary.prevExpense), goodWhenUp: false)
        }
    }

    private func flowCard(icon: String, label: String, value: Double, change: Double?, goodWhenUp: Bool) -> some View {
        OwnerCard(padding: 14) {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 6) {
                    Image(systemName: icon).font(.mv(size: 13, weight: .semibold)).foregroundStyle(goodWhenUp ? OwnerTone.good.color : OwnerTone.bad.color)
                    Text(label).font(.mv(size: 12.5)).foregroundStyle(MinervaColor.inkSoft)
                }
                Text(value.cad).font(MinervaFont.display(22, weight: .semibold)).foregroundStyle(MinervaColor.ink).lineLimit(1).minimumScaleFactor(0.6)
                if let change {
                    // For expenses a rise is bad news, so the colours flip.
                    let good = goodWhenUp ? change >= 0 : change <= 0
                    HStack(spacing: 3) {
                        Image(systemName: change >= 0 ? "arrow.up.right" : "arrow.down.right").font(.mv(size: 10, weight: .bold))
                        Text(abs(change) > 999 ? ">999 %" : "\(Int(abs(change).rounded())) %").font(.mv(size: 12, weight: .bold))
                    }
                    .foregroundStyle(good ? OwnerTone.good.color : OwnerTone.bad.color)
                } else {
                    Text(" ").font(.mv(size: 12))
                }
            }
        }
        .accessibilityElement(children: .combine)
    }

    // MARK: Categories

    private func categoryCard(_ summary: OwnerFinanceSummary) -> some View {
        let total = max(summary.categories.reduce(0) { $0 + $1.amount }, 1)
        return VStack(alignment: .leading, spacing: 10) {
            OwnerSectionHeader(title: L("Où va l'argent", "Where the money goes"))
            OwnerCard(padding: 14) {
                VStack(alignment: .leading, spacing: 14) {
                    ForEach(Array(summary.categories.enumerated()), id: \.element.id) { index, category in
                        VStack(alignment: .leading, spacing: 5) {
                            HStack {
                                Text(category.category).font(.mv(size: 14, weight: .medium)).foregroundStyle(MinervaColor.ink).lineLimit(1)
                                Spacer(minLength: 8)
                                Text(category.amount.cad).font(.mv(size: 13.5, weight: .semibold)).foregroundStyle(MinervaColor.ink).monospacedDigit()
                                Text("\(Int((category.amount / total * 100).rounded())) %").font(.mv(size: 12)).foregroundStyle(MinervaColor.inkFaint)
                                    .frame(minWidth: 36, alignment: .trailing)
                            }
                            GeometryReader { proxy in
                                Capsule().fill(MinervaColor.emerald.opacity(index == 0 ? 0.95 : 0.35))
                                    .frame(width: max(8, proxy.size.width * CGFloat(category.amount / total)))
                            }
                            .frame(height: 6)
                        }
                        .accessibilityElement(children: .combine)
                    }
                }
            }
        }
    }

    // MARK: Transactions grouped by day

    private func transactionsCard(_ summary: OwnerFinanceSummary) -> some View {
        let groups = Dictionary(grouping: summary.recent, by: \.date).sorted { $0.key > $1.key }
        return VStack(alignment: .leading, spacing: 10) {
            OwnerSectionHeader(title: L("Transactions", "Transactions"))
            if groups.isEmpty {
                OwnerCard { OwnerEmptyState(icon: "dollarsign.circle", title: L("Aucune transaction", "No transactions"),
                                            message: L("Aucune transaction sur cette période.", "No transactions in this period.")) }
            } else {
                ForEach(groups, id: \.key) { group in
                    VStack(alignment: .leading, spacing: 6) {
                        Text(dayLabel(group.key)).font(.mv(size: 12.5, weight: .semibold)).foregroundStyle(MinervaColor.inkSoft).padding(.leading, 4)
                        OwnerCard(padding: 6) {
                            VStack(spacing: 0) {
                                ForEach(Array(group.value.enumerated()), id: \.element.id) { index, tx in
                                    if index > 0 { OwnerDivider() }
                                    let isIn = tx.direction == "in"
                                    OwnerRow(icon: isIn ? "arrow.down.circle.fill" : "arrow.up.circle.fill", title: tx.description, subtitle: tx.category,
                                             tint: isIn ? OwnerTone.good.color : OwnerTone.bad.color) {
                                        Text((isIn ? "+" : "−") + tx.amount.cad).font(.mv(size: 14, weight: .semibold))
                                            .foregroundStyle(isIn ? OwnerTone.good.color : OwnerTone.bad.color).monospacedDigit()
                                    }
                                    .padding(.horizontal, 10).padding(.vertical, 4)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    private func dayLabel(_ isoDay: String) -> String {
        let parser = DateFormatter()
        parser.calendar = Calendar(identifier: .gregorian)
        parser.locale = Locale(identifier: "en_US_POSIX")
        parser.dateFormat = "yyyy-MM-dd"
        guard let date = parser.date(from: String(isoDay.prefix(10))) else { return isoDay }
        if Calendar.current.isDateInToday(date) { return L("Aujourd'hui", "Today") }
        if Calendar.current.isDateInYesterday(date) { return L("Hier", "Yesterday") }
        return date.formatted(.dateTime.weekday(.wide).day().month(.wide)).capitalized
    }
}
