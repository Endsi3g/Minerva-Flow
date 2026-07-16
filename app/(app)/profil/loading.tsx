import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function ProfilLoading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-2 h-8 w-32" />
      </div>
      <div className="max-w-2xl space-y-6">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={3} />
        <SkeletonCard lines={4} />
      </div>
    </div>
  );
}
