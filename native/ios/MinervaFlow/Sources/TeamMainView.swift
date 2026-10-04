import SwiftUI
import Charts

private let teamIntroSeenKey = "hasSeenTeamIntro"

/// Native mirror of the web /equipe portal — same gate (SupabaseManager's
/// isTeamExperience/isTeamMember, resolved in loadTeamPortalContext), same
/// text-only animated intro content, same "Revoir l'intro" affordance.
struct TeamMainView: View {
    @EnvironmentObject var supabase: SupabaseManager
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    @State private var showIntro = false
    @State private var hasCheckedIntro = false

    private var isFrench: Bool { storedLanguage == AppLanguage.fr.rawValue }

    private var introKey: String {
        guard let id = supabase.authUserID?.uuidString else { return teamIntroSeenKey }
        return "\(teamIntroSeenKey).\(id)"
    }

    @ToolbarContentBuilder
    private var accountMenu: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            Menu {
                Button(isFrench ? "Revoir l'intro" : "Replay intro") {
                    withAnimation { showIntro = true }
                }
                Button(isFrench ? "Se déconnecter" : "Sign out", role: .destructive) {
                    Task { await supabase.signOut() }
                }
            } label: {
                Image(systemName: "ellipsis.circle")
            }
        }
    }

    var body: some View {
        Group {
            if hasCheckedIntro && showIntro {
                TeamOnboardingIntroView(isTeamMember: supabase.isTeamMember) {
                    UserDefaults.standard.set(true, forKey: introKey)
                    withAnimation { showIntro = false }
                }
            } else if hasCheckedIntro {
                TabView {
                    NavigationStack {
                        ScrollView {
                            VStack(alignment: .leading, spacing: 18) {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(isFrench ? "Bienvenue" : "Welcome")
                                        .font(MinervaFont.display(26, weight: .semibold))
                                        .foregroundStyle(MinervaColor.ink)
                                    Text(supabase.isTeamMember
                                         ? (isFrench ? "Les indicateurs fondamentaux de Minerva Flow, en direct." : "Minerva Flow's core metrics, live.")
                                         : (isFrench ? "Découvrez le produit et notre façon de vendre dans l'onglet Académie." : "Learn the product and how we sell in the Academy tab."))
                                        .font(.mv(size: 13.5))
                                        .foregroundStyle(MinervaColor.inkSoft)
                                }
                                if supabase.isTeamMember {
                                    TeamMetricsDashboardView(isFrench: isFrench)
                                }
                            }
                            .padding(20)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .refreshable { await supabase.loadTeamMetrics() }
                        .task { await supabase.loadTeamMetrics() }
                        .background(MinervaColor.cream.ignoresSafeArea())
                        .navigationTitle(isFrench ? "Équipe" : "Team")
                        .toolbar { accountMenu }
                    }
                    .tabItem { Label(isFrench ? "Accueil" : "Home", systemImage: "house.fill") }

                    NavigationStack {
                        TeamAcademyListView(isFrench: isFrench)
                            .navigationTitle(isFrench ? "Académie" : "Academy")
                            .toolbar { accountMenu }
                    }
                    .tabItem { Label(isFrench ? "Académie" : "Academy", systemImage: "book.fill") }

                    if supabase.isTeamMember {
                        NavigationStack {
                            TeamGoalsView(isFrench: isFrench)
                                .navigationTitle(isFrench ? "Objectifs" : "Goals")
                                .toolbar { accountMenu }
                        }
                        .tabItem { Label(isFrench ? "Objectifs" : "Goals", systemImage: "target") }

                        NavigationStack {
                            TeamDirectoryView(isFrench: isFrench)
                                .navigationTitle(isFrench ? "Membres" : "Members")
                                .toolbar { accountMenu }
                        }
                        .tabItem { Label(isFrench ? "Membres" : "Members", systemImage: "person.3.fill") }
                    }

                    NavigationStack {
                        TeamMemberDetailView(memberId: "me", isFrench: isFrench)
                            .toolbar { accountMenu }
                    }
                    .tabItem { Label(isFrench ? "Profil" : "Profile", systemImage: "person.crop.circle.fill") }
                }
                .tint(MinervaColor.emeraldDark)
            } else {
                Color.clear
            }
        }
        .onAppear {
            showIntro = !UserDefaults.standard.bool(forKey: introKey)
            hasCheckedIntro = true
        }
    }
}

/// Text only, one line at a time — explicitly asked for no images, icons or
/// other components. Mirrors the web TeamOnboardingIntro's copy exactly.
private struct TeamOnboardingIntroView: View {
    let isTeamMember: Bool
    let onDone: () -> Void

    @State private var index = 0

    private var lines: [String] {
        [
            "Bienvenue chez Minerva Flow.",
            "Que vous soyez ambassadeur ou membre de l’équipe —",
            "nous construisons l’outil que les restaurants méritent.",
            "Nos valeurs : la rigueur avant la vitesse, l’honnêteté dans les chiffres, le respect du temps des restaurateurs.",
            "Ce qu’on attend de vous : représenter la marque avec justesse, et protéger la confiance qu’on nous donne.",
            isTeamMember
                ? "Ici, le tableau de bord suit nos restaurants, nos revenus et notre rétention — en temps réel."
                : "Ici, votre espace suit vos recommandations et vos commissions — en temps réel.",
            "Bienvenue à bord.",
        ]
    }

    private var isLast: Bool { index == lines.count - 1 }

    var body: some View {
        ZStack {
            MinervaColor.cream.ignoresSafeArea()

            VStack {
                HStack {
                    Spacer()
                    Button("Passer") { onDone() }
                        .font(.mv(size: 12.5, weight: .medium))
                        .foregroundStyle(MinervaColor.inkFaint)
                }
                Spacer()
                Text(lines[index])
                    .id(index)
                    .font(MinervaFont.display(26, weight: .medium))
                    .foregroundStyle(MinervaColor.ink)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                    .transition(.opacity.combined(with: .move(edge: .trailing)))
                    .frame(maxWidth: 420)
                Spacer()
                if isLast {
                    Button {
                        onDone()
                    } label: {
                        Text("Entrer dans l’espace")
                            .font(.mv(size: 13.5, weight: .semibold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 12)
                            .background(MinervaColor.emerald)
                            .clipShape(Capsule())
                    }
                    .padding(.bottom, 40)
                } else {
                    Color.clear.frame(height: 52).padding(.bottom, 40)
                }
            }
            .padding(24)
        }
        .onAppear { advance() }
    }

    private func advance() {
        guard !isLast else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 3.4) {
            withAnimation(.easeOut(duration: 0.4)) { index += 1 }
            advance()
        }
    }
}


/// Same four KPIs and two charts as the web /equipe dashboard (served by
/// /api/team/metrics), in the native tile/card language Home already uses.
private struct TeamMetricsDashboardView: View {
    @EnvironmentObject var supabase: SupabaseManager
    let isFrench: Bool

    private static let monthParser: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter
    }()

    private func monthDate(_ iso: String) -> Date { Self.monthParser.date(from: iso) ?? Date() }

    var body: some View {
        if let metrics = supabase.teamMetrics {
            VStack(alignment: .leading, spacing: 14) {
                if let focus = metrics.focus { focusCard(focus) }
                if let funnel = metrics.funnel { funnelCard(funnel, visitors: metrics.visitors) }

                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                    tile(icon: "storefront.fill", value: "\(metrics.totalRestaurants)", label: isFrench ? "restaurants inscrits · hors \(metrics.funnel?.demosExcluded ?? 0) démos/tests" : "restaurants signed up · excl. \(metrics.funnel?.demosExcluded ?? 0) demos/tests", delta: nil)
                    tile(icon: "chart.line.uptrend.xyaxis", value: "\(metrics.newRestaurantsThisMonth)", label: isFrench ? "nouveaux ce mois" : "new this month", delta: metrics.newRestaurantsDeltaPct)
                    tile(icon: "dollarsign.circle.fill", value: metrics.mrr.cad, label: subscriptionsLabel(metrics), delta: metrics.mrrDeltaPct)
                    tile(icon: "person.fill.xmark", value: metrics.churnRatePct.map { String(format: "%.1f %%", $0) } ?? "—", label: churnLabel(metrics), delta: nil)
                    tile(icon: "eye.fill", value: metrics.visitors.map { "\($0.total)" } ?? "—", label: metrics.visitors == nil ? (isFrench ? "visiteurs · PostHog non branché" : "visitors · PostHog not connected") : (isFrench ? "visiteurs uniques · 30 j" : "unique visitors · 30d"), delta: metrics.visitors?.deltaPct)
                }

                chartCard(title: isFrench ? "Restaurants inscrits par mois" : "Restaurants signed up per month") {
                    Chart(metrics.restaurantsJoinedSeries) { point in
                        BarMark(x: .value("Mois", monthDate(point.date), unit: .month), y: .value("Restaurants", point.count))
                            .foregroundStyle(MinervaColor.emerald)
                            .cornerRadius(4)
                    }
                    .chartXAxis { AxisMarks(values: .stride(by: .month)) { _ in AxisValueLabel(format: .dateTime.month(.narrow)) } }
                    .chartYAxis { AxisMarks(position: .leading) }
                    .frame(height: 170)
                }

                chartCard(title: isFrench ? "MRR dans le temps" : "MRR over time") {
                    Chart(metrics.mrrSeries) { point in
                        AreaMark(x: .value("Mois", monthDate(point.date), unit: .month), y: .value("MRR", point.revenue))
                            .foregroundStyle(MinervaColor.emerald.opacity(0.18))
                        LineMark(x: .value("Mois", monthDate(point.date), unit: .month), y: .value("MRR", point.revenue))
                            .foregroundStyle(MinervaColor.emerald)
                    }
                    .chartXAxis { AxisMarks(values: .stride(by: .month)) { _ in AxisValueLabel(format: .dateTime.month(.narrow)) } }
                    .chartYAxis { AxisMarks(position: .leading) }
                    .frame(height: 170)
                    if metrics.activeSubscriptions == 0 && metrics.mrr == 0 {
                        Text(isFrench
                             ? "Aucun abonnement payant pour l'instant — la facturation n'est pas encore activée, donc le MRR reste à zéro. La courbe se remplira dès le premier abonné."
                             : "No paying subscriptions yet — billing isn't enabled, so MRR stays at zero. The curve fills in with the first subscriber.")
                            .font(.mv(size: 11.5))
                            .foregroundStyle(MinervaColor.inkFaint)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
        } else if supabase.isLoadingTeamMetrics {
            VStack(spacing: 10) {
                Skeletons.card(height: 96)
                Skeletons.card(height: 96)
                Skeletons.card(height: 190)
            }
        } else if let error = supabase.teamMetricsError {
            VStack(alignment: .leading, spacing: 10) {
                Text(error).font(.mv(size: 12.5)).foregroundStyle(.red)
                Button(isFrench ? "Réessayer" : "Retry") { Task { await supabase.loadTeamMetrics() } }
                    .font(.mv(size: 12.5, weight: .semibold))
                    .foregroundStyle(MinervaColor.emeraldDark)
            }
        }
    }

    private func focusCard(_ focus: NativeTeamMetrics.Focus) -> some View {
        let format: (Double) -> String = { focus.metric == "mrr" ? $0.cad : "\(Int($0.rounded()))" }
        let progress = (focus.target ?? 0) > 0 ? min(100, focus.actual / (focus.target ?? 1) * 100) : nil
        return chartCard(title: isFrench ? "Le chiffre du mois · \(focus.label)" : "This month's number · \(focus.label)") {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(format(focus.actual))
                    .font(.mv(size: 38, weight: .bold, design: .rounded))
                    .foregroundStyle(MinervaColor.ink)
                Text(focus.target.map { "/ \(format($0))" } ?? (isFrench ? "cible à définir" : "target not set"))
                    .font(.mv(size: 14))
                    .foregroundStyle(MinervaColor.inkFaint)
            }
            if let progress {
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule().fill(MinervaColor.ink.opacity(0.08))
                        Capsule().fill(MinervaColor.emerald).frame(width: geo.size.width * progress / 100)
                    }
                }
                .frame(height: 8)
                .accessibilityElement()
                .accessibilityLabel(focus.label)
                .accessibilityValue("\(Int(progress)) %")
            }
            Text(isFrench ? "TROIS PROCHAINES ACTIONS" : "NEXT THREE ACTIONS")
                .font(.mv(size: 10.5, weight: .semibold)).tracking(0.4)
                .foregroundStyle(MinervaColor.inkFaint)
                .padding(.top, 4)
            if focus.actions.isEmpty {
                Text(isFrench ? "Rien de bloquant détecté dans les chiffres : gardez le rythme." : "Nothing blocking in the numbers: keep the pace.")
                    .font(.mv(size: 12.5)).foregroundStyle(MinervaColor.inkSoft)
            }
            ForEach(Array(focus.actions.enumerated()), id: \.element.id) { index, action in
                HStack(alignment: .top, spacing: 10) {
                    Text("\(index + 1)")
                        .font(.mv(size: 11.5, weight: .bold))
                        .foregroundStyle(MinervaColor.emeraldDark)
                        .frame(width: 22, height: 22)
                        .background(MinervaColor.emerald.opacity(0.14))
                        .clipShape(Circle())
                    VStack(alignment: .leading, spacing: 2) {
                        Text(action.title).font(.mv(size: 13, weight: .semibold)).foregroundStyle(MinervaColor.ink)
                        Text(action.reason).font(.mv(size: 12)).foregroundStyle(MinervaColor.inkSoft)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
        }
    }

    private func funnelCard(_ funnel: NativeTeamMetrics.Funnel, visitors: NativeTeamMetrics.Visitors?) -> some View {
        let top = Double(max(funnel.stages.first?.count ?? 0, 1))
        return chartCard(title: isFrench ? "Entonnoir · hors \(funnel.demosExcluded) démos/tests" : "Funnel · excl. \(funnel.demosExcluded) demos/tests") {
            ForEach(funnel.stages) { stage in
                VStack(alignment: .leading, spacing: 5) {
                    HStack {
                        Text(stage.label).font(.mv(size: 12.5, weight: .medium)).foregroundStyle(MinervaColor.ink)
                        Spacer()
                        Text("\(stage.count)").font(.mv(size: 18, weight: .bold, design: .rounded)).foregroundStyle(MinervaColor.ink)
                    }
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule().fill(MinervaColor.ink.opacity(0.08))
                            Capsule().fill(MinervaColor.emerald).frame(width: geo.size.width * Double(stage.count) / top)
                        }
                    }
                    .frame(height: 8)
                    .accessibilityElement()
                    .accessibilityLabel(stage.label)
                    .accessibilityValue("\(stage.count)")
                    if stage.key != "registered" {
                        Text(isFrench
                             ? "\(stage.conversionFromPrevious.map { String(format: "%.0f %%", $0) } ?? "—") de l'étape précédente"
                             : "\(stage.conversionFromPrevious.map { String(format: "%.0f%%", $0) } ?? "—") of the previous stage")
                            .font(.mv(size: 11)).foregroundStyle(MinervaColor.inkFaint)
                    }
                }
            }
            Text(isFrench
                 ? "Trafic 30 j : \(visitors.map { "\($0.total) visiteurs uniques" } ?? "non branché"). Affiché à part : aucun taux visiteurs → inscrits n'est calculé (fenêtre de 30 jours contre cumul). Activé = 1 article publié + 1 client inscrit ; un compte interne non marqué démo compte comme un restaurant."
                 : "30-day traffic: \(visitors.map { "\($0.total) unique visitors" } ?? "not connected"). Shown separately: no visitors → signups rate is computed (30-day window vs. cumulative). Activated = 1 published item + 1 enrolled customer; an internal account not flagged as demo counts as a restaurant.")
                .font(.mv(size: 11)).foregroundStyle(MinervaColor.inkFaint)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func subscriptionsLabel(_ metrics: NativeTeamMetrics) -> String {
        if metrics.activeSubscriptions == 0 { return isFrench ? "MRR · aucun abonnement actif" : "MRR · no active subscription" }
        let plural = metrics.activeSubscriptions == 1 ? "" : "s"
        return isFrench ? "MRR · \(metrics.activeSubscriptions) abonnement\(plural) actif\(plural)" : "MRR · \(metrics.activeSubscriptions) active subscription\(plural)"
    }

    private func churnLabel(_ metrics: NativeTeamMetrics) -> String {
        guard metrics.churnRatePct != nil else { return isFrench ? "churn · aucun abonné en début de mois" : "churn · no subscriber at month start" }
        let plural = metrics.churnedThisMonth == 1 ? "" : "s"
        return isFrench ? "churn · \(metrics.churnedThisMonth) annulation\(plural)" : "churn · \(metrics.churnedThisMonth) cancellation\(plural)"
    }

    private func tile(icon: String, value: String, label: String, delta: Double?) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Image(systemName: icon)
                    .font(.mv(size: 13, weight: .semibold))
                    .foregroundStyle(MinervaColor.emeraldDark)
                Spacer()
                if let delta {
                    HStack(spacing: 2) {
                        Image(systemName: delta >= 0 ? "arrow.up.right" : "arrow.down.right")
                        Text(String(format: "%.1f %%", abs(delta)))
                    }
                    .font(.mv(size: 10.5, weight: .semibold))
                    .foregroundStyle(delta >= 0 ? MinervaColor.emeraldDark : .red)
                }
            }
            Text(value)
                .font(.mv(size: 21, weight: .bold, design: .rounded))
                .foregroundStyle(MinervaColor.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            Text(label)
                .font(.mv(size: 11))
                .foregroundStyle(MinervaColor.inkFaint)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private func chartCard<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.mv(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)
            content()
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}


// MARK: - Académie

private func academyTagColor(_ tag: String) -> Color {
    switch tag {
    case "vérifié": return MinervaColor.emeraldDark
    case "hypothèse": return .blue
    case "cible": return .purple
    default: return .orange // "à confirmer"
    }
}

private struct TeamAcademyListView: View {
    @EnvironmentObject var supabase: SupabaseManager
    let isFrench: Bool

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                if supabase.academyPages.isEmpty && supabase.isLoadingAcademy {
                    Skeletons.card(height: 84)
                    Skeletons.card(height: 84)
                } else if supabase.academyPages.isEmpty {
                    Text(isFrench ? "Impossible de charger l'Académie. Tirez pour réessayer." : "Couldn't load the Academy. Pull to retry.")
                        .font(.mv(size: 12.5))
                        .foregroundStyle(MinervaColor.inkFaint)
                }
                ForEach(supabase.academyPages) { page in
                    NavigationLink {
                        TeamAcademyPageView(page: page, isFrench: isFrench)
                    } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(page.title)
                                    .font(.mv(size: 15, weight: .semibold))
                                    .foregroundStyle(MinervaColor.ink)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.mv(size: 11, weight: .semibold))
                                    .foregroundStyle(MinervaColor.inkFaint)
                            }
                            Text(page.description)
                                .font(.mv(size: 12.5))
                                .foregroundStyle(MinervaColor.inkSoft)
                                .multilineTextAlignment(.leading)
                        }
                        .padding(16)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(MinervaColor.creamSoft)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(20)
        }
        .background(MinervaColor.cream.ignoresSafeArea())
        .refreshable { await supabase.loadTeamAcademy() }
        .task { if supabase.academyPages.isEmpty { await supabase.loadTeamAcademy() } }
    }
}

private struct TeamAcademyPageView: View {
    let page: NativeAcademyPage
    let isFrench: Bool

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text(page.description)
                    .font(.mv(size: 13))
                    .foregroundStyle(MinervaColor.inkSoft)
                ForEach(page.sections) { section in
                    VStack(alignment: .leading, spacing: 10) {
                        HStack(spacing: 8) {
                            Text(section.title)
                                .font(MinervaFont.display(18, weight: .medium))
                                .foregroundStyle(MinervaColor.ink)
                            if section.teamOnly == true {
                                Text(isFrench ? "ÉQUIPE SEULEMENT" : "TEAM ONLY")
                                    .font(.mv(size: 9, weight: .bold))
                                    .tracking(0.4)
                                    .foregroundStyle(MinervaColor.inkSoft)
                                    .padding(.horizontal, 7)
                                    .padding(.vertical, 3)
                                    .background(MinervaColor.ink.opacity(0.08))
                                    .clipShape(Capsule())
                            }
                        }
                        if let intro = section.intro {
                            Text(intro)
                                .font(.mv(size: 13))
                                .foregroundStyle(MinervaColor.inkSoft)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        ForEach(section.items ?? []) { item in
                            HStack(alignment: .top, spacing: 8) {
                                if let tag = item.tag {
                                    Text(tag)
                                        .font(.mv(size: 10, weight: .bold))
                                        .foregroundStyle(academyTagColor(tag))
                                        .padding(.horizontal, 7)
                                        .padding(.vertical, 3)
                                        .background(academyTagColor(tag).opacity(0.12))
                                        .clipShape(Capsule())
                                        .fixedSize()
                                }
                                Text(item.text)
                                    .font(.mv(size: 13))
                                    .foregroundStyle(MinervaColor.ink)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }
                        if let note = section.note {
                            let isWarn = note.tone == "warn"
                            HStack(alignment: .top, spacing: 8) {
                                Image(systemName: isWarn ? "exclamationmark.triangle.fill" : "info.circle.fill")
                                    .foregroundStyle(isWarn ? Color.orange : Color.blue)
                                Text(note.text)
                                    .font(.mv(size: 12))
                                    .foregroundStyle(MinervaColor.ink)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            .padding(12)
                            .background((isWarn ? Color.orange : Color.blue).opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                    }
                    .padding(16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(MinervaColor.creamSoft)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                }
            }
            .padding(20)
        }
        .background(MinervaColor.cream.ignoresSafeArea())
        .navigationTitle(page.title)
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Objectifs du mois (équipe seulement)

private struct TeamGoalsView: View {
    @EnvironmentObject var supabase: SupabaseManager
    let isFrench: Bool

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                if let goals = supabase.teamGoals {
                    Text(isFrench
                         ? "\(Int(goals.elapsedPct)) % du mois écoulé. Les chiffres réels se mettent à jour tout seuls ; seules les cibles se saisissent."
                         : "\(Int(goals.elapsedPct))% of the month elapsed. Actuals update on their own; only targets are entered.")
                        .font(.mv(size: 12.5))
                        .foregroundStyle(MinervaColor.inkSoft)
                    ForEach(goals.rows) { row in
                        TeamGoalCard(row: row, elapsedPct: goals.elapsedPct, isFrench: isFrench)
                    }
                } else if supabase.isLoadingTeamGoals {
                    Skeletons.card(height: 150)
                    Skeletons.card(height: 150)
                } else {
                    Text(isFrench ? "Impossible de charger les objectifs. Tirez pour réessayer." : "Couldn't load goals. Pull to retry.")
                        .font(.mv(size: 12.5))
                        .foregroundStyle(MinervaColor.inkFaint)
                }
            }
            .padding(20)
        }
        .background(MinervaColor.cream.ignoresSafeArea())
        .refreshable { await supabase.loadTeamGoals() }
        .task { await supabase.loadTeamGoals() }
    }
}

private struct TeamGoalCard: View {
    @EnvironmentObject var supabase: SupabaseManager
    let row: NativeTeamGoals.Row
    let elapsedPct: Double
    let isFrench: Bool

    @State private var draft = ""
    @State private var saving = false
    @State private var status: String?

    private func format(_ value: Double?) -> String {
        guard let value else { return "—" }
        return row.unit == "money" ? value.cad : "\(Int(value.rounded()))"
    }

    private var progress: Double? {
        guard let target = row.target, target > 0, let actual = row.actual else { return nil }
        return min(100, actual / target * 100)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(row.label.uppercased())
                .font(.mv(size: 10.5, weight: .semibold))
                .tracking(0.4)
                .foregroundStyle(MinervaColor.inkFaint)
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text(format(row.actual))
                    .font(.mv(size: 26, weight: .bold, design: .rounded))
                    .foregroundStyle(MinervaColor.ink)
                Text("/ \(format(row.target))")
                    .font(.mv(size: 13))
                    .foregroundStyle(MinervaColor.inkFaint)
                Spacer()
                if let progress {
                    let onPace = progress >= elapsedPct
                    Text(onPace ? (isFrench ? "dans le rythme" : "on pace") : (isFrench ? "en retard" : "behind"))
                        .font(.mv(size: 10, weight: .bold))
                        .foregroundStyle(onPace ? MinervaColor.emeraldDark : Color.orange)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background((onPace ? MinervaColor.emerald : Color.orange).opacity(0.14))
                        .clipShape(Capsule())
                }
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(MinervaColor.ink.opacity(0.08))
                    Capsule().fill(MinervaColor.emerald).frame(width: geo.size.width * (progress ?? 0) / 100)
                    Rectangle().fill(MinervaColor.ink.opacity(0.35)).frame(width: 1.5).offset(x: geo.size.width * elapsedPct / 100)
                }
            }
            .frame(height: 8)
            .accessibilityElement()
            .accessibilityLabel(row.label)
            .accessibilityValue("\(Int(progress ?? 0)) %")

            HStack(spacing: 8) {
                TextField(isFrench ? "Cible du mois" : "Monthly target", text: $draft)
                    .keyboardType(.decimalPad)
                    .padding(10)
                    .background(MinervaColor.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                Button {
                    guard let value = Double(draft.replacingOccurrences(of: ",", with: ".")), value >= 0 else {
                        status = isFrench ? "Valeur invalide" : "Invalid value"
                        return
                    }
                    saving = true
                    Task {
                        let ok = await supabase.saveTeamGoal(metric: row.metric, target: value)
                        saving = false
                        status = ok ? (isFrench ? "Enregistré" : "Saved") : (isFrench ? "Échec, réessayez" : "Failed, try again")
                    }
                } label: {
                    Text(saving ? "…" : (isFrench ? "Enregistrer" : "Save"))
                        .font(.mv(size: 12.5, weight: .semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(MinervaColor.emerald)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .disabled(saving || draft.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            if let status {
                Text(status).font(.mv(size: 11.5)).foregroundStyle(MinervaColor.inkSoft)
            }
        }
        .padding(16)
        .background(MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .onAppear { if let target = row.target, draft.isEmpty { draft = format(target).replacingOccurrences(of: " ", with: "") } }
    }
}
