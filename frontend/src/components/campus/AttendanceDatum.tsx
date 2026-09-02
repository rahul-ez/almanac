// frontend/src/components/campus/AttendanceDatum.tsx
// "42 registered" format. isLive prop → ongoing/live pairing.

import { Users } from "lucide-react";

interface AttendanceDatumProps {
  count: number;
  isLive?: boolean;
}

export function AttendanceDatum({ count, isLive = false }: AttendanceDatumProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-label font-medium ${
        isLive ? "text-accent-text" : "text-text-muted"
      }`}
      aria-label={`${count} registered${isLive ? ", event is live" : ""}`}
    >
      <Users size={14} aria-hidden="true" />
      <span>{count} registered</span>
      {isLive && (
        <span className="inline-flex items-center gap-1 text-caption font-medium text-accent-text bg-accent-subtle px-1.5 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block animate-pulse" aria-hidden="true" />
          Live
        </span>
      )}
    </span>
  );
}
