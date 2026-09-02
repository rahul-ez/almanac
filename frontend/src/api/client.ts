// frontend/src/api/client.ts
// The ONLY file permitted to call fetch("/api/...").
// Per architecture.md: every frontend network request goes through this file.
// Per code-standards.md: TypeScript interfaces are colocated here.

// ── Types ────────────────────────────────────────────────────────────────────

export type Role = "student" | "council";

export interface SessionResponse {
  role: Role;
}

export interface EventSummary {
  event_id: string;
  name: string;
  club: string;
  start_ts: string;
  room: string | null;
  attendance_count: number;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
}

export interface ListEventsResponse {
  events: EventSummary[];
  error?: string;
}

export interface FreeRoom {
  room_id: string;
  name: string;
  type: "Classroom" | "Lab" | "Auditorium" | "Study room";
}

export interface RoomAvailabilityResponse {
  at: string;
  free_rooms: FreeRoom[];
  error?: string;
}

export interface TeacherAvailabilityResponse {
  teacher_name: string;
  at: string;
  available: boolean;
  error?: string;
}

export type GenieStatus = "ok" | "no_answer" | "error";

export interface GenieResponse {
  status: GenieStatus;
  answer?: string;
  sql?: string;
  rows?: Record<string, unknown>[];
  message?: string;
}

export interface BookingRequest {
  room_id: string;
  event_id: string;
  start_ts: string;
  end_ts: string;
}

export interface BookingResponse {
  booking_id: string;
  room_id: string;
  event_id: string;
  start_ts: string;
  end_ts: string;
  error?: string;
  conflicting_booking?: {
    event: string;
    room: string;
    start_ts: string;
    end_ts: string;
  };
}

export interface CreateEventRequest {
  name: string;
  club: string;
  start_ts: string;
  room_id?: string;
  topic?: string;
}

export interface CreateEventResponse {
  event_id: string;
  name: string;
  club: string;
  start_ts: string;
  room_id?: string;
  topic?: string;
  error?: string;
}

// ── Mock flag ─────────────────────────────────────────────────────────────────
// Defaults to false (connecting to live Backend at /api). Set VITE_USE_MOCK=true for mock UI development.
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body?.error ?? res.statusText), { status: res.status, body });
  }
  return res.json() as Promise<T>;
}

// ── API functions ─────────────────────────────────────────────────────────────

/** Initialize or update the session role. Called on mount (no code) and after AccessCodeModal. */
export async function createSession(accessCode?: string): Promise<SessionResponse> {
  if (USE_MOCK) {
    return { role: accessCode ? "council" : "student" };
  }
  return apiFetch<SessionResponse>("/api/session", {
    method: "POST",
    body: JSON.stringify({ access_code: accessCode ?? "" }),
  });
}

/** List upcoming events with live attendance counts. Powers Newsletter Home. */
export async function listEvents(upcoming = true): Promise<ListEventsResponse> {
  if (USE_MOCK) {
    return {
      events: [
        {
          event_id: "evt_001",
          name: "AI Workshop",
          club: "AI Club",
          start_ts: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          room: "Auditorium",
          attendance_count: 42,
          status: "upcoming",
        },
        {
          event_id: "evt_002",
          name: "Robotics Demo Day",
          club: "Robotics Society",
          start_ts: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          room: "Lab 204",
          attendance_count: 18,
          status: "ongoing",
        },
        {
          event_id: "evt_003",
          name: "Design Sprint",
          club: "Design Club",
          start_ts: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          room: null,
          attendance_count: 0,
          status: "upcoming",
        },
      ],
    };
  }
  const params = upcoming ? "?upcoming=true" : "";
  return apiFetch<ListEventsResponse>(`/api/events${params}`);
}

/** Get room availability at a given time. Powers Newsletter Home + Admin Panel. */
export async function getRoomAvailability(
  at?: string,
  type?: string
): Promise<RoomAvailabilityResponse> {
  if (USE_MOCK) {
    return {
      at: at ?? new Date().toISOString(),
      free_rooms: [
        { room_id: "r_101", name: "Classroom 101", type: "Classroom" },
        { room_id: "r_204", name: "Lab 204", type: "Lab" },
        { room_id: "r_aud", name: "Auditorium", type: "Auditorium" },
      ],
    };
  }
  const params = new URLSearchParams();
  if (at) params.set("at", at);
  if (type) params.set("type", type);
  const qs = params.toString() ? `?${params}` : "";
  return apiFetch<RoomAvailabilityResponse>(`/api/rooms/availability${qs}`);
}

/** Direct teacher availability check. Primary experience is via Ask Genie. */
export async function getTeacherAvailability(
  teacherName: string,
  at: string
): Promise<TeacherAvailabilityResponse> {
  if (USE_MOCK) {
    return { teacher_name: teacherName, at, available: true };
  }
  const params = new URLSearchParams({ teacher_name: teacherName, at });
  return apiFetch<TeacherAvailabilityResponse>(`/api/teachers/availability?${params}`);
}

/** Submit a natural-language campus question to Genie. Powers Ask Genie page. */
export async function askGenie(question: string): Promise<GenieResponse> {
  if (USE_MOCK) {
    return {
      status: "ok",
      answer: "Lab 204 is free at 3pm today.",
      sql: "SELECT r.name FROM rooms r WHERE room_is_free(r.room_id, '2026-09-05T15:00:00') = TRUE AND r.type = 'Lab'",
      rows: [{ name: "Lab 204" }],
    };
  }
  return apiFetch<GenieResponse>("/api/genie/ask", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

/** Create a room booking (council only). */
export async function createBooking(payload: BookingRequest): Promise<BookingResponse> {
  if (USE_MOCK) {
    return {
      booking_id: "bk_mock",
      room_id: payload.room_id,
      event_id: payload.event_id,
      start_ts: payload.start_ts,
      end_ts: payload.end_ts,
    };
  }
  return apiFetch<BookingResponse>("/api/bookings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Create an event (council only). */
export async function createEvent(payload: CreateEventRequest): Promise<CreateEventResponse> {
  if (USE_MOCK) {
    return {
      event_id: "evt_mock",
      name: payload.name,
      club: payload.club,
      start_ts: payload.start_ts,
      room_id: payload.room_id,
      topic: payload.topic,
    };
  }
  return apiFetch<CreateEventResponse>("/api/events", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
