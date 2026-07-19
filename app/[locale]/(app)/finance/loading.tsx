import { Skeleton, SkeletonStatCard, SkeletonRow } from "@/components/ui/Skeleton";

export default function FinanceLoading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-96" />
      </div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>
      <div className="overflow-hidden rounded-2xl border border-mv-border bg-mv-surface shadow-mv-sm">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
