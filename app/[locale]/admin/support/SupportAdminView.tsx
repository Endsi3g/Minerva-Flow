"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/minerva/FormField";
import { replySupportRequestAction } from "./actions";
import type { AdminSupportRequest } from "@/lib/data/admin";
import { formatDate } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

const statusTone: Record<string, "amber" | "green" | "neutral"> = {
  nouveau: "amber",
  en_cours: "neutral",
  resolu: "green",
};

const knownCategories = new Set(["bug", "amelioration", "question"]);

function TicketCard({ ticket }: { ticket: AdminSupportRequest }) {
  const t = useTranslations("admin.support");
  const [reply, setReply] = useState(ticket.adminReply ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleReply(status: "en_cours" | "resolu") {
    if (!reply.trim()) return;
    setIsSubmitting(true);
    try {
      const ok = await replySupportRequestAction(ticket.id, reply, status);
      if (ok) toast.success(t("replySuccess"));
      else toast.error(t("replyFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-mv-border bg-mv-surface p-4 shadow-mv-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge tone="neutral">
            {knownCategories.has(ticket.category) ? t(`category.${ticket.category}`) : ticket.category}
          </Badge>
          <Badge tone={statusTone[ticket.status]}>{t(`status.${ticket.status}`)}</Badge>
        </div>
        <span className="text-[11.5px] text-mv-ink-faint">{formatDate(ticket.createdAt.slice(0, 10))}</span>
      </div>
      <p className="font-display text-[15px] font-medium text-mv-ink">{ticket.subject}</p>
      <p className="mt-1 text-[11.5px] text-mv-ink-faint">{ticket.userEmail}</p>
      <p className="mt-2 text-[13px] leading-relaxed text-mv-ink-soft">{ticket.message}</p>

      <div className="mt-4 border-t border-mv-border-soft pt-3">
        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder={t("replyPlaceholder")}
          rows={3}
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button size="sm" variant="secondary" disabled={isSubmitting || !reply.trim()} onClick={() => handleReply("en_cours")}>
            {t("replyInProgress")}
          </Button>
          <Button size="sm" disabled={isSubmitting || !reply.trim()} onClick={() => handleReply("resolu")}>
            {t("replyResolved")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SupportAdminView({ tickets }: { tickets: AdminSupportRequest[] }) {
  const t = useTranslations("admin.support");
  return (
    <div className="space-y-3">
      {tickets.length === 0 ? (
        <p className="text-[13px] text-mv-ink-faint">{t("emptyState")}</p>
      ) : (
        tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)
      )}
    </div>
  );
}
