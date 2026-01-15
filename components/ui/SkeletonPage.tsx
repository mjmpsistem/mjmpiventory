import { Skeleton } from "./Skeleton";

export function SkeletonPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
