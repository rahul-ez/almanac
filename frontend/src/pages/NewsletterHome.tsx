// frontend/src/pages/NewsletterHome.tsx
// Newsletter Home: PageHeader + Section (events) + Section (internships) + Section (room availability).
// 15s polling paused on visibilitychange (tab hidden).

import { useEffect, useRef, useState } from "react";
import { Container } from "../components/layout/Container";
import { PageHeader } from "../components/layout/PageHeader";
import { Section } from "../components/layout/Section";
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

const POLL_INTERVAL_MS = 15_000;
const ROOM_TYPE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "Classroom", label: "Classrooms" },
  { value: "Lab", label: "Labs" },
  { value: "Auditorium", label: "Auditoriums" },
  { value: "Study room", label: "Study rooms" },
];

export function NewsletterHome() {
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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchAll() {
    const [evRes, intRes, roomRes] = await Promise.allSettled([
      listEvents(true),
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

  return (
    <Container className="py-8 flex flex-col gap-8">
      <PageHeader
        title="Campus Today"
        description="Live events, room availability, and internship opportunities across campus."
        actionSlot={
          <FreshnessStamp
            lastUpdatedAt={lastUpdated}
            isStale={isStale}
            onRefresh={fetchAll}
          />
        }
      />

      {/* Events section */}
      <Section
        id="events"
        title="Events"
        description="Upcoming and ongoing campus events"
      >
        {eventsLoading && <Skeleton variant="card" count={3} />}
        {eventsError && (
          <Banner variant="error" title="Live data unavailable">
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
            {events.map((event) => (
              <EventCard
                key={event.event_id}
                event={event}
                onRegister={setRegisteringEvent}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Internships & Opportunities section */}
      <Section
        id="internships"
        title="Internships & Opportunities"
        description="Active job roles, research fellowships, and summer internships"
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

      {/* Room availability section */}
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
          <Banner variant="error" title="Live data unavailable">
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

      {/* Quick Event Registration Dialog */}
      {registeringEvent && (
        <RegisterModal
          eventId={registeringEvent.event_id}
          eventName={registeringEvent.name}
          onClose={() => setRegisteringEvent(null)}
          onSuccess={() => {
            fetchAll(); // Refresh attendance count immediately!
          }}
        />
      )}
    </Container>
  );
}
