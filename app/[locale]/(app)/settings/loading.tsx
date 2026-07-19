import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function SettingsLoading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-2 h-8 w-40" />
      </div>
      <Skeleton className="mb-6 h-9 w-80 rounded-full" />
      <SkeletonCard lines={5} />
    </div>
  );
}
