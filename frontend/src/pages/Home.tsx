// frontend/src/pages/Home.tsx
// V2 Student Home per v2-ui-spec.md §5:
// PageHeader + CampusPulse + Ask Genie Callout + Events Preview + Room Availability Snapshot + Internships.
// 15s polling paused on visibilitychange (tab hidden).

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Container } from "../components/layout/Container";
import { PageHeader } from "../components/layout/PageHeader";
import { Section } from "../components/layout/Section";
import { CampusPulse } from "../components/campus/CampusPulse";
import { EventCard } from "../components/campus/EventCard";
import { InternshipCard } from "../components/campus/InternshipCard";
import { RoomAvailabilityTable } from "../components/campus/RoomAvailabilityTable";
import { RegisterModal } from "../components/dialogs/RegisterModal";
import { Skeleton } from "../components/loading/Skeleton";
import { Banner } from "../components/data/Banner";
import { FreshnessStamp } from "../components/loading/FreshnessStamp";
import { SegmentedControl } from "../components/primitives/SegmentedControl";
import { listEvents, getRoomAvailability, listInternships } from "../api/client";
import type { EventSummary, FreeRoom, InternshipSummary } from "../api/client";
import { MessageSquare, ArrowRight } from "lucide-react";

const POLL_INTERVAL_MS = 15_000;
const ROOM_TYPE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "Classroom", label: "Classrooms" },
  { value: "Lab", label: "Labs" },
  { value: "Auditorium", label: "Auditoriums" },
  { value: "Study room", label: "Study rooms" },
];

export function Home() {
  const [events, setEvents] = useState<EventSummary[] | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [registeringEvent, setRegisteringEvent] = useState<EventSummary | null>(null);

  const [internships, setInternships] = useState<InternshipSummary[] | null>(null);
  const [internshipsError, setInternshipsError] = useState<string | null>(null);

  const [rooms, setRooms] = useState<FreeRoom[] | null>(null);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [roomTypeFilter, setRoomTypeFilter] = useState("all");

  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [refreshPulseCount, setRefreshPulseCount] = useState(0);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchAll() {
    const [evRes, intRes, roomRes] = await Promise.allSettled([
      listEvents({ upcoming: true }),
      listInternships(true),
      getRoomAvailability(
        undefined,
        roomTypeFilter === "all" ? undefined : roomTypeFilter
      ),
    ]);

    let anyError = false;

    if (evRes.status === "fulfilled") {
      if (evRes.value.error) {
        setEventsError(evRes.value.error);
        anyError = true;
      } else {
        setEvents(evRes.value.events);
        setEventsError(null);
      }
    } else {
      setEventsError("Couldn't load events — try again shortly.");
      anyError = true;
    }

    if (intRes.status === "fulfilled") {
      if (intRes.value.error) {
        setInternshipsError(intRes.value.error);
        anyError = true;
      } else {
        setInternships(intRes.value.internships);
        setInternshipsError(null);
      }
    } else {
      setInternshipsError("Couldn't load internships — try again shortly.");
      anyError = true;
    }

    if (roomRes.status === "fulfilled") {
      if (roomRes.value.error) {
        setRoomsError(roomRes.value.error);
        anyError = true;
      } else {
        setRooms(roomRes.value.free_rooms);
        setRoomsError(null);
      }
    } else {
      setRoomsError("Couldn't load room availability — try again shortly.");
      anyError = true;
    }

    setLastUpdated(new Date().toISOString());
    setIsStale(anyError);
    setRefreshPulseCount((c) => c + 1);
  }

  // Initial fetch + polling
  useEffect(() => {
    fetchAll();

    function startPolling() {
      pollRef.current = setInterval(() => {
        if (!document.hidden) fetchAll();
      }, POLL_INTERVAL_MS);
    }

    function handleVisibility() {
      if (document.hidden) {
        if (pollRef.current) clearInterval(pollRef.current);
      } else {
        fetchAll();
        startPolling();
      }
    }

    startPolling();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomTypeFilter]);

  const eventsLoading = events === null && !eventsError;
  const internshipsLoading = internships === null && !internshipsError;
  const roomsLoading = rooms === null && !roomsError;

  // Trimmed preview of upcoming events for Home
  const previewEvents = events ? events.slice(0, 3) : [];

  return (
    <Container className="py-8 flex flex-col gap-10">
      <PageHeader
        title="Campus Overview"
        description="Live campus pulse, upcoming events, and current space availability."
        actionSlot={
          <FreshnessStamp
            lastUpdatedAt={lastUpdated}
            isStale={isStale}
            onRefresh={fetchAll}
          />
        }
      />

      {/* 1. Live Campus Pulse block */}
      <CampusPulse onRefreshTrigger={refreshPulseCount} />

      {/* 2. Ask Genie entry callout */}
      <div className="bg-surface-elevated border border-border rounded-lg p-5 sm:p-6 shadow-raised flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3 max-w-xl">
          <div className="w-10 h-10 rounded-full bg-primary-subtle border border-primary-mid flex items-center justify-center flex-shrink-0 mt-0.5">
            <MessageSquare size={18} strokeWidth={1.5} className="text-primary" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h3 className="font-display text-h2 font-medium text-text">
              Have a question about campus?
            </h3>
            <p className="text-body text-text-muted">
              Ask Genie in plain English about free labs, professor office hours, or event details.
            </p>
          </div>
        </div>

        <Link
          to="/genie"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md bg-primary text-white hover:bg-primary-hover transition-colors font-semibold text-label shadow-sm flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span>Ask Genie</span>
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>

      {/* 3. Upcoming Events preview section */}
      <Section
        id="events-preview"
        title="Upcoming Events"
        description="Happening soon on campus"
        controlRow={
          <Link
            to="/events"
            className="text-label font-semibold text-primary hover:text-primary-hover inline-flex items-center gap-1 transition-colors"
          >
            <span>View all events</span>
            {events && events.length > 0 && <span>({events.length})</span>}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        }
      >
        {eventsLoading && <Skeleton variant="card" count={3} />}
        {eventsError && (
          <Banner variant="error" title="Events unavailable">
            {eventsError}
          </Banner>
        )}
        {events && !eventsError && events.length === 0 && (
          <p className="text-body text-text-muted py-6 text-center">
            No upcoming events right now. Check back soon.
          </p>
        )}
        {events && !eventsError && events.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {previewEvents.map((event) => (
              <EventCard
                key={event.event_id}
                event={event}
                onRegister={setRegisteringEvent}
              />
            ))}
          </div>
        )}
      </Section>

      {/* 4. Room availability snapshot section */}
      <Section
        id="room-availability"
        title="Room Availability"
        description="Rooms free right now"
        controlRow={
          <SegmentedControl
            id="room-type-filter"
            label="Filter by room type"
            options={ROOM_TYPE_OPTIONS}
            value={roomTypeFilter}
            onChange={setRoomTypeFilter}
          />
        }
      >
        {roomsLoading && <Skeleton variant="row" count={4} />}
        {roomsError && (
          <Banner variant="error" title="Room data unavailable">
            {roomsError}
          </Banner>
        )}
        {rooms && !roomsError && (
          <RoomAvailabilityTable
            variant="snapshot"
            freeRooms={rooms}
            labelledById="room-availability"
          />
        )}
      </Section>

      {/* 5. Internships & Opportunities section (preserved) */}
      <Section
        id="internships"
        title="Internships & Opportunities"
        description="Active job roles, fellowships, and research opportunities"
      >
        {internshipsLoading && <Skeleton variant="card" count={3} />}
        {internshipsError && (
          <Banner variant="error" title="Opportunities unavailable">
            {internshipsError}
          </Banner>
        )}
        {internships && !internshipsError && internships.length === 0 && (
          <p className="text-body text-text-muted py-6 text-center">
            No open internships right now. Check back soon.
          </p>
        )}
        {internships && !internshipsError && internships.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {internships.map((internship) => (
              <InternshipCard
                key={internship.internship_id}
                internship={internship}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Quick Event Registration Modal */}
      {registeringEvent && (
        <RegisterModal
          eventId={registeringEvent.event_id}
          eventName={registeringEvent.name}
          onClose={() => setRegisteringEvent(null)}
          onSuccess={() => {
            fetchAll();
          }}
        />
      )}
    </Container>
  );
}
