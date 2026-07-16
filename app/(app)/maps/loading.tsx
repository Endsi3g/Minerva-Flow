import { Skeleton } from "@/components/ui/Skeleton";

export default function MapsLoading() {
  return (
    <div className="relative flex-1">
      <Skeleton className="absolute inset-0 rounded-none" />
      <Skeleton className="absolute left-4 top-4 h-40 w-64 rounded-2xl" />
    </div>
  );
}
