import { Skeleton, SkeletonRow, SkeletonCard } from "@/components/ui/Skeleton";

export default function ReservationsLoading() {
  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-2 h-8 w-48" />
        </div>
        <Skeleton className="h-9 w-40 rounded-lg" />
      </div>
      <Skeleton className="mb-4 h-9 w-64 rounded-lg" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="overflow-hidden rounded-2xl border border-mv-border bg-mv-surface shadow-mv-sm xl:col-span-7">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
        <div className="xl:col-span-5">
          <SkeletonCard lines={4} />
        </div>
      </div>
    </div>
  );
}
