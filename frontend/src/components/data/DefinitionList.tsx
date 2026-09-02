// frontend/src/components/data/DefinitionList.tsx
// Real dl/dt/dd. Used for card metadata and booking summaries.
// Per ui-registry.md: stacks on mobile, grid on --bp-md+.

interface DefinitionItem {
  term: string;
  definition: string | React.ReactNode;
}

interface DefinitionListProps {
  items: DefinitionItem[];
}

export function DefinitionList({ items }: DefinitionListProps) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
      {items.map(({ term, definition }) => (
        <div key={term} className="flex flex-col gap-0.5">
          <dt className="text-caption font-medium text-text-muted uppercase tracking-wide">
            {term}
          </dt>
          <dd className="text-body text-text">{definition}</dd>
        </div>
      ))}
    </dl>
  );
}
