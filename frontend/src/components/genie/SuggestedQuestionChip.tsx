// frontend/src/components/genie/SuggestedQuestionChip.tsx
// --radius-full pill. Used in Genie empty state + after no_answer only.
// Submits the question on click.

interface SuggestedQuestionChipProps {
  question: string;
  onClick: (question: string) => void;
}

export function SuggestedQuestionChip({ question, onClick }: SuggestedQuestionChipProps) {
  return (
    <button
      onClick={() => onClick(question)}
      className={[
        "inline-flex items-center px-3 py-1.5 rounded-full",
        "border border-border bg-surface",
        "text-label font-medium text-text-muted",
        "hover:bg-primary-subtle hover:text-primary hover:border-primary",
        "transition-colors duration-fast ease-standard",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        "text-left",
      ].join(" ")}
    >
      {question}
    </button>
  );
}
