import { LogoMark } from "@/components/shell/Logo";
import { Card } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { OctagonAlert } from "lucide-react";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-mv-cream px-6 py-10">
      <div className="mb-6 flex items-center gap-2.5">
        <LogoMark size={30} />
        <span className="font-display text-[17px] font-medium text-mv-ink">
          Minerva <span className="text-mv-green-dark">Flow</span>
        </span>
      </div>

      <Card className="w-full max-w-sm text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-mv-red-bg text-mv-red">
          <OctagonAlert size={20} />
        </div>
        <h1 className="font-display text-[19px] font-medium text-mv-ink">
          Un problème est survenu
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-mv-ink-soft">
          {params?.error ? params.error : "Erreur non spécifiée."}
        </p>
        <Button href="/login" className="mt-5 w-full">
          Retour à la connexion
        </Button>
      </Card>
    </div>
  );
}
