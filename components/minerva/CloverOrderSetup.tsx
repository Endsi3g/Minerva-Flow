"use client";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useLocale } from "next-intl";
import { getCloverOrderSetupAction, saveCloverOrderMappingAction, saveCloverOrderSetupAction, type CloverOrderSetup as Setup } from "@/app/[locale]/(app)/settings/clover-order-actions";
import { toast } from "sonner";

export function CloverOrderSetup({ restaurantId }: { restaurantId: string }) {
  const english = useLocale().startsWith("en");
  const [setup, setSetup] = useState<Setup | null>(null);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState("");
  const [pending, startTransition] = useTransition();
  const text = (fr: string, en: string) => english ? en : fr;
  const field = "w-full rounded-md border border-mv-border bg-white px-3 py-2 text-sm text-mv-ink";
  useEffect(() => {
    let cancelled = false;
    getCloverOrderSetupAction(restaurantId).then(result => {
      if (cancelled) return;
      if (result.ok) setSetup(result.setup); else setError(true);
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [restaurantId]);
  async function refresh() {
    const result = await getCloverOrderSetupAction(restaurantId);
    if (result.ok) setSetup(result.setup); else setError(true);
  }
  function fail(reason?: string) {
    const messages: Record<string,string> = {
      catalog_price_mismatch: text("Le prix Clover ne correspond pas au prix du format.","The Clover price does not match the selected format."),
      modifier_mapping_required: text("Les options ne correspondent pas à ce produit Clover.","The modifiers do not belong to this Clover product."),
      merchant_connection_required: text("Reconnectez le marchand Clover.","Reconnect your Clover merchant."),
      merchant_validation_required: text("La réception et l’annulation Clover doivent d’abord être validées.","Clover reception and cancellation must be validated first."),
    };
    toast.error(messages[reason ?? ""] ?? text("Configuration non enregistrée. Vérifiez la connexion, les produits et les permissions Clover.","Configuration was not saved. Check the Clover connection, products and permissions."));
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const result = await saveCloverOrderSetupAction(restaurantId, { orderTypeId: String(data.get("orderTypeId") ?? "").trim(),
          enabled: data.get("enabled") === "on", employeeAttribution: data.get("employees") === "on", automaticCancellation: data.get("cancellation") === "on" });
        if (!result.ok) { fail(result.reason); return; }
        await refresh(); toast.success(text("Configuration Clover enregistrée.","Clover configuration saved."));
      } catch { fail(); }
    });
  }
  function map(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const [menuItemId, priceOptionId = ""] = selected.split(":");
    startTransition(async () => {
      try {
        const result = await saveCloverOrderMappingAction(restaurantId, { menuItemId, priceOptionId,
          cloverItemId: String(data.get("cloverItemId") ?? "").trim(), modifierIds: String(data.get("modifierIds") ?? "").split(",").map(id => id.trim()).filter(Boolean) });
        if (!result.ok) { fail(result.reason); return; }
        await refresh(); toast.success(text("Produit et prix vérifiés dans Clover.","Product and price verified in Clover."));
      } catch { fail(); }
    });
  }
  if (error) return <p className="mt-3 text-sm text-mv-red" role="alert">{text("La configuration des commandes Clover est indisponible. Vérifiez la connexion et l’installation de la mise à jour.","Clover order setup is unavailable. Check the connection and update installation.")}</p>;
  if (!setup) return <p className="mt-3 text-sm text-mv-ink-soft" role="status">{text("Chargement de la configuration Clover…","Loading Clover configuration…")}</p>;
  return <section className="mt-4 space-y-4 border-t border-mv-border-soft pt-4" aria-label={text("Commandes Clover","Clover orders")}>
    <div><h3 className="font-heading text-lg text-mv-ink">{text("Commandes vers Clover","Orders to Clover")}</h3>
      <p className="mt-1 text-sm text-mv-ink-soft">{text("Après votre acceptation, avec paiement à la réception. La transmission ne confirme ni le paiement ni l’impression.","After your acceptance, with payment at pickup. Transmission does not confirm payment or printing.")}</p></div>
    {!setup.exportValidated && <p className="rounded-lg bg-mv-cream p-3 text-sm text-mv-ink-soft" role="status">{text("Activation en attente des essais réels dans Orders/Register. Vous pouvez préparer les associations des produits.","Activation awaits real Orders/Register tests. You can prepare product mappings.")}</p>}
    <form key={`${setup.orderTypeId}:${setup.enabled}:${setup.employeeAttribution}:${setup.automaticCancellation}`} onSubmit={save} className="space-y-3">
      <label className="block text-sm">{text("Identifiant du type de commande Clover","Clover order type identifier")}<input className={`${field} mt-1`} name="orderTypeId" defaultValue={setup.orderTypeId} required maxLength={64} /></label>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="employees" defaultChecked={setup.employeeAttribution} />{text("Afficher l’employé Clover associé à la commande","Show the Clover employee associated with the order")}</label>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={setup.enabled} disabled={!setup.exportValidated} />{text("Transmettre après acceptation","Transmit after acceptance")}</label>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="cancellation" defaultChecked={setup.automaticCancellation} disabled={!setup.cancellationValidated} />{text("Synchroniser l’annulation des commandes non payées","Synchronize cancellation of unpaid orders")}</label>
      <button className="min-h-11 rounded-md bg-mv-green px-4 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={pending}>{text("Enregistrer","Save")}</button>
    </form>
    <form onSubmit={map} className="space-y-3 border-t border-mv-border-soft pt-4">
      <h4 className="font-semibold text-mv-ink">{text("Associer un produit et son format","Map a product and its format")}</h4>
      <label className="block text-sm">{text("Produit Minerva Flow","Minerva Flow product")}<select className={`${field} mt-1`} value={selected} onChange={event => setSelected(event.target.value)} required>
        <option value="">{text("Choisir un produit vérifié","Select a reviewed product")}</option>
        {setup.menu.flatMap(item => item.price_options.length ? item.price_options.map(option => <option key={`${item.id}:${option.id}`} value={`${item.id}:${option.id}`}>{item.name} · {option.label}</option>) : [<option key={item.id} value={`${item.id}:`}>{item.name}</option>])}
      </select></label>
      <label className="block text-sm">{text("Identifiant du produit dans Clover","Product identifier in Clover")}<input className={`${field} mt-1`} name="cloverItemId" required maxLength={64} /></label>
      <label className="block text-sm">{text("Identifiants des options Clover, séparés par des virgules (facultatif)","Clover modifier identifiers, separated by commas (optional)")}<input className={`${field} mt-1`} name="modifierIds" maxLength={1300} /></label>
      <button className="min-h-11 rounded-md border border-mv-border px-4 py-2 text-sm font-medium text-mv-ink disabled:opacity-50" disabled={pending || !selected}>{text("Vérifier et associer","Verify and map")}</button>
      <p className="text-sm text-mv-ink-soft">{setup.mappings.length} {text("association(s) vérifiée(s). Les brouillons sans prix confirmé sont exclus.","verified mapping(s). Drafts with unconfirmed prices are excluded.")}</p>
    </form>
  </section>;
}
