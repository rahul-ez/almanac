// frontend/src/components/dialogs/RegisterModal.tsx
// Quick in-app event registration modal with live feedback.

import { useEffect, useRef, useState } from "react";
import { X, CheckCircle, Ticket } from "lucide-react";
import { Button } from "../primitives/Button";
import { FormField } from "../primitives/FormField";
import { registerForEvent } from "../../api/client";

interface RegisterModalProps {
  eventId: string;
  eventName?: string;
  onClose: () => void;
  onSuccess?: (attendanceId: string) => void;
}

export function RegisterModal({
  eventId,
  eventName,
  onClose,
  onSuccess,
}: RegisterModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);

  // Escape to dismiss
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await registerForEvent({
        event_id: eventId,
        registrant_name: name.trim(),
        registrant_email: email.trim(),
      });
      if (res.status === "ok") {
        setSuccessId(res.attendance_id);
        if (onSuccess) onSuccess(res.attendance_id);
      }
    } catch {
      setError("Registration could not be completed. Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-text/25 backdrop-blur-xs"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          className="relative bg-surface rounded-lg shadow-modal w-full max-w-md p-6 flex flex-col gap-5 border border-border"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            ref={firstFocusRef}
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-4 right-4 p-1 text-text-muted hover:text-text rounded transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X size={20} strokeWidth={1.5} aria-hidden="true" />
          </button>

          {successId ? (
            /* Success State */
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <div className="w-12 h-12 rounded-full bg-success-subtle flex items-center justify-center text-success">
                <CheckCircle size={28} strokeWidth={1.5} aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-display text-h2 font-semibold text-text">
                  Registration Confirmed!
                </h2>
                <p className="mt-1 text-body text-text-muted">
                  You are registered for <strong>{eventName || eventId}</strong>.
                </p>
                <p className="mt-2 text-caption text-text-muted">
                  Pass ID: <code className="bg-surface-sunken px-1.5 py-0.5 rounded text-primary">{successId}</code>
                </p>
              </div>
              <Button
                type="button"
                variant="primary"
                onClick={onClose}
                className="w-full mt-2"
              >
                Done
              </Button>
            </div>
          ) : (
            /* Registration Form */
            <>
              <div>
                <div className="flex items-center gap-2 text-primary text-label font-semibold">
                  <Ticket size={16} strokeWidth={1.5} aria-hidden="true" />
                  <span>Event Registration</span>
                </div>
                <h2 id="register-modal-title" className="font-display text-h2 font-semibold text-text mt-1">
                  {eventName || `Register for ${eventId}`}
                </h2>
                <p className="mt-1 text-caption text-text-muted">
                  Enter your student name and college email to confirm your attendance.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <FormField
                  id="reg-name"
                  label="Full Name"
                  variant="text"
                  required
                  value={name}
                  placeholder="e.g. Rahul Sharma"
                  onChange={(e) => setName(e.target.value)}
                />

                <FormField
                  id="reg-email"
                  label="College Email"
                  variant="text"
                  type="email"
                  required
                  value={email}
                  placeholder="e.g. rahul.sharma@campus.edu"
                  onChange={(e) => setEmail(e.target.value)}
                  helperText="Use your campus email address"
                />

                {error && (
                  <p className="text-caption text-error" role="alert">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  loadingLabel="Registering…"
                  disabled={!name.trim() || !email.trim()}
                  className="w-full mt-1"
                >
                  Confirm Registration
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
