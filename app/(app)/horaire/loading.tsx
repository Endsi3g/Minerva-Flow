import { Skeleton } from "@/components/ui/Skeleton";

export default function HoraireLoading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-2 h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-96" />
      </div>
      <Skeleton className="mb-4 h-9 w-52 rounded-lg" />
      <div className="overflow-hidden rounded-xl border border-mv-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 border-b border-mv-border-soft p-2.5 last:border-b-0">
            <Skeleton className="h-4 w-32 shrink-0" />
            {Array.from({ length: 7 }).map((_, j) => (
              <Skeleton key={j} className="h-8 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
