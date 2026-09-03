// frontend/src/App.tsx
// App root: SessionProvider → BrowserRouter → Shell → Routes.
// Thin — wires owned student surfaces and routes.

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SessionContext, useSession, useSessionState } from "./hooks/useSession";
import { Shell } from "./components/layout/Shell";
import { Home } from "./pages/Home";
import { Events } from "./pages/Events";
import { EventDetail } from "./pages/EventDetail";
import { AskGenie } from "./pages/AskGenie";
import { AdminPanel } from "./pages/AdminPanel";
import { Entry } from "./pages/Entry";

function RootRoute() {
  const { hasResolvedSession, isInitialized } = useSession();

  // While checking initial session, render quiet loading or proceed
  if (!isInitialized) {
    return null;
  }

  // If session has not been resolved (fresh session), show Entry screen
  if (!hasResolvedSession) {
    return <Entry />;
  }

  return <Home />;
}

function AppContent() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/entry" element={<Entry />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:event_id" element={<EventDetail />} />
        <Route path="/genie" element={<AskGenie />} />
        <Route path="/admin" element={<AdminPanel />} />
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}

export function App() {
  const sessionState = useSessionState();

  return (
    <SessionContext.Provider value={sessionState}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </SessionContext.Provider>
  );
}

