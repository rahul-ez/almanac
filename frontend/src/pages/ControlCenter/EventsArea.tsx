// frontend/src/pages/ControlCenter/EventsArea.tsx
// Council Control Center - Events area per v2-ui-spec.md §14.
// Create Event flow + Manage Events with status indicators, cancellation,
// and Registered Students Attendee Roster modal/table.

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
  getEventAttendees,
  type CreateEventResponse,
  type EventSummary,
  type EventAttendee,
} from "../../api/client";
import { formatDate, formatTime, deriveEventStatus } from "../../lib/formatTime";
import type { SemanticState } from "../../styles/tokens";
import {
  PlusCircle,
  Calendar,
  MapPin,
  Users,
  Ban,
  AlertTriangle,
  X,
  Search,
  Mail,
  GraduationCap,
  Clock,
  UserCheck,
} from "lucide-react";

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

  // Registered Students Attendee Modal State
  const [selectedEventForAttendees, setSelectedEventForAttendees] = useState<EventSummary | null>(null);
  const [attendees, setAttendees] = useState<EventAttendee[] | null>(null);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [attendeesError, setAttendeesError] = useState<string | null>(null);
  const [attendeeSearch, setAttendeeSearch] = useState("");

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

  async function openAttendeesModal(evt: EventSummary) {
    setSelectedEventForAttendees(evt);
    setLoadingAttendees(true);
    setAttendeesError(null);
    setAttendeeSearch("");
    try {
      const res = await getEventAttendees(evt.event_id);
      if (res.error) {
        setAttendeesError(res.error);
      } else {
        setAttendees(res.attendees);
      }
    } catch {
      setAttendeesError("Could not load registered students list.");
    } finally {
      setLoadingAttendees(false);
    }
  }

  function closeAttendeesModal() {
    setSelectedEventForAttendees(null);
    setAttendees(null);
    setAttendeesError(null);
  }

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
      if (onEventCreated && res.event_id) {
        onEventCreated(res.event_id);
      }
    } catch {
      setCreateError("Failed to schedule event. Please check your inputs.");
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
        setCancelMessage({
          id: eventId,
          success: false,
          text: `Cancellation failed: ${res.error}`,
        });
      } else {
        setCancelMessage({
          id: eventId,
          success: true,
          text: `Event ${eventId} has been cancelled and its room booking released.`,
        });
        setEvents((prev) =>
          prev
            ? prev.map((e) => (e.event_id === eventId ? { ...e, status: "cancelled", room: null } : e))
            : null
        );
      }
    } catch {
      setCancelMessage({
        id: eventId,
        success: false,
        text: "Could not cancel event. Please try again.",
      });
    } finally {
      setCancellingId(null);
      setConfirmingCancelId(null);
    }
  }

  // Filter attendees by search query
  const filteredAttendees = (attendees || []).filter((att) => {
    if (!attendeeSearch.trim()) return true;
    const q = attendeeSearch.toLowerCase();
    return (
      att.registrant_name.toLowerCase().includes(q) ||
      att.registrant_email.toLowerCase().includes(q) ||
      (att.major && att.major.toLowerCase().includes(q)) ||
      (att.student_id && att.student_id.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col gap-8">
      {/* 1. Schedule Event Section */}
      <Section
        id="schedule-event"
        title="Schedule Campus Event"
        description="Create a new official event for an active campus organization"
      >
        <form
          onSubmit={handleCreateSubmit}
          className="bg-surface rounded-lg border border-border p-6 sm:p-8 flex flex-col gap-5 max-w-2xl shadow-raised"
        >
          <FormField
            id="event-name"
            label="Event Name"
            variant="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Annual Tech Symposium"
            required
            helperText="A clear, public title for the event"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              id="event-club"
              label="Hosting Club / Society"
              variant="select"
              value={club}
              onChange={(e) => setClub(e.target.value)}
              options={STANDARD_CLUBS}
              required
            />

            <FormField
              id="event-topic"
              label="Topic (Optional)"
              variant="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. AI, Career, Sports"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              id="event-date"
              label="Date"
              variant="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />

            <FormField
              id="event-time"
              label="Start Time"
              variant="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>

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
        description="Click on any event to view registered students and roster details"
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
                  {/* Event summary info — Clickable to open attendee table */}
                  <div
                    onClick={() => openAttendeesModal(evt)}
                    className="flex flex-col gap-1.5 max-w-xl cursor-pointer group"
                    title="Click to view registered students"
                  >
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

                    <h4 className="font-display text-h3 font-medium text-text group-hover:text-primary transition-colors flex items-center gap-2">
                      <span className={isCancelled ? "line-through text-text-muted" : ""}>
                        {evt.name}
                      </span>
                      <span className="text-caption font-sans font-normal text-text-muted group-hover:text-primary transition-colors">
                        (view roster →)
                      </span>
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
                      <span className="flex items-center gap-1 font-medium text-primary">
                        <Users size={13} aria-hidden="true" />
                        {evt.attendance_count} registered
                      </span>
                    </div>
                  </div>

                  {/* Actions column */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="secondary"
                      onClick={() => openAttendeesModal(evt)}
                      leftIcon={<Users size={14} />}
                      className="text-caption font-semibold hover:border-primary-mid"
                    >
                      Attendees ({evt.attendance_count})
                    </Button>

                    <Link
                      to={`/events/${evt.event_id}`}
                      className="inline-flex items-center justify-center px-3 py-1.5 rounded border border-border bg-surface text-caption font-semibold text-text hover:border-primary-mid transition-colors"
                    >
                      Student Page
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
                            Cancel
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

      {/* 3. Registered Students Attendee Roster Modal */}
      {selectedEventForAttendees && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={closeAttendeesModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="attendees-modal-title"
        >
          <div
            className="w-full max-w-3xl bg-surface border border-border rounded-lg shadow-raised overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-start justify-between gap-4 bg-surface-sunken">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-caption font-semibold text-primary px-2 py-0.5 rounded bg-primary-subtle border border-primary-mid/30">
                    <UserCheck size={12} />
                    Registration Roster
                  </span>
                  <span className="text-caption font-mono text-text-muted">
                    {selectedEventForAttendees.event_id}
                  </span>
                </div>
                <h3
                  id="attendees-modal-title"
                  className="font-display text-h2 font-semibold text-text"
                >
                  {selectedEventForAttendees.name}
                </h3>
                <p className="text-caption text-text-muted flex items-center gap-2">
                  <span>{selectedEventForAttendees.club}</span>
                  <span>·</span>
                  <span>{formatDate(selectedEventForAttendees.start_ts)} at {formatTime(selectedEventForAttendees.start_ts)}</span>
                  <span>·</span>
                  <strong className="text-text">
                    {attendees ? attendees.length : selectedEventForAttendees.attendance_count} Registered Students
                  </strong>
                </p>
              </div>

              <button
                type="button"
                onClick={closeAttendeesModal}
                className="p-1.5 text-text-muted hover:text-text rounded-md hover:bg-surface border border-transparent hover:border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Filter Bar */}
            <div className="p-4 border-b border-border bg-surface flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                />
                <input
                  type="text"
                  value={attendeeSearch}
                  onChange={(e) => setAttendeeSearch(e.target.value)}
                  placeholder="Filter registered students by name, email, or major…"
                  className="w-full pl-9 pr-3 py-1.5 text-body text-text bg-surface-sunken border border-border rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-sm"
                />
              </div>
              {attendeeSearch && (
                <button
                  type="button"
                  onClick={() => setAttendeeSearch("")}
                  className="text-caption text-text-muted hover:text-text underline"
                >
                  Clear filter
                </button>
              )}
            </div>

            {/* Modal Body / Table Content */}
            <div className="p-5 overflow-y-auto flex-1">
              {loadingAttendees && <Skeleton variant="row" count={5} />}

              {attendeesError && (
                <Banner variant="error" title="Could not load attendees">
                  {attendeesError}
                </Banner>
              )}

              {!loadingAttendees && !attendeesError && attendees && attendees.length === 0 && (
                <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-text-muted">
                  <Users size={32} className="text-text-muted/60" />
                  <p className="text-body font-medium text-text">No registrations recorded yet</p>
                  <p className="text-caption">
                    When students register via Almanac or the registration form, their details will appear here live.
                  </p>
                </div>
              )}

              {!loadingAttendees && !attendeesError && attendees && attendees.length > 0 && (
                <>
                  {filteredAttendees.length === 0 ? (
                    <div className="p-6 text-center text-text-muted">
                      <p className="text-body">No registered students match "{attendeeSearch}".</p>
                    </div>
                  ) : (
                    <div className="border border-border rounded-lg overflow-hidden">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="bg-surface-sunken border-b border-border text-caption font-semibold text-text-muted uppercase tracking-wider">
                            <th className="py-2.5 px-4">Student Name</th>
                            <th className="py-2.5 px-4">Email Address</th>
                            <th className="py-2.5 px-4">Major / Year</th>
                            <th className="py-2.5 px-4">Registered At</th>
                            <th className="py-2.5 px-4 text-right">Attendance ID</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-surface">
                          {filteredAttendees.map((att) => (
                            <tr
                              key={att.attendance_id}
                              className="hover:bg-surface-sunken transition-colors"
                            >
                              {/* Student Name */}
                              <td className="py-3 px-4 font-medium text-text">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-primary-subtle text-primary border border-primary-mid/40 flex items-center justify-center text-xs font-semibold uppercase flex-shrink-0">
                                    {att.registrant_name ? att.registrant_name.charAt(0) : "S"}
                                  </div>
                                  <span className="truncate max-w-[160px] sm:max-w-none">
                                    {att.registrant_name || "Unknown"}
                                  </span>
                                </div>
                              </td>

                              {/* Email Address with mailto */}
                              <td className="py-3 px-4 text-text-muted">
                                <a
                                  href={`mailto:${att.registrant_email}`}
                                  className="inline-flex items-center gap-1 text-primary hover:underline"
                                  title={`Send email to ${att.registrant_email}`}
                                >
                                  <Mail size={13} aria-hidden="true" />
                                  <span className="truncate max-w-[180px] sm:max-w-none">
                                    {att.registrant_email}
                                  </span>
                                </a>
                              </td>

                              {/* Major / Academic Year */}
                              <td className="py-3 px-4 text-text-muted">
                                {att.major ? (
                                  <span className="inline-flex items-center gap-1 text-caption text-text px-2 py-0.5 rounded bg-surface-sunken border border-border">
                                    <GraduationCap size={12} className="text-primary" />
                                    {att.major} {att.year ? `· Year ${att.year}` : ""}
                                  </span>
                                ) : (
                                  <span className="text-caption text-text-muted italic">
                                    Not linked
                                  </span>
                                )}
                              </td>

                              {/* Registered Timestamp */}
                              <td className="py-3 px-4 text-caption text-text-muted whitespace-nowrap">
                                <span className="inline-flex items-center gap-1">
                                  <Clock size={12} />
                                  {formatDate(att.registered_at)} {formatTime(att.registered_at)}
                                </span>
                              </td>

                              {/* Attendance ID */}
                              <td className="py-3 px-4 text-right text-caption font-mono text-text-muted">
                                {att.attendance_id}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-surface-sunken flex items-center justify-between text-caption text-text-muted">
              <span>
                Showing {filteredAttendees.length} of {attendees ? attendees.length : 0} student registrations
              </span>
              <Button variant="secondary" onClick={closeAttendeesModal}>
                Close Roster
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
