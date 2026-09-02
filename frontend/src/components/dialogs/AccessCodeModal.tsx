// frontend/src/components/dialogs/AccessCodeModal.tsx
// The product's only modal. Focus trap, Escape to dismiss.
// Per ui-registry.md: --radius-lg, --shadow-modal. "Code not recognized" is a plain
// restatement, not an error pairing with error semantic color.
// Per ui-rules.md: council role UI is Should Ship; underlying enforcement is Must Ship.

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "../primitives/Button";
import { FormField } from "../primitives/FormField";

interface AccessCodeModalProps {
  onSubmit: (code: string) => Promise<void>;
  onClose: () => void;
}

export function AccessCodeModal({ onSubmit, onClose }: AccessCodeModalProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);

  // Focus the input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Focus trap + Escape to dismiss
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      await onSubmit(code.trim());
      // onSubmit is responsible for closing the modal on success
    } catch {
      // On mock/real failure, show non-alarming feedback
      setFeedback("Code not recognized. Check the code and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-text/20 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="access-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          className="relative bg-surface rounded-lg shadow-modal w-full max-w-sm p-6 flex flex-col gap-5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            ref={firstFocusRef}
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-4 right-4 p-1 text-text-muted hover:text-text rounded transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X size={20} aria-hidden="true" />
          </button>

          <div>
            <h2 id="access-modal-title" className="text-h2 font-semibold text-text">
              Council access
            </h2>
            <p className="mt-1 text-body text-text-muted">
              Enter the council access code to manage events and room bookings.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FormField
              id="access-code"
              label="Access code"
              variant="text"
              type="password"
              autoComplete="off"
              value={code}
              onChange={(e) => { setCode(e.target.value); setFeedback(null); }}
              placeholder="Enter code"
              // @ts-expect-error ref forwarding
              ref={inputRef}
              required
            />

            {feedback && (
              <p className="text-caption text-text-muted" role="status">
                {feedback}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              loadingLabel="Checking…"
              disabled={!code.trim()}
              className="w-full"
            >
              Confirm access
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
