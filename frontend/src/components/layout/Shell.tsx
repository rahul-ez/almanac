// frontend/src/components/layout/Shell.tsx
// App shell: skip link + TopBar + main landmark.
// Rendered once in App.tsx. Pages compose inside <main>.
// Per ui-registry.md: skip link visible on focus, navigates to #main-content.

import type { ReactNode } from "react";
import { TopBar } from "./TopBar";

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      {/* Skip link — visible only on focus */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-surface focus:rounded-md focus:text-label focus:shadow-elevated"
      >
        Skip to main content
      </a>

      <TopBar />

      <main
        id="main-content"
        className="flex-1 flex flex-col"
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  );
}
