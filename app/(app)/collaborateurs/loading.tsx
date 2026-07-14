import { Skeleton, SkeletonRow } from "@/components/ui/Skeleton";

export default function CollaborateursLoading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-2 h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-96" />
      </div>
      <div className="mb-4 flex justify-end">
        <Skeleton className="h-9 w-40 rounded-lg" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-mv-border bg-mv-surface shadow-mv-sm">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
