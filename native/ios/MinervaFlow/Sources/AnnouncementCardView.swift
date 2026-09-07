import SwiftUI

/// Luxury editorial announcement card & micro-survey for customer portal.
/// Displays platform announcements, updates, and 1-click interactive polls.
struct AnnouncementCardView: View {
    let announcement: PlatformAnnouncement
    @EnvironmentObject var supabase: SupabaseManager

    @State private var isDismissed: Bool = false
    @State private var selectedOption: String? = nil
    @State private var feedbackText: String = ""
    @State private var isSubmitting: Bool = false
    @State private var feedbackSent: Bool = false

    private var dismissedStorageKey: String {
        "announcement_dismissed_\(announcement.id)"
    }

    private var votedStorageKey: String {
        "announcement_voted_\(announcement.id)"
    }

    var body: some View {
        if !isDismissed {
            VStack(alignment: .leading, spacing: 12) {
                // Header with badge & dismiss button
                HStack(alignment: .center) {
                    HStack(spacing: 4) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 11, weight: .semibold))
                        Text(announcement.badgeLabel?.uppercased() ?? "NOUVEAUTÉ")
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                            .tracking(0.5)
                    }
                    .foregroundStyle(MinervaColor.emeraldDark)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(MinervaColor.emerald.opacity(0.12))
                    .clipShape(Capsule())

                    Spacer()

                    Button {
                        withAnimation(.easeOut(duration: 0.2)) {
                            isDismissed = true
                        }
                        UserDefaults.standard.set(true, forKey: dismissedStorageKey)
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(MinervaColor.inkFaint)
                            .padding(6)
                            .background(Color.white.opacity(0.6))
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)
                }

                // Title & Body
                VStack(alignment: .leading, spacing: 4) {
                    Text(announcement.title)
                        .font(MinervaFont.display(17, weight: .medium))
                        .foregroundStyle(MinervaColor.ink)
                        .fixedSize(horizontal: false, vertical: true)

                    Text(announcement.body)
                        .font(.system(size: 13))
                        .foregroundStyle(MinervaColor.inkSoft)
                        .lineSpacing(2)
                        .fixedSize(horizontal: false, vertical: true)
                }

                // Micro-Survey Block
                if let question = announcement.pollQuestion, let options = announcement.pollOptions, !options.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        Text(question)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(MinervaColor.ink)

                        // Survey Options
                        VStack(spacing: 6) {
                            ForEach(options, id: \.self) { option in
                                let isSelected = (selectedOption == option)
                                Button {
                                    handleVote(option: option)
                                } label: {
                                    HStack(spacing: 8) {
                                        if isSelected {
                                            Image(systemName: "checkmark")
                                                .font(.system(size: 12, weight: .bold))
                                        }
                                        Text(option)
                                            .font(.system(size: 13, weight: isSelected ? .semibold : .regular))
                                        Spacer()
                                    }
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 10)
                                    .background(
                                        isSelected
                                            ? MinervaColor.emerald
                                            : Color.white.opacity(0.9)
                                    )
                                    .foregroundStyle(
                                        isSelected
                                            ? MinervaColor.creamSoft
                                            : MinervaColor.ink
                                    )
                                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                                            .stroke(
                                                isSelected ? MinervaColor.emerald : MinervaColor.border,
                                                lineWidth: 1
                                            )
                                    )
                                }
                                .buttonStyle(PressableButtonStyle())
                                .disabled(selectedOption != nil)
                                .opacity(selectedOption != nil && !isSelected ? 0.55 : 1.0)
                            }
                        }

                        // Optional Feedback Input (shows up after picking an option)
                        if selectedOption != nil && !feedbackSent {
                            HStack(spacing: 8) {
                                TextField("Votre commentaire (optionnel)...", text: $feedbackText)
                                    .font(.system(size: 12))
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .background(Color.white)
                                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                                            .stroke(MinervaColor.border, lineWidth: 1)
                                    )

                                Button {
                                    handleSendFeedback()
                                } label: {
                                    Image(systemName: "paperplane.fill")
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundStyle(MinervaColor.creamSoft)
                                        .padding(.horizontal, 14)
                                        .padding(.vertical, 8)
                                        .background(
                                            feedbackText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                                                ? MinervaColor.emerald.opacity(0.4)
                                                : MinervaColor.emerald
                                        )
                                        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                                }
                                .buttonStyle(PressableButtonStyle())
                                .disabled(feedbackText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSubmitting)
                            }
                            .padding(.top, 4)
                        }

                        // Success confirmation
                        if feedbackSent {
                            HStack(spacing: 6) {
                                Image(systemName: "heart.fill")
                                    .font(.system(size: 12))
                                Text("Merci beaucoup pour votre avis !")
                                    .font(.system(size: 12, weight: .medium))
                            }
                            .foregroundStyle(MinervaColor.emeraldDark)
                            .padding(.top, 2)
                        }
                    }
                    .padding(12)
                    .background(Color.white.opacity(0.65))
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .stroke(MinervaColor.border, lineWidth: 1)
                    )
                }

                // CTA Link if present
                if let ctaLabel = announcement.callToActionLabel,
                   let ctaUrlString = announcement.callToActionUrl,
                   let url = URL(string: ctaUrlString) {
                    Link(destination: url) {
                        HStack(spacing: 6) {
                            Text(ctaLabel)
                                .font(.system(size: 13, weight: .semibold))
                            Image(systemName: "arrow.up.right")
                                .font(.system(size: 11, weight: .bold))
                        }
                        .foregroundStyle(MinervaColor.emeraldDark)
                    }
                    .padding(.top, 2)
                }
            }
            .padding(16)
            .background(
                LinearGradient(
                    colors: [
                        MinervaColor.creamSoft,
                        MinervaColor.cream,
                        MinervaColor.emerald.opacity(0.08)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(MinervaColor.emerald.opacity(0.2), lineWidth: 1)
            )
            .onAppear {
                isDismissed = UserDefaults.standard.bool(forKey: dismissedStorageKey)
                if let saved = UserDefaults.standard.string(forKey: votedStorageKey) {
                    selectedOption = saved
                    feedbackSent = true
                }
            }
        }
    }

    private func handleVote(option: String) {
        guard selectedOption == nil else { return }
        withAnimation(.easeOut(duration: 0.15)) {
            selectedOption = option
        }
        UserDefaults.standard.set(option, forKey: votedStorageKey)

        Task {
            await supabase.submitAnnouncementVote(
                announcementId: announcement.id,
                option: option
            )
        }
    }

    private func handleSendFeedback() {
        let trimmed = feedbackText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let opt = selectedOption, !trimmed.isEmpty, !isSubmitting else { return }

        isSubmitting = true
        Task {
            await supabase.submitAnnouncementVote(
                announcementId: announcement.id,
                option: opt,
                feedback: trimmed
            )
            await MainActor.run {
                withAnimation(.easeOut(duration: 0.2)) {
                    feedbackSent = true
                    isSubmitting = false
                }
            }
        }
    }
}
