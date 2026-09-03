// frontend/src/components/layout/TopBar.tsx
// Sticky top navigation bar per v2-ui-spec.md §3.
// 4-item inline navigation: Home · Events · Ask Genie · Council access (or Control Center for council).
// No hamburger menu at any breakpoint.

import { useNavigate } from "react-router-dom";
import { NavItem } from "./NavItem";
import { RoleBadge } from "../campus/RoleBadge";
import { AccessCodeModal } from "../dialogs/AccessCodeModal";
import { useSession } from "../../hooks/useSession";
import { useState } from "react";

export function TopBar() {
  const { role, refreshRole, endSession } = useSession();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);

  function handleCouncilClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (role === "student") {
      e.preventDefault();
      setModalOpen(true);
    }
    // If council, react-router-dom Link navigates normally to /admin (Control Center)
  }

  async function handleModalSubmit(code: string) {
    await refreshRole(code);
    setModalOpen(false);
    // Navigate to admin once council access is granted
    navigate("/admin");
  }

  async function handleSwitchToStudent() {
    await endSession();
    navigate("/");
  }

  return (
    <>
      <header
        className="sticky top-0 z-40 h-nav bg-surface border-b border-divider"
        role="banner"
      >
        <div className="w-full max-w-container mx-auto px-4 lg:px-8 h-full flex items-center justify-between gap-4">
          {/* Product masthead */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate("/");
            }}
            className="font-display text-h2 font-medium text-text hover:text-primary transition-colors duration-fast ease-standard flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm tracking-tight"
          >
            Almanac
          </a>

          {/* Primary navigation — 4 items inline */}
          <nav aria-label="Primary navigation" className="flex items-center gap-1 sm:gap-2">
            <NavItem label="Home" href="/" />
            <NavItem label="Events" href="/events" />
            <NavItem label="Ask Genie" href="/genie" />
            <NavItem
              label={role === "council" ? "Control Center" : "Council access"}
              href="/admin"
              onClick={handleCouncilClick}
            />
          </nav>

          {/* Role badge & session switcher (only visible when council) */}
          {role === "council" && (
            <div className="flex items-center gap-3 flex-shrink-0">
              <RoleBadge />
              <button
                type="button"
                onClick={handleSwitchToStudent}
                className="text-caption text-text-muted hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded hidden sm:inline-block"
              >
                Switch to student view
              </button>
            </div>
          )}
        </div>
      </header>

      {modalOpen && (
        <AccessCodeModal
          onSubmit={handleModalSubmit}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}

