import { Skeleton, SkeletonStatCard, SkeletonCard } from "@/components/ui/Skeleton";

export default function EtablissementLoading() {
  return (
    <div>
      <Skeleton className="mb-4 h-4 w-40" />
      <div className="mb-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-8 w-56" />
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>
      <SkeletonCard lines={5} />
    </div>
  );
}
