import { Skeleton } from "./Skeleton";
import { SkeletonBlock } from "./SkeletonBlock";

export function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-sm space-y-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-40" />
      <SkeletonBlock lines={2} />
    </div>
  );
}
