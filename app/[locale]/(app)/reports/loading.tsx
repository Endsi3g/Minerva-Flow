import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function ReportsLoading() {
  return (
    <div className="mx-auto max-w-5xl w-full">
      <div className="mb-6">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-2 h-8 w-32" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} lines={2} />
        ))}
      </div>
    </div>
  );
}
