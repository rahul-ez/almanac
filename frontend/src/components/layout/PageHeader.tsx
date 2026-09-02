// frontend/src/components/layout/PageHeader.tsx
// Opens every page: h1 at --text-display (Playfair Display, 600), one supporting line in Public Sans.
// Action slot right-aligned and aligned to baseline of title.

interface PageHeaderProps {
  title: string;
  description: string;
  /** At most one item — e.g. Newsletter Home's refresh + freshness stamp. */
  actionSlot?: React.ReactNode;
}

export function PageHeader({ title, description, actionSlot }: PageHeaderProps) {
  return (
    <div className="pt-6 pb-0">
      <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-3">
        <div>
          <h1 className="font-display text-display font-semibold text-text leading-tight tracking-tight">
            {title}
          </h1>
          <p className="mt-2 text-body text-text-muted">{description}</p>
        </div>
        {actionSlot && (
          <div className="w-full md:w-auto md:flex-shrink-0">
            {actionSlot}
          </div>
        )}
      </div>
    </div>
  );
}
