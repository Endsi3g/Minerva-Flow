import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function WorkspaceLoading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-2 h-8 w-44" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SkeletonCard lines={3} />
        <SkeletonCard lines={3} />
      </div>
    </div>
  );
}
