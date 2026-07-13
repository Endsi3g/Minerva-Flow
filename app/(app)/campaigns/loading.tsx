import { Skeleton, SkeletonRow } from "@/components/ui/Skeleton";

export default function CampaignsLoading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-2 h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-96" />
      </div>
      <div className="mb-4 flex gap-2.5">
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-mv-border bg-mv-surface shadow-mv-sm">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
