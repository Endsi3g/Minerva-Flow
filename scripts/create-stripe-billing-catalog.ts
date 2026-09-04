/**
 * One-off setup script: creates the Starter/Pro products + monthly/yearly
 * prices in Stripe from lib/billing/plans.ts, and prints the env vars to
 * paste into .env.local (or the Vercel project settings for prod). Safe to
 * re-run — it looks up existing products/prices by a `minerva_flow_tier`
 * metadata key before creating new ones, so it won't duplicate the catalog.
 *
 * Usage: npx tsx scripts/create-stripe-billing-catalog.ts
 */
import Stripe from "stripe";
import { PLANS, SELF_SERVE_TIERS, type BillingInterval } from "../lib/billing/plans";

const apiKey = process.env.STRIPE_SECRET_KEY;
if (!apiKey) {
  console.error("Erreur: STRIPE_SECRET_KEY n'est pas définie dans l'environnement.");
  process.exit(1);
}

const stripe = new Stripe(apiKey);

async function findOrCreateProduct(tier: string, name: string, description: string): Promise<Stripe.Product> {
  const existing = await stripe.products.search({
    query: `metadata['minerva_flow_tier']:'${tier}' AND active:'true'`,
  });
  if (existing.data[0]) return existing.data[0];

  return stripe.products.create({
    name: `Minerva Flow — ${name}`,
    description,
    metadata: { minerva_flow_tier: tier },
  });
}

async function findOrCreatePrice(
  product: Stripe.Product,
  tier: string,
  interval: BillingInterval,
  unitAmountCad: number
): Promise<Stripe.Price> {
  const existing = await stripe.prices.search({
    query: `product:'${product.id}' AND metadata['minerva_flow_interval']:'${interval}' AND active:'true'`,
  });
  if (existing.data[0]) return existing.data[0];

  return stripe.prices.create({
    product: product.id,
    currency: "cad",
    unit_amount: unitAmountCad * 100,
    recurring: { interval: interval === "monthly" ? "month" : "year" },
    metadata: { minerva_flow_tier: tier, minerva_flow_interval: interval },
  });
}

async function main() {
  const envLines: string[] = [];

  for (const tier of SELF_SERVE_TIERS) {
    const plan = PLANS[tier];
    if (plan.monthlyPriceCad == null || plan.yearlyPriceCad == null) continue;

    console.log(`\n— ${plan.name} —`);
    const product = await findOrCreateProduct(tier, plan.name, plan.description);
    console.log(`  Produit: ${product.id}`);

    const monthly = await findOrCreatePrice(product, tier, "monthly", plan.monthlyPriceCad);
    console.log(`  Prix mensuel (${plan.monthlyPriceCad}$ CAD): ${monthly.id}`);
    envLines.push(`STRIPE_PRICE_${tier.toUpperCase()}_MONTHLY=${monthly.id}`);

    const yearly = await findOrCreatePrice(product, tier, "yearly", plan.yearlyPriceCad);
    console.log(`  Prix annuel (${plan.yearlyPriceCad}$ CAD): ${yearly.id}`);
    envLines.push(`STRIPE_PRICE_${tier.toUpperCase()}_YEARLY=${yearly.id}`);
  }

  console.log("\n\n# Colle ces lignes dans .env.local (et dans les env vars Vercel pour la prod) :\n");
  console.log(envLines.join("\n"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
