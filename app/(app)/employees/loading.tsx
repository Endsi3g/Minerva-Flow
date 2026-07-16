import { Skeleton, SkeletonRow } from "@/components/ui/Skeleton";

export default function EmployeesLoading() {
  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-2 h-8 w-48" />
        </div>
        <Skeleton className="h-9 w-44 rounded-lg" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-mv-border bg-mv-surface shadow-mv-sm">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
