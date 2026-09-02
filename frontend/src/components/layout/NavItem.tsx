// frontend/src/components/layout/NavItem.tsx
// A single primary navigation destination.
// Per ui-registry.md: exactly three instances (Home, Ask Genie, Council access).
// Active state: --color-primary underline + aria-current="page".
// "Council access" fires onClick instead of navigating when role is "student".

import { Link, useLocation } from "react-router-dom";
import type { MouseEventHandler } from "react";

interface NavItemProps {
  label: string;
  href: string;
  /** Provided for "Council access" — opens modal instead of navigating for students. */
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export function NavItem({ label, href, onClick }: NavItemProps) {
  const { pathname } = useLocation();
  const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      to={href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={[
        "relative px-3 py-1 text-label font-medium transition-colors duration-fast ease-standard",
        "hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm",
        isActive
          ? "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full"
          : "text-text-muted",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}
