// frontend/src/hooks/useSession.ts
// Provides session role and profile state via React Context.
// On mount: calls GET /api/session. If session exists with council role or profile, resolves immediately.
// Entry screen calls setStudentSession or setCouncilSession to establish the session.

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createSession, getSession, endSession as apiEndSession, type Role } from "../api/client";

interface SessionContextValue {
  role: Role;
  displayName?: string;
  displayEmail?: string;
  isInitialized: boolean;
  hasResolvedSession: boolean;
  /** Establish student session with optional display fields. */
  setStudentSession: (displayName?: string, displayEmail?: string) => Promise<void>;
  /** Attempt council session elevation with access code. */
  setCouncilSession: (accessCode: string) => Promise<{ success: boolean; role: Role }>;
  /** Refresh session role with optional access code. */
  refreshRole: (accessCode?: string) => Promise<void>;
  /** Clear session and switch back to fresh student state. */
  endSession: () => Promise<void>;
}

export const SessionContext = createContext<SessionContextValue>({
  role: "student",
  isInitialized: false,
  hasResolvedSession: false,
  setStudentSession: async () => {},
  setCouncilSession: async () => ({ success: false, role: "student" }),
  refreshRole: async () => {},
  endSession: async () => {},
});

export function useSession(): SessionContextValue {
  return useContext(SessionContext);
}

/** Hook for the SessionProvider implementation. Used once at App root. */
export function useSessionState(): SessionContextValue {
  const [role, setRole] = useState<Role>("student");
  const [displayName, setDisplayName] = useState<string | undefined>();
  const [displayEmail, setDisplayEmail] = useState<string | undefined>();
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasResolvedSession, setHasResolvedSession] = useState(false);

  // Initialize on mount via GET /api/session
  useEffect(() => {
    let mounted = true;
    async function initSession() {
      try {
        const res = await getSession();
        if (mounted) {
          setRole(res.role);
          setDisplayName(res.display_name);
          setDisplayEmail(res.display_email);
          // If already identified as council or has session profile, mark as resolved
          if (res.role === "council" || res.display_name || res.display_email) {
            setHasResolvedSession(true);
          }
        }
      } catch {
        // Fallback to default student
      } finally {
        if (mounted) setIsInitialized(true);
      }
    }
    initSession();
    return () => {
      mounted = false;
    };
  }, []);

  const setStudentSession = useCallback(
    async (name?: string, email?: string) => {
      try {
        const res = await createSession(undefined, name?.trim() || undefined, email?.trim() || undefined);
        setRole(res.role);
        setDisplayName(res.display_name);
        setDisplayEmail(res.display_email);
        setHasResolvedSession(true);
      } catch {
        setRole("student");
        setHasResolvedSession(true);
      }
    },
    []
  );

  const setCouncilSession = useCallback(
    async (accessCode: string) => {
      try {
        const res = await createSession(accessCode.trim());
        setRole(res.role);
        setDisplayName(res.display_name);
        setDisplayEmail(res.display_email);
        setHasResolvedSession(true);
        return { success: res.role === "council", role: res.role };
      } catch {
        setRole("student");
        setHasResolvedSession(true);
        return { success: false, role: "student" as Role };
      }
    },
    []
  );

  const refreshRole = useCallback(
    async (accessCode?: string) => {
      try {
        const res = await createSession(accessCode);
        setRole(res.role);
        if (res.display_name) setDisplayName(res.display_name);
        if (res.display_email) setDisplayEmail(res.display_email);
        setHasResolvedSession(true);
      } catch {
        // Keep existing role
      }
    },
    []
  );

  const endSession = useCallback(async () => {
    try {
      await apiEndSession();
    } catch {
      // Ignore
    } finally {
      setRole("student");
      setDisplayName(undefined);
      setDisplayEmail(undefined);
      setHasResolvedSession(false);
    }
  }, []);

  return {
    role,
    displayName,
    displayEmail,
    isInitialized,
    hasResolvedSession,
    setStudentSession,
    setCouncilSession,
    refreshRole,
    endSession,
  };
}

