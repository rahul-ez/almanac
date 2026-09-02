// frontend/src/components/primitives/Button.tsx
// Per ui-registry.md & campus-companion-redesign-spec.md:
// Primary: solid --color-primary fill with white text, --color-primary-hover on hover.
// Secondary: --color-surface with --color-primary text and --color-border border.
// Tertiary: transparent with --color-primary text.

import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tertiary";
  loading?: boolean;
  loadingLabel?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const baseStyles =
  "inline-flex items-center justify-center gap-2 rounded-md text-label font-semibold transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-control-md px-4 select-none cursor-pointer";

const variantStyles = {
  primary:
    "bg-primary text-white hover:bg-primary-hover active:bg-primary-hover disabled:bg-text-disabled disabled:text-white disabled:cursor-not-allowed",
  secondary:
    "bg-surface text-primary border border-border hover:bg-primary-subtle hover:border-primary-mid active:bg-primary-subtle disabled:border-border disabled:text-text-disabled disabled:cursor-not-allowed",
  tertiary:
    "bg-transparent text-primary hover:bg-primary-subtle active:bg-primary-subtle disabled:text-text-disabled disabled:cursor-not-allowed",
};

export function Button({
  variant = "primary",
  loading = false,
  loadingLabel = "Loading…",
  leftIcon,
  rightIcon,
  children,
  disabled,
  className = "",
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...rest}
      disabled={isDisabled}
      aria-disabled={isDisabled ? "true" : undefined}
      aria-busy={loading ? "true" : undefined}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin h-4 w-4 flex-shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          {loadingLabel}
        </>
      ) : (
        <>
          {leftIcon && <span aria-hidden="true">{leftIcon}</span>}
          {children}
          {rightIcon && <span aria-hidden="true">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}
