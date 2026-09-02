// frontend/src/components/data/StatusIndicator.tsx
// Per ui-registry.md: all 14 semantic states. Icon aria-hidden; text carries meaning.
// Never invents a new color pairing.

import type { SemanticState } from "../../styles/tokens";
import { stateColors } from "../../styles/tokens";

interface StatusIndicatorProps {
  state: SemanticState;
  label?: string; // Overrides the default capitalized state label
}

const STATE_LABELS: Record<SemanticState, string> = {
  available:   "Available",
  unavailable: "Unavailable",
  upcoming:    "Upcoming",
  ongoing:     "Ongoing",
  completed:   "Completed",
  cancelled:   "Cancelled",
  pending:     "Pending",
  confirmed:   "Confirmed",
  conflict:    "Conflict",
  full:        "Full",
  empty:       "Empty",
  loading:     "Loading",
  error:       "Error",
  no_answer:   "No answer",
};

export function StatusIndicator({ state, label }: StatusIndicatorProps) {
  const safeState: SemanticState = state && stateColors[state] ? state : "upcoming";
  const { text, bg } = stateColors[safeState];
  const displayLabel = label ?? STATE_LABELS[safeState] ?? "Upcoming";

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-caption font-medium"
      style={{ color: text, backgroundColor: bg }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: text }}
        aria-hidden="true"
      />
      {displayLabel}
    </span>
  );
}
