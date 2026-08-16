interface SkeletonProps {
  className?: string;
  height?: string | number;
  width?: string | number;
  rounded?: string;
}

export function Skeleton({ className = '', height, width, rounded = 'rounded-md' }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${rounded} ${className}`}
      style={{ height, width }}
      aria-hidden="true"
    />
  );
}

/* ── Skeleton text lines ── */
export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={14}
          width={i === lines - 1 ? '65%' : '100%'}
        />
      ))}
    </div>
  );
}

/* ── Skeleton card ── */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`glass p-5 flex flex-col gap-3 ${className}`}
      aria-hidden="true"
    >
      <div className="flex gap-3 items-center">
        <Skeleton width={36} height={36} rounded="rounded-full" />
        <div className="flex-1 flex flex-col gap-1.5">
          <Skeleton height={12} width="60%" />
          <Skeleton height={10} width="40%" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
}

/* ── Source card skeleton ── */
export function SourceCardSkeleton() {
  return (
    <div className="glass p-4 flex flex-col gap-2.5" aria-hidden="true">
      <div className="flex justify-between items-start gap-2">
        <Skeleton height={12} width="55%" />
        <Skeleton height={10} width={40} />
      </div>
      <div className="flex gap-4">
        <Skeleton height={10} width={60} />
        <Skeleton height={10} width={50} />
      </div>
      {/* Score bar skeleton */}
      <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
        <Skeleton height="100%" width="70%" rounded="rounded-full" />
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}
