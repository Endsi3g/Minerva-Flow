import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function OverviewLoading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-mv-border bg-mv-surface p-5 shadow-mv-sm">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-5 w-40" />
            <Skeleton className="mt-6 h-[220px] w-full rounded-xl" />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex-1 rounded-2xl border border-mv-border bg-mv-surface p-5 shadow-mv-sm">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-4 h-7 w-12" />
          </div>
          <div className="flex-1 rounded-2xl border border-mv-border bg-mv-surface p-5 shadow-mv-sm">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-4 h-7 w-12" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-3 xl:col-span-5">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="xl:col-span-4">
          <SkeletonCard lines={5} />
        </div>
        <div className="xl:col-span-3">
          <SkeletonCard lines={4} />
        </div>
      </div>
    </div>
  );
}
