// frontend/src/components/genie/SuggestedQuestionChip.tsx
// --radius-full pill. Used in Genie empty state + after no_answer only.
// Per campus-companion-redesign-spec.md §6:
// Fill --color-surface-sunken at rest, text --color-text.
// Hover fill --color-primary-subtle, text --color-primary-hover.

interface SuggestedQuestionChipProps {
  question: string;
  onClick: (question: string) => void;
}

export function SuggestedQuestionChip({ question, onClick }: SuggestedQuestionChipProps) {
  return (
    <button
      onClick={() => onClick(question)}
      className={[
        "inline-flex items-center px-3.5 py-1.5 rounded-full",
        "border border-border bg-surface-sunken",
        "text-label font-medium text-text",
        "hover:bg-primary-subtle hover:text-primary-hover hover:border-primary-mid",
        "transition-colors duration-fast ease-standard",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        "text-left cursor-pointer",
      ].join(" ")}
    >
      {question}
    </button>
  );
}
