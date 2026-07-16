import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function BillingLoading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-2 h-8 w-44" />
      </div>
      <SkeletonCard lines={4} />
    </div>
  );
}
