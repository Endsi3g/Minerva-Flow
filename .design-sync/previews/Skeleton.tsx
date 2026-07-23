import * as React from "react";
import { Skeleton, SkeletonCard, SkeletonRow, SkeletonStatCard } from "minerva-flow";

export function Default() {
  return (
    <div className="w-[280px] space-y-2.5">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
    </div>
  );
}

export function StatCards() {
  return (
    <div className="flex w-[560px] gap-4">
      <SkeletonStatCard />
      <SkeletonStatCard />
      <SkeletonStatCard />
    </div>
  );
}

export function Card() {
  return (
    <div className="w-[320px]">
      <SkeletonCard lines={4} />
    </div>
  );
}

export function Rows() {
  return (
    <div className="w-[520px] overflow-hidden rounded-2xl border border-mv-border bg-mv-surface">
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </div>
  );
}
