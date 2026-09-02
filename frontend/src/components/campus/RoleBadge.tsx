// frontend/src/components/campus/RoleBadge.tsx
// Shown in TopBar only when role is "council".
// Per ui-registry.md: text label required (not icon-only).

import { ShieldCheck } from "lucide-react";

export function RoleBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-subtle text-primary text-caption font-medium flex-shrink-0"
      aria-label="Signed in as Council"
    >
      <ShieldCheck size={12} aria-hidden="true" />
      Council
    </span>
  );
}
