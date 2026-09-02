// frontend/src/components/genie/GenieQueryInput.tsx
// Growing textarea + IconButton.
// Enter submits, Shift+Enter newline. Disabled while in-flight.
// Per ui-registry.md.

import { useRef } from "react";
import { SendHorizonal } from "lucide-react";
import { IconButton } from "../primitives/IconButton";

interface GenieQueryInputProps {
  onSubmit: (question: string) => void;
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
}

export function GenieQueryInput({ onSubmit, disabled = false, value, onChange }: GenieQueryInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const q = value.trim();
    if (!q || disabled) return;
    onSubmit(q);
    onChange("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value);
    // Auto-grow
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  return (
    <div className="flex items-end gap-2 p-3 border-t border-border bg-surface">
      <label htmlFor="genie-query" className="sr-only">
        Ask a campus question
      </label>
      <textarea
        id="genie-query"
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={1}
        placeholder="Ask anything about campus rooms, teachers, events…"
        className={[
          "flex-1 resize-none rounded-md border border-border px-3 py-2",
          "bg-surface text-body text-text",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
          "disabled:bg-surface-sunken disabled:text-text-disabled disabled:cursor-not-allowed",
          "transition-colors duration-fast",
          "max-h-32 overflow-y-auto",
        ].join(" ")}
      />
      <IconButton
        icon={<SendHorizonal size={18} />}
        aria-label="Send question to Genie"
        onClick={submit}
        disabled={disabled || !value.trim()}
        loading={disabled}
        className="flex-shrink-0"
      />
    </div>
  );
}
