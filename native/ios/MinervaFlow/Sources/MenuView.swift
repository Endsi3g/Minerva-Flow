import SwiftUI

/// Full ordering flow: browse the restaurant's live menu grouped by
/// category, build a cart with quantity steppers, then a real checkout
/// sheet (tip selection, tax breakdown, payment method note, submission).
/// Mirrors the web portal's MenuBrowserCard + CheckoutModal pair exactly —
/// same pay-on-site model (no online payment wired in yet on either
/// platform), same order landing in the restaurant's own /commandes queue
/// as a normal `soumise` order. The only structural difference from web:
/// this talks to app/api/portal/menu and /orders instead of a Server
/// Action, since native has no way to call one of those directly.
struct MenuView: View {
    @EnvironmentObject var supabase: SupabaseManager

    @State private var cart: [String: Int] = [:]
    @State private var checkoutOpen = false
    @State private var hasLoadedOnce = false

    private var cartCount: Int { cart.values.reduce(0, +) }
    private var cartLines: [(item: NativeMenuItem, quantity: Int)] {
        supabase.menuItems.compactMap { item in
            guard let qty = cart[item.id], qty > 0 else { return nil }
            return (item, qty)
        }
    }
    private var cartSubtotal: Double {
        cartLines.reduce(0) { $0 + $1.item.price * Double($1.quantity) }
    }

    private var groupedMenu: [(category: String, items: [NativeMenuItem])] {
        var order: [String] = []
        var buckets: [String: [NativeMenuItem]] = [:]
        for item in supabase.menuItems {
            let key = item.category?.trimmingCharacters(in: .whitespaces).isEmpty == false
                ? item.category!
                : "Autres"
            if buckets[key] == nil {
                buckets[key] = []
                order.append(key)
            }
            buckets[key]?.append(item)
        }
        return order.map { (category: $0, items: buckets[$0] ?? []) }
    }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                Group {
                    if supabase.isLoadingMenu && supabase.menuItems.isEmpty {
                        VStack {
                            Spacer()
                            ProgressView()
                            Spacer()
                        }
                    } else if supabase.menuItems.isEmpty {
                        emptyState
                    } else {
                        categoryGrid
                    }
                }
                .background(MinervaColor.cream.ignoresSafeArea())

                if cartCount > 0 {
                    cartBar
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
            .navigationTitle("Commander")
            .navigationBarTitleDisplayMode(.large)
            .animation(.easeInOut(duration: 0.25), value: cartCount)
            .task {
                guard !hasLoadedOnce else { return }
                hasLoadedOnce = true
                await supabase.fetchMenu()
            }
            .refreshable { await supabase.fetchMenu() }
            .sheet(isPresented: $checkoutOpen) {
                CheckoutSheet(
                    lines: cartLines,
                    taxRate: supabase.taxRate,
                    acceptsTips: supabase.acceptsTips,
                    onOrdered: {
                        cart = [:]
                        checkoutOpen = false
                    }
                )
            }
            .alert("Erreur", isPresented: Binding(
                get: { supabase.lastError != nil },
                set: { if !$0 { supabase.lastError = nil } }
            )) {
                Button("OK", role: .cancel) { supabase.lastError = nil }
            } message: {
                Text(supabase.lastError ?? "")
            }
        }
    }

    /// Categories first, browsed one at a time — a restaurant with dozens
    /// of items (the "40 cafés" case) would otherwise force one long
    /// scroll to find anything. Each tile shows the category's own item
    /// count so it's obvious how much is behind it before tapping in.
    private var categoryGrid: some View {
        ScrollView {
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                ForEach(groupedMenu, id: \.category) { group in
                    NavigationLink {
                        CategoryItemListView(category: group.category, items: group.items, cart: $cart)
                    } label: {
                        VStack(alignment: .leading, spacing: 8) {
                            Image(systemName: "fork.knife")
                                .font(.system(size: 20))
                                .foregroundStyle(MinervaColor.emerald)
                            Text(group.category)
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(MinervaColor.ink)
                                .fixedSize(horizontal: false, vertical: true)
                            Text("\(group.items.count) article\(group.items.count > 1 ? "s" : "")")
                                .font(.system(size: 11))
                                .foregroundStyle(MinervaColor.inkFaint)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(16)
                    }
                    .background(MinervaColor.creamSoft)
                    .clipShape(RoundedRectangle(cornerRadius: 18))
                    .buttonStyle(PressableButtonStyle())
                }
                Color.clear.frame(height: cartCount > 0 ? 80 : 8).gridCellColumns(2)
            }
            .padding(18)
        }
    }

    private var cartBar: some View {
        Button {
            checkoutOpen = true
        } label: {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "cart.fill")
                    Text("\(cartCount) article\(cartCount > 1 ? "s" : "")")
                        .font(.system(size: 13.5, weight: .semibold))
                }
                Spacer()
                HStack(spacing: 4) {
                    Text(String(format: "%.2f $", cartSubtotal))
                        .font(.system(size: 13.5, weight: .semibold))
                    Image(systemName: "arrow.right")
                        .font(.system(size: 12, weight: .bold))
                }
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 18)
            .padding(.vertical, 15)
        }
        .background(MinervaColor.emerald)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: MinervaColor.ink.opacity(0.15), radius: 12, x: 0, y: 4)
        .buttonStyle(PressableButtonStyle())
        .padding(.horizontal, 18)
        .padding(.bottom, 8)
    }

    private var emptyState: some View {
        VStack(spacing: 10) {
            Image(systemName: "fork.knife.circle")
                .font(.system(size: 36))
                .foregroundStyle(MinervaColor.inkFaint)
            Text("Aucun plat disponible")
                .font(MinervaFont.display(18))
                .foregroundStyle(MinervaColor.ink)
            Text("Votre restaurant n'a pas encore publié de menu.")
                .font(.system(size: 12.5))
                .foregroundStyle(MinervaColor.inkSoft)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

/// One category's items — the second step of the category-first browse
/// (category grid → this list → MenuItemDetailView). The quantity stepper
/// lives here rather than on the detail page, so adding to cart never
/// requires leaving the list; tapping the item's name/photo instead of the
/// stepper is what opens the full detail page.
struct CategoryItemListView: View {
    let category: String
    let items: [NativeMenuItem]
    @Binding var cart: [String: Int]
    @EnvironmentObject var supabase: SupabaseManager

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                ForEach(items) { item in
                    menuRow(item)
                }
            }
            .padding(18)
        }
        .background(MinervaColor.cream.ignoresSafeArea())
        .navigationTitle(category)
        .navigationBarTitleDisplayMode(.inline)
    }

    private func menuRow(_ item: NativeMenuItem) -> some View {
        let quantity = cart[item.id] ?? 0

        return HStack(spacing: 12) {
            NavigationLink {
                MenuItemDetailView(item: item, restaurantId: item.restaurantId, allItemsInCategory: items)
            } label: {
                HStack(spacing: 12) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 12).fill(MinervaColor.ink.opacity(0.05))
                        if let firstImage = item.galleryImageURLs.first, let url = URL(string: firstImage) {
                            AsyncImage(url: url) { phase in
                                if let image = phase.image {
                                    image.resizable().scaledToFill()
                                } else {
                                    Image(systemName: "fork.knife").foregroundStyle(MinervaColor.inkFaint)
                                }
                            }
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        } else {
                            Image(systemName: "fork.knife")
                                .font(.system(size: 18))
                                .foregroundStyle(MinervaColor.inkFaint)
                        }
                    }
                    .frame(width: 56, height: 56)
                    .clipped()

                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.name)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(MinervaColor.ink)
                            .fixedSize(horizontal: false, vertical: true)
                        if let description = item.description {
                            Text(description)
                                .font(.system(size: 11.5))
                                .foregroundStyle(MinervaColor.inkFaint)
                                .lineLimit(2)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        Text(String(format: "%.2f $", item.price))
                            .font(.system(size: 12.5, weight: .semibold))
                            .foregroundStyle(MinervaColor.emeraldDark)
                    }
                }
            }
            .buttonStyle(.plain)

            Spacer(minLength: 8)

            stepper(quantity: quantity, itemId: item.id)
        }
        .padding(12)
        .background(quantity > 0 ? MinervaColor.emerald.opacity(0.06) : MinervaColor.creamSoft)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(quantity > 0 ? MinervaColor.emerald.opacity(0.3) : .clear, lineWidth: 1.5)
        )
    }

    private func stepper(quantity: Int, itemId: String) -> some View {
        HStack(spacing: 10) {
            if quantity > 0 {
                Button {
                    let generator = UIImpactFeedbackGenerator(style: .light)
                    generator.impactOccurred()
                    cart[itemId] = max(0, quantity - 1)
                } label: {
                    Image(systemName: "minus.circle.fill")
                        .font(.system(size: 22))
                        .foregroundStyle(MinervaColor.inkSoft)
                }
                .buttonStyle(PressableButtonStyle())

                Text("\(quantity)")
                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                    .foregroundStyle(MinervaColor.ink)
                    .frame(minWidth: 16)
            }

            Button {
                let generator = UIImpactFeedbackGenerator(style: .light)
                generator.impactOccurred()
                cart[itemId] = quantity + 1
            } label: {
                Image(systemName: "plus.circle.fill")
                    .font(.system(size: 22))
                    .foregroundStyle(MinervaColor.emerald)
            }
            .buttonStyle(PressableButtonStyle())
        }
    }
}

private let tipPresets: [Double] = [0, 0.10, 0.15, 0.20]

/// Full checkout: line-item review, tip selection, tax breakdown, an
/// optional payment-method note (pay-on-site — no card capture, same as
/// web), then submission with real success/error states rather than just
/// dismissing the sheet and hoping.
struct CheckoutSheet: View {
    let lines: [(item: NativeMenuItem, quantity: Int)]
    let taxRate: Double
    let acceptsTips: Bool
    let onOrdered: () -> Void

    @EnvironmentObject var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss

    @State private var tipPct: Double?
    @State private var paymentMethod = ""
    @State private var status: Status = .idle

    enum Status { case idle, submitting, done, error }

    private var subtotal: Double { lines.reduce(0) { $0 + $1.item.price * Double($1.quantity) } }
    private var taxAmount: Double { (subtotal * taxRate * 100).rounded() / 100 }
    private var tipAmount: Double { tipPct.map { (subtotal * $0 * 100).rounded() / 100 } ?? 0 }
    private var total: Double { subtotal + taxAmount + tipAmount }

    var body: some View {
        NavigationStack {
            Group {
                if status == .done {
                    doneState
                } else {
                    formState
                }
            }
            .background(MinervaColor.cream.ignoresSafeArea())
            .navigationTitle("Votre commande")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    if status != .done {
                        Button("Fermer") { dismiss() }
                    }
                }
            }
        }
        .onAppear { tipPct = acceptsTips ? 0.15 : nil }
        .interactiveDismissDisabled(status == .submitting)
    }

    private var formState: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(spacing: 8) {
                    ForEach(lines, id: \.item.id) { line in
                        HStack {
                            Text("\(line.quantity)× \(line.item.name)")
                                .font(.system(size: 13))
                                .foregroundStyle(MinervaColor.inkSoft)
                                .fixedSize(horizontal: false, vertical: true)
                            Spacer(minLength: 8)
                            Text(String(format: "%.2f $", line.item.price * Double(line.quantity)))
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(MinervaColor.ink)
                        }
                    }
                }
                .padding(14)
                .background(MinervaColor.creamSoft)
                .clipShape(RoundedRectangle(cornerRadius: 14))

                if acceptsTips {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Pourboire")
                            .font(.system(size: 12.5, weight: .semibold))
                            .foregroundStyle(MinervaColor.inkSoft)
                        HStack(spacing: 8) {
                            ForEach(tipPresets, id: \.self) { pct in
                                Button {
                                    tipPct = pct
                                } label: {
                                    Text(pct == 0 ? "Aucun" : "\(Int(pct * 100))%")
                                        .font(.system(size: 12.5, weight: .semibold))
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 10)
                                }
                                .background(tipPct == pct ? MinervaColor.emerald.opacity(0.15) : MinervaColor.creamSoft)
                                .foregroundStyle(tipPct == pct ? MinervaColor.emeraldDark : MinervaColor.inkSoft)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(tipPct == pct ? MinervaColor.emerald : MinervaColor.border)
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                            }
                        }
                    }
                }

                VStack(spacing: 6) {
                    totalRow("Sous-total", subtotal)
                    totalRow("Taxes", taxAmount)
                    if acceptsTips { totalRow("Pourboire", tipAmount) }
                    Divider()
                    totalRow("Total", total, emphasized: true)
                }
                .padding(14)
                .background(MinervaColor.creamSoft)
                .clipShape(RoundedRectangle(cornerRadius: 14))

                VStack(alignment: .leading, spacing: 6) {
                    Text("Comment payez-vous en salle ?")
                        .font(.system(size: 11.5, weight: .semibold))
                        .foregroundStyle(MinervaColor.inkSoft)
                    TextField("", text: $paymentMethod, prompt: Text("Carte, comptant…").foregroundStyle(MinervaColor.inkFaint))
                        .padding(12)
                        .background(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 11))
                        .overlay(RoundedRectangle(cornerRadius: 11).stroke(MinervaColor.border))
                    Text("Le paiement se fait sur place, pas dans l'app.")
                        .font(.system(size: 10.5))
                        .foregroundStyle(MinervaColor.inkFaint)
                }

                if status == .error {
                    Text("La commande a échoué. Réessayez.")
                        .font(.system(size: 12.5))
                        .foregroundStyle(.red)
                }

                Button {
                    Task { await submit() }
                } label: {
                    HStack {
                        if status == .submitting { ProgressView().tint(.white) }
                        Text(status == .submitting ? "Envoi…" : "Envoyer la commande (\(String(format: "%.2f $", total)))")
                            .font(.system(size: 14.5, weight: .semibold))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                }
                .background(MinervaColor.emerald)
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .buttonStyle(PressableButtonStyle())
                .disabled(status == .submitting)
            }
            .padding(18)
        }
    }

    private func totalRow(_ label: String, _ amount: Double, emphasized: Bool = false) -> some View {
        HStack {
            Text(label)
                .font(.system(size: emphasized ? 14 : 12.5, weight: emphasized ? .semibold : .regular))
            Spacer()
            Text(String(format: "%.2f $", amount))
                .font(.system(size: emphasized ? 15 : 12.5, weight: emphasized ? .bold : .medium))
        }
        .foregroundStyle(emphasized ? MinervaColor.ink : MinervaColor.inkSoft)
    }

    private var doneState: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 56))
                .foregroundStyle(MinervaColor.emeraldDark)
            Text("Commande envoyée")
                .font(MinervaFont.display(22))
                .foregroundStyle(MinervaColor.ink)
            Text("Le restaurant a reçu votre commande. Vous recevrez une confirmation sur place.")
                .font(.system(size: 13))
                .foregroundStyle(MinervaColor.inkSoft)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, 30)
            Spacer()
            Button("Fermer") {
                onOrdered()
                dismiss()
            }
            .font(.system(size: 14.5, weight: .semibold))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 13)
            .background(MinervaColor.emerald)
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .buttonStyle(PressableButtonStyle())
            .padding(.horizontal, 24)
        }
    }

    private func submit() async {
        status = .submitting
        let cartDict = Dictionary(uniqueKeysWithValues: lines.map { ($0.item.id, $0.quantity) })
        let result = await supabase.submitOrder(cart: cartDict, tipAmount: tipAmount, paymentMethod: paymentMethod.isEmpty ? nil : paymentMethod)
        let generator = UINotificationFeedbackGenerator()
        if result.ok {
            generator.notificationOccurred(.success)
            status = .done
        } else {
            generator.notificationOccurred(.error)
            status = .error
        }
    }
}
