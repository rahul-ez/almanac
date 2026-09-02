// frontend/src/components/layout/PageHeader.tsx
// Opens every page: h1 at --text-display, one supporting line, optional action slot.
// Per ui-registry.md: exactly one h1 per page. Action slot right-aligned at --bp-md+,
// stacked full-width below.

interface PageHeaderProps {
  title: string;
  description: string;
  /** At most one item — e.g. Newsletter Home's refresh + freshness stamp. */
  actionSlot?: React.ReactNode;
}

export function PageHeader({ title, description, actionSlot }: PageHeaderProps) {
  return (
    <div className="pt-10 pb-0">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h1 className="text-display text-text sm:text-h1 font-bold leading-tight">
            {title}
          </h1>
          <p className="mt-2 text-body text-text-muted">{description}</p>
        </div>
        {actionSlot && (
          <div className="w-full md:w-auto md:flex-shrink-0 md:pt-1">
            {actionSlot}
          </div>
        )}
      </div>
    </div>
  );
}
