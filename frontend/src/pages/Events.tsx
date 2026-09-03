// frontend/src/pages/Events.tsx
// Complete event discovery and planning surface per v2-ui-spec.md §7.
// Default view: Grid (discovery). Secondary view: Calendar (planning).
// Backed by GET /api/events with filters: club_id, q, upcoming.

import { useState, useEffect, useMemo } from "react";
import { Container } from "../components/layout/Container";
import { PageHeader } from "../components/layout/PageHeader";
import { Section } from "../components/layout/Section";
import { SegmentedControl } from "../components/primitives/SegmentedControl";
import { FormField } from "../components/primitives/FormField";
import { Button } from "../components/primitives/Button";
import { EventCard } from "../components/campus/EventCard";
import { CalendarView } from "../components/campus/CalendarView";
import { RegisterModal } from "../components/dialogs/RegisterModal";
import { Skeleton } from "../components/loading/Skeleton";
import { Banner } from "../components/data/Banner";
import { listEvents, type EventSummary } from "../api/client";
import { RotateCcw } from "lucide-react";

const VIEW_OPTIONS = [
  { value: "grid", label: "Grid" },
  { value: "calendar", label: "Calendar" },
];

export function Events() {
  const [viewMode, setViewMode] = useState("grid");
  const [events, setEvents] = useState<EventSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state for Grid view
  const [clubFilter, setClubFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Event registration modal
  const [registeringEvent, setRegisteringEvent] = useState<EventSummary | null>(null);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  async function fetchGridEvents() {
    setLoading(true);
    setError(null);
    try {
      const res = await listEvents({
        upcoming: true,
        club_id: clubFilter === "all" ? undefined : clubFilter,
        q: debouncedQuery.trim() || undefined,
      });
      if (res.error) {
        setError(res.error);
      } else {
        setEvents(res.events);
      }
    } catch {
      setError("Couldn't load campus events. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (viewMode === "grid") {
      fetchGridEvents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubFilter, debouncedQuery, viewMode]);

  // Extract unique club options from loaded events
  const clubOptions = useMemo(() => {
    const defaultOption = [{ value: "all", label: "All Clubs & Organizers" }];
    if (!events) return defaultOption;

    const uniqueClubs = Array.from(new Set(events.map((e) => e.club))).sort();
    return [
      ...defaultOption,
      ...uniqueClubs.map((club) => ({ value: club, label: club })),
    ];
  }, [events]);

  function handleResetFilters() {
    setClubFilter("all");
    setSearchQuery("");
  }

  const isFiltered = clubFilter !== "all" || debouncedQuery.trim().length > 0;

  return (
    <Container className="py-8 flex flex-col gap-8">
      {/* Header with Grid / Calendar toggle */}
      <PageHeader
        title="Campus Events"
        description="Discover student club activities, academic workshops, hackathons, and guest lectures."
        actionSlot={
          <SegmentedControl
            id="events-view-toggle"
            label="Events view mode"
            options={VIEW_OPTIONS}
            value={viewMode}
            onChange={setViewMode}
          />
        }
      />

      {/* Grid View */}
      {viewMode === "grid" && (
        <Section
          id="events-grid"
          title="All Events"
          description="Browse and register for upcoming events"
        >
          {/* Controls: Club filter and Search input */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-6 bg-surface p-4 rounded-lg border border-border shadow-raised">
            <div className="sm:col-span-6 md:col-span-5">
              <FormField
                id="events-search"
                variant="text"
                label="Search events"
                placeholder="Search by name, topic, or keyword…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="sm:col-span-6 md:col-span-5">
              <FormField
                id="events-club-filter"
                variant="select"
                label="Filter by club"
                options={clubOptions}
                value={clubFilter}
                onChange={(e) => setClubFilter(e.target.value)}
              />
            </div>

            <div className="sm:col-span-12 md:col-span-2 flex items-end">
              {isFiltered && (
                <Button
                  type="button"
                  variant="tertiary"
                  onClick={handleResetFilters}
                  leftIcon={<RotateCcw size={14} />}
                  className="w-full text-caption"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {loading && !events && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton variant="card" count={6} />
            </div>
          )}

          {error && (
            <Banner variant="error" title="Couldn't load events">
              {error}
            </Banner>
          )}

          {!loading && !error && events && events.length === 0 && (
            <div className="p-8 text-center bg-surface rounded-lg border border-border flex flex-col items-center gap-3">
              <p className="text-body text-text-muted">
                {isFiltered
                  ? "No events found matching your search and filter criteria."
                  : "No upcoming campus events scheduled right now."}
              </p>
              {isFiltered && (
                <Button
                  variant="secondary"
                  onClick={handleResetFilters}
                  className="text-label"
                >
                  Show all events
                </Button>
              )}
            </div>
          )}

          {!loading && !error && events && events.length > 0 && (
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
      )}

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <Section
          id="events-calendar"
          title="Week Calendar"
          description="Plan your week across campus activities and room sessions"
        >
          <CalendarView onRegisterClick={setRegisteringEvent} />
        </Section>
      )}

      {/* Quick Event Registration Dialog */}
      {registeringEvent && (
        <RegisterModal
          eventId={registeringEvent.event_id}
          eventName={registeringEvent.name}
          onClose={() => setRegisteringEvent(null)}
          onSuccess={() => {
            if (viewMode === "grid") fetchGridEvents();
          }}
        />
      )}
    </Container>
  );
}
