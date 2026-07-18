import { Skeleton, SkeletonRow } from "@/components/ui/Skeleton";

export default function DaysLoading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-2 h-8 w-32" />
        <Skeleton className="mt-2 h-4 w-[420px]" />
      </div>
      <div className="mb-6 rounded-2xl border border-mv-border bg-mv-surface p-5 shadow-mv-sm">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-4 w-56" />
        <div className="mt-5 grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-mv-border bg-mv-surface shadow-mv-sm">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
