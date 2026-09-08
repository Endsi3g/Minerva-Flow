/**
 * One-off setup script: creates the "Carte NFC personnalisée" one-time
 * product + $75 CAD price in Stripe, and prints the env var to paste into
 * .env.local (or Vercel project settings for prod). Safe to re-run — it
 * looks up an existing product by a `minerva_flow_product` metadata key
 * before creating a new one, same pattern as
 * create-stripe-billing-catalog.ts.
 *
 * Usage: npx tsx scripts/create-stripe-nfc-card-price.ts
 */
import Stripe from "stripe";

const NFC_CARD_PRICE_CAD = 75;

const apiKey = process.env.STRIPE_SECRET_KEY;
if (!apiKey) {
  console.error("Erreur: STRIPE_SECRET_KEY n'est pas définie dans l'environnement.");
  process.exit(1);
}

const stripe = new Stripe(apiKey);

async function main() {
  const existing = await stripe.products.search({
    query: `metadata['minerva_flow_product']:'nfc_card' AND active:'true'`,
  });

  const product =
    existing.data[0] ??
    (await stripe.products.create({
      name: "Minerva Flow — Carte NFC personnalisée",
      description:
        "Carte NFC physique brandée, prête à poser (comptoir, table, vitrine) — point d'entrée direct vers l'app Minerva Flow d'un restaurant.",
      metadata: { minerva_flow_product: "nfc_card" },
    }));
  console.log(`Produit: ${product.id}`);

  const existingPrices = await stripe.prices.search({
    query: `product:'${product.id}' AND active:'true'`,
  });

  const price =
    existingPrices.data[0] ??
    (await stripe.prices.create({
      product: product.id,
      currency: "cad",
      unit_amount: NFC_CARD_PRICE_CAD * 100,
      // One-time, not recurring — quantity (number of cards) is chosen at
      // checkout, not baked into the price.
      metadata: { minerva_flow_product: "nfc_card" },
    }));
  console.log(`Prix (${NFC_CARD_PRICE_CAD}$ CAD, unitaire): ${price.id}`);

  console.log("\n# Colle cette ligne dans .env.local (et dans les env vars Vercel pour la prod) :\n");
  console.log(`STRIPE_PRICE_NFC_CARD=${price.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
