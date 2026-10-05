import SwiftUI

private let contributionSources: [(key: String, fr: String, en: String)] = [
    ("github", "Commits GitHub", "GitHub commits"),
    ("referral", "Recommandations", "Referrals"),
    ("ugc", "Contenus UGC soumis", "UGC submitted"),
    ("content", "Contenus publiés", "Published content"),
    ("checkin", "Bilans hebdomadaires", "Weekly check-ins"),
]

private func heatColor(_ level: Int) -> Color {
    switch level {
    case 1: return MinervaColor.emerald.opacity(0.25)
    case 2: return MinervaColor.emerald.opacity(0.45)
    case 3: return MinervaColor.emerald.opacity(0.7)
    case 4: return MinervaColor.emerald
    default: return MinervaColor.ink.opacity(0.07)
    }
}

/// Monday-first, one column per week — same shape as the web graph.
struct ContributionHeatmapView: View {
    let heatmap: NativeHeatmap
    var cell: CGFloat = 11
    var isFrench = true

    private let spacing: CGFloat = 3

    private var columns: [[NativeHeatmapDay]] {
        stride(from: 0, to: heatmap.days.count, by: 7).map { start in
            Array(heatmap.days[start..<min(start + 7, heatmap.days.count)])
        }
    }

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(alignment: .top, spacing: spacing) {
                ForEach(Array(columns.enumerated()), id: \.offset) { _, week in
                    VStack(spacing: spacing) {
                        ForEach(week) { day in
                            RoundedRectangle(cornerRadius: cell > 8 ? 3 : 2)
                                .fill(day.future ? Color.clear : heatColor(day.level))
                                .frame(width: cell, height: cell)
                        }
                    }
                }
            }
        }
        // The cells carry no per-cell semantics: VoiceOver gets the total, and
        // the per-source numbers are listed as text right below on the profile.
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(isFrench
            ? "\(heatmap.total) contribution\(heatmap.total > 1 ? "s" : "") sur les \(heatmap.weeks) dernières semaines"
            : "\(heatmap.total) contribution\(heatmap.total == 1 ? "" : "s") over the last \(heatmap.weeks) weeks")
    }
}

struct TeamDirectoryView: View {
    @EnvironmentObject var supabase: SupabaseManager
    let isFrench: Bool

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                Text(isFrench
                     ? "Visible par les membres de l'équipe seulement. Ordre alphabétique : ce n'est pas un classement de performance."
                     : "Visible to team members only. Alphabetical order: this is not a performance ranking.")
                    .font(.mv(size: 12.5))
                    .foregroundStyle(MinervaColor.inkSoft)

                if supabase.memberDirectory.isEmpty && supabase.isLoadingMembers {
                    Skeletons.card(height: 110)
                    Skeletons.card(height: 110)
                }
                ForEach(supabase.memberDirectory) { member in
                    NavigationLink {
                        TeamMemberDetailView(memberId: member.id, isFrench: isFrench)
                    } label: {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack(spacing: 12) {
                                Text(member.initials)
                                    .font(.mv(size: 13, weight: .semibold))
                                    .foregroundStyle(MinervaColor.emeraldDark)
                                    .frame(width: 38, height: 38)
                                    .background(MinervaColor.emerald.opacity(0.12))
                                    .clipShape(Circle())
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(member.id == supabase.memberDirectoryUserId ? "\(member.name) (\(isFrench ? "vous" : "you"))" : member.name)
                                        .font(.mv(size: 15, weight: .semibold))
                                        .foregroundStyle(MinervaColor.ink)
                                    Text(isFrench
                                         ? "\(member.heatmap.total) contribution\(member.heatmap.total == 1 ? "" : "s") · 26 semaines"
                                         : "\(member.heatmap.total) contribution\(member.heatmap.total == 1 ? "" : "s") · 26 weeks")
                                        .font(.mv(size: 11.5))
                                        .foregroundStyle(MinervaColor.inkFaint)
                                }
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.mv(size: 11, weight: .semibold))
                                    .foregroundStyle(MinervaColor.inkFaint)
                            }
                            ContributionHeatmapView(heatmap: member.heatmap, cell: 6, isFrench: isFrench)
                        }
                        .padding(14)
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
        .refreshable { await supabase.loadMemberDirectory() }
        .task { await supabase.loadMemberDirectory() }
    }
}

struct TeamMemberDetailView: View {
    @EnvironmentObject var supabase: SupabaseManager
    let memberId: String
    let isFrench: Bool

    @State private var profile: NativeMemberProfile?
    @State private var isLoading = true

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                if let profile {
                    header(profile)
                    if profile.githubStatus == "unavailable" {
                        notice(isFrench
                               ? "GitHub indisponible : les commits n'ont pas pu être lus. Un graphique vide ne veut pas dire zéro commit."
                               : "GitHub unavailable: commits couldn't be read. An empty graph doesn't mean zero commits.")
                    }
                    graphCard(profile)
                    transparencyCard
                    contentCard(profile)
                    if profile.isTeamMember { checkinsCard(profile) }
                    if profile.isSelf {
                        TeamProfileForms(isTeamMember: profile.isTeamMember, githubLogin: profile.githubLogin, isFrench: isFrench) {
                            await reload()
                        }
                    }
                } else if isLoading {
                    Skeletons.card(height: 90)
                    Skeletons.card(height: 160)
                } else {
                    Text(isFrench ? "Profil introuvable." : "Profile not found.")
                        .font(.mv(size: 13))
                        .foregroundStyle(MinervaColor.inkFaint)
                }
            }
            .padding(20)
        }
        .background(MinervaColor.cream.ignoresSafeArea())
        .navigationTitle(profile?.name ?? (isFrench ? "Profil" : "Profile"))
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await reload() }
        .task { await reload() }
    }

    private func reload() async {
        profile = await supabase.loadMemberProfile(id: memberId)
        isLoading = false
    }

    private func header(_ profile: NativeMemberProfile) -> some View {
        HStack(spacing: 14) {
            Text(profile.initials)
                .font(MinervaFont.display(20, weight: .medium))
                .foregroundStyle(MinervaColor.emeraldDark)
                .frame(width: 54, height: 54)
                .background(MinervaColor.emerald.opacity(0.12))
                .clipShape(Circle())
            VStack(alignment: .leading, spacing: 4) {
                Text(profile.name)
                    .font(MinervaFont.display(22, weight: .semibold))
                    .foregroundStyle(MinervaColor.ink)
                HStack(spacing: 8) {
                    Text(profile.isTeamMember ? (isFrench ? "ÉQUIPE" : "TEAM") : (isFrench ? "AMBASSADEUR" : "AMBASSADOR"))
                        .font(.mv(size: 9.5, weight: .bold))
                        .tracking(0.4)
                        .foregroundStyle(profile.isTeamMember ? MinervaColor.emeraldDark : Color.purple)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background((profile.isTeamMember ? MinervaColor.emerald : Color.purple).opacity(0.12))
                        .clipShape(Capsule())
                    if let login = profile.githubLogin {
                        Label(login, systemImage: "chevron.left.forwardslash.chevron.right")
                            .font(.mv(size: 12, weight: .medium))
                            .foregroundStyle(MinervaColor.inkSoft)
                    } else if profile.isTeamMember {
                        Text(isFrench ? "GitHub non lié" : "GitHub not linked")
                            .font(.mv(size: 12))
                            .foregroundStyle(MinervaColor.inkFaint)
                    }
                }
            }
        }
    }

    private func card<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10, content: content)
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(MinervaColor.creamSoft)
            .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func notice(_ text: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(.orange)
            Text(text).font(.mv(size: 12)).foregroundStyle(MinervaColor.ink).fixedSize(horizontal: false, vertical: true)
        }
        .padding(12)
        .background(Color.orange.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func graphCard(_ profile: NativeMemberProfile) -> some View {
        card {
            Text(isFrench
                 ? "\(profile.heatmap.total) contribution\(profile.heatmap.total == 1 ? "" : "s") · 26 semaines"
                 : "\(profile.heatmap.total) contribution\(profile.heatmap.total == 1 ? "" : "s") · 26 weeks")
                .font(.mv(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)
            ContributionHeatmapView(heatmap: profile.heatmap, cell: 11, isFrench: isFrench)
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                ForEach(contributionSources, id: \.key) { source in
                    HStack {
                        Text(isFrench ? source.fr : source.en)
                            .font(.mv(size: 11.5))
                            .foregroundStyle(MinervaColor.inkSoft)
                        Spacer()
                        Text("\(profile.heatmap.bySource[source.key] ?? 0)")
                            .font(.mv(size: 14, weight: .bold, design: .rounded))
                            .foregroundStyle(MinervaColor.ink)
                    }
                    .padding(10)
                    .background(MinervaColor.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
            }
        }
    }

    private var transparencyCard: some View {
        card {
            Text(isFrench ? "Ce qui est mesuré, et ce qui ne l'est pas" : "What is measured, and what is not")
                .font(.mv(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)
            Text(isFrench
                 ? "Compté : commits GitHub liés à votre identifiant, recommandations et contenus UGC du programme ambassadeur, contenus que vous déclarez, bilan hebdomadaire."
                 : "Counted: GitHub commits linked to your handle, referrals and UGC from the ambassador program, content you declare, your weekly check-in.")
                .font(.mv(size: 12))
                .foregroundStyle(MinervaColor.inkSoft)
                .fixedSize(horizontal: false, vertical: true)
            Text(isFrench
                 ? "Jamais compté : connexions, temps passé dans l'app, horaires, contenu de vos messages. Aucun score caché : ce que vous voyez ici est ce que voient les autres membres de l'équipe."
                 : "Never counted: logins, time in the app, hours, message content. No hidden score: what you see here is what other team members see.")
                .font(.mv(size: 12))
                .foregroundStyle(MinervaColor.inkSoft)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func contentCard(_ profile: NativeMemberProfile) -> some View {
        card {
            Text(isFrench ? "Contenus déclarés" : "Declared content")
                .font(.mv(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)
            if profile.contentLinks.isEmpty {
                Text(isFrench ? "Aucun contenu déclaré pour l'instant." : "No declared content yet.")
                    .font(.mv(size: 12.5)).foregroundStyle(MinervaColor.inkFaint)
            }
            ForEach(profile.contentLinks) { link in
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 2) {
                        if let url = URL(string: link.url) {
                            Link(link.title.isEmpty ? link.url : link.title, destination: url)
                                .font(.mv(size: 13, weight: .medium))
                                .foregroundStyle(MinervaColor.emeraldDark)
                                .lineLimit(2)
                        }
                        Text("\(link.platform) · \(link.publishedOn)")
                            .font(.mv(size: 11)).foregroundStyle(MinervaColor.inkFaint)
                    }
                    Spacer()
                    if profile.isSelf {
                        Button(isFrench ? "Retirer" : "Remove") {
                            Task {
                                _ = await supabase.updateTeamProfile(["kind": "deleteContent", "id": link.id])
                                await reload()
                            }
                        }
                        .font(.mv(size: 12, weight: .medium))
                        .foregroundStyle(MinervaColor.inkFaint)
                    }
                }
            }
        }
    }

    private func checkinsCard(_ profile: NativeMemberProfile) -> some View {
        card {
            Text(isFrench ? "Derniers bilans hebdomadaires" : "Latest weekly check-ins")
                .font(.mv(size: 13, weight: .semibold))
                .foregroundStyle(MinervaColor.ink)
            if profile.checkins.isEmpty {
                Text(isFrench ? "Aucun bilan pour l'instant." : "No check-in yet.")
                    .font(.mv(size: 12.5)).foregroundStyle(MinervaColor.inkFaint)
            }
            ForEach(profile.checkins) { checkin in
                VStack(alignment: .leading, spacing: 3) {
                    Text((isFrench ? "SEMAINE DU " : "WEEK OF ") + checkin.weekStart)
                        .font(.mv(size: 10.5, weight: .semibold)).tracking(0.3)
                        .foregroundStyle(MinervaColor.inkFaint)
                    if !checkin.commitments.isEmpty {
                        Text((isFrench ? "Engagements : " : "Commitments: ") + checkin.commitments)
                            .font(.mv(size: 12.5)).foregroundStyle(MinervaColor.ink)
                    }
                    if !checkin.delivered.isEmpty {
                        Text((isFrench ? "Livré : " : "Delivered: ") + checkin.delivered)
                            .font(.mv(size: 12.5)).foregroundStyle(MinervaColor.ink)
                    }
                }
            }
        }
    }
}

/// Own profile only — the server derives the user from the token, never from this payload.
private struct TeamProfileForms: View {
    @EnvironmentObject var supabase: SupabaseManager
    let isTeamMember: Bool
    let githubLogin: String?
    let isFrench: Bool
    let onSaved: () async -> Void

    @State private var commitments = ""
    @State private var delivered = ""
    @State private var contentURL = ""
    @State private var contentTitle = ""
    @State private var github = ""
    @State private var checkinStatus: String?
    @State private var contentStatus: String?
    @State private var githubStatus: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            if isTeamMember {
                form(title: isFrench ? "Mon bilan hebdomadaire" : "My weekly check-in", status: checkinStatus) {
                    field(isFrench ? "Mes engagements" : "My commitments", text: $commitments, lines: 3)
                    field(isFrench ? "Ce que j'ai livré" : "What I delivered", text: $delivered, lines: 3)
                    button(isFrench ? "Enregistrer le bilan" : "Save check-in") {
                        checkinStatus = await supabase.updateTeamProfile(["kind": "checkin", "commitments": commitments, "delivered": delivered]) ?? (isFrench ? "Enregistré" : "Saved")
                        await onSaved()
                    }
                }
            }
            form(title: isFrench ? "Déclarer un contenu publié" : "Declare published content", status: contentStatus) {
                field("https://", text: $contentURL, lines: 1, keyboard: .URL)
                field(isFrench ? "Titre (facultatif)" : "Title (optional)", text: $contentTitle, lines: 1)
                button(isFrench ? "Ajouter" : "Add") {
                    let error = await supabase.updateTeamProfile(["kind": "content", "url": contentURL, "title": contentTitle])
                    contentStatus = error ?? (isFrench ? "Enregistré" : "Saved")
                    if error == nil { contentURL = ""; contentTitle = "" }
                    await onSaved()
                }
            }
            if isTeamMember {
                form(title: isFrench ? "Mon identifiant GitHub" : "My GitHub handle", status: githubStatus) {
                    field(isFrench ? "ex. Endsi3g (vide pour délier)" : "e.g. Endsi3g (empty to unlink)", text: $github, lines: 1)
                    button(isFrench ? "Enregistrer" : "Save") {
                        githubStatus = await supabase.updateTeamProfile(["kind": "github", "login": github]) ?? (isFrench ? "Enregistré" : "Saved")
                        await onSaved()
                    }
                }
            }
        }
        .onAppear { if github.isEmpty { github = githubLogin ?? "" } }
    }

    private func form<Content: View>(title: String, status: String?, @ViewBuilder _ content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title).font(.mv(size: 13, weight: .semibold)).foregroundStyle(MinervaColor.ink)
            content()
            if let status {
                Text(status).font(.mv(size: 11.5)).foregroundStyle(MinervaColor.inkSoft)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func field(_ placeholder: String, text: Binding<String>, lines: Int, keyboard: UIKeyboardType = .default) -> some View {
        TextField(placeholder, text: text, axis: .vertical)
            .lineLimit(lines...max(lines, lines == 1 ? 1 : 6))
            .keyboardType(keyboard)
            .textInputAutocapitalization(keyboard == .URL ? .never : .sentences)
            .autocorrectionDisabled(keyboard == .URL)
            .padding(10)
            .background(MinervaColor.surface)
            .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private func button(_ title: String, action: @escaping () async -> Void) -> some View {
        Button {
            Task { await action() }
        } label: {
            Text(title)
                .font(.mv(size: 12.5, weight: .semibold))
                .foregroundStyle(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(MinervaColor.emerald)
                .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }
}
