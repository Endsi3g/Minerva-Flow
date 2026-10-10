import SwiftUI
import AVFoundation

struct NativeEnrollmentRestaurant: Decodable, Identifiable {
    let id: String
    let name: String
    var city: String? = nil
    var address: String? = nil
}

struct EnrollmentSelectionView: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @EnvironmentObject private var router: DeepLinkRouter
    @AppStorage(AppLanguagePreference.key) private var language = AppLanguage.fr.rawValue
    let onSelect: (NativeEnrollmentRestaurant) -> Void
    let onSignIn: () -> Void
    @State private var query = ""
    @State private var results: [NativeEnrollmentRestaurant] = []
    @State private var loading = false
    @State private var error: String?
    @State private var searched = false
    @State private var showScanner = false
    @State private var publicRestaurant: NativeEnrollmentRestaurant?
    @FocusState private var searchFocused: Bool
    private var isFrench: Bool { language == AppLanguage.fr.rawValue }

    var body: some View {
        Group {
            if let restaurant = publicRestaurant {
                PublicEnrollmentMenuView(restaurant: restaurant, onClose: { publicRestaurant = nil }) {
                    publicRestaurant = nil
                    onSelect(restaurant)
                }
            } else {
                selectionContent
            }
        }
        .onAppear { resolvePendingLink() }
        .onChange(of: router.pendingUniversalLink) { _, _ in resolvePendingLink() }
    }

    private var selectionContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                HStack(spacing: 10) {
                    Image("LogoMark").resizable().frame(width: 34, height: 34).accessibilityHidden(true)
                    Text("Minerva Flow").font(.mv(size: 20, weight: .semibold)).foregroundStyle(MinervaColor.ink)
                    Spacer(minLength: 8)
                    LanguageMenu(language: Binding(get: { AppLanguage(rawValue: language) ?? .fr }, set: { language = $0.rawValue }), tint: MinervaColor.emeraldDark)
                }
                .padding(.top, 8)

                VStack(alignment: .leading, spacing: 12) {
                    Text(isFrench ? "Vos restaurants préférés, vos récompenses." : "Your favourite places, your rewards.")
                        .font(MinervaFont.display(36, weight: .semibold)).fixedSize(horizontal: false, vertical: true)
                    Text(isFrench ? "Commandez, cumulez des points et profitez des offres de vos restaurants et cafés." : "Order, earn points and enjoy offers from your restaurants and cafés.")
                        .font(.mv(size: 16)).foregroundStyle(MinervaColor.inkSoft).fixedSize(horizontal: false, vertical: true)
                }

                VStack(spacing: 12) {
                    if !supabase.isAuthenticated {
                        Button(action: onSignIn) {
                            Text(isFrench ? "Se connecter ou créer un compte" : "Sign in or create an account")
                                .font(.mv(size: 16, weight: .semibold)).foregroundStyle(.white)
                                .frame(maxWidth: .infinity, minHeight: 54)
                                .background(MinervaColor.emeraldDark, in: Capsule())
                        }
                        .buttonStyle(PressableButtonStyle()).accessibilityIdentifier("enrollmentSignIn")
                    }
                    Button { showScanner = true } label: {
                        Label(isFrench ? "Scanner le code d'un restaurant" : "Scan a restaurant code", systemImage: "qrcode.viewfinder")
                            .font(.mv(size: 16, weight: .semibold)).foregroundStyle(MinervaColor.emeraldDark)
                            .frame(maxWidth: .infinity, minHeight: 54)
                            .background(MinervaColor.emerald.opacity(0.12), in: Capsule())
                    }
                    .buttonStyle(PressableButtonStyle()).accessibilityIdentifier("enrollmentScanner")
                }

                VStack(alignment: .leading, spacing: 10) {
                    Text(isFrench ? "Ou cherchez un restaurant" : "Or find a restaurant").font(.mv(size: 14, weight: .semibold)).foregroundStyle(MinervaColor.inkSoft)
                    HStack(spacing: 10) {
                        Image(systemName: "magnifyingglass").foregroundStyle(MinervaColor.inkFaint)
                        TextField(isFrench ? "Nom du restaurant" : "Restaurant name", text: $query)
                            .font(.mv(size: 15)).autocorrectionDisabled().submitLabel(.search)
                            .frame(minHeight: 44).focused($searchFocused)
                            .accessibilityIdentifier("enrollmentSearch")
                            .onTapGesture { searchFocused = true }
                            .onSubmit { searchFocused = false; Task { await search() } }
                        Button { searchFocused = false; Task { await search() } } label: {
                            Image(systemName: "arrow.right").font(.mv(size: 15, weight: .semibold)).frame(width: 40, height: 40)
                        }.disabled(query.trimmingCharacters(in: .whitespacesAndNewlines).count < 2 || loading)
                            .accessibilityLabel(isFrench ? "Rechercher" : "Search")
                    }
                    .padding(.horizontal, 12).padding(.vertical, 4).background(MinervaColor.surface, in: RoundedRectangle(cornerRadius: 16))
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(MinervaColor.border))
                }
                if loading { ProgressView().frame(maxWidth: .infinity).padding() }
                if let error {
                    Label(error, systemImage: "exclamationmark.circle").font(.mv(size: 13)).foregroundStyle(.red)
                }
                if !results.isEmpty {
                    CompteGroup(title: isFrench ? "ÉTABLISSEMENTS" : "RESTAURANTS") {
                        ForEach(results) { restaurant in
                            Button { browseOrSelect(restaurant) } label: {
                                CompteRowLabel(icon: "storefront", title: restaurant.name,
                                               subtitle: [restaurant.address, restaurant.city].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · "))
                            }.buttonStyle(.plain).accessibilityIdentifier("enrollmentRestaurant:\(restaurant.id)")
                            if restaurant.id != results.last?.id { CompteSeparator() }
                        }
                    }
                } else if searched && !loading {
                    Text(isFrench ? "Aucun établissement trouvé. Vérifiez le nom ou scannez le code fourni sur place." : "No restaurant found. Check the name or scan its code on site.")
                        .font(.mv(size: 13)).foregroundStyle(MinervaColor.inkSoft)
                }
                if let message = supabase.lastError { Text(message).font(.mv(size: 13)).foregroundStyle(.red) }
                if supabase.isAuthenticated {
                    Button(action: onSignIn) {
                        Text(isFrench ? "Changer de compte" : "Switch account").font(.mv(size: 14, weight: .semibold))
                            .foregroundStyle(MinervaColor.emeraldDark).frame(maxWidth: .infinity, minHeight: 44)
                    }.buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 24).padding(.bottom, 32)
            .frame(maxWidth: 540).frame(maxWidth: .infinity)
        }
        .background(MinervaColor.cream.ignoresSafeArea()).foregroundStyle(MinervaColor.ink)
        .scrollDismissesKeyboard(.interactively)
        .sheet(isPresented: $showScanner) { EnrollmentScannerView { value in showScanner = false; Task { await resolve(value) } } }
    }

    private func browseOrSelect(_ restaurant: NativeEnrollmentRestaurant) {
        if supabase.isAuthenticated { onSelect(restaurant) } else { publicRestaurant = restaurant }
    }

    private struct Response: Decodable { let restaurants: [NativeEnrollmentRestaurant] }
    private struct LinkResponse: Decodable { let restaurantId: String?; let restaurantName: String? }
    private func search() async {
        var url = URLComponents(url: Config.apiBaseURL.appending(path: "/api/portal/enrollment"), resolvingAgainstBaseURL: false)!
        url.queryItems = [URLQueryItem(name: "q", value: query)]
        loading = true; error = nil; searched = true
        defer { loading = false }
        do {
            let (data, response) = try await URLSession.shared.data(from: url.url!)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
            results = try JSONDecoder().decode(Response.self, from: data).restaurants
        } catch { results = []; self.error = isFrench ? "La recherche est indisponible. Réessayez ou scannez votre code." : "Search is unavailable. Retry or scan your code." }
    }
    private func resolvePendingLink() {
        guard let link = router.pendingUniversalLink else { return }
        router.pendingUniversalLink = nil
        switch link {
        case .touchpoint(let code): Task { await resolve("https://minervaflow.app/t/\(code)") }
        case .referral(let code, _): Task { await resolve("https://minervaflow.app/p/\(code)") }
        }
    }
    private func resolve(_ value: String) async {
        guard let scanned = URL(string: value), ["minervaflow.app", "www.minervaflow.app"].contains(scanned.host ?? ""), scanned.scheme == "https" else {
            error = isFrench ? "Scannez un code Minerva Flow valide." : "Scan a valid Minerva Flow code."; return
        }
        var parts = scanned.pathComponents.filter { $0 != "/" }
        if ["fr", "en", "tr"].contains(parts.first ?? "") { parts.removeFirst() }
        guard parts.count == 2 else { error = isFrench ? "Ce code est invalide." : "This code is invalid."; return }
        let kind = parts[0], token = parts[1]
        guard ["f", "m", "t", "p"].contains(kind) else { error = isFrench ? "Ce code ne relie pas un restaurant." : "This code does not link a restaurant."; return }
        var url = URLComponents(url: Config.apiBaseURL.appending(path: kind == "t" ? "/api/portal/resolve-touchpoint/\(token)" : kind == "p" ? "/api/portal/resolve-referral/\(token)" : "/api/portal/enrollment"), resolvingAgainstBaseURL: false)!
        if kind == "f" || kind == "m" { url.queryItems = [URLQueryItem(name: "token", value: token), URLQueryItem(name: "kind", value: kind == "m" ? "menu" : "loyalty")] }
        loading = true; error = nil
        defer { loading = false }
        do {
            let (data, response) = try await URLSession.shared.data(from: url.url!)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
            let restaurant: NativeEnrollmentRestaurant
            if kind == "f" || kind == "m" {
                guard let first = try JSONDecoder().decode(Response.self, from: data).restaurants.first else { throw URLError(.badServerResponse) }
                restaurant = first
            } else {
                let link = try JSONDecoder().decode(LinkResponse.self, from: data)
                guard let id = link.restaurantId, let name = link.restaurantName else { throw URLError(.badServerResponse) }
                restaurant = NativeEnrollmentRestaurant(id: id, name: name)
            }
            browseOrSelect(restaurant)
        } catch { self.error = isFrench ? "Impossible de lire ce code. Vérifiez le lien ou recherchez le restaurant." : "Could not read this code. Check the link or search for the restaurant." }
    }
}

private struct PublicEnrollmentMenuView: View {
    let restaurant: NativeEnrollmentRestaurant
    let onClose: () -> Void
    let onContinue: () -> Void
    @AppStorage(AppLanguagePreference.key) private var language = AppLanguage.fr.rawValue
    @State private var items: [NativeMenuItem] = []
    @State private var loading = true
    @State private var failed = false
    private var fr: Bool { language == AppLanguage.fr.rawValue }
    private struct Response: Decodable { let items: [NativeMenuItem] }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text(restaurant.name).font(MinervaFont.display(28, weight: .semibold)).accessibilityIdentifier("publicRestaurantName")
                    Text(fr ? "Découvrez le menu. Connectez-vous pour commander et retrouver vos récompenses." : "Browse the menu. Sign in to order and find your rewards.")
                        .font(.mv(size: 14)).foregroundStyle(MinervaColor.inkSoft)
                    if loading { ProgressView().frame(maxWidth: .infinity) }
                    if failed {
                        Text(fr ? "Le menu n’a pas pu être chargé." : "The menu could not be loaded.").font(.mv(size: 14))
                        Button(fr ? "Réessayer" : "Retry") { Task { await load() } }
                    } else if !loading && items.isEmpty {
                        Text(fr ? "Ce restaurant prépare son menu. Revenez bientôt." : "This restaurant is preparing its menu. Check back soon.").font(.mv(size: 14))
                    }
                    ForEach(items) { item in
                        VStack(alignment: .leading, spacing: 9) {
                            if let value = item.imageUrl, let url = URL(string: value), url.scheme == "https" {
                                AsyncImage(url: url) { image in image.resizable().scaledToFill() } placeholder: { Color.clear }
                                    .frame(height: 150).clipped().clipShape(RoundedRectangle(cornerRadius: 12))
                            }
                            Text(item.name).font(.mv(size: 16, weight: .semibold))
                            if let text = item.description, !text.isEmpty { Text(text).font(.mv(size: 13)).foregroundStyle(MinervaColor.inkSoft) }
                            if let options = item.priceOptions, !options.isEmpty {
                                ForEach(options) { option in Text("\(option.label) · \(option.price.formatted(.currency(code: "CAD")))").font(.mv(size: 14)) }
                            } else if item.price > 0 {
                                Text(item.price.formatted(.currency(code: "CAD"))).font(.mv(size: 14, weight: .semibold))
                            }
                        }.padding(16).frame(maxWidth: .infinity, alignment: .leading)
                            .background(MinervaColor.surface, in: RoundedRectangle(cornerRadius: 16))
                            .overlay(RoundedRectangle(cornerRadius: 16).stroke(MinervaColor.border))
                    }
                }.padding(22)
            }.background(MinervaColor.cream).foregroundStyle(MinervaColor.ink)
                .navigationTitle(fr ? "Menu du restaurant" : "Restaurant menu").navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .cancellationAction) { Button(fr ? "Retour" : "Back", action: onClose) } }
                .safeAreaInset(edge: .bottom) {
                    VStack {
                        Button(action: onContinue) {
                            Text(fr ? "Se connecter pour commander" : "Sign in to order").font(.mv(size: 15, weight: .semibold))
                                .frame(maxWidth: .infinity).padding(16).background(MinervaColor.emeraldDark, in: RoundedRectangle(cornerRadius: 14)).foregroundStyle(.white)
                                .contentShape(Rectangle())
                        }.buttonStyle(.plain).accessibilityIdentifier("publicMenuSignIn")
                    }.padding(18).background(MinervaColor.cream)
                }
                .task { await load() }
        }
    }

    private func load() async {
        loading = true; failed = false
        defer { loading = false }
        do {
            let url = Config.apiBaseURL.appending(path: "/api/portal/enrollment/\(restaurant.id)/menu")
            let (data, response) = try await URLSession.shared.data(from: url)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
            items = try JSONDecoder().decode(Response.self, from: data).items.filter { $0.active && $0.isDraft != true }
        } catch { items = []; failed = true }
    }
}

private struct EnrollmentScannerView: View {
    @Environment(\.dismiss) private var dismiss
    let onScan: (String) -> Void
    @State private var authorized = false
    @State private var checked = false
    var body: some View {
        NavigationStack {
            Group {
                if authorized { QRScannerRepresentable(onScan: onScan).ignoresSafeArea() }
                else if checked { ContentUnavailableView("Accès caméra requis", systemImage: "camera", description: Text("Autorisez la caméra dans Réglages, ou recherchez le nom du restaurant.")) }
                else { ProgressView() }
            }.navigationTitle("Scanner votre restaurant").navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Fermer") { dismiss() } } }
                .task {
                    authorized = AVCaptureDevice.authorizationStatus(for: .video) == .authorized
                    if AVCaptureDevice.authorizationStatus(for: .video) == .notDetermined { authorized = await AVCaptureDevice.requestAccess(for: .video) }
                    checked = true
                }
        }
    }
}
