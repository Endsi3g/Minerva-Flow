"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/minerva/FormField";
import { Table, THead, Th, Tr, Td } from "@/components/minerva/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import type { Customer } from "@/lib/types";
import { type LoyaltyTierThresholds, getLoyaltyTier } from "@/lib/loyalty-tiers";
import { LoyaltyTierBadge } from "@/components/minerva/LoyaltyTierBadge";
import { FidelisationSubNav } from "@/components/fidelisation/FidelisationSubNav";
import { TablePagination } from "@/components/minerva/TablePagination";
import { Plus, Search, Check, MapPin, Gift, Cake, CreditCard, Sparkles, Copy, Download } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import { createCustomerAction, claimRewardRedemptionAction, grantBirthdayBonusAction } from "./actions";
import { notifyError } from "@/lib/notify-error";
import { toast } from "sonner";

function NewCustomerModal({
  restaurantId,
  open,
  onClose,
  onCreated,
}: {
  restaurantId: string;
  open: boolean;
  onClose: () => void;
  onCreated: (c: Customer) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      const customer = await createCustomerAction(restaurantId, {
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? "") || null,
        phone: String(form.get("phone") ?? "") || null,
        notes: String(form.get("notes") ?? "") || null,
        birthday: String(form.get("birthday") ?? "") || null,
        city: String(form.get("city") ?? "") || null,
        marketingConsent,
        consentSource: "staff",
      });
      if (customer) {
        onCreated(customer);
        onClose();
        (e.target as HTMLFormElement).reset();
        setMarketingConsent(false);
      } else {
        notifyError("L'ajout du client a échoué.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouveau client" description="Créez une fiche pour commencer à suivre ses visites.">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Nom">
          <Input name="name" placeholder="Ex : Jeanne Tremblay" required autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Courriel" hint="Optionnel">
            <Input name="email" type="email" />
          </Field>
          <Field label="Téléphone" hint="Optionnel">
            <Input name="phone" type="tel" />
          </Field>
        </div>
        <Field label="Notes" hint="Optionnel — allergies, préférences…">
          <Input name="notes" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date de naissance" hint="Optionnel">
            <Input name="birthday" type="date" />
          </Field>
          <Field label="Ville" hint="Optionnel — d'où vient le client">
            <Input name="city" placeholder="Ex : Montréal" />
          </Field>
        </div>
        <label className="flex items-start gap-2 text-[12px] text-mv-ink-soft">
          <Checkbox
            checked={marketingConsent}
            onCheckedChange={(checked) => setMarketingConsent(Boolean(checked))}
            className="mt-0.5"
          />
          <span>Le client accepte de recevoir des offres et rappels par courriel ou SMS.</span>
        </label>
        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Création…" : "Créer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function RewardValidationCard({ restaurantId }: { restaurantId: string }) {
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    rewardName: string;
    pointsSpent: number;
    customerName: string;
    claimedAt: string;
  } | null>(null);

  async function handleValidate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!code.trim()) return;
    setIsSubmitting(true);
    setResult(null);
    try {
      const claimed = await claimRewardRedemptionAction(restaurantId, code);
      if (claimed) {
        setResult(claimed);
        setCode("");
      } else {
        notifyError("Code introuvable ou déjà utilisé.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader
        eyebrow="Au comptoir"
        title="Valider une récompense"
        description="Le client échange ses points depuis son espace client et reçoit un code — entrez-le ici pour confirmer."
      />
      <form onSubmit={handleValidate} className="flex flex-wrap items-end gap-2">
        <Field label="Code du client">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Ex : A1B2C3"
            className="w-40 font-mono uppercase tracking-wider"
            maxLength={6}
          />
        </Field>
        <Button type="submit" size="sm" disabled={isSubmitting || !code.trim()}>
          <Check size={14} /> Valider
        </Button>
      </form>
      {result && (
        <div className="mv-check-pop mt-3 flex items-start gap-2.5 rounded-lg border border-mv-green/20 bg-mv-green-tint px-3 py-2.5">
          <Check size={15} className="mt-0.5 shrink-0 text-mv-green-dark" />
          <p className="text-[12.5px] leading-relaxed text-mv-green-darker">
            <strong className="font-semibold">{result.rewardName}</strong> validée pour {result.customerName}
            {" "}(-{result.pointsSpent} pts).
          </p>
        </div>
      )}
    </Card>
  );
}

/**
 * Ranked "where do my customers come from" list, grouped by the city each
 * customer entered (portal self-serve, or staff at creation — see
 * NewCustomerModal). Sorted by total visits rather than customer count so a
 * smaller but highly repeat-visiting city can outrank a bigger one-and-done
 * crowd — the actual ask was to spot where the people who "come back often"
 * live, not just where headcount is highest.
 */
function CustomerOriginCard({ customers }: { customers: Customer[] }) {
  const byCity = useMemo(() => {
    const map = new Map<string, { city: string; customerCount: number; visits: number; spent: number }>();
    for (const c of customers) {
      const raw = c.city?.trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      const entry = map.get(key) ?? { city: raw, customerCount: 0, visits: 0, spent: 0 };
      entry.customerCount += 1;
      entry.visits += c.visitCount;
      entry.spent += c.totalSpent;
      map.set(key, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.visits - a.visits);
  }, [customers]);

  const withCity = customers.filter((c) => c.city?.trim()).length;
  const maxVisits = Math.max(1, ...byCity.map((c) => c.visits));

  return (
    <Card>
      <CardHeader
        eyebrow="Géographie"
        title="Provenance des clients"
        description={
          withCity > 0
            ? `${withCity} client${withCity > 1 ? "s ont" : " a"} indiqué sa ville — classé par visites cumulées.`
            : "Aucun client n'a encore indiqué sa ville — ça se remplit dès qu'un client le fait depuis son portail."
        }
      />
      {byCity.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <MapPin size={20} className="text-mv-ink-faint" />
          <p className="max-w-sm text-[12.5px] text-mv-ink-soft">
            Demandez à vos clients d&apos;ajouter leur ville dans &laquo; Mon profil &raquo; sur leur portail, ou
            ajoutez-la vous-même en créant une fiche client.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {byCity.slice(0, 8).map((c) => (
            <div key={c.city} className="relative overflow-hidden rounded-lg bg-mv-cream-soft p-2.5">
              <div
                className="absolute inset-y-0 left-0 bg-mv-green/10"
                style={{ width: `${Math.max(6, (c.visits / maxVisits) * 100)}%` }}
              />
              <div className="relative flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-[13px] font-medium text-mv-ink">
                  <MapPin size={13} className="text-mv-green-dark" /> {c.city}
                </span>
                <span className="flex shrink-0 items-center gap-3 text-[12px] text-mv-ink-soft">
                  <span>
                    {c.customerCount} client{c.customerCount > 1 ? "s" : ""}
                  </span>
                  <span className="font-semibold text-mv-ink">
                    {c.visits} visite{c.visits > 1 ? "s" : ""}
                  </span>
                  <span>{formatCurrency(c.spent)}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function getDaysUntilBirthday(birthdayStr?: string | null): number | null {
  if (!birthdayStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentYear = today.getFullYear();
  const parts = birthdayStr.split("-");
  const month = parseInt(parts.length === 3 ? parts[1] : parts[0], 10) - 1;
  const day = parseInt(parts.length === 3 ? parts[2] : parts[1], 10);
  if (isNaN(month) || isNaN(day)) return null;

  let nextBday = new Date(currentYear, month, day);
  nextBday.setHours(0, 0, 0, 0);
  if (nextBday.getTime() < today.getTime()) {
    nextBday = new Date(currentYear + 1, month, day);
    nextBday.setHours(0, 0, 0, 0);
  }
  const diffMs = nextBday.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function DigitalLoyaltyPassModal({
  customer,
  restaurantName,
  rate,
  thresholds,
  open,
  onClose,
}: {
  customer: Customer | null;
  restaurantName: string;
  rate: number;
  thresholds: LoyaltyTierThresholds;
  open: boolean;
  onClose: () => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!customer) return;
    const memberCode = `MEMBER-${customer.id.slice(0, 8).toUpperCase()}`;
    QRCode.toDataURL(memberCode, { width: 400, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [customer]);

  if (!customer) return null;

  const tier = getLoyaltyTier(customer.totalSpent, thresholds);
  const tierInfo = {
    ambassadeur: {
      gradient: "from-emerald-950 via-teal-900 to-slate-950",
      accent: "text-emerald-300",
      border: "border-emerald-500/40",
      glow: "shadow-emerald-900/30",
      label: "Membre Ambassadeur (VIP)",
    },
    privilegie: {
      gradient: "from-amber-950 via-amber-900 to-stone-950",
      accent: "text-amber-300",
      border: "border-amber-500/40",
      glow: "shadow-amber-900/30",
      label: "Membre Privilégié",
    },
    habitue: {
      gradient: "from-stone-900 via-stone-950 to-black",
      accent: "text-mv-green-light",
      border: "border-stone-700/60",
      glow: "shadow-black/40",
      label: "Membre Habitué",
    },
  }[tier];

  const dollarValuation = customer.loyaltyPoints / (rate > 0 ? rate : 1);
  const memberCode = `FLOW-${customer.id.slice(0, 8).toUpperCase()}`;

  function handleCopy() {
    navigator.clipboard.writeText(memberCode);
    setCopied(true);
    toast.success("Code membre copié !");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `pass-fidelite-${customer?.name.toLowerCase().replace(/\s+/g, "-")}.png`;
    a.click();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pass Fidélité Numérique"
      description="Carte virtuelle avec code de scan pour caisse et service à table."
    >
      <div className="space-y-4">
        <div
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${tierInfo.gradient} ${tierInfo.border} ${tierInfo.glow} p-5 text-white shadow-2xl border`}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className={tierInfo.accent} />
              <span className="font-display text-[15px] font-bold tracking-wide text-white">{restaurantName}</span>
            </div>
            <span className={`text-[11px] font-bold uppercase tracking-wider ${tierInfo.accent}`}>
              {tierInfo.label}
            </span>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-[10.5px] uppercase font-semibold tracking-wider text-white/60">Titulaire</p>
              <p className="font-display text-[18px] font-bold text-white mt-0.5">{customer.name}</p>
              <p className="font-mono text-[11.5px] text-white/70 mt-0.5">{memberCode}</p>
            </div>

            {qrDataUrl && (
              <div className="rounded-xl bg-white p-1.5 shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="Code Membre" className="h-16 w-16" />
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
            <div>
              <span className="text-[10.5px] uppercase font-medium text-white/60">Solde de Points</span>
              <p className="font-display text-[20px] font-bold text-white leading-tight">
                {customer.loyaltyPoints} <span className="text-[13px] font-normal text-white/70">pts</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10.5px] uppercase font-medium text-white/60">Valeur récompense</span>
              <p className={`font-mono text-[15px] font-bold ${tierInfo.accent}`}>
                ~{formatCurrency(dollarValuation)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={handleCopy} className="text-[12px] gap-1.5">
            {copied ? <Check size={14} className="text-mv-green-dark" /> : <Copy size={14} />} Copier code membre
          </Button>
          <Button variant="secondary" size="sm" onClick={handleDownload} disabled={!qrDataUrl} className="text-[12px] gap-1.5">
            <Download size={14} /> Télécharger QR Pass
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function BirthdayPerksCard({
  restaurantId,
  customers,
  onGranted,
}: {
  restaurantId: string | null;
  customers: Customer[];
  onGranted: (updated: Customer) => void;
}) {
  const [grantingId, setGrantingId] = useState<string | null>(null);

  const upcomingBirthdays = useMemo(() => {
    return customers
      .map((c) => ({
        customer: c,
        daysUntil: getDaysUntilBirthday(c.birthday),
      }))
      .filter((item): item is { customer: Customer; daysUntil: number } => item.daysUntil !== null && item.daysUntil <= 14)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [customers]);

  async function handleGrantBonus(customer: Customer) {
    if (!restaurantId) return;
    setGrantingId(customer.id);
    try {
      const updated = await grantBirthdayBonusAction(restaurantId, customer.id, 50);
      if (updated) {
        onGranted(updated);
        toast.success(`Cadeau d'anniversaire (+50 pts) accordé à ${customer.name} ! 🎂`);
      } else {
        notifyError("L'attribution du bonus a échoué.");
      }
    } finally {
      setGrantingId(null);
    }
  }

  return (
    <Card className="border-mv-amber/40 bg-gradient-to-br from-mv-amber-tint/30 to-mv-surface p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mv-amber-tint text-mv-amber-dark border border-mv-amber/30">
            <Cake size={16} />
          </div>
          <div>
            <h3 className="font-display text-[15px] font-bold text-mv-ink">Anniversaires à Venir</h3>
            <p className="text-[11.5px] text-mv-ink-soft">Attribution de bonus & surprises clients</p>
          </div>
        </div>
        <Badge tone={upcomingBirthdays.length > 0 ? "amber" : "neutral"}>
          {upcomingBirthdays.length} à célébrer
        </Badge>
      </div>

      {upcomingBirthdays.length === 0 ? (
        <p className="text-[12px] text-mv-ink-faint py-4 text-center">
          Aucun anniversaire client dans les 14 prochains jours.
        </p>
      ) : (
        <div className="space-y-2 mt-3 max-h-[220px] overflow-y-auto pr-1">
          {upcomingBirthdays.map(({ customer, daysUntil }) => (
            <div
              key={customer.id}
              className="flex items-center justify-between rounded-xl border border-mv-amber/20 bg-mv-surface p-2.5 shadow-mv-xs"
            >
              <div>
                <p className="font-semibold text-[13px] text-mv-ink">{customer.name}</p>
                <p className="text-[11px] text-mv-ink-faint">
                  {daysUntil === 0 ? (
                    <span className="font-bold text-mv-amber-dark">🎂 C&apos;est son anniversaire aujourd&apos;hui !</span>
                  ) : (
                    `Dans ${daysUntil} jour${daysUntil > 1 ? "s" : ""}`
                  )}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleGrantBonus(customer)}
                disabled={grantingId === customer.id}
                className="text-[11.5px] h-7 px-2.5 bg-mv-amber-tint hover:bg-mv-amber hover:text-white text-mv-amber-dark border-mv-amber/30"
              >
                <Gift size={12} /> {grantingId === customer.id ? "Offert…" : "Offrir +50 pts"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function FidelisationView({
  restaurantId,
  restaurantName = "Restaurant",
  initialCustomers,
  loyaltyPointsPerDollar,
  loyaltyTierThresholds,
}: {
  restaurantId: string | null;
  restaurantName?: string;
  initialCustomers: Customer[];
  loyaltyPointsPerDollar: number;
  loyaltyTierThresholds: LoyaltyTierThresholds;
}) {
  const { role } = useApp();
  const router = useRouter();

  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [passCustomer, setPassCustomer] = useState<Customer | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const canCreate = Boolean(restaurantId) && (role === "owner" || role === "manager" || role === "staff");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q)
    );
  }, [customers, search]);

  // Reset to page 1 whenever the search term actually changes — adjusted
  // during render (React's documented pattern) rather than in a useEffect,
  // which would cause an extra cascading render.
  const [prevSearch, setPrevSearch] = useState(search);
  if (search !== prevSearch) {
    setPrevSearch(search);
    setPage(1);
  }

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div>
      <FidelisationSubNav />

      <PageHeader
        eyebrow="Clients"
        title="Fidélisation"
        description="Fiches clients, visites, passes numériques et points de fidélité."
        action={
          canCreate && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus size={15} /> Nouveau client
            </Button>
          )
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <RewardValidationCard restaurantId={restaurantId!} />
        <BirthdayPerksCard
          restaurantId={restaurantId}
          customers={customers}
          onGranted={(updated) => {
            setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          }}
        />
        <CustomerOriginCard customers={customers} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative w-64">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mv-ink-faint" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un client…"
            className="pl-8"
          />
        </div>
        <span className="text-[12.5px] text-mv-ink-faint">
          {filtered.length} client{filtered.length > 1 ? "s" : ""}
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="Aucun client"
          description="Ajoutez votre première fiche client pour commencer à suivre les visites et les points."
          action={
            canCreate && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus size={15} /> Nouveau client
              </Button>
            )
          }
        />
      ) : (
        <>
          <Table>
            <THead>
              <Th>Client</Th>
              <Th>Dernière visite</Th>
              <Th className="text-right">Visites</Th>
              <Th className="text-right">Total dépensé</Th>
              <Th className="text-right">Points</Th>
              <Th className="text-right">Carte & Pass</Th>
            </THead>
            <tbody>
              {visible.map((c) => {
                const daysUntilBday = getDaysUntilBirthday(c.birthday);
                return (
                  <Tr key={c.id} onClick={() => router.push(`/fidelisation/${c.id}`)}>
                    <Td className="font-semibold">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{c.name}</span>
                        <LoyaltyTierBadge totalSpent={c.totalSpent} thresholds={loyaltyTierThresholds} size="xs" />
                        {daysUntilBday !== null && daysUntilBday <= 14 && (
                          <Badge tone="amber" className="text-[10.5px] px-1.5 py-0">
                            🎂 {daysUntilBday === 0 ? "Anniv. aujourd'hui" : `Anniv. dans ${daysUntilBday}j`}
                          </Badge>
                        )}
                      </div>
                    </Td>
                    <Td className="text-mv-ink-soft">{c.lastVisitAt ? formatDate(c.lastVisitAt) : "—"}</Td>
                    <Td className="text-right">{c.visitCount}</Td>
                    <Td className="text-right font-medium">{formatCurrency(c.totalSpent)}</Td>
                    <Td className="text-right">
                      <Badge tone="green">{c.loyaltyPoints} pts</Badge>
                    </Td>
                    <Td className="text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPassCustomer(c);
                        }}
                        className="h-7 px-2 text-[11.5px] gap-1 border-mv-border text-mv-ink-soft hover:text-mv-ink"
                      >
                        <CreditCard size={12} /> Pass Numérique
                      </Button>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
          <TablePagination page={safePage} pageCount={pageCount} onPageChange={setPage} className="mt-3" />
        </>
      )}

      {restaurantId && (
        <NewCustomerModal
          restaurantId={restaurantId}
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={(c) => {
            setCustomers((prev) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)));
            router.push(`/fidelisation/${c.id}`);
          }}
        />
      )}

      <DigitalLoyaltyPassModal
        customer={passCustomer}
        restaurantName={restaurantName}
        rate={loyaltyPointsPerDollar}
        thresholds={loyaltyTierThresholds}
        open={Boolean(passCustomer)}
        onClose={() => setPassCustomer(null)}
      />
    </div>
  );
}
