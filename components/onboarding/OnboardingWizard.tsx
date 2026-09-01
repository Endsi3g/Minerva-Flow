"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { Onboarding, ChoiceGroup } from "@/components/ui/onboarding";
import { Avatar } from "@/components/minerva/PersonAvatar";
import { Field, Input } from "@/components/minerva/FormField";
import { roleLabels } from "@/lib/app-context";
import { useAvatarUpload } from "@/hooks/use-avatar-upload";
import { updateProfileNameAction } from "@/app/[locale]/(app)/profil/actions";
import { updateRestaurantAction, createRestaurantAction } from "@/app/[locale]/(app)/settings/actions";
import { setMyRoleAction, finishOnboardingAction } from "@/app/[locale]/onboarding/actions";
import type { Role } from "@/lib/types";

const ROLE_OPTIONS: Role[] = ["owner", "manager", "staff", "consultant"];

/**
 * Single-step by design: account creation (a separate route, see AuthCard)
 * already made the restaurant exist via the handle_new_user() DB trigger —
 * this step only needs to attach a name to it and a name/role to you.
 * Address, financial baseline, and tool connections were deliberately moved
 * out to a post-onboarding checklist on Overview — see FinishSetupCard —
 * so a new owner reaches the real app in one short step instead of six.
 */
export function OnboardingWizard({
  userId,
  restaurantId,
  restaurantName,
  initialFullName,
  initialAvatarUrl,
  initialRole,
}: {
  userId: string;
  restaurantId: string;
  restaurantName: string;
  initialFullName: string;
  initialAvatarUrl: string | null;
  initialRole: Role;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // getMyProfile() falls back to the account email when no real name was
  // ever set (same fallback the signup DB trigger uses) — showing that raw
  // email as a "prefilled" name reads as broken, so start blank instead and
  // let the placeholder guide the first real name entry.
  const [fullName, setFullName] = useState(initialFullName.includes("@") ? "" : initialFullName);
  const [role, setRole] = useState<Role>(initialRole);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [restaurantNameInput, setRestaurantNameInput] = useState(
    restaurantName === "Mon restaurant" ? "" : restaurantName
  );
  // Tracks the restaurant once created, separately from the `restaurantId`
  // prop: an account that reaches this step with no restaurant (e.g. an
  // orphaned membership) only creates one once. Without this, retrying
  // after a downstream failure (finishOnboardingAction erroring, say) would
  // call createRestaurantAction again on the still-empty prop and leave the
  // user owning two restaurants.
  const [currentRestaurantId, setCurrentRestaurantId] = useState(restaurantId);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { preview, loading: uploadLoading, error: uploadError, pickAndUpload } = useAvatarUpload({
    userId,
    onUploaded: (url) => setAvatarUrl(url),
  });

  async function handleComplete() {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const trimmed = fullName.trim();
      if (trimmed && trimmed !== initialFullName) {
        const result = await updateProfileNameAction(trimmed);
        if (!result.ok) throw new Error(result.error);
      }

      const finalName = restaurantNameInput.trim() || restaurantName;
      let targetRestaurantId = currentRestaurantId;
      if (targetRestaurantId) {
        if (finalName !== restaurantName) {
          await updateRestaurantAction(targetRestaurantId, { name: finalName }).catch(() => null);
        }
      } else {
        const created = await createRestaurantAction({ name: finalName });
        if (!created) throw new Error("Impossible de créer votre établissement. Réessayez.");
        targetRestaurantId = created.id;
        setCurrentRestaurantId(created.id);
      }

      // createRestaurantAction always inserts the new membership as
      // "owner" — applying the chosen role here (a no-op update when it
      // already matches) covers both the newly-created and pre-existing
      // restaurant cases with the same call.
      await setMyRoleAction(targetRestaurantId, role);

      const finished = await finishOnboardingAction();
      if (!finished) throw new Error("Impossible de terminer la configuration. Réessayez.");
      router.push("/overview");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Une erreur est survenue.");
      setSubmitting(false);
    }
  }

  return (
    <Onboarding
      defaultValue={1}
      totalSteps={1}
      onComplete={handleComplete}
      canGoNext={() => fullName.trim().length > 0 && restaurantNameInput.trim().length > 0}
      className="border-none bg-transparent p-0 shadow-none"
    >
      <Onboarding.Step step={1}>
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative block rounded-full outline-none focus-visible:ring-2 focus-visible:ring-mv-green/40"
              aria-label="Changer la photo de profil"
            >
              <Avatar name={fullName || "?"} src={preview ?? avatarUrl} size={72} />
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-transparent transition-colors group-hover:bg-black/35 group-hover:text-white">
                {uploadLoading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void pickAndUpload(f);
                e.target.value = "";
              }}
            />
          </div>
          {uploadError && <p className="text-[12px] text-mv-red">{uploadError}</p>}

          <div className="w-full space-y-4">
            <Field label="Votre nom">
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Tremblay"
                required
              />
            </Field>

            <Field label="Nom de votre restaurant">
              <Input
                value={restaurantNameInput}
                onChange={(e) => setRestaurantNameInput(e.target.value)}
                placeholder="Ex : Bistro du Coin"
                required
              />
            </Field>

            <div>
              <p className="mb-2 text-[13px] font-semibold text-mv-ink-soft">Votre rôle</p>
              <ChoiceGroup name="role" value={role} onValueChange={(v) => setRole(v as Role)} orientation="grid">
                {ROLE_OPTIONS.map((r) => (
                  <ChoiceGroup.Item key={r} value={r}>
                    {roleLabels[r]}
                  </ChoiceGroup.Item>
                ))}
              </ChoiceGroup>
            </div>
          </div>

          {submitError && <p className="text-[12.5px] text-mv-red">{submitError}</p>}
        </div>
      </Onboarding.Step>

      <Onboarding.Navigation className="mt-6" completeLabel={submitting ? "Un instant…" : "Accéder à mon espace"} />
    </Onboarding>
  );
}
