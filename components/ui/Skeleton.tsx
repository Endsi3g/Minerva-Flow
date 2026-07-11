import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("mv-skeleton rounded-md", className)} />;
}

export function SkeletonStatCard() {
  return (
    <div className="flex-1 rounded-2xl border border-mv-border bg-mv-surface p-5 shadow-mv-sm">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-7 w-20" />
      <Skeleton className="mt-3 h-3 w-16" />
    </div>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-2xl border border-mv-border bg-mv-surface p-5 shadow-mv-sm">
      <Skeleton className="h-4 w-1/3" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-full" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 border-b border-mv-border-soft px-4 py-3.5">
      <Skeleton className="h-3.5 w-1/4" />
      <Skeleton className="h-3.5 w-1/6" />
      <Skeleton className="h-3.5 w-1/6" />
      <Skeleton className="h-3.5 w-1/6" />
      <Skeleton className="ml-auto h-6 w-16 rounded-full" />
    </div>
  );
}
