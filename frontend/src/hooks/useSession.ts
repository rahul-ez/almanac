// frontend/src/hooks/useSession.ts
// Provides session role state via React Context.
// Calls POST /api/session on mount (no code) → role: "student" + initializes cookie.
// Re-called with access code from AccessCodeModal to elevate to "council".

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createSession, type Role } from "../api/client";

interface SessionContextValue {
  role: Role;
  /** Call with access code to attempt council elevation; call with no arg to refresh. */
  refreshRole: (accessCode?: string) => Promise<void>;
}

export const SessionContext = createContext<SessionContextValue>({
  role: "student",
  refreshRole: async () => {},
});

export function useSession(): SessionContextValue {
  return useContext(SessionContext);
}

/** Hook for the SessionProvider implementation. Used once at App root. */
export function useSessionState(): SessionContextValue {
  const [role, setRole] = useState<Role>("student");

  const refreshRole = useCallback(async (accessCode?: string) => {
    try {
      const res = await createSession(accessCode);
      setRole(res.role);
    } catch {
      // On error keep existing role — don't reset to student silently
    }
  }, []);

  // Initialize on mount — establishes the session cookie and sets initial role
  useEffect(() => {
    refreshRole();
  }, [refreshRole]);

  return { role, refreshRole };
}
