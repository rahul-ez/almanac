// frontend/src/components/layout/Section.tsx
// Named content region — the unit pages are built from (at most 4 per page).
// Per ui-registry.md: h2 at --text-h1 size, --space-8 between sections,
// independent loading/empty/error states so one failure never blanks the page.

import type { ReactNode } from "react";

interface SectionProps {
  title: string;
  description?: string;
  /** Optional filter/control row rendered beneath the title. */
  controlRow?: ReactNode;
  children: ReactNode;
  id?: string;
}

export function Section({ title, description, controlRow, children, id }: SectionProps) {
  const headingId = id ?? title.toLowerCase().replace(/\s+/g, "-");

  return (
    <section aria-labelledby={headingId} className="mt-8 first:mt-0">
      <div className="flex flex-col gap-1 mb-4">
        <h2
          id={headingId}
          className="text-h1 font-bold text-text"
        >
          {title}
        </h2>
        {description && (
          <p className="text-body text-text-muted">{description}</p>
        )}
        {controlRow && (
          <div className="mt-2">{controlRow}</div>
        )}
      </div>
      {children}
    </section>
  );
}
