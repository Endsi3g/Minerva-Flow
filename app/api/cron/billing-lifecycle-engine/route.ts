import { NextResponse } from "next/server";
import { processBillingLifecycleEngine } from "@/lib/email/billing-lifecycle";

/**
 * Cron quotidien : relance de paiement (J+3 en past_due) et reconquête
 * post-annulation (J+21). Les emails événementiels (essai qui finit, échec
 * de paiement immédiat, quota atteint) partent directement depuis le
 * webhook Stripe / le suivi de quota, pas d'ici. Protégé par CRON_SECRET.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const stats = await processBillingLifecycleEngine();
    return NextResponse.json({ ok: true, stats });
  } catch (err) {
    console.error("[Cron BillingLifecycleEngine] Erreur d'exécution:", err);
    return NextResponse.json(
      { error: "Erreur interne lors du traitement du cycle de vie facturation", details: String(err) },
      { status: 500 }
    );
  }
}
