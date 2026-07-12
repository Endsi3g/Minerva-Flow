import { LogoMark } from "@/components/shell/Logo";
import { Card } from "@/components/minerva/PageCard";
import { MailCheck } from "lucide-react";

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-mv-cream px-6 py-10">
      <div className="mb-6 flex items-center gap-2.5">
        <LogoMark size={30} />
        <span className="font-display text-[17px] font-medium text-mv-ink">
          Minerva <span className="text-mv-green-dark">Flow</span>
        </span>
      </div>

      <Card className="w-full max-w-sm text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-mv-green-tint text-mv-green-dark">
          <MailCheck size={20} />
        </div>
        <h1 className="font-display text-[19px] font-medium text-mv-ink">Vérifiez vos emails</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-mv-ink-soft">
          Nous vous avons envoyé un lien de confirmation. Cliquez dessus pour activer votre compte
          et accéder à votre cockpit.
        </p>
      </Card>
    </div>
  );
}
