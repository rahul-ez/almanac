// frontend/src/pages/AdminPanel.tsx
// Admin Panel: RoleGate → PageHeader → Section (create event) + Section (book room).
// Per architecture.md: UI role gate is cosmetic only. Server enforces on every write.
// Per ui-rules.md: write actions only reachable after /api/session with council role.

import { useEffect, useState } from "react";
import { Container } from "../components/layout/Container";
import { PageHeader } from "../components/layout/PageHeader";
import { Section } from "../components/layout/Section";
import { FormField } from "../components/primitives/FormField";
import { Button } from "../components/primitives/Button";
import { Banner } from "../components/data/Banner";
import { RoleBadge } from "../components/campus/RoleBadge";
import { BookingSummary } from "../components/campus/BookingSummary";
import { useSession } from "../hooks/useSession";
import { createEvent, createBooking, getRoomAvailability, listEvents } from "../api/client";
import type { CreateEventResponse, BookingResponse, FreeRoom, EventSummary } from "../api/client";
import { ShieldOff } from "lucide-react";

// Standard Campus Rooms
const STANDARD_ROOMS = [
  { value: "room_005", label: "Lab 204 (Lab)" },
  { value: "room_004", label: "Robotics Lab (Lab)" },
  { value: "room_009", label: "Lab 305 (Lab)" },
  { value: "room_006", label: "Auditorium (Auditorium)" },
  { value: "room_001", label: "Classroom 101 (Classroom)" },
  { value: "room_002", label: "Classroom 102 (Classroom)" },
  { value: "room_003", label: "Classroom 103 (Classroom)" },
  { value: "room_007", label: "Study Room A (Study room)" },
  { value: "room_008", label: "Study Room B (Study room)" },
];

const STANDARD_CLUBS = [
  { value: "AI Club", label: "AI Club" },
  { value: "Robotics Society", label: "Robotics Society" },
  { value: "Coding Club", label: "Coding Club" },
  { value: "Design Club", label: "Design Club" },
  { value: "Debate Society", label: "Debate Society" },
  { value: "Music Club", label: "Music Club" },
];

// ── RoleGate ──────────────────────────────────────────────────────────────────
// Shown when role is "student". Presents an access prompt.
function RoleGate() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <ShieldOff size={40} className="text-text-muted" aria-hidden="true" />
      <div>
        <p className="text-h2 font-semibold text-text">Council access required</p>
        <p className="mt-1 text-body text-text-muted max-w-sm">
          Use the "Council access" link in the navigation to enter the access code.
        </p>
      </div>
    </div>
  );
}

// ── Create Event Form ──────────────────────────────────────────────────────────
interface CreateEventFormProps {
  onEventCreated?: (event: CreateEventResponse) => void;
}

function CreateEventForm({ onEventCreated }: CreateEventFormProps) {
  const [name, setName] = useState("");
  const [club, setClub] = useState("AI Club");
  const [startTs, setStartTs] = useState("");
  const [startTime, setStartTime] = useState("");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CreateEventResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const isoStart = `${startTs}T${startTime}:00`;
      const res = await createEvent({ name, club, start_ts: isoStart, topic: topic || undefined });
      setResult(res);
      if (onEventCreated) onEventCreated(res);
    } catch (err: unknown) {
      const e = err as { status?: number; body?: { error?: string } };
      if (e?.status === 403) setError("Council access required. Please re-enter the access code.");
      else if (e?.body?.error) setError(`Could not create event: ${e.body.error}`);
      else setError("Couldn't create the event. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-lg">
      <FormField
        id="ev-name"
        label="Event name"
        variant="text"
        required
        value={name}
        placeholder="e.g. GenAI Hackathon"
        onChange={(e) => setName(e.target.value)}
      />
      <FormField
        id="ev-club"
        label="Club / Society"
        variant="select"
        required
        value={club}
        options={STANDARD_CLUBS}
        onChange={(e) => setClub(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          id="ev-date"
          label="Date"
          variant="date"
          required
          value={startTs}
          onChange={(e) => setStartTs(e.target.value)}
        />
        <FormField
          id="ev-time"
          label="Time"
          variant="time"
          required
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
      </div>
      <FormField
        id="ev-topic"
        label="Topic (optional)"
        variant="text"
        value={topic}
        placeholder="e.g. AI, Robotics, Career"
        onChange={(e) => setTopic(e.target.value)}
      />
      <Button
        type="submit"
        variant="primary"
        loading={loading}
        loadingLabel="Creating event…"
        disabled={!name || !club || !startTs || !startTime}
      >
        Create event
      </Button>
      {result && !result.error && (
        <Banner variant="success" title={`Event "${result.name}" created`}>
          Event ID: <strong>{result.event_id}</strong> (Auto-selected in Book a Room below)
        </Banner>
      )}
      {error && <Banner variant="error" title="Could not create event">{error}</Banner>}
    </form>
  );
}

// ── Book Room Form ─────────────────────────────────────────────────────────────
interface BookRoomFormProps {
  selectedEventId?: string;
}

function BookRoomForm({ selectedEventId }: BookRoomFormProps) {
  const [eventsList, setEventsList] = useState<EventSummary[]>([]);
  const [eventId, setEventId] = useState(selectedEventId || "");
  const [roomId, setRoomId] = useState("room_005");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BookingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [freeRooms, setFreeRooms] = useState<FreeRoom[] | null>(null);
  const [checkingRooms, setCheckingRooms] = useState(false);

  // Sync selected event from Create Event above
  useEffect(() => {
    if (selectedEventId) setEventId(selectedEventId);
  }, [selectedEventId]);

  // Load events for selection
  useEffect(() => {
    listEvents(false)
      .then((res) => {
        if (res.events && res.events.length > 0) {
          setEventsList(res.events);
          if (!eventId) setEventId(res.events[0].event_id);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkAvailability() {
    if (!date || !startTime) return;
    setCheckingRooms(true);
    try {
      const at = `${date}T${startTime}:00`;
      const res = await getRoomAvailability(at);
      setFreeRooms(res.free_rooms);
    } catch {
      setFreeRooms([]);
    } finally {
      setCheckingRooms(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const isoStart = `${date}T${startTime}:00`;
      const isoEnd = `${date}T${endTime}:00`;
      const res = await createBooking({
        room_id: roomId,
        event_id: eventId,
        start_ts: isoStart,
        end_ts: isoEnd,
      });
      setResult(res);
    } catch (err: unknown) {
      const e = err as { status?: number; body?: { error?: string; conflicting_booking?: unknown } };
      if (e?.status === 403) {
        setError("Council access required. Please re-enter the access code.");
      } else if (e?.status === 409) {
        setResult(e?.body as BookingResponse);
      } else if (e?.body?.error) {
        setError(`Booking failed: ${e.body.error}`);
      } else {
        setError("Couldn't create the booking. Please check that event and room exist and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  const eventOptions = eventsList.map((ev) => ({
    value: ev.event_id,
    label: `${ev.name} (${ev.event_id})`,
  }));

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-lg">
      {eventOptions.length > 0 ? (
        <FormField
          id="bk-event-select"
          label="Select Event"
          variant="select"
          required
          value={eventId}
          options={eventOptions}
          onChange={(e) => setEventId(e.target.value)}
          helperText="Choose an event to assign the room booking to."
        />
      ) : (
        <FormField
          id="bk-event"
          label="Event ID"
          variant="text"
          required
          value={eventId}
          placeholder="e.g. evt_001"
          onChange={(e) => setEventId(e.target.value)}
          helperText="Enter canonical event ID (e.g. evt_001) or Event Name."
        />
      )}

      <FormField
        id="bk-room-select"
        label="Room"
        variant="select"
        required
        value={roomId}
        options={STANDARD_ROOMS}
        onChange={(e) => setRoomId(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          id="bk-date"
          label="Date"
          variant="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <div className="flex flex-col gap-1">
          <FormField
            id="bk-start"
            label="Start time"
            variant="time"
            required
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
      </div>
      <FormField
        id="bk-end"
        label="End time"
        variant="time"
        required
        value={endTime}
        onChange={(e) => setEndTime(e.target.value)}
      />
      <Button
        type="button"
        variant="secondary"
        onClick={checkAvailability}
        loading={checkingRooms}
        loadingLabel="Checking…"
        disabled={!date || !startTime}
      >
        Check room availability
      </Button>
      {freeRooms !== null && (
        <div className="flex flex-col gap-2">
          <p className="text-label text-text-muted">Free rooms at {startTime || "selected time"}:</p>
          <div className="flex flex-wrap gap-2">
            {freeRooms.map((r) => (
              <button
                key={r.room_id}
                type="button"
                onClick={() => setRoomId(r.room_id)}
                className={`px-3 py-1 text-caption rounded border transition-colors ${
                  roomId === r.room_id
                    ? "bg-primary text-white border-primary"
                    : "bg-surface text-text border-border hover:border-primary"
                }`}
              >
                {r.name} ({r.type})
              </button>
            ))}
          </div>
        </div>
      )}
      <Button
        type="submit"
        variant="primary"
        loading={loading}
        loadingLabel="Booking…"
        disabled={!eventId || !roomId || !date || !startTime || !endTime}
      >
        Book room
      </Button>
      {result && <BookingSummary response={result} />}
      {error && <Banner variant="error" title="Could not book room">{error}</Banner>}
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function AdminPanel() {
  const { role } = useSession();
  const [createdEventId, setCreatedEventId] = useState<string | undefined>();

  if (role !== "council") {
    return (
      <Container className="py-8">
        <RoleGate />
      </Container>
    );
  }

  return (
    <Container className="py-8 flex flex-col gap-8">
      <PageHeader
        title="Council Panel"
        description="Create events and book rooms for your club or society."
        actionSlot={<RoleBadge />}
      />

      <Section id="create-event" title="Create Event" description="Schedule a new campus event">
        <CreateEventForm onEventCreated={(ev) => setCreatedEventId(ev.event_id)} />
      </Section>

      <Section id="book-room" title="Book a Room" description="Reserve a room for your event">
        <BookRoomForm selectedEventId={createdEventId} />
      </Section>
    </Container>
  );
}
