/**
 * SPRINT 7: Table loading skeleton
 *
 * A skeleton placeholder for tables while data is loading.
 * Used with React 19 Suspense boundaries for better UX.
 */

interface TableSkeletonProps {
  rows?: number
  columns?: number
}

export function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
  return (
    <div className="bg-[#18181b] rounded-lg border border-zinc-800 overflow-hidden">
      {/* Table Header Skeleton */}
      <div className="border-b border-zinc-800">
        <div className="grid gap-4 p-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <div
              key={i}
              className="h-4 bg-zinc-800 rounded animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>

      {/* Table Body Skeleton */}
      <div className="divide-y divide-zinc-800">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-4 p-4"
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div
                key={colIndex}
                className="h-4 bg-zinc-800/50 rounded animate-pulse"
                style={{ animationDelay: `${(rowIndex * columns + colIndex) * 50}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
