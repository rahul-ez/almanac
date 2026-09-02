// frontend/src/components/loading/FreshnessStamp.tsx
// "Updated just now" / "Updated 12s ago" stamp for Newsletter Home header action slot.
// Updates every 10s via interval. Marks stale state if last fetch errored.

import { useEffect, useState } from "react";
import { formatFreshness } from "../../lib/formatTime";
import { RefreshCw } from "lucide-react";

interface FreshnessStampProps {
  lastUpdatedAt: string | null; // ISO timestamp of last successful fetch
  isStale?: boolean;            // True if last fetch errored
  onRefresh?: () => void;       // Optional manual refresh trigger
}

export function FreshnessStamp({ lastUpdatedAt, isStale = false, onRefresh }: FreshnessStampProps) {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const id = setInterval(() => forceUpdate((n) => n + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  const label = lastUpdatedAt
    ? formatFreshness(lastUpdatedAt, isStale)
    : "Fetching live data…";

  return (
    <div className="flex items-center gap-2">
      <span className="text-caption text-text-muted">{label}</span>
      {onRefresh && (
        <button
          onClick={onRefresh}
          aria-label="Refresh campus data"
          className="p-1 text-text-muted hover:text-primary rounded transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <RefreshCw size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
