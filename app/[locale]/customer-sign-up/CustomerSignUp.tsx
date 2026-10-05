"use client";


import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { LogoMark } from "@/components/shell/Logo";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function CustomerSignUp({ restaurantId, menuToken }: { restaurantId: string; menuToken: string | null }) {
  const t = useTranslations("customerSignUp");
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const next = `/customer-join?restaurant=${encodeURIComponent(restaurantId)}`;
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name.trim(), product_updates_opt_in: false, preferred_language: "fr" },
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`,
        },
      });
      if (authError) throw authError;
      if (data.session) {
        const { error: joinError } = await supabase.rpc("join_restaurant_as_customer", { p_restaurant_id: restaurantId });
        if (joinError) throw joinError;
        router.push("/portal");
      } else {
        setSent(true);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("aSmallErrorOccurred"));
      setBusy(false);
    }
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#f5f1e6] px-5 py-10 text-[#24352c]"><div className="w-full max-w-md rounded-3xl border border-[#e6e0d2] bg-[#fafaf5] p-6 shadow-sm sm:p-9">
    <div className="mb-6 flex items-center justify-center gap-2.5"><LogoMark size={28} /><span className="font-semibold">Minerva <span className="text-[#167f5b]">Flow</span></span></div>
    {sent ? <div className="py-3 text-center"><CheckCircle2 size={30} className="mx-auto text-[#167f5b]" /><h1 className="mt-3 font-display text-2xl">{t("oneSmallClickTo")}</h1><p className="mt-2 text-sm leading-6 text-[#657168]">{t("weSentAConfirmation")} <strong>{email}</strong>{t("onceConfirmedYourAccount")}</p><Link href="/app" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0e5a40]">{t("seeHowToInstall")} <ArrowRight size={14} /></Link></div> : <>
    <p className="text-center text-xs font-semibold uppercase tracking-[.15em] text-[#167f5b]">{menuToken ? t("yourMenuAwaits") : t("customerArea")}</p>
    <h1 className="mt-2 text-center font-display text-3xl">{t("createMyAccount")}</h1>
    <p className="mt-2 text-center text-sm leading-6 text-[#657168]">{t("aNameAConfirmed")}</p>
    <form onSubmit={submit} className="mt-7 space-y-4">
      <label className="block text-sm font-medium">{t("yourName")}<input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={120} className="mt-1.5 h-11 w-full rounded-xl border border-[#d9ded7] bg-white px-3.5 text-sm outline-none focus:border-[#167f5b]" /></label>
      <label className="block text-sm font-medium">{t("email")}<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5 h-11 w-full rounded-xl border border-[#d9ded7] bg-white px-3.5 text-sm outline-none focus:border-[#167f5b]" /></label>
      <label className="block text-sm font-medium">{t("password")}<input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="mt-1.5 h-11 w-full rounded-xl border border-[#d9ded7] bg-white px-3.5 text-sm outline-none focus:border-[#167f5b]" /><span className="mt-1 block text-xs font-normal text-[#778078]">{t("atLeast8Characters")}</span></label>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p>{error}</p>{error.includes("existe déjà") && <Link href={`/portal/login?next=${encodeURIComponent(`/customer-join?restaurant=${restaurantId}`)}`} className="mt-2 inline-block font-semibold underline underline-offset-2">{t("getALinkTo")}</Link>}</div>}
      <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#173c2e] px-4 text-sm font-semibold text-white hover:bg-[#0e5a40] disabled:opacity-60">{busy ? <><Loader2 size={16} className="animate-spin" /> {t("creatingTheAccount")}</> : <>{t("createMyAccount")} <ArrowRight size={15} /></>}</button>
    </form></>}
    <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs leading-5 text-[#778078]"><ShieldCheck size={14} /> {t("yourPasswordIsManaged")}</p>
    <Link href="/portal/login" className="mt-5 block text-center text-sm font-semibold text-[#0e5a40] underline underline-offset-4">{t("iAlreadyHaveAn")}</Link>
  </div></main>;
}
