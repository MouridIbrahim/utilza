export function Skeleton({ className, label }) {
  return (
    <div
      aria-busy="true"
      aria-label={label || 'Loading'}
      className={`animate-pulse rounded bg-[var(--color-surface-subtle)] ${className || 'h-24 w-full'}`}
    />
  );
}

export function CardSkeletonGrid({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading tools">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-36 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div aria-label="Loading results" className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
