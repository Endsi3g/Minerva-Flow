import { LogoMark } from "@/components/shell/Logo";
import { getScheduleShareByToken } from "@/lib/data/schedule-shares";
import { formatDate } from "@/lib/utils";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { notFound } from "next/navigation";

export default async function SharedSchedulePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const ip = await getClientIp();
  const { allowed } = await checkRateLimit(`schedule-share:${ip}`, { max: 30, windowSeconds: 300 });
  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mv-cream px-6 text-center">
        <p className="text-[14px] text-mv-ink-soft">Trop de tentatives. Réessayez dans quelques minutes.</p>
      </div>
    );
  }

  const share = await getScheduleShareByToken(token);
  if (!share) notFound();

  const { employeeName, restaurantName, shifts } = share.snapshot;

  return (
    <div className="min-h-screen bg-mv-cream px-6 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 flex items-center gap-2.5">
          <LogoMark size={28} />
          <span className="font-sans text-[16px] font-medium text-mv-ink">
            Flow <span className="text-mv-green-dark">par Minerva</span>
          </span>
        </div>

        <p className="text-[12px] font-semibold uppercase tracking-wide text-mv-ink-faint">{restaurantName}</p>
        <h1 className="mb-6 font-display text-[24px] font-medium text-mv-ink">Horaire de {employeeName}</h1>

        {shifts.length === 0 ? (
          <p className="rounded-xl border border-mv-border bg-mv-surface p-5 text-[13px] text-mv-ink-soft">
            Aucun quart planifié pour l&apos;instant.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-mv-border bg-mv-surface">
            {shifts.map((s, i) => (
              <div
                key={s.id}
                className={`flex items-center justify-between px-4 py-3 ${i > 0 ? "border-t border-mv-border-soft" : ""}`}
              >
                <div>
                  <p className="text-[13.5px] font-semibold text-mv-ink">{formatDate(s.shiftDate)}</p>
                  {s.positionLabel && <p className="text-[11.5px] text-mv-ink-faint">{s.positionLabel}</p>}
                </div>
                <p className="text-[13px] font-medium text-mv-ink-soft">
                  {s.startTime.slice(0, 5)} – {s.endTime.slice(0, 5)}
                </p>
              </div>
            ))}
          </div>
        )}

        <p className="mt-8 text-[11.5px] text-mv-ink-faint">
          Lien généré via Flow par Minerva — mis à jour au moment de sa création, pas en temps réel.
        </p>
      </div>
    </div>
  );
}
