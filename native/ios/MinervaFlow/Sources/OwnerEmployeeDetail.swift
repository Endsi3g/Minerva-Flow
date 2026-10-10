import SwiftUI

/// One team member's page for the owner, like the web team page: role and
/// rate, contact, notes, this week's hours and upcoming shifts.
struct OwnerEmployeeDetailScreen: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    let employee: NativeOwnerEmployee
    @State private var profile: OwnerEmployeeProfile?
    @State private var failed = false
    @State private var editing = false
    @State private var editingContact = false
    private var L: Lx { Lx(storedLanguage) }

    /// Live row from the store so edits appear immediately after saving.
    private var current: NativeOwnerEmployee { supabase.ownerEmployees.first { $0.id == employee.id } ?? employee }

    private var weekShifts: [OwnerEmployeeProfile.Shift] {
        guard let interval = Calendar.current.dateInterval(of: .weekOfYear, for: Date()) else { return [] }
        return (profile?.shifts ?? []).filter { shift in shift.date.map { interval.contains($0) } ?? false }
    }
    private var weekHours: Double { weekShifts.reduce(0) { $0 + $1.hours } }
    private var upcoming: [OwnerEmployeeProfile.Shift] {
        let today = Calendar.current.startOfDay(for: Date())
        return (profile?.shifts ?? []).filter { ($0.date ?? .distantPast) >= today }
    }

    var body: some View {
        OwnerScreen(title: current.fullName, subtitle: current.roleTitle.isEmpty ? nil : current.roleTitle, showsLocationMenu: false) {
            summaryCard
            contactCard
            notesCard
            shiftsCard
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) { Button(L("Modifier", "Edit")) { editing = true } }
        }
        .task { await load() }
        .refreshable { await load() }
        .sheet(isPresented: $editing) { EmployeeEditor(employee: current) }
        .sheet(isPresented: $editingContact, onDismiss: { Task { await load() } }) {
            EmployeeContactEditor(employeeId: employee.id, phone: profile?.contactPhone ?? "", email: profile?.contactEmail ?? "", notes: profile?.description ?? "")
        }
    }

    private func load() async {
        profile = await supabase.fetchOwnerEmployeeProfile(employeeId: employee.id)
        failed = profile == nil
    }

    private var summaryCard: some View {
        OwnerCard(padding: 14) {
            HStack(alignment: .top, spacing: 0) {
                figure(L("Taux horaire", "Hourly rate"), current.hourlyWage.map { $0.cad + "/h" } ?? "—")
                divider
                figure(L("Heures cette semaine", "Hours this week"), profile == nil ? "—" : String(format: "%.1f h", weekHours))
                divider
                figure(L("Coût estimé", "Est. cost"), (profile != nil && current.hourlyWage != nil) ? (weekHours * (current.hourlyWage ?? 0)).cad : "—")
            }
        }
    }

    private var divider: some View { Rectangle().fill(MinervaColor.border.opacity(0.8)).frame(width: 1, height: 40).padding(.horizontal, 10) }

    private func figure(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label).font(.mv(size: 11.5)).foregroundStyle(MinervaColor.inkSoft).lineLimit(2)
            Text(value).font(MinervaFont.display(20, weight: .semibold)).foregroundStyle(MinervaColor.ink).lineLimit(1).minimumScaleFactor(0.6)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }

    private var contactCard: some View {
        OwnerCard(padding: 12) {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text(L("Contact", "Contact")).font(.mv(size: 13, weight: .semibold)).foregroundStyle(MinervaColor.inkSoft)
                    Spacer()
                    OwnerPill(text: current.active ? L("Actif", "Active") : L("Inactif", "Inactive"), tone: current.active ? .good : .neutral)
                }
                if let phone = profile?.contactPhone, !phone.isEmpty {
                    HStack(spacing: 8) {
                        Label(phone, systemImage: "phone").font(.mv(size: 14))
                        Spacer()
                        let digits = phone.filter { $0.isNumber || $0 == "+" }
                        if let call = URL(string: "tel:" + digits) { Link(destination: call) { Label(L("Appeler", "Call"), systemImage: "phone.fill") }.buttonStyle(OwnerSecondaryButtonStyle(compact: true)) }
                        if let text = URL(string: "sms:" + digits) { Link(destination: text) { Label("SMS", systemImage: "message.fill") }.buttonStyle(OwnerSecondaryButtonStyle(compact: true)) }
                    }
                }
                if let email = profile?.contactEmail, !email.isEmpty {
                    HStack {
                        Label(email, systemImage: "envelope").font(.mv(size: 14)).lineLimit(1)
                        Spacer()
                        if let mail = URL(string: "mailto:" + email) { Link(destination: mail) { Text(L("Écrire", "Email")) }.buttonStyle(OwnerSecondaryButtonStyle(compact: true)) }
                    }
                }
                if (profile?.contactPhone ?? "").isEmpty && (profile?.contactEmail ?? "").isEmpty {
                    Text(L("Aucun contact enregistré.", "No contact saved.")).font(.mv(size: 13)).foregroundStyle(MinervaColor.inkFaint)
                }
                Button { editingContact = true } label: { Label(L("Modifier contact et notes", "Edit contact and notes"), systemImage: "pencil") }
                    .buttonStyle(OwnerSecondaryButtonStyle(tint: OwnerTone.neutral.color, compact: true))
            }
        }
    }

    @ViewBuilder private var notesCard: some View {
        if let notes = profile?.description, !notes.isEmpty {
            VStack(alignment: .leading, spacing: 6) {
                OwnerSectionHeader(title: L("Notes", "Notes"))
                OwnerCard(padding: 12) { Text(notes).font(.mv(size: 13.5)).foregroundStyle(MinervaColor.ink) }
            }
        }
    }

    private var shiftsCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            OwnerSectionHeader(title: L("Prochains quarts", "Upcoming shifts"))
            OwnerCard(padding: 4) {
                if profile == nil && !failed {
                    ProgressView().frame(maxWidth: .infinity).padding(14)
                } else if upcoming.isEmpty {
                    Text(L("Aucun quart planifié. Créez l'horaire depuis l'application web.", "No shifts scheduled. Build the schedule from the web app."))
                        .font(.mv(size: 13)).foregroundStyle(MinervaColor.inkSoft).padding(12)
                } else {
                    VStack(spacing: 0) {
                        ForEach(Array(upcoming.prefix(10).enumerated()), id: \.element.id) { index, shift in
                            if index > 0 { OwnerDivider() }
                            OwnerRow(icon: "calendar", title: (shift.date?.formatted(.dateTime.weekday(.abbreviated).day().month(.abbreviated)) ?? shift.shiftDate).capitalized,
                                     subtitle: shift.positionLabel) {
                                Text(shift.timeRange).font(.mv(size: 13, weight: .semibold)).monospacedDigit()
                            }
                            .padding(.horizontal, 10).padding(.vertical, 3)
                        }
                    }
                }
            }
        }
    }
}

private struct EmployeeContactEditor: View {
    @EnvironmentObject private var supabase: SupabaseManager
    @Environment(\.dismiss) private var dismiss
    @AppStorage(AppLanguagePreference.key) private var storedLanguage = AppLanguage.fr.rawValue
    let employeeId: String
    @State var phone: String
    @State var email: String
    @State var notes: String
    @State private var saving = false
    @State private var error: String?
    private var L: Lx { Lx(storedLanguage) }

    var body: some View {
        OwnerFormSheet(title: L("Contact et notes", "Contact and notes"), canSave: true, isSaving: saving, errorMessage: error, onSave: save) {
            Section(L("Contact", "Contact")) {
                TextField(L("Téléphone", "Phone"), text: $phone).keyboardType(.phonePad)
                TextField(L("Courriel", "Email"), text: $email).keyboardType(.emailAddress).textInputAutocapitalization(.never).autocorrectionDisabled()
            }
            Section(L("Notes", "Notes")) { TextField(L("Disponibilités, compétences, rappels…", "Availability, skills, reminders…"), text: $notes, axis: .vertical).lineLimit(3...8) }
        }
    }

    private func save() {
        saving = true; error = nil
        Task {
            let ok = await supabase.updateOwnerEmployeeContact(employeeId: employeeId, phone: phone, email: email, notes: notes)
            saving = false
            if ok { dismiss() } else { error = L("Les informations n'ont pas été enregistrées. Réessayez.", "The details were not saved. Try again.") }
        }
    }
}
