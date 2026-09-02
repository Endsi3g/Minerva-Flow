import { NextResponse } from "next/server";
import { processLifecycleEngine } from "@/lib/email/lifecycle";

/**
 * Cron quotidien : évalue le cycle de vie des utilisateurs et envoie les emails
 * d'onboarding, d'activation, de support, de cas d'usage, de conversion et de réactivation.
 * Protégé par CRON_SECRET.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const stats = await processLifecycleEngine();
    return NextResponse.json({ ok: true, stats });
  } catch (err) {
    console.error("[Cron LifecycleEngine] Erreur d'exécution:", err);
    return NextResponse.json(
      { error: "Erreur interne lors du traitement du lifecycle", details: String(err) },
      { status: 500 }
    );
  }
}
