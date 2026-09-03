// frontend/src/pages/Entry.tsx
// Role-aware entry screen per v2-ui-spec.md §4.
// Displayed for fresh sessions without a resolved role.
// Primary action: "Continue as student"
// Optional UX capture: display name and campus email
// Council action: "Enter access code" (inline)

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/primitives/Button";
import { FormField } from "../components/primitives/FormField";
import { useSession } from "../hooks/useSession";
import { ChevronDown, ChevronUp, KeyRound, ArrowRight } from "lucide-react";

export function Entry() {
  const { setStudentSession, setCouncilSession } = useSession();
  const navigate = useNavigate();

  // Student optional profile state (initialized from localStorage cache)
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem("almanac_profile_name") || ""
  );
  const [displayEmail, setDisplayEmail] = useState(
    () => localStorage.getItem("almanac_profile_email") || ""
  );
  const [showProfileFields, setShowProfileFields] = useState(
    () => Boolean(localStorage.getItem("almanac_profile_name") || localStorage.getItem("almanac_profile_email"))
  );
  const [studentLoading, setStudentLoading] = useState(false);

  // Council access state
  const [showCouncilForm, setShowCouncilForm] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [councilLoading, setCouncilLoading] = useState(false);
  const [councilFeedback, setCouncilFeedback] = useState<string | null>(null);

  function handleNameChange(val: string) {
    setDisplayName(val);
    localStorage.setItem("almanac_profile_name", val);
  }

  function handleEmailChange(val: string) {
    setDisplayEmail(val);
    localStorage.setItem("almanac_profile_email", val);
  }

  async function handleStudentContinue() {
    setStudentLoading(true);
    try {
      if (displayName.trim()) {
        localStorage.setItem("almanac_profile_name", displayName.trim());
      }
      if (displayEmail.trim()) {
        localStorage.setItem("almanac_profile_email", displayEmail.trim());
      }
      await setStudentSession(displayName, displayEmail);
      navigate("/", { replace: true });
    } finally {
      setStudentLoading(false);
    }
  }

  async function handleCouncilSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessCode.trim()) return;

    setCouncilLoading(true);
    setCouncilFeedback(null);

    try {
      const res = await setCouncilSession(accessCode.trim());
      if (res.success) {
        // Successful council entry navigates directly to control center / admin
        navigate("/admin", { replace: true });
      } else {
        // Unrecognized code silently resolves to student with plain informative text
        setCouncilFeedback("That code wasn't recognized — continuing as a student.");
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 1200);
      }
    } finally {
      setCouncilLoading(false);
    }
  }

  return (
    <main
      id="main-content"
      className="min-h-[calc(100vh-var(--nav-height,56px))] flex items-center justify-center px-4 py-12 bg-bg"
    >
      <div className="w-full max-w-md mx-auto bg-surface border border-border rounded-lg shadow-raised p-6 sm:p-8 flex flex-col gap-6">
        {/* Welcome header */}
        <div className="text-center flex flex-col gap-2">
          <h1 className="font-display text-display font-semibold text-text tracking-tight">
            Welcome to Almanac
          </h1>
          <p className="text-body text-text-muted">
            One place to ask, discover, and act on what's happening on campus.
          </p>
        </div>

        {/* Student path */}
        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            onClick={handleStudentContinue}
            loading={studentLoading}
            loadingLabel="Entering…"
            className="w-full text-body font-semibold min-h-control-lg text-base"
            rightIcon={<ArrowRight size={18} />}
          >
            Continue as student
          </Button>

          {/* Optional display name / email capture */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setShowProfileFields((prev) => !prev)}
              aria-expanded={showProfileFields}
              className="text-caption text-text-muted hover:text-text inline-flex items-center justify-center gap-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded transition-colors"
            >
              <span>Add your name and email to speed up registration later — optional</span>
              {showProfileFields ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showProfileFields && (
              <div className="flex flex-col gap-3 p-3 bg-surface-sunken rounded-md border border-border mt-1">
                <FormField
                  id="entry-display-name"
                  variant="text"
                  label="Display name"
                  placeholder="e.g. Aditi Sharma"
                  value={displayName}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
                <FormField
                  id="entry-display-email"
                  variant="text"
                  label="Campus email"
                  placeholder="e.g. aditi.sharma@campus.edu"
                  value={displayEmail}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  helperText="UX convenience only — no account is created"
                />
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-1" aria-hidden="true">
          <div className="border-t border-divider w-full" />
          <span className="bg-surface px-3 text-caption text-text-muted absolute">
            or
          </span>
        </div>

        {/* Council path */}
        <div className="flex flex-col gap-3">
          {!showCouncilForm ? (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowCouncilForm(true)}
                className="text-label text-primary hover:text-primary-hover font-semibold inline-flex items-center justify-center gap-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded transition-colors"
              >
                <KeyRound size={16} strokeWidth={1.5} />
                <span>Council / club admin? Enter access code</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleCouncilSubmit} className="flex flex-col gap-3 p-3 bg-surface-sunken rounded-md border border-border">
              <FormField
                id="entry-access-code"
                variant="text"
                label="Council / Club Access Code"
                placeholder="Enter club access code"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                disabled={councilLoading}
                required
                autoFocus
              />

              {councilFeedback && (
                <p className="text-caption text-text-muted bg-surface p-2 rounded border border-border" role="status">
                  {councilFeedback}
                </p>
              )}

              <div className="flex items-center gap-2 justify-end pt-1">
                <Button
                  type="button"
                  variant="tertiary"
                  onClick={() => {
                    setShowCouncilForm(false);
                    setCouncilFeedback(null);
                  }}
                  disabled={councilLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={councilLoading}
                  loadingLabel="Continuing…"
                  disabled={!accessCode.trim()}
                >
                  Continue
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
