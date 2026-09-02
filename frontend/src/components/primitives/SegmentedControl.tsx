// frontend/src/components/primitives/SegmentedControl.tsx
// role="radiogroup" semantics. Used for room-type filter only.
// Per campus-companion-redesign-spec.md §5.4:
// Selected segment uses --color-primary-subtle fill and --color-primary text.
// Unselected segments use --color-border outline. No drop shadows.

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
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-md border border-border bg-surface p-0.5"
    >
      {options.map((opt) => {
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
              "px-3 py-1.5 rounded text-label font-medium transition-colors duration-fast ease-standard",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
              isSelected
                ? "bg-primary-subtle text-primary font-semibold"
                : "text-text-muted hover:bg-surface-sunken hover:text-text",
            ].join(" ")}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
