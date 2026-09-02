// frontend/src/components/primitives/SegmentedControl.tsx
// role="radiogroup" semantics. Used for room-type filter only.
// Per ui-registry.md: options: All / Classroom / Lab / Auditorium / Study room.

interface SegmentedControlProps {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

export function SegmentedControl({
  id,
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-border bg-surface overflow-hidden">
      {options.map((opt, i) => {
        const isSelected = opt.value === value;
        const btnId = `${id}-${opt.value}`;
        return (
          <button
            key={opt.value}
            id={btnId}
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(opt.value)}
            className={[
              "px-3 py-1.5 text-label font-medium transition-colors duration-fast ease-standard",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
              i > 0 ? "border-l border-border" : "",
              isSelected
                ? "bg-primary text-surface"
                : "text-text-muted hover:bg-surface-sunken",
            ].join(" ")}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
