// frontend/src/App.tsx
// App root: SessionProvider → BrowserRouter → Shell → Routes.
// Thin — no data fetching, no business logic.

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SessionContext, useSessionState } from "./hooks/useSession";
import { Shell } from "./components/layout/Shell";
import { NewsletterHome } from "./pages/NewsletterHome";
import { AskGenie } from "./pages/AskGenie";
import { AdminPanel } from "./pages/AdminPanel";

function AppContent() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<NewsletterHome />} />
        <Route path="/genie" element={<AskGenie />} />
        <Route path="/admin" element={<AdminPanel />} />
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
