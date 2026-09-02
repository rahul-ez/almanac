// frontend/src/pages/AdminPanel.tsx
// Admin Panel: RoleGate → PageHeader → Section (create event) + Section (book room).
// Per architecture.md: UI role gate is cosmetic only. Server enforces on every write.
// Per ui-rules.md: write actions only reachable after /api/session with council role.

import { useState } from "react";
import { Container } from "../components/layout/Container";
import { PageHeader } from "../components/layout/PageHeader";
import { Section } from "../components/layout/Section";
import { FormField } from "../components/primitives/FormField";
import { Button } from "../components/primitives/Button";
import { Banner } from "../components/data/Banner";
import { RoleBadge } from "../components/campus/RoleBadge";
import { RoomAvailabilityTable } from "../components/campus/RoomAvailabilityTable";
import { BookingSummary } from "../components/campus/BookingSummary";
import { useSession } from "../hooks/useSession";
import { createEvent, createBooking, getRoomAvailability } from "../api/client";
import type { CreateEventResponse, BookingResponse, FreeRoom } from "../api/client";
import { ShieldOff } from "lucide-react";

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
function CreateEventForm() {
  const [name, setName] = useState("");
  const [club, setClub] = useState("");
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
      const res = await createEvent({ name, club, start_ts: isoStart, topic });
      setResult(res);
    } catch (err: unknown) {
      const e = err as { status?: number };
      if (e?.status === 403) setError("Council access required. Please re-enter the access code.");
      else setError("Couldn't create the event. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-lg">
      <FormField id="ev-name" label="Event name" variant="text" required value={name} onChange={(e) => setName(e.target.value)} />
      <FormField id="ev-club" label="Club / Society" variant="text" required value={club} onChange={(e) => setClub(e.target.value)} />
      <div className="grid grid-cols-2 gap-4">
        <FormField id="ev-date" label="Date" variant="date" required value={startTs} onChange={(e) => setStartTs(e.target.value)} />
        <FormField id="ev-time" label="Time" variant="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} />
      </div>
      <FormField id="ev-topic" label="Topic (optional)" variant="text" value={topic} onChange={(e) => setTopic(e.target.value)} />
      <Button type="submit" variant="primary" loading={loading} loadingLabel="Creating event…" disabled={!name || !club || !startTs || !startTime}>
        Create event
      </Button>
      {result && !result.error && (
        <Banner variant="success" title={`Event "${result.name}" created`}>
          Event ID: {result.event_id}
        </Banner>
      )}
      {error && <Banner variant="error" title="Could not create event">{error}</Banner>}
    </form>
  );
}

// ── Book Room Form ─────────────────────────────────────────────────────────────
function BookRoomForm() {
  const [eventId, setEventId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BookingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [freeRooms, setFreeRooms] = useState<FreeRoom[] | null>(null);
  const [checkingRooms, setCheckingRooms] = useState(false);

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
      const res = await createBooking({ room_id: roomId, event_id: eventId, start_ts: isoStart, end_ts: isoEnd });
      setResult(res);
    } catch (err: unknown) {
      const e = err as { status?: number; body?: { error?: string } };
      if (e?.status === 403) setError("Council access required. Please re-enter the access code.");
      else if (e?.status === 409) setResult(e?.body as BookingResponse);
      else setError("Couldn't create the booking. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-lg">
      <FormField id="bk-event" label="Event ID" variant="text" required value={eventId} onChange={(e) => setEventId(e.target.value)} helperText="Get this from the Create Event confirmation above." />
      <FormField id="bk-room" label="Room ID" variant="text" required value={roomId} onChange={(e) => setRoomId(e.target.value)} />
      <div className="grid grid-cols-2 gap-4">
        <FormField id="bk-date" label="Date" variant="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        <div className="flex flex-col gap-1">
          <FormField id="bk-start" label="Start time" variant="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
      </div>
      <FormField id="bk-end" label="End time" variant="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} />
      <Button type="button" variant="secondary" onClick={checkAvailability} loading={checkingRooms} loadingLabel="Checking…" disabled={!date || !startTime}>
        Check room availability
      </Button>
      {freeRooms !== null && (
        <RoomAvailabilityTable variant="snapshot" freeRooms={freeRooms} labelledById="book-room" />
      )}
      <Button type="submit" variant="primary" loading={loading} loadingLabel="Booking…" disabled={!eventId || !roomId || !date || !startTime || !endTime}>
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
        <CreateEventForm />
      </Section>

      <Section id="book-room" title="Book a Room" description="Reserve a room for your event">
        <BookRoomForm />
      </Section>
    </Container>
  );
}
