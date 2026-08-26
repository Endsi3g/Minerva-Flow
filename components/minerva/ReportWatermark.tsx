/** Tiled, rotated attribution overlay for shared/exported reports — absolutely positioned over its (relatively positioned) parent. */
export function ReportWatermark() {
  const tiles = Array.from({ length: 24 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden print:opacity-100" aria-hidden="true">
      <div
        className="absolute flex flex-wrap gap-x-11 gap-y-7"
        style={{ inset: "-30% -10%", transform: "rotate(-24deg)", transformOrigin: "center" }}
      >
        {tiles.map((_, i) => (
          <span key={i} className="whitespace-nowrap font-display text-[13px] font-semibold text-mv-ink/[0.07]">
            FLOW PAR MINERVA
          </span>
        ))}
      </div>
    </div>
  );
}
