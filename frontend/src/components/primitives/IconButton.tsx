// frontend/src/components/primitives/IconButton.tsx
// Icon-only button. Mandatory aria-label.
// Per ui-registry.md: 40x40px minimum hit area. Used exclusively for Genie send.

import type { ButtonHTMLAttributes } from "react";
import type { ReactNode } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  icon: ReactNode;
  loading?: boolean;
}

export function IconButton({
  icon,
  loading = false,
  className = "",
  ...rest
}: IconButtonProps) {
  return (
    <button
      {...rest}
      aria-busy={loading ? "true" : undefined}
      className={[
        "inline-flex items-center justify-center rounded-md",
        "w-10 h-10 min-w-[40px] min-h-[40px]",
        "text-primary hover:bg-primary-subtle",
        "transition-colors duration-fast ease-standard",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        className,
      ].join(" ")}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}
