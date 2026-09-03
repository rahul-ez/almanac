// frontend/src/pages/ControlCenter/RoomsArea.tsx
// Council Control Center - Rooms area per v2-ui-spec.md §15.
// Room availability check + Book a Room governed form with conflict handling.
// Supports URL search params pre-filling (e.g. from Genie -> Book Room).

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Section } from "../../components/layout/Section";
import { FormField } from "../../components/primitives/FormField";
import { Button } from "../../components/primitives/Button";
import { Banner } from "../../components/data/Banner";
import { RoomAvailabilityTable } from "../../components/campus/RoomAvailabilityTable";
import { BookingSummary } from "../../components/campus/BookingSummary";
import { Skeleton } from "../../components/loading/Skeleton";
import {
  getRoomAvailability,
  createBooking,
  listEvents,
  type FreeRoom,
  type BookingResponse,
  type EventSummary,
} from "../../api/client";
import { DoorClosed, Search } from "lucide-react";

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

interface RoomsAreaProps {
  initialEventId?: string;
}

export function RoomsArea({ initialEventId }: RoomsAreaProps) {
  const [searchParams] = useSearchParams();

  // 1. Availability check state
  const [checkDate, setCheckDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [checkTime, setCheckTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });
  const [freeRooms, setFreeRooms] = useState<FreeRoom[] | null>(null);
  const [checkingRooms, setCheckingRooms] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  // 2. Booking form state
  const [eventsList, setEventsList] = useState<EventSummary[]>([]);
  const [eventId, setEventId] = useState(initialEventId || searchParams.get("event_id") || "");
  const [roomId, setRoomId] = useState(() => searchParams.get("room_id") || "room_005");
  const [bookDate, setBookDate] = useState(() => {
    const pDate = searchParams.get("date");
    if (pDate) return pDate;
    const pStart = searchParams.get("start_ts");
    if (pStart) return pStart.slice(0, 10);
    return new Date().toISOString().slice(0, 10);
  });
  const [startTime, setStartTime] = useState(() => {
    const pStart = searchParams.get("start_ts");
    if (pStart && pStart.includes("T")) return pStart.split("T")[1].slice(0, 5);
    return "";
  });
  const [endTime, setEndTime] = useState(() => {
    const pEnd = searchParams.get("end_ts");
    if (pEnd && pEnd.includes("T")) return pEnd.split("T")[1].slice(0, 5);
    return "";
  });

  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingResult, setBookingResult] = useState<BookingResponse | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Load events for dropdown
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

  // Update from initialEventId prop
  useEffect(() => {
    if (initialEventId) setEventId(initialEventId);
  }, [initialEventId]);

  // Initial availability query
  useEffect(() => {
    handleQueryAvailability();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleQueryAvailability() {
    if (!checkDate || !checkTime) return;
    setCheckingRooms(true);
    setCheckError(null);
    try {
      const at = `${checkDate}T${checkTime}:00`;
      const res = await getRoomAvailability(at);
      if (res.error) setCheckError(res.error);
      else setFreeRooms(res.free_rooms);
    } catch {
      setCheckError("Couldn't check room availability.");
    } finally {
      setCheckingRooms(false);
    }
  }

  async function handleBookSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBookingLoading(true);
    setBookingError(null);
    setBookingResult(null);

    try {
      const isoStart = `${bookDate}T${startTime}:00`;
      const isoEnd = `${bookDate}T${endTime}:00`;

      const res = await createBooking({
        room_id: roomId,
        event_id: eventId,
        start_ts: isoStart,
        end_ts: isoEnd,
      });

      setBookingResult(res);
      handleQueryAvailability();
    } catch (err: unknown) {
      const e = err as { status?: number; body?: { error?: string; conflicting_booking?: unknown } };
      if (e?.status === 403) {
        setBookingError("Council access authorization required.");
      } else if (e?.status === 409) {
        // Backend returned conflict
        setBookingResult(e?.body as BookingResponse);
      } else if (e?.body?.error) {
        setBookingError(`Booking failed: ${e.body.error}`);
      } else {
        setBookingError("Couldn't complete booking. Verify the event and room are valid.");
      }
    } finally {
      setBookingLoading(false);
    }
  }

  const eventOptions = eventsList.map((ev) => ({
    value: ev.event_id,
    label: `${ev.name} (${ev.event_id})`,
  }));

  return (
    <div className="flex flex-col gap-10">
      {/* 1. Room Availability Check Section */}
      <Section
        id="room-check"
        title="Room Availability Query"
        description="Verify which rooms, labs, and halls are unbooked at a specific date and time"
      >
        <div className="flex flex-col gap-5 bg-surface p-6 rounded-lg border border-border shadow-raised">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
            <div className="sm:col-span-5">
              <FormField
                id="check-date"
                label="Date"
                variant="date"
                value={checkDate}
                onChange={(e) => setCheckDate(e.target.value)}
              />
            </div>
            <div className="sm:col-span-5">
              <FormField
                id="check-time"
                label="Time"
                variant="time"
                value={checkTime}
                onChange={(e) => setCheckTime(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Button
                variant="secondary"
                onClick={handleQueryAvailability}
                loading={checkingRooms}
                loadingLabel="Checking…"
                leftIcon={<Search size={14} />}
                className="w-full text-label font-semibold min-h-control-md"
              >
                Check
              </Button>
            </div>
          </div>

          {checkingRooms && <Skeleton variant="row" count={4} />}

          {checkError && (
            <Banner variant="error" title="Query Failed">
              {checkError}
            </Banner>
          )}

          {!checkingRooms && !checkError && freeRooms && (
            <RoomAvailabilityTable
              variant="check"
              freeRooms={freeRooms}
              labelledById="room-check"
            />
          )}
        </div>
      </Section>

      {/* 2. Book a Room Governed Write Form */}
      <Section
        id="book-room-form"
        title="Book Facility for Event"
        description="Reserve an auditorium, lab, or classroom for an official student activity"
      >
        <form onSubmit={handleBookSubmit} className="flex flex-col gap-5 max-w-xl bg-surface p-6 rounded-lg border border-border shadow-raised">
          {eventOptions.length > 0 ? (
            <FormField
              id="bk-event-select"
              label="Assigned Event"
              variant="select"
              required
              value={eventId}
              options={eventOptions}
              onChange={(e) => setEventId(e.target.value)}
              helperText="Choose the campus event that this booking supports."
            />
          ) : (
            <FormField
              id="bk-event-text"
              label="Event ID"
              variant="text"
              required
              value={eventId}
              placeholder="e.g. evt_001"
              onChange={(e) => setEventId(e.target.value)}
            />
          )}

          <FormField
            id="bk-room-select"
            label="Room to Reserve"
            variant="select"
            required
            value={roomId}
            options={STANDARD_ROOMS}
            onChange={(e) => setRoomId(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <FormField
                id="bk-date"
                label="Date"
                variant="date"
                required
                value={bookDate}
                onChange={(e) => setBookDate(e.target.value)}
              />
            </div>
            <div className="sm:col-span-1">
              <FormField
                id="bk-start"
                label="Start time"
                variant="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="sm:col-span-1">
              <FormField
                id="bk-end"
                label="End time"
                variant="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              loading={bookingLoading}
              loadingLabel="Submitting booking…"
              disabled={!eventId || !roomId || !bookDate || !startTime || !endTime}
              leftIcon={<DoorClosed size={16} />}
              className="text-label font-semibold"
            >
              Confirm Booking
            </Button>
          </div>

          {bookingResult && <BookingSummary response={bookingResult} />}

          {bookingError && (
            <Banner variant="error" title="Could not book room">
              {bookingError}
            </Banner>
          )}
        </form>
      </Section>
    </div>
  );
}
