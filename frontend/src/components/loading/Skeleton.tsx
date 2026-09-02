// frontend/src/components/loading/Skeleton.tsx
// Per ui-registry.md: card / row variants. aria-busy on containing region.
// Not shown for fetches < ~300ms (handled by caller setting loading only after delay).

interface SkeletonProps {
  variant?: "card" | "row";
  count?: number;
}

function SkeletonPulse({ className }: { className: string }) {
  return (
    <div
      className={`bg-surface-sunken rounded animate-pulse ${className}`}
      aria-hidden="true"
    />
  );
}

function SkeletonCard() {
  return (
    <div className="bg-surface rounded-lg border border-border p-4 flex flex-col gap-3">
      <SkeletonPulse className="h-5 w-3/4" />
      <SkeletonPulse className="h-4 w-1/2" />
      <SkeletonPulse className="h-4 w-full" />
      <SkeletonPulse className="h-4 w-2/3" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 h-table-row border-b border-divider last:border-0">
      <SkeletonPulse className="h-4 w-1/4" />
      <SkeletonPulse className="h-4 w-1/3" />
      <SkeletonPulse className="h-4 w-1/5" />
      <SkeletonPulse className="h-4 w-1/6 ml-auto" />
    </div>
  );
}

export function Skeleton({ variant = "card", count = 3 }: SkeletonProps) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading content"
      className={variant === "card" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col"}
    >
      {Array.from({ length: count }).map((_, i) =>
        variant === "card" ? <SkeletonCard key={i} /> : <SkeletonRow key={i} />
      )}
    </div>
  );
}
