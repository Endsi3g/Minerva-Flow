import { LogoMark } from "@/components/shell/Logo";
import { Card } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { getInviteByToken, redeemInvite } from "@/lib/data/invites";
import { createClient } from "@/lib/supabase/server";
import { roleLabels } from "@/lib/app-context";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { CheckCircle2, XCircle } from "lucide-react";
import { redirect } from "next/navigation";

const statusMessage: Record<string, string> = {
  not_found: "Ce lien d'invitation n'existe pas ou a été révoqué.",
  expired: "Ce lien d'invitation a expiré. Demandez-en un nouveau au propriétaire.",
  used: "Ce lien d'invitation a déjà été utilisé.",
  rate_limited: "Trop de tentatives. Réessayez dans quelques minutes.",
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-mv-cream px-6 py-10">
      <div className="mb-6 flex items-center gap-2.5">
        <LogoMark size={30} />
        <span className="font-sans text-[17px] font-medium text-mv-ink">
          Minerva <span className="text-mv-green-dark">Flow</span>
        </span>
      </div>
      <Card className="w-full max-w-md text-center">{children}</Card>
    </div>
  );
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const ip = await getClientIp();
  const { allowed } = await checkRateLimit(`invite:${ip}`, { max: 20, windowSeconds: 300 });
  if (!allowed) {
    return (
      <Shell>
        <XCircle size={32} className="mx-auto mb-3 text-mv-red" />
        <h1 className="font-display text-[18px] font-medium text-mv-ink">Trop de tentatives</h1>
        <p className="mt-2 text-[13px] text-mv-ink-soft">{statusMessage.rate_limited}</p>
      </Shell>
    );
  }

  const invite = await getInviteByToken(token);

  if (invite.status !== "valid") {
    return (
      <Shell>
        <XCircle size={32} className="mx-auto mb-3 text-mv-red" />
        <h1 className="font-display text-[18px] font-medium text-mv-ink">Invitation invalide</h1>
        <p className="mt-2 text-[13px] text-mv-ink-soft">{statusMessage[invite.status]}</p>
        <Button href="/login" variant="secondary" className="mt-5 w-full">
          Retour à la connexion
        </Button>
      </Shell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const result = await redeemInvite(token);
    if (result.ok) redirect("/overview");
    return (
      <Shell>
        <XCircle size={32} className="mx-auto mb-3 text-mv-red" />
        <h1 className="font-display text-[18px] font-medium text-mv-ink">Impossible de rejoindre</h1>
        <p className="mt-2 text-[13px] text-mv-ink-soft">
          Une erreur est survenue en traitant cette invitation. Réessayez ou demandez un nouveau lien.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <CheckCircle2 size={32} className="mx-auto mb-3 text-mv-green-dark" />
      <h1 className="font-display text-[18px] font-medium text-mv-ink">Vous êtes invité·e</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-mv-ink-soft">
        Rejoignez <span className="font-semibold text-mv-ink">{invite.restaurantName}</span> en tant
        que <span className="font-semibold text-mv-ink">{roleLabels[invite.role]}</span>. Connectez-vous
        ou créez un compte pour continuer.
      </p>
      <div className="mt-5 flex flex-col gap-2">
        <Button href={`/login?inviteToken=${token}`} className="w-full">
          Se connecter
        </Button>
        <Button href={`/sign-up?inviteToken=${token}`} variant="secondary" className="w-full">
          Créer un compte
        </Button>
      </div>
    </Shell>
  );
}
