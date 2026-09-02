// frontend/src/components/data/Banner.tsx
// Per ui-registry.md: success / error / conflict / warning / info variants.
// Persistent — never auto-dismissed. Rendered in a polite live region.

import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";
import type { ReactNode } from "react";

type BannerVariant = "success" | "error" | "conflict" | "warning" | "info";

interface BannerProps {
  variant: BannerVariant;
  title: string;
  children?: ReactNode;
}

const config: Record<BannerVariant, {
  icon: ReactNode;
  bg: string;
  border: string;
  titleColor: string;
}> = {
  success: {
    icon: <CheckCircle size={16} aria-hidden="true" />,
    bg: "bg-success-subtle",
    border: "border-success",
    titleColor: "text-success",
  },
  error: {
    icon: <XCircle size={16} aria-hidden="true" />,
    bg: "bg-error-subtle",
    border: "border-error",
    titleColor: "text-error",
  },
  conflict: {
    icon: <XCircle size={16} aria-hidden="true" />,
    bg: "bg-error-subtle",
    border: "border-error",
    titleColor: "text-error",
  },
  warning: {
    icon: <AlertTriangle size={16} aria-hidden="true" />,
    bg: "bg-warning-subtle",
    border: "border-warning",
    titleColor: "text-warning",
  },
  info: {
    icon: <Info size={16} aria-hidden="true" />,
    bg: "bg-info-subtle",
    border: "border-info",
    titleColor: "text-info",
  },
};

export function Banner({ variant, title, children }: BannerProps) {
  const { icon, bg, border, titleColor } = config[variant];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${bg} ${border} border rounded-md px-4 py-3 flex gap-3`}
    >
      <span className={`flex-shrink-0 mt-0.5 ${titleColor}`}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-label font-medium ${titleColor}`}>{title}</p>
        {children && (
          <div className="mt-1 text-body text-text-muted">{children}</div>
        )}
      </div>
    </div>
  );
}
