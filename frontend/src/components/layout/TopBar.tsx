// frontend/src/components/layout/TopBar.tsx
// Sticky top navigation bar.
// Per ui-registry.md & campus-companion-redesign-spec.md:
// Height --nav-height, --color-surface background, --color-divider bottom border.
// Product name "Almanac" in --text-h2 (Playfair Display, 500) as masthead.
// NavItems + RoleBadge in Public Sans --text-label. No hamburger menu.

import { useNavigate } from "react-router-dom";
import { NavItem } from "./NavItem";
import { RoleBadge } from "../campus/RoleBadge";
import { AccessCodeModal } from "../dialogs/AccessCodeModal";
import { useSession } from "../../hooks/useSession";
import { useState } from "react";

export function TopBar() {
  const { role, refreshRole } = useSession();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);

  function handleCouncilClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (role === "student") {
      e.preventDefault();
      setModalOpen(true);
    }
    // If council, react-router-dom Link navigates normally to /admin
  }

  async function handleModalSubmit(code: string) {
    await refreshRole(code);
    setModalOpen(false);
    // Navigate to admin once council access is granted
    navigate("/admin");
  }

  return (
    <>
      <header
        className="sticky top-0 z-40 h-nav bg-surface border-b border-divider"
        role="banner"
      >
        <div className="w-full max-w-container mx-auto px-4 lg:px-8 h-full flex items-center justify-between gap-6">
          {/* Product masthead */}
          <a
            href="/"
            onClick={(e) => { e.preventDefault(); navigate("/"); }}
            className="font-display text-h2 font-medium text-text hover:text-primary transition-colors duration-fast ease-standard flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm tracking-tight"
          >
            Almanac
          </a>

          {/* Primary navigation */}
          <nav aria-label="Primary navigation" className="flex items-center gap-1">
            <NavItem label="Home" href="/" />
            <NavItem label="Ask Genie" href="/genie" />
            <NavItem
              label="Council access"
              href="/admin"
              onClick={handleCouncilClick}
            />
          </nav>

          {/* Role badge (only visible when council) */}
          {role === "council" && <RoleBadge />}
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
