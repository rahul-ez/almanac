// frontend/src/pages/ControlCenter/EventsArea.tsx
// Council Control Center - Events area per v2-ui-spec.md §14.
// Create Event flow + Manage Events with status indicators and cancellation.

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Section } from "../../components/layout/Section";
import { FormField } from "../../components/primitives/FormField";
import { Button } from "../../components/primitives/Button";
import { Banner } from "../../components/data/Banner";
import { StatusIndicator } from "../../components/data/StatusIndicator";
import { Skeleton } from "../../components/loading/Skeleton";
import {
  createEvent,
  listEvents,
  cancelEvent,
  type CreateEventResponse,
  type EventSummary,
} from "../../api/client";
import { formatDate, formatTime, deriveEventStatus } from "../../lib/formatTime";
import type { SemanticState } from "../../styles/tokens";
import { PlusCircle, Calendar, MapPin, Users, Ban, AlertTriangle } from "lucide-react";

const STANDARD_CLUBS = [
  { value: "AI Club", label: "AI Club" },
  { value: "Robotics Club", label: "Robotics Club" },
  { value: "Photography Club", label: "Photography Club" },
  { value: "Debate Society", label: "Debate Society" },
  { value: "Campus Sports Club", label: "Campus Sports Club" },
  { value: "Coding Club", label: "Coding Club" },
  { value: "Design Club", label: "Design Club" },
];

interface EventsAreaProps {
  onEventCreated?: (eventId: string) => void;
}

export function EventsArea({ onEventCreated }: EventsAreaProps) {
  // Create Event Form State
  const [name, setName] = useState("");
  const [club, setClub] = useState("AI Club");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [topic, setTopic] = useState("");
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState<CreateEventResponse | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // Manage Events State
  const [events, setEvents] = useState<EventSummary[] | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  // Two-step cancellation state
  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelMessage, setCancelMessage] = useState<{ id: string; success: boolean; text: string } | null>(null);

  async function loadEvents() {
    setLoadingEvents(true);
    setEventsError(null);
    try {
      const res = await listEvents(false); // all events
      if (res.error) {
        setEventsError(res.error);
      } else {
        setEvents(res.events);
      }
    } catch {
      setEventsError("Couldn't load events list.");
    } finally {
      setLoadingEvents(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    setCreateResult(null);

    try {
      const isoStart = `${date}T${time}:00`;
      const res = await createEvent({
        name: name.trim(),
        club,
        start_ts: isoStart,
        topic: topic.trim() || undefined,
      });

      setCreateResult(res);
      setName("");
      setDate("");
      setTime("");
      setTopic("");
      loadEvents();
      if (onEventCreated) onEventCreated(res.event_id);
    } catch (err: unknown) {
      const e = err as { status?: number; body?: { error?: string } };
      if (e?.status === 403) {
        setCreateError("Council access authorization required. Re-enter your access code.");
      } else if (e?.body?.error) {
        setCreateError(`Could not create event: ${e.body.error}`);
      } else {
        setCreateError("Couldn't create the event. Please check details and try again.");
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleConfirmCancel(eventId: string) {
    setCancellingId(eventId);
    setCancelMessage(null);
    try {
      const res = await cancelEvent(eventId);
      if (res.error) {
        setCancelMessage({ id: eventId, success: false, text: res.error });
      } else {
        setCancelMessage({
          id: eventId,
          success: true,
          text: `Event ${eventId} has been successfully cancelled.`,
        });
        loadEvents();
      }
    } catch {
      setCancelMessage({
        id: eventId,
        success: false,
        text: "Failed to cancel event. Please try again.",
      });
    } finally {
      setCancellingId(null);
      setConfirmingCancelId(null);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      {/* 1. Schedule Event Section */}
      <Section
        id="schedule-event"
        title="Schedule New Event"
        description="Create a governed campus event for student discovery and registration"
      >
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-5 max-w-xl bg-surface p-6 rounded-lg border border-border shadow-raised">
          <FormField
            id="ev-name"
            label="Event title"
            variant="text"
            required
            value={name}
            placeholder="e.g. Applied Machine Learning Bootcamp"
            onChange={(e) => setName(e.target.value)}
          />

          <FormField
            id="ev-club"
            label="Host Club / Society"
            variant="select"
            required
            value={club}
            options={STANDARD_CLUBS}
            onChange={(e) => setClub(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              id="ev-date"
              label="Date"
              variant="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <FormField
              id="ev-time"
              label="Start time"
              variant="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          <FormField
            id="ev-topic"
            label="Topic / Tags (optional)"
            variant="text"
            value={topic}
            placeholder="e.g. AI, Workshop, Career"
            onChange={(e) => setTopic(e.target.value)}
          />

          <div className="pt-2 flex items-center justify-between gap-4">
            <Button
              type="submit"
              variant="primary"
              loading={creating}
              loadingLabel="Scheduling event…"
              disabled={!name || !club || !date || !time}
              leftIcon={<PlusCircle size={16} />}
              className="text-label font-semibold"
            >
              Schedule Event
            </Button>
          </div>

          {createResult && !createResult.error && (
            <Banner variant="success" title={`Event "${createResult.name}" Scheduled`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span>Created with Event ID: <strong>{createResult.event_id}</strong></span>
                <Link
                  to={`/events/${createResult.event_id}`}
                  className="text-primary hover:text-primary-hover font-semibold underline text-caption"
                >
                  View student page →
                </Link>
              </div>
            </Banner>
          )}

          {createError && (
            <Banner variant="error" title="Could not create event">
              {createError}
            </Banner>
          )}
        </form>
      </Section>

      {/* 2. Manage Events Section */}
      <Section
        id="manage-events"
        title="Manage Campus Events"
        description="Monitor status, attendance records, and governance operations"
      >
        {cancelMessage && (
          <div className="mb-4">
            <Banner
              variant={cancelMessage.success ? "success" : "error"}
              title={cancelMessage.success ? "Event Cancelled" : "Cancellation Error"}
            >
              {cancelMessage.text}
            </Banner>
          </div>
        )}

        {loadingEvents && !events && <Skeleton variant="row" count={5} />}

        {eventsError && (
          <Banner variant="error" title="Could not load events">
            {eventsError}
          </Banner>
        )}

        {!loadingEvents && !eventsError && events && events.length === 0 && (
          <div className="p-8 text-center bg-surface rounded-lg border border-border">
            <p className="text-body text-text-muted">No events currently scheduled.</p>
          </div>
        )}

        {!loadingEvents && !eventsError && events && events.length > 0 && (
          <div className="bg-surface rounded-lg border border-border overflow-hidden shadow-raised divide-y divide-divider">
            {events.map((evt) => {
              const derived = deriveEventStatus(evt.start_ts);
              const currentStatus: SemanticState =
                evt.status === "cancelled"
                  ? "cancelled"
                  : evt.status === "ongoing" || evt.status === "completed" || evt.status === "upcoming"
                  ? evt.status
                  : derived;

              const isCancelled = currentStatus === "cancelled";
              const isConfirming = confirmingCancelId === evt.event_id;
              const isCancelling = cancellingId === evt.event_id;

              return (
                <div
                  key={evt.event_id}
                  className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                    isCancelled ? "bg-surface-sunken opacity-75" : "hover:bg-surface-sunken"
                  }`}
                >
                  {/* Event summary info */}
                  <div className="flex flex-col gap-1.5 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusIndicator state={currentStatus} />
                      <span className="text-caption font-semibold text-text-muted uppercase tracking-wider">
                        {evt.club}
                      </span>
                      <span className="text-divider">·</span>
                      <span className="text-caption font-mono text-text-muted">
                        {evt.event_id}
                      </span>
                    </div>

                    <h4 className="font-display text-h3 font-medium text-text">
                      <Link
                        to={`/events/${evt.event_id}`}
                        className={`hover:text-primary transition-colors ${
                          isCancelled ? "line-through text-text-muted" : ""
                        }`}
                      >
                        {evt.name}
                      </Link>
                    </h4>

                    <div className="flex items-center gap-4 text-caption text-text-muted flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} aria-hidden="true" />
                        {formatDate(evt.start_ts)} at {formatTime(evt.start_ts)}
                      </span>
                      {evt.room && (
                        <span className="flex items-center gap-1">
                          <MapPin size={13} aria-hidden="true" />
                          {evt.room}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users size={13} aria-hidden="true" />
                        {evt.attendance_count} registered
                      </span>
                    </div>
                  </div>

                  {/* Actions column */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      to={`/events/${evt.event_id}`}
                      className="inline-flex items-center justify-center px-3 py-1.5 rounded border border-border bg-surface text-caption font-semibold text-text hover:border-primary-mid transition-colors"
                    >
                      View Details
                    </Link>

                    {!isCancelled && (
                      <>
                        {isConfirming ? (
                          <div className="flex items-center gap-1.5 bg-error-subtle p-1 rounded border border-error">
                            <span className="text-caption text-error font-medium px-1 flex items-center gap-1">
                              <AlertTriangle size={12} />
                              Cancel?
                            </span>
                            <button
                              type="button"
                              disabled={isCancelling}
                              onClick={() => handleConfirmCancel(evt.event_id)}
                              className="px-2 py-1 bg-error text-white hover:bg-error-hover text-caption font-semibold rounded transition-colors"
                            >
                              {isCancelling ? "Cancelling…" : "Yes, cancel"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingCancelId(null)}
                              className="px-2 py-1 bg-surface text-text hover:bg-surface-sunken text-caption font-semibold rounded border border-border"
                            >
                              Keep
                            </button>
                          </div>
                        ) : (
                          <Button
                            variant="secondary"
                            onClick={() => setConfirmingCancelId(evt.event_id)}
                            leftIcon={<Ban size={13} />}
                            className="text-caption text-error hover:bg-error-subtle"
                          >
                            Cancel Event
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
