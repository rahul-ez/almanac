// frontend/src/pages/EventDetail.tsx
// Event detail page per v2-ui-spec.md §8.
// Route: /events/:event_id
// Backed by GET /api/events/{event_id}.

import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Container } from "../components/layout/Container";
import { DefinitionList } from "../components/data/DefinitionList";
import { StatusIndicator } from "../components/data/StatusIndicator";
import { AttendanceDatum } from "../components/campus/AttendanceDatum";
import { LiveUpdateHighlight } from "../components/campus/LiveUpdateHighlight";
import { Button } from "../components/primitives/Button";
import { Banner } from "../components/data/Banner";
import { Skeleton } from "../components/loading/Skeleton";
import { RegisterModal } from "../components/dialogs/RegisterModal";
import { getEvent, type EventDetailResponse } from "../api/client";
import { formatDate, formatTime, deriveEventStatus } from "../lib/formatTime";
import type { SemanticState } from "../styles/tokens";
import { ArrowLeft, Ticket, Calendar, MapPin, Users, Tag } from "lucide-react";

export function EventDetail() {
  const { event_id } = useParams<{ event_id: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  async function fetchEventDetails() {
    if (!event_id) return;
    setLoading(true);
    setErrorStatus(null);
    setErrorMessage(null);

    try {
      const data = await getEvent(event_id);
      if (data.error) {
        setErrorMessage(data.error);
        setErrorStatus(502);
      } else {
        setEvent(data);
      }
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 404) {
        setErrorStatus(404);
        setErrorMessage("This event could not be found.");
      } else {
        setErrorStatus(status ?? 502);
        setErrorMessage("Couldn't load event details. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEventDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event_id]);

  if (loading) {
    return (
      <Container className="py-8 flex flex-col gap-6 max-w-4xl">
        <div className="h-6 w-24 bg-surface-sunken rounded animate-pulse" />
        <div className="bg-surface rounded-lg border border-border p-6 flex flex-col gap-6 shadow-raised">
          <div className="h-8 bg-surface-sunken rounded w-2/3 animate-pulse" />
          <div className="h-4 bg-surface-sunken rounded w-1/3 animate-pulse" />
          <Skeleton variant="row" count={4} />
          <div className="h-24 bg-surface-sunken rounded animate-pulse" />
        </div>
      </Container>
    );
  }

  // 404 Not Found State
  if (errorStatus === 404) {
    return (
      <Container className="py-12 flex flex-col items-center justify-center text-center gap-4 max-w-md mx-auto">
        <div className="w-12 h-12 rounded-full bg-surface-sunken flex items-center justify-center text-text-muted border border-border">
          <Calendar size={24} strokeWidth={1.5} />
        </div>
        <h1 className="font-display text-h1 font-semibold text-text">
          Event Not Found
        </h1>
        <p className="text-body text-text-muted">
          This event doesn't exist or may have been removed.
        </p>
        <Link
          to="/events"
          className="inline-flex items-center gap-2 text-label font-semibold text-primary hover:text-primary-hover pt-2"
        >
          <ArrowLeft size={16} />
          <span>Back to All Events</span>
        </Link>
      </Container>
    );
  }

  // 502 / General Error State
  if (errorStatus && errorMessage) {
    return (
      <Container className="py-8 flex flex-col gap-6 max-w-4xl">
        <Banner variant="error" title="Couldn't load event">
          {errorMessage}
        </Banner>
        <div>
          <Button variant="secondary" onClick={fetchEventDetails}>
            Try again
          </Button>
        </div>
      </Container>
    );
  }

  if (!event) return null;

  const derived = deriveEventStatus(event.start_ts);
  const currentStatus: SemanticState =
    event.status === "cancelled"
      ? "cancelled"
      : event.status === "ongoing" || event.status === "completed" || event.status === "upcoming"
      ? event.status
      : derived;

  const isCancelled = currentStatus === "cancelled";
  const isLive = currentStatus === "ongoing";
  const isUpcoming = currentStatus === "upcoming";

  const definitionItems = [
    {
      term: "Club / Organizer",
      definition: event.club,
    },
    {
      term: "Date",
      definition: formatDate(event.start_ts),
    },
    {
      term: "Time",
      definition: `${formatTime(event.start_ts)}${event.end_ts ? ` – ${formatTime(event.end_ts)}` : ""}`,
    },
    {
      term: "Location / Room",
      definition: event.room ? (
        <span className="inline-flex items-center gap-1.5">
          <MapPin size={14} className="text-text-muted" aria-hidden="true" />
          <span>{event.room}</span>
        </span>
      ) : (
        <span className="text-text-muted italic">Room not booked</span>
      ),
    },
    ...(event.topic
      ? [
          {
            term: "Topic",
            definition: (
              <span className="inline-flex items-center gap-1.5">
                <Tag size={14} className="text-text-muted" aria-hidden="true" />
                <span>{event.topic}</span>
              </span>
            ),
          },
        ]
      : []),
  ];

  return (
    <Container className="py-8 flex flex-col gap-6 max-w-4xl">
      {/* Back button */}
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-label text-text-muted hover:text-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded py-1 px-2 -ml-2"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back</span>
        </button>
      </div>

      {/* Cancelled Banner if applicable */}
      {isCancelled && (
        <Banner variant="error" title="Event Cancelled">
          This event has been cancelled by the organizer. Room bookings and registrations have been released.
        </Banner>
      )}

      {/* Main Event Card */}
      <article className="bg-surface rounded-lg border border-border shadow-raised p-6 sm:p-8 flex flex-col gap-6">
        {/* Header: Title + Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-divider">
          <h1 className="font-display text-display font-semibold text-text leading-tight">
            {event.name}
          </h1>
          <div className="flex-shrink-0">
            <StatusIndicator state={currentStatus} />
          </div>
        </div>

        {/* Definition List metadata */}
        <div className="bg-surface-sunken p-4 sm:p-6 rounded-lg border border-border">
          <DefinitionList items={definitionItems} />
        </div>

        {/* Description */}
        {event.description && (
          <div className="flex flex-col gap-2">
            <h2 className="text-label font-semibold text-text uppercase tracking-wider">
              About this event
            </h2>
            <p className="text-body text-text leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>
        )}

        {/* Attendance Datum & Live Pulse */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-surface border border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-subtle border border-primary-mid flex items-center justify-center text-primary flex-shrink-0">
              <Users size={18} strokeWidth={1.5} aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-caption text-text-muted font-medium uppercase tracking-wide">
                Live Attendance
              </span>
              <LiveUpdateHighlight value={event.attendance_count}>
                <AttendanceDatum count={event.attendance_count} isLive={isLive} />
              </LiveUpdateHighlight>
            </div>
          </div>

          {/* Registration CTA */}
          <div className="flex items-center gap-3">
            {isUpcoming && !isCancelled && (
              <Button
                variant="primary"
                onClick={() => setShowRegisterModal(true)}
                leftIcon={<Ticket size={16} />}
                className="text-body font-semibold min-h-control-md px-5"
              >
                Register for Event
              </Button>
            )}

            {isCancelled && (
              <span className="text-caption text-text-muted italic">
                Registration unavailable
              </span>
            )}
          </div>
        </div>
      </article>

      {/* Registration Modal */}
      {showRegisterModal && (
        <RegisterModal
          eventId={event.event_id}
          eventName={event.name}
          onClose={() => setShowRegisterModal(false)}
          onSuccess={() => {
            fetchEventDetails();
          }}
        />
      )}
    </Container>
  );
}
