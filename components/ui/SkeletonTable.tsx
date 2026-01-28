import { Skeleton } from "./Skeleton";

interface Props {
  rows?: number;
  cols?: number;
  showHeader?: boolean;
}

export function SkeletonTable({
  rows = 6,
  cols = 5,
  showHeader = true,
}: Props) {
  return (
    <div className="w-full overflow-hidden">
      <div className="divide-y divide-gray-200">
        {/* Header */}
        {showHeader && (
          <div
            className="grid gap-4 px-6 py-4 bg-gray-50"
            style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
          >
            {Array.from({ length: cols }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-3/4 rounded-md" />
            ))}
          </div>
        )}

        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className={`grid gap-4 px-6 py-4 ${
              rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/50"
            }`}
            style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
          >
            {Array.from({ length: cols }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                className={`h-4 rounded-md ${
                  colIndex === 0
                    ? "w-2/3"
                    : colIndex === cols - 1
                    ? "w-1/3"
                    : "w-full"
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
