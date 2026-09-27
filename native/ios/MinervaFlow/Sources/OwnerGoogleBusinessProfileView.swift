import SwiftUI

enum NativeOwnerAPIURL {
    static func make(path: String, baseURL: URL, restaurantId: String, queryItems additions: [URLQueryItem] = []) -> URL? {
        guard !restaurantId.isEmpty,
              let url = URL(string: path, relativeTo: baseURL),
              var components = URLComponents(url: url.absoluteURL, resolvingAgainstBaseURL: false) else { return nil }
        var queryItems = components.queryItems ?? []
        queryItems.removeAll { $0.name == "restaurantId" }
        queryItems.append(URLQueryItem(name: "restaurantId", value: restaurantId))
        queryItems.append(contentsOf: additions.filter { $0.name != "restaurantId" })
        components.queryItems = queryItems
        return components.url
    }
}

private struct GoogleProfilePayload: Decodable {
    let configured: Bool
    let connected: Bool
    let connectedEmail: String?
    let selectedLocation: SelectedLocation?
    let locations: [Location]
    let error: String?

    struct SelectedLocation: Decodable {
        let accountName: String?
        let locationName: String
        let title: String
    }

    struct Location: Decodable, Identifiable, Hashable {
        let accountName: String
        let locationName: String
        let title: String
        let placeId: String?
        let websiteUri: String?
        let regularHours: Hours?
        var id: String { locationName }
    }

    struct Hours: Decodable, Hashable {
        let periods: [Period]?
    }

    struct Period: Decodable, Hashable {
        let openDay: String
        let openTime: String
        let closeDay: String
        let closeTime: String
    }
}

private struct GoogleReviewsPayload: Decodable {
    let reviews: [Review]
    let totalReviewCount: Int?
    let nextPageToken: String?

    struct Review: Decodable, Identifiable {
        let id: String
        let authorName: String
        let rating: Int
        let comment: String
        let createdAt: String?
        let ownerReply: String?
    }
}

private struct GoogleAPIError: Decodable { let error: String? }

struct OwnerGoogleBusinessProfileView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @EnvironmentObject private var router: DeepLinkRouter
    @Environment(\.openURL) private var openURL
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    @State private var profile: GoogleProfilePayload?
    @State private var reviews: [GoogleReviewsPayload.Review] = []
    @State private var totalReviewCount: Int?
    @State private var nextReviewPageToken: String?
    @State private var loadingMoreReviews = false
    @State private var loading = false
    @State private var error: String?
    @State private var notice: String?
    @State private var selectedLocationName = ""
    @State private var replyReview: GoogleReviewsPayload.Review?
    @State private var replyText = ""
    @State private var showHoursEditor = false
    @State private var profileLoadID = UUID()

    private var isFrench: Bool { storedLanguage == AppLanguage.fr.rawValue }
    private var restaurantId: String? { supabase.selectedOwnerRestaurantId }
    private var selectedLocation: GoogleProfilePayload.Location? { profile?.locations.first { $0.locationName == selectedLocationName } }

    var body: some View {
        List {
            Section {
                if let profile, profile.connected {
                    Label(isFrench ? "Google connecté" : "Google connected", systemImage: "checkmark.circle.fill")
                        .foregroundStyle(MinervaColor.emeraldDark)
                    if let email = profile.connectedEmail { LabeledContent(isFrench ? "Compte" : "Account", value: email) }
                } else {
                    Text(isFrench
                         ? "Reliez la fiche Google de cet établissement pour consulter les avis et gérer ses horaires depuis Minerva Flow."
                         : "Connect this location’s Google listing to read reviews and manage hours from Minerva Flow.")
                        .foregroundStyle(.secondary)
                    Button { Task { await beginConnection() } } label: {
                        Label(isFrench ? "Connecter Google Business Profile" : "Connect Google Business Profile", systemImage: "link")
                    }
                    .disabled(loading || profile?.configured == false)
                    if profile?.configured == false {
                        Text(isFrench ? "La connexion Google n’est pas configurée sur le serveur." : "Google connection is not configured on the server.")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                }
            } header: { Text(isFrench ? "Connexion" : "Connection") }

            if let profile, profile.connected {
                Section(isFrench ? "Fiche de l’établissement" : "Business listing") {
                    if profile.locations.isEmpty {
                        ContentUnavailableView(
                            isFrench ? "Aucune fiche accessible" : "No accessible listings",
                            systemImage: "mappin.slash",
                            description: Text(isFrench ? "Vérifiez les accès de ce compte Google dans Business Profile." : "Check this Google account’s access in Business Profile.")
                        )
                    } else {
                        Picker(isFrench ? "Fiche" : "Listing", selection: $selectedLocationName) {
                            Text(isFrench ? "Choisir une fiche" : "Choose a listing").tag("")
                            ForEach(profile.locations) { location in Text(location.title).tag(location.locationName) }
                        }
                        .onChange(of: selectedLocationName) { _, newValue in
                            guard let location = profile.locations.first(where: { $0.locationName == newValue }), location.locationName != profile.selectedLocation?.locationName else { return }
                            Task { await saveLocation(location) }
                        }
                        if let location = selectedLocation {
                            if let website = location.websiteUri, let url = URL(string: website) { Link(website, destination: url) }
                            if let placeId = location.placeId { LabeledContent("Google Maps", value: placeId).font(.caption) }
                            Button { showHoursEditor = true } label: { Label(isFrench ? "Modifier les horaires d’ouverture" : "Edit opening hours", systemImage: "clock") }
                                .disabled(profile.selectedLocation?.locationName != location.locationName)
                        }
                    }
                }

                Section {
                    if reviews.isEmpty && nextReviewPageToken == nil {
                        ContentUnavailableView(isFrench ? "Aucun avis chargé" : "No reviews loaded", systemImage: "star.bubble", description: Text(isFrench ? "Touchez Actualiser pour synchroniser les avis de la fiche sélectionnée." : "Tap Refresh to sync reviews from the selected listing."))
                    } else {
                        ForEach(reviews) { review in
                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    Text(review.authorName).font(.headline)
                                    Spacer()
                                    Label("\(review.rating)/5", systemImage: "star.fill").foregroundStyle(.orange).font(.subheadline.weight(.semibold))
                                }
                                if !review.comment.isEmpty { Text(review.comment).font(.subheadline) }
                                if let reply = review.ownerReply, !reply.isEmpty {
                                    Label(isFrench ? "Votre réponse" : "Your reply", systemImage: "arrowshape.turn.up.left")
                                        .font(.caption.weight(.semibold)).foregroundStyle(MinervaColor.emeraldDark)
                                    Text(reply).font(.subheadline).foregroundStyle(.secondary)
                                }
                                Button(review.ownerReply == nil ? (isFrench ? "Répondre" : "Reply") : (isFrench ? "Modifier la réponse" : "Edit reply")) {
                                    replyReview = review
                                    replyText = review.ownerReply ?? ""
                                }
                                .font(.subheadline.weight(.semibold))
                            }
                            .padding(.vertical, 5)
                        }
                        if let nextReviewPageToken {
                            Button {
                                Task { await loadMoreReviews(pageToken: nextReviewPageToken) }
                            } label: {
                                HStack {
                                    Text(isFrench ? "Afficher plus d’avis" : "Load more reviews")
                                    Spacer()
                                    if loadingMoreReviews { ProgressView() }
                                    else if let totalReviewCount { Text("\(reviews.count)/\(totalReviewCount)").foregroundStyle(.secondary) }
                                }
                            }
                            .disabled(loadingMoreReviews || loading)
                        }
                    }
                } header: {
                    HStack {
                        Text(isFrench ? "Avis Google" : "Google reviews")
                        Spacer()
                        if let count = profile.selectedLocation == nil ? nil : (totalReviewCount ?? reviews.count) { Text("\(reviews.count)/\(count)").foregroundStyle(.secondary) }
                    }
                } footer: {
                    Text(isFrench ? "Les réponses sont publiées directement sur Google. Relisez-les avant l’envoi." : "Replies are published directly on Google. Review each reply before sending.")
                }
            }

            if let error { Section { Label(error, systemImage: "exclamationmark.triangle.fill").foregroundStyle(.orange) } }
            if let notice { Section { Label(notice, systemImage: "checkmark.circle.fill").foregroundStyle(MinervaColor.emeraldDark) } }
        }
        .navigationTitle(isFrench ? "Google Business Profile" : "Google Business Profile")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { Task { await loadProfileAndReviews() } } label: { if loading { ProgressView() } else { Label(isFrench ? "Actualiser" : "Refresh", systemImage: "arrow.clockwise") } }
                    .disabled(loading)
            }
            ToolbarItem(placement: .topBarTrailing) { OwnerRestaurantPicker() }
        }
        .task { await loadProfileAndReviews() }
        .onChange(of: supabase.selectedOwnerRestaurantId) { _, _ in
            // Clear tenant-scoped content immediately and invalidate any request
            // still in flight for the previously selected restaurant.
            profileLoadID = UUID()
            profile = nil
            reviews = []
            totalReviewCount = nil
            nextReviewPageToken = nil
            loadingMoreReviews = false
            selectedLocationName = ""
            replyReview = nil
            replyText = ""
            showHoursEditor = false
            error = nil
            notice = nil
            Task { await loadProfileAndReviews() }
        }
        .onChange(of: router.googleBusinessProfileStatus) { _, status in
            guard let status else { return }
            if status == "connected" {
                notice = isFrench ? "Google est connecté. Choisissez la fiche à gérer." : "Google is connected. Choose a listing to manage."
            } else {
                error = router.googleBusinessProfileReason ?? (isFrench ? "La connexion Google n’a pas abouti." : "Google connection did not finish.")
            }
            Task { await loadProfileAndReviews() }
            router.googleBusinessProfileStatus = nil
            router.googleBusinessProfileReason = nil
        }
        .sheet(item: $replyReview) { review in
            NavigationStack {
                Form {
                    Section(isFrench ? "Avis de \(review.authorName)" : "Review by \(review.authorName)") { Text(review.comment.isEmpty ? (isFrench ? "Aucun commentaire écrit." : "No written comment.") : review.comment) }
                    Section(isFrench ? "Votre réponse publique" : "Your public reply") { TextEditor(text: $replyText).frame(minHeight: 130) }
                }
                .navigationTitle(isFrench ? "Répondre à l’avis" : "Reply to review")
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button(isFrench ? "Annuler" : "Cancel") { replyReview = nil } }
                    ToolbarItem(placement: .confirmationAction) { Button(isFrench ? "Publier" : "Publish") { Task { await publishReply(review) } }.disabled(replyText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || loading) }
                }
            }
            .frame(minWidth: 400, minHeight: 330)
        }
        .sheet(isPresented: $showHoursEditor) {
            if let location = selectedLocation { GoogleHoursEditor(location: location, isFrench: isFrench) { periods in Task { await saveHours(periods) } } }
        }
        .alert(isFrench ? "Google Business Profile" : "Google Business Profile", isPresented: Binding(get: { error != nil && !loading }, set: { if !$0 { error = nil } })) {
            Button("OK", role: .cancel) { error = nil }
        } message: { Text(error ?? "") }
    }

    private func authorizedRequest(_ path: String, restaurantId: String, method: String = "GET", queryItems: [URLQueryItem] = [], body: [String: Any]? = nil) async throws -> Data {
        guard let requestURL = NativeOwnerAPIURL.make(path: path, baseURL: Config.apiBaseURL, restaurantId: restaurantId, queryItems: queryItems) else {
            throw apiError("Adresse du service invalide.")
        }
        let session = try await supabase.client.auth.session
        var request = URLRequest(url: requestURL, cachePolicy: .reloadIgnoringLocalCacheData)
        request.httpMethod = method
        request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            var payload = body
            payload["restaurantId"] = restaurantId
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let response = response as? HTTPURLResponse else { throw apiError("Réponse serveur invalide.") }
        guard (200..<300).contains(response.statusCode) else {
            let message = (try? JSONDecoder().decode(GoogleAPIError.self, from: data).error) ?? "Une erreur serveur est survenue (\(response.statusCode))."
            throw apiError(message)
        }
        return data
    }

    private func loadProfileAndReviews() async {
        guard let requestedRestaurantId = restaurantId else {
            profileLoadID = UUID()
            profile = nil
            reviews = []
            totalReviewCount = nil
            nextReviewPageToken = nil
            loadingMoreReviews = false
            selectedLocationName = ""
            loading = false
            return
        }
        let requestID = UUID()
        profileLoadID = requestID
        loading = true
        loadingMoreReviews = false
        defer { if profileLoadID == requestID { loading = false } }
        error = nil
        do {
            let data = try await authorizedRequest("/api/native/owner/google-business-profile", restaurantId: requestedRestaurantId)
            guard profileLoadID == requestID, restaurantId == requestedRestaurantId else { return }
            let loaded = try JSONDecoder().decode(GoogleProfilePayload.self, from: data)
            profile = loaded
            if let selected = loaded.selectedLocation?.locationName { selectedLocationName = selected }
            else if !selectedLocationName.isEmpty && !loaded.locations.contains(where: { $0.locationName == selectedLocationName }) { selectedLocationName = "" }
            if loaded.connected, loaded.selectedLocation != nil {
                try await loadReviews(restaurantId: requestedRestaurantId, requestID: requestID)
            } else {
                reviews = []
            }
        } catch {
            guard profileLoadID == requestID, restaurantId == requestedRestaurantId else { return }
            self.error = error.localizedDescription
        }
    }

    private func loadReviews(restaurantId: String, requestID: UUID) async throws {
        let data = try await authorizedRequest("/api/native/owner/google-business-profile/reviews", restaurantId: restaurantId)
        guard profileLoadID == requestID, self.restaurantId == restaurantId else { return }
        let page = try JSONDecoder().decode(GoogleReviewsPayload.self, from: data)
        reviews = page.reviews
        totalReviewCount = page.totalReviewCount
        nextReviewPageToken = page.nextPageToken
    }

    private func loadMoreReviews(pageToken: String) async {
        guard !loadingMoreReviews, let restaurantId else { return }
        let requestID = profileLoadID
        loadingMoreReviews = true
        defer { if profileLoadID == requestID { loadingMoreReviews = false } }
        do {
            let data = try await authorizedRequest(
                "/api/native/owner/google-business-profile/reviews",
                restaurantId: restaurantId,
                queryItems: [URLQueryItem(name: "pageToken", value: pageToken)]
            )
            guard profileLoadID == requestID, self.restaurantId == restaurantId else { return }
            let page = try JSONDecoder().decode(GoogleReviewsPayload.self, from: data)
            var knownReviewIDs = Set(reviews.map(\.id))
            reviews.append(contentsOf: page.reviews.filter { knownReviewIDs.insert($0.id).inserted })
            totalReviewCount = page.totalReviewCount ?? totalReviewCount
            nextReviewPageToken = page.nextPageToken
        } catch {
            guard profileLoadID == requestID, self.restaurantId == restaurantId else { return }
            self.error = error.localizedDescription
        }
    }

    private func beginConnection() async {
        guard let restaurantId else { error = apiError("Aucun établissement n’est sélectionné.").localizedDescription; return }
        loading = true; defer { loading = false }; error = nil
        do {
            let data = try await authorizedRequest("/api/native/owner/google-business-profile/connect", restaurantId: restaurantId, method: "POST", body: [:])
            let response = try JSONDecoder().decode(AuthorizationURL.self, from: data)
            guard let url = URL(string: response.authorizationUrl) else { throw apiError("Lien Google invalide.") }
            openURL(url)
        } catch { self.error = error.localizedDescription }
    }

    private func saveLocation(_ location: GoogleProfilePayload.Location) async {
        guard let restaurantId else { error = apiError("Aucun établissement n’est sélectionné.").localizedDescription; return }
        reviews = []
        totalReviewCount = nil
        nextReviewPageToken = nil
        loading = true; defer { loading = false }; error = nil
        do {
            let _ = try await authorizedRequest("/api/native/owner/google-business-profile", restaurantId: restaurantId, method: "POST", body: ["accountName": location.accountName, "locationName": location.locationName])
            guard self.restaurantId == restaurantId else { return }
            notice = isFrench ? "La fiche \(location.title) est maintenant liée à cet espace." : "\(location.title) is now linked to this workspace."
            await loadProfileAndReviews()
        } catch { self.error = error.localizedDescription }
    }

    private func publishReply(_ review: GoogleReviewsPayload.Review) async {
        guard let restaurantId else { error = apiError("Aucun établissement n’est sélectionné.").localizedDescription; return }
        loading = true; defer { loading = false }; error = nil
        do {
            let _ = try await authorizedRequest("/api/native/owner/google-business-profile/reply", restaurantId: restaurantId, method: "POST", body: ["reviewName": review.id, "comment": replyText])
            guard self.restaurantId == restaurantId else { return }
            replyReview = nil
            notice = isFrench ? "Votre réponse a été publiée sur Google." : "Your reply was published on Google."
            await loadProfileAndReviews()
        } catch { self.error = error.localizedDescription }
    }

    private func saveHours(_ periods: [[String: String]]) async {
        guard let restaurantId else { error = apiError("Aucun établissement n’est sélectionné.").localizedDescription; return }
        loading = true; defer { loading = false }; error = nil
        do {
            let _ = try await authorizedRequest("/api/native/owner/google-business-profile/hours", restaurantId: restaurantId, method: "PUT", body: ["periods": periods])
            guard self.restaurantId == restaurantId else { return }
            showHoursEditor = false
            notice = isFrench ? "Les horaires ont été mis à jour sur Google." : "The opening hours were updated on Google."
            await loadProfileAndReviews()
        } catch { self.error = error.localizedDescription }
    }

    private func apiError(_ message: String) -> NSError { NSError(domain: "MinervaFlow.GoogleBusinessProfile", code: 1, userInfo: [NSLocalizedDescriptionKey: message]) }
    private struct AuthorizationURL: Decodable { let authorizationUrl: String }
}

private struct GoogleHoursEditor: View {
    private struct OpeningRange: Identifiable {
        let id = UUID()
        var openTime: String
        var closeDay: String
        var closeTime: String
    }

    private struct Day: Identifiable {
        let code: String
        let name: String
        let english: String
        var ranges: [OpeningRange]
        var id: String { code }
    }

    private static let dayCodes = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]
    private static let labels = [("Lundi", "Monday"), ("Mardi", "Tuesday"), ("Mercredi", "Wednesday"), ("Jeudi", "Thursday"), ("Vendredi", "Friday"), ("Samedi", "Saturday"), ("Dimanche", "Sunday")]
    @Environment(\.dismiss) private var dismiss
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var days: [Day]
    @State private var validationError: String?
    let location: GoogleProfilePayload.Location
    let isFrench: Bool
    let onSave: ([[String: String]]) -> Void

    init(location: GoogleProfilePayload.Location, isFrench: Bool, onSave: @escaping ([[String: String]]) -> Void) {
        self.location = location; self.isFrench = isFrench; self.onSave = onSave
        let periods = location.regularHours?.periods ?? []
        _days = State(initialValue: Self.labels.enumerated().map { index, label in
            let code = Self.dayCodes[index]
            let ranges = periods.filter { $0.openDay == code }.map {
                OpeningRange(openTime: $0.openTime, closeDay: $0.closeDay, closeTime: $0.closeTime)
            }
            return Day(code: code, name: label.0, english: label.1, ranges: ranges)
        })
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text(isFrench
                         ? "Conservez ou ajoutez plusieurs plages par jour. Les changements sont publiés sur Google lorsque vous touchez Enregistrer."
                         : "Keep or add multiple opening periods per day. Changes are published to Google when you tap Save.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
                Section(location.title) {
                    ForEach($days) { $day in
                        VStack(alignment: .leading, spacing: 8) {
                            Toggle(isFrench ? day.name : day.english, isOn: Binding(
                                get: { !day.ranges.isEmpty },
                                set: { isOpen in
                                    if isOpen, day.ranges.isEmpty {
                                        day.ranges.append(OpeningRange(openTime: "09:00", closeDay: day.code, closeTime: "17:00"))
                                    } else if !isOpen {
                                        day.ranges.removeAll()
                                    }
                                }
                            ))
                            if !day.ranges.isEmpty {
                                ForEach($day.ranges) { $range in
                                    HStack(spacing: 7) {
                                        TextField(isFrench ? "Ouverture" : "Opens", text: $range.openTime)
                                            .accessibilityLabel(isFrench ? "Heure d’ouverture, \(day.name)" : "\(day.english) opening time")
                                        Text("→").foregroundStyle(.secondary)
                                        Picker(isFrench ? "Jour de fermeture" : "Closing day", selection: $range.closeDay) {
                                            ForEach(Self.dayCodes, id: \.self) { code in
                                                Text(dayLabel(code)).tag(code)
                                            }
                                        }
                                        .labelsHidden()
                                        .frame(maxWidth: 125)
                                        TextField(isFrench ? "Fermeture" : "Closes", text: $range.closeTime)
                                            .accessibilityLabel(isFrench ? "Heure de fermeture, \(day.name)" : "\(day.english) closing time")
                                        Button(role: .destructive) {
                                            day.ranges.removeAll { $0.id == range.id }
                                        } label: {
                                            Image(systemName: "trash")
                                        }
                                        .accessibilityLabel(isFrench ? "Retirer cette plage du \(day.name)" : "Remove this \(day.english) period")
                                    }
                                    .textFieldStyle(.roundedBorder)
                                    .monospacedDigit()
                                }
                                Button {
                                    day.ranges.append(OpeningRange(openTime: "09:00", closeDay: day.code, closeTime: "17:00"))
                                } label: {
                                    Label(isFrench ? "Ajouter une plage" : "Add opening period", systemImage: "plus")
                                }
                                .disabled(days.reduce(0) { $0 + $1.ranges.count } >= 28)
                            }
                        }
                        .padding(.vertical, 5)
                    }
                }
                if let validationError { Section { Text(validationError).foregroundStyle(.red) } }
            }
            .navigationTitle(isFrench ? "Horaires d’ouverture" : "Opening hours")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button(isFrench ? "Annuler" : "Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button(isFrench ? "Enregistrer" : "Save") { validateAndSave() } }
            }
            .frame(minWidth: horizontalSizeClass == .regular ? 520 : 0, minHeight: 440)
        }
    }

    private func validateAndSave() {
        let pattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/
        for day in days {
            for range in day.ranges {
                guard range.openTime.wholeMatch(of: pattern) != nil, range.closeTime.wholeMatch(of: pattern) != nil else {
                    validationError = isFrench ? "Utilisez le format 24 heures HH:mm, par exemple 09:00." : "Use the 24-hour HH:mm format, for example 09:00."
                    return
                }
                if range.closeDay == day.code && range.closeTime <= range.openTime {
                    validationError = isFrench ? "Pour une fermeture le même jour, l’heure de fermeture doit suivre l’ouverture." : "For a same-day close, closing time must follow opening time."
                    return
                }
            }
        }
        let periods = days.flatMap { day in
            day.ranges.map { range in
                ["openDay": day.code, "openTime": range.openTime, "closeDay": range.closeDay, "closeTime": range.closeTime]
            }
        }
        validationError = nil
        onSave(periods)
    }

    private func dayLabel(_ code: String) -> String {
        guard let index = Self.dayCodes.firstIndex(of: code) else { return code }
        return isFrench ? Self.labels[index].0 : Self.labels[index].1
    }
}
