"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Input } from "@/components/minerva/FormField";
import type { WriteResult } from "@/lib/team/profile-writes";
import {
  addContentLinkAction,
  deleteContentLinkAction,
  saveCheckinAction,
  saveGithubAction,
} from "@/app/[locale]/equipe/(portal)/membres/actions";

const TEXTAREA =
  "w-full rounded-xl border border-mv-border bg-mv-cream-soft px-3.5 py-2.5 text-[13.5px] text-mv-ink placeholder:text-mv-ink-faint transition-colors focus:border-mv-green focus:bg-mv-surface focus:outline-none focus:ring-2 focus:ring-mv-green/15";

function Feedback({ result }: { result: WriteResult | null }) {
  if (!result) return null;
  return result.ok ? (
    <span role="status" className="text-[12px] text-mv-green-dark">Enregistré</span>
  ) : (
    <span role="alert" className="text-[12px] text-mv-red">{result.error}</span>
  );
}

function SubmitButton({ pending, children }: { pending: boolean; children: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-9 rounded-lg bg-mv-green px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-mv-green-dark disabled:opacity-50"
    >
      {pending ? "Enregistrement…" : children}
    </button>
  );
}

export function ProfileForms({ isTeamMember, githubLogin }: { isTeamMember: boolean; githubLogin: string | null }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {isTeamMember && <CheckinForm />}
      <ContentForm />
      {isTeamMember && <GithubForm initial={githubLogin ?? ""} />}
    </div>
  );
}

function CheckinForm() {
  const [commitments, setCommitments] = useState("");
  const [delivered, setDelivered] = useState("");
  const [result, setResult] = useState<WriteResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <Card>
      <CardHeader eyebrow="Cette semaine" title="Mon bilan hebdomadaire" description="Un seul bilan par semaine : enregistrer à nouveau le modifie." />
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => setResult(await saveCheckinAction(commitments, delivered)));
        }}
      >
        <div>
          <label htmlFor="checkin-commitments" className="mb-1.5 block text-[11.5px] font-semibold text-mv-ink-soft">Mes engagements</label>
          <textarea id="checkin-commitments" rows={3} maxLength={2000} value={commitments} onChange={(e) => { setCommitments(e.target.value); setResult(null); }} className={TEXTAREA} />
        </div>
        <div>
          <label htmlFor="checkin-delivered" className="mb-1.5 block text-[11.5px] font-semibold text-mv-ink-soft">Ce que j’ai livré</label>
          <textarea id="checkin-delivered" rows={3} maxLength={2000} value={delivered} onChange={(e) => { setDelivered(e.target.value); setResult(null); }} className={TEXTAREA} />
        </div>
        <div className="flex items-center gap-3">
          <SubmitButton pending={pending}>Enregistrer le bilan</SubmitButton>
          <Feedback result={result} />
        </div>
      </form>
    </Card>
  );
}

function ContentForm() {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [result, setResult] = useState<WriteResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <Card>
      <CardHeader eyebrow="Contenu" title="Déclarer un contenu publié" description="Vidéo ou publication sur vos réseaux, lien https obligatoire." />
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await addContentLinkAction(url, title);
            setResult(res);
            if (res.ok) {
              setUrl("");
              setTitle("");
            }
          });
        }}
      >
        <div>
          <label htmlFor="content-url" className="mb-1.5 block text-[11.5px] font-semibold text-mv-ink-soft">Lien</label>
          <Input id="content-url" type="url" required placeholder="https://" value={url} onChange={(e) => { setUrl(e.target.value); setResult(null); }} />
        </div>
        <div>
          <label htmlFor="content-title" className="mb-1.5 block text-[11.5px] font-semibold text-mv-ink-soft">Titre (facultatif)</label>
          <Input id="content-title" maxLength={160} value={title} onChange={(e) => { setTitle(e.target.value); setResult(null); }} />
        </div>
        <div className="flex items-center gap-3">
          <SubmitButton pending={pending}>Ajouter</SubmitButton>
          <Feedback result={result} />
        </div>
      </form>
    </Card>
  );
}

function GithubForm({ initial }: { initial: string }) {
  const [login, setLogin] = useState(initial);
  const [result, setResult] = useState<WriteResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <Card>
      <CardHeader eyebrow="GitHub" title="Mon identifiant GitHub" description="Sert uniquement à compter vos commits publics du dépôt Minerva Flow. Laissez vide pour délier." />
      <form
        className="flex flex-wrap items-center gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => setResult(await saveGithubAction(login)));
        }}
      >
        <Input aria-label="Identifiant GitHub" maxLength={40} placeholder="ex. Endsi3g" value={login} onChange={(e) => { setLogin(e.target.value); setResult(null); }} className="max-w-[220px]" />
        <SubmitButton pending={pending}>Enregistrer</SubmitButton>
        <Feedback result={result} />
      </form>
    </Card>
  );
}

export function DeleteContentLinkButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => { await deleteContentLinkAction(id); })}
      className="shrink-0 text-[12px] font-medium text-mv-ink-faint hover:text-mv-red disabled:opacity-50"
      aria-label="Retirer ce contenu"
    >
      {pending ? "…" : "Retirer"}
    </button>
  );
}
