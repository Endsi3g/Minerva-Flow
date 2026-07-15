"use client";

import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Avatar } from "@/components/minerva/PersonAvatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/minerva/FormField";
import { Spinner } from "@/components/ui/spinner";
import { RolePermissionsCard, roleTone } from "@/components/minerva/RolePermissionsCard";
import { DeleteAccountCard } from "@/components/minerva/DeleteAccountCard";
import { roleLabels, useApp } from "@/lib/app-context";
import { useAvatarUpload } from "@/hooks/use-avatar-upload";
import { updateProfileNameAction } from "./actions";
import { formatRelativeTime } from "@/lib/utils";
import { useActivityLogRealtime, type ActivityLogRow } from "@/hooks/use-activity-log-realtime";
import type { MyProfile } from "@/lib/data/profile";
import type { ActivityLogEntry, Role } from "@/lib/types";
import { Camera, Check, History, Pencil, X } from "lucide-react";
import { toast } from "sonner";

function toActivityLogEntry(row: ActivityLogRow, actorName: string): ActivityLogEntry {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    actorId: row.actor_id,
    actorName,
    actionType: row.action_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    description: row.description,
    createdAt: row.created_at,
  };
}

function AvatarUploader({ profile }: { profile: MyProfile }) {
  const { updateAuthUser } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);

  const { preview, loading, error, pickAndUpload } = useAvatarUpload({
    userId: profile.id,
    onUploaded: (url) => {
      setAvatarUrl(url);
      updateAuthUser({ avatarUrl: url });
      toast.success("Photo de profil mise à jour.");
    },
  });

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void pickAndUpload(file);
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="group relative h-24 w-24 shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-mv-green/40 disabled:cursor-wait"
        aria-label="Changer la photo de profil"
      >
        <Avatar name={profile.fullName || profile.email} src={preview ?? avatarUrl} size={96} />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-mv-ink/0 text-transparent transition-colors group-hover:bg-mv-ink/40 group-hover:text-mv-cream-soft">
          <Camera size={20} />
        </span>
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-mv-ink/50">
            <Spinner className="size-5 text-mv-cream-soft" />
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleChange}
      />
      {error && <p className="max-w-[200px] text-center text-[11.5px] text-mv-red">{error}</p>}
    </div>
  );
}

function NameEditor({ profile }: { profile: MyProfile }) {
  const { updateAuthUser } = useApp();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(profile.fullName);
  const [saving, setSaving] = useState(false);

  function cancel() {
    setEditing(false);
    setValue(profile.fullName);
  }

  async function handleSave() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === profile.fullName) {
      cancel();
      return;
    }
    setSaving(true);
    const result = await updateProfileNameAction(trimmed);
    setSaving(false);
    if (result.ok) {
      updateAuthUser({ fullName: trimmed });
      setEditing(false);
      toast.success("Nom mis à jour.");
    } else {
      toast.error(result.error);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") void handleSave();
    if (e.key === "Escape") cancel();
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group flex items-center gap-1.5"
      >
        <span className="font-display text-[18px] font-medium text-mv-ink">{profile.fullName}</span>
        <Pencil
          size={13}
          className="text-mv-ink-faint opacity-0 transition-opacity group-hover:opacity-100"
        />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={saving}
        className="h-9 w-52 text-center text-[14px] font-medium"
      />
      <Button size="icon-sm" variant="secondary" onClick={handleSave} disabled={saving} aria-label="Enregistrer">
        <Check size={14} />
      </Button>
      <Button size="icon-sm" variant="ghost" onClick={cancel} disabled={saving} aria-label="Annuler">
        <X size={14} />
      </Button>
    </div>
  );
}

export function ProfileView({
  profile,
  role,
  activity: initialActivity,
}: {
  profile: MyProfile | null;
  role: Role | null;
  activity: ActivityLogEntry[];
}) {
  const [activity, setActivity] = useState<ActivityLogEntry[]>(initialActivity);
  // Adjust state during render (not in an effect) when the server gives us
  // a fresh activity list — e.g. after a restaurant switch re-runs the
  // page's server component while this client component stays mounted.
  const [syncedActivity, setSyncedActivity] = useState(initialActivity);
  if (initialActivity !== syncedActivity) {
    setSyncedActivity(initialActivity);
    setActivity(initialActivity);
  }

  // Live-updates the personal activity journal as new rows are written for
  // the current user, filtered by actor_id.
  useActivityLogRealtime("actor_id", profile?.id, (row) => {
    if (!profile) return;
    setActivity((prev) => {
      if (prev.some((entry) => entry.id === row.id)) return prev;
      return [toActivityLogEntry(row, profile.fullName), ...prev];
    });
  });

  if (!profile) {
    return (
      <div>
        <PageHeader eyebrow="Compte" title="Profil" />
        <Card>
          <p className="text-[13px] text-mv-ink-soft">
            Vous devez être connecté pour voir votre profil.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Compte"
        title="Profil"
        description="Votre photo, votre nom et votre activité récente."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-4">
          <Card>
            <div className="flex flex-col items-center gap-3 text-center">
              <AvatarUploader profile={profile} />
              <NameEditor profile={profile} />
              <p className="text-[12.5px] text-mv-ink-faint">{profile.email}</p>
              {role && <Badge tone={roleTone[role]}>{roleLabels[role]}</Badge>}
            </div>
          </Card>

          {role && <RolePermissionsCard eyebrow="Capacités" highlightRole={role} />}

          <DeleteAccountCard />
        </div>

        <div className="xl:col-span-8">
          <Card>
            <CardHeader
              eyebrow="Historique"
              title="Activité"
              description="Vos dernières actions dans Minerva Flow."
            />
            {activity.length === 0 ? (
              <p className="text-[12.5px] text-mv-ink-faint">
                Aucune activité enregistrée pour l&apos;instant.
              </p>
            ) : (
              <div>
                {activity.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 border-b border-mv-border-soft py-3 last:border-0"
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mv-cream-soft text-mv-ink-soft">
                      <History size={13} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-mv-ink">{entry.description}</p>
                      <p className="mt-0.5 text-[11.5px] text-mv-ink-faint">
                        {formatRelativeTime(entry.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
