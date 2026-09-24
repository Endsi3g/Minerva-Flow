"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { reviewAmbassadorUgcAction } from "./actions";

export type UgcReviewItem = { id: string; platform: string; postUrl: string; caption: string; createdAt: string; restaurant: string; ambassadorEmail: string | null };

export function ReviewQueue({ items }: { items: UgcReviewItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  async function review(id: string, status: "approved" | "rejected") {
    setBusy(id);
    const ok = await reviewAmbassadorUgcAction(id, status);
    setBusy("");
    setNotice(ok ? "Décision enregistrée." : "La décision n’a pas pu être enregistrée.");
    if (ok) router.refresh();
  }
  return <div className="space-y-4">{items.length === 0 ? <p className="rounded-xl bg-mv-cream-soft p-5 text-[13px] text-mv-ink-soft">Aucun contenu en attente de vérification.</p> : items.map((item) => <article key={item.id} className="rounded-2xl border border-mv-border-soft bg-mv-surface p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[13px] font-semibold text-mv-ink">{item.restaurant} · {item.platform}</p><p className="mt-1 text-[11px] text-mv-ink-faint">{item.ambassadorEmail ?? "Ambassadeur"} · {new Date(item.createdAt).toLocaleString("fr-CA")}</p></div><a href={item.postUrl} target="_blank" rel="noreferrer" className="text-[12px] font-medium text-mv-green-dark underline">Ouvrir la publication</a></div><p className="mt-3 whitespace-pre-wrap text-[12.5px] leading-relaxed text-mv-ink-soft">{item.caption}</p><div className="mt-4 flex gap-2"><Button size="sm" onClick={() => review(item.id, "approved")} loading={busy === item.id}>Approuver</Button><Button size="sm" variant="secondary" onClick={() => review(item.id, "rejected")} disabled={Boolean(busy)}>Refuser</Button></div></article>)}{notice && <p className="text-[12px] text-mv-ink-soft" role="status">{notice}</p>}</div>;
}
