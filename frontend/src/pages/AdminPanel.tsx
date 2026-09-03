// frontend/src/pages/AdminPanel.tsx
// Council Control Center per v2-ui-spec.md §12:
// 5 operational areas: Overview | Events | Rooms | Analytics | Activity.
// RoleGate protects unauthenticated access. Server strictly enforces permissions on every write.

import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Container } from "../components/layout/Container";
import { PageHeader } from "../components/layout/PageHeader";
import { SegmentedControl } from "../components/primitives/SegmentedControl";
import { RoleBadge } from "../components/campus/RoleBadge";
import { Button } from "../components/primitives/Button";
import { AccessCodeModal } from "../components/dialogs/AccessCodeModal";
import { useSession } from "../hooks/useSession";
import { OverviewArea } from "./ControlCenter/OverviewArea";
import { EventsArea } from "./ControlCenter/EventsArea";
import { RoomsArea } from "./ControlCenter/RoomsArea";
import { AnalyticsArea } from "./ControlCenter/AnalyticsArea";
import { ActivityArea } from "./ControlCenter/ActivityArea";
import { ShieldAlert, KeyRound, ArrowLeft } from "lucide-react";

type ControlCenterArea = "overview" | "events" | "rooms" | "analytics" | "activity";

const AREA_OPTIONS = [
  { value: "overview", label: "Overview" },
  { value: "events", label: "Events" },
  { value: "rooms", label: "Rooms" },
  { value: "analytics", label: "Analytics" },
  { value: "activity", label: "Activity" },
];

function RoleGate() {
  const [showAccessModal, setShowAccessModal] = useState(false);
  const navigate = useNavigate();
  const { setCouncilSession } = useSession();

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 text-center max-w-md mx-auto">
      <div className="w-14 h-14 rounded-full bg-surface-sunken border border-border flex items-center justify-center text-text-muted">
        <ShieldAlert size={28} strokeWidth={1.5} />
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h1 font-semibold text-text">
          Council Authorization Required
        </h1>
        <p className="text-body text-text-muted">
          The Control Center is reserved for verified student council members, society officers, and facility administrators.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          onClick={() => navigate("/")}
          leftIcon={<ArrowLeft size={16} />}
        >
          Back to Home
        </Button>
        <Button
          variant="primary"
          onClick={() => setShowAccessModal(true)}
          leftIcon={<KeyRound size={16} />}
        >
          Enter Council Code
        </Button>
      </div>

      {showAccessModal && (
        <AccessCodeModal
          onSubmit={async (code) => {
            await setCouncilSession(code);
            setShowAccessModal(false);
          }}
          onClose={() => setShowAccessModal(false)}
        />
      )}
    </div>
  );
}

export function AdminPanel() {
  const { role, endSession } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();

  // Selected area from query params or default to "overview"
  const areaParam = searchParams.get("area") as ControlCenterArea | null;
  const currentArea: ControlCenterArea =
    areaParam && ["overview", "events", "rooms", "analytics", "activity"].includes(areaParam)
      ? areaParam
      : "overview";

  const [activeArea, setActiveArea] = useState<ControlCenterArea>(currentArea);
  const [lastCreatedEventId, setLastCreatedEventId] = useState<string | undefined>();

  // Keep state in sync with URL param
  useEffect(() => {
    if (areaParam && areaParam !== activeArea) {
      setActiveArea(areaParam);
    }
  }, [areaParam, activeArea]);

  function handleAreaChange(area: string) {
    const nextArea = area as ControlCenterArea;
    setActiveArea(nextArea);
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev);
      nextParams.set("area", nextArea);
      return nextParams;
    });
  }

  function handleEventCreated(eventId: string) {
    setLastCreatedEventId(eventId);
  }

  if (role !== "council") {
    return (
      <Container className="py-8">
        <RoleGate />
      </Container>
    );
  }

  return (
    <Container className="py-8 flex flex-col gap-8">
      {/* Control Center Header */}
      <PageHeader
        title="Council Control Center"
        description="Governed campus operations, scheduling, facility allocation, and operational analytics."
        actionSlot={
          <div className="flex items-center gap-3">
            <RoleBadge />
            <button
              type="button"
              onClick={endSession}
              className="text-caption font-semibold text-text-muted hover:text-text border border-border px-2.5 py-1 rounded bg-surface hover:bg-surface-sunken transition-colors"
            >
              Switch to student view
            </button>
          </div>
        }
      />

      {/* 5-Area Segmented Navigation Bar */}
      <div className="flex items-center justify-start border-b border-divider pb-4">
        <SegmentedControl
          id="control-center-areas"
          label="Control Center Navigation"
          options={AREA_OPTIONS}
          value={activeArea}
          onChange={handleAreaChange}
        />
      </div>

      {/* Render Active Sub-Area */}
      {activeArea === "overview" && (
        <OverviewArea onNavigateArea={handleAreaChange} />
      )}

      {activeArea === "events" && (
        <EventsArea onEventCreated={handleEventCreated} />
      )}

      {activeArea === "rooms" && (
        <RoomsArea initialEventId={lastCreatedEventId} />
      )}

      {activeArea === "analytics" && (
        <AnalyticsArea />
      )}

      {activeArea === "activity" && (
        <ActivityArea />
      )}
    </Container>
  );
}
