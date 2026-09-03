// frontend/src/api/client.ts
// The ONLY file permitted to call fetch("/api/...").
// Per architecture.md: every frontend network request goes through this file.
// Per code-standards.md: TypeScript interfaces are colocated here.

// ── Types ────────────────────────────────────────────────────────────────────

export type Role = "student" | "council";

export interface SessionResponse {
  role: Role;
  display_name?: string;
  display_email?: string;
}

export type EventStatus = "scheduled" | "cancelled" | "upcoming" | "ongoing" | "completed";

export interface EventSummary {
  event_id: string;
  name: string;
  club: string;
  topic?: string;
  start_ts: string;
  end_ts?: string;
  room: string | null;
  attendance_count: number;
  status: EventStatus;
}

export interface ListEventsParams {
  upcoming?: boolean;
  from?: string;
  to?: string;
  club_id?: string;
  status?: "scheduled" | "cancelled";
  q?: string;
}

export interface ListEventsResponse {
  events: EventSummary[];
  error?: string;
}

export interface EventDetailResponse {
  event_id: string;
  name: string;
  club: string;
  club_id?: string;
  topic?: string;
  description?: string | null;
  room: string | null;
  room_id?: string | null;
  start_ts: string;
  end_ts?: string;
  status: EventStatus;
  attendance_count: number;
  created_at?: string;
  error?: string;
}

export interface PulseEventSummary {
  event_id: string;
  name: string;
  club: string;
  room?: string | null;
  start_ts?: string;
  end_ts?: string;
}

export interface CampusPulseResponse {
  at: string;
  events_now: PulseEventSummary[];
  events_upcoming: PulseEventSummary[];
  rooms_available_count: number;
  rooms_total_count: number;
  registrations_today: number;
  next_major_event?: PulseEventSummary | null;
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

export interface InternshipSummary {
  internship_id: string;
  company_name: string;
  role_title: string;
  location: string;
  stipend?: string | null;
  eligibility?: string | null;
  deadline_ts: string;
  apply_url?: string | null;
  status: "open" | "closed";
}

export interface ListInternshipsResponse {
  internships: InternshipSummary[];
  error?: string;
}

export interface RegisterEventRequest {
  event_id: string;
  registrant_name: string;
  registrant_email: string;
}

export interface RegisterEventResponse {
  status: "ok";
  attendance_id: string;
  error?: string;
}

export interface CancelEventResponse {
  event_id: string;
  status: "cancelled";
  error?: string;
}

export interface AnalyticsOverviewResponse {
  range: { from: string | null; to: string | null };
  total_events: number;
  upcoming_events: number;
  total_registrations: number;
  average_attendance_per_event: number;
  active_clubs: number;
  rooms_booked_now: number;
  rooms_total: number;
  error?: string;
}

export interface PopularEventItem {
  event_id: string;
  name: string;
  attendance_count: number;
}

export interface AnalyticsEventsResponse {
  range: { from: string | null; to: string | null };
  popular_events: PopularEventItem[];
  low_attendance_events: PopularEventItem[];
  zero_attendance_events: PopularEventItem[];
  error?: string;
}

export interface RoomUtilizationItem {
  room_id: string;
  name: string;
  type: string;
  confirmed_bookings: number;
  total_booked_hours: number;
}

export interface PeakBookingPeriodItem {
  hour_of_day: number;
  booking_count: number;
}

export interface AnalyticsRoomsResponse {
  range: { from: string | null; to: string | null };
  room_utilization: RoomUtilizationItem[];
  peak_booking_periods: PeakBookingPeriodItem[];
  error?: string;
}

export interface ClubActivityItem {
  club_id: string;
  name: string;
  active: boolean;
  event_count: number;
  total_registrations: number;
}

export interface AnalyticsClubsResponse {
  range: { from: string | null; to: string | null };
  club_activity: ClubActivityItem[];
  error?: string;
}

export interface ActivityItem {
  type: "event_created" | "room_booked" | "event_cancelled";
  at: string;
  event_id?: string;
  name?: string;
  booking_id?: string;
  room?: string;
  event_name?: string;
}

export interface ActivityResponse {
  activity: ActivityItem[];
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

/** Retrieve current session info (GET /api/session). */
export async function getSession(): Promise<SessionResponse> {
  if (USE_MOCK) {
    return { role: "student" };
  }
  return apiFetch<SessionResponse>("/api/session");
}

/** Initialize or update the session role (POST /api/session). */
export async function createSession(
  accessCode?: string,
  displayName?: string,
  displayEmail?: string
): Promise<SessionResponse> {
  if (USE_MOCK) {
    return {
      role: accessCode ? "council" : "student",
      ...(displayName ? { display_name: displayName } : {}),
      ...(displayEmail ? { display_email: displayEmail } : {}),
    };
  }
  return apiFetch<SessionResponse>("/api/session", {
    method: "POST",
    body: JSON.stringify({
      access_code: accessCode ?? "",
      ...(displayName ? { display_name: displayName } : {}),
      ...(displayEmail ? { display_email: displayEmail } : {}),
    }),
  });
}

/** End session and clear cookie (POST /api/session/end). */
export async function endSession(): Promise<SessionResponse> {
  if (USE_MOCK) {
    return { role: "student" };
  }
  return apiFetch<SessionResponse>("/api/session/end", {
    method: "POST",
  });
}

/** List events with flexible filter parameters or boolean upcoming flag (GET /api/events). */
export async function listEvents(
  paramsOrUpcoming?: boolean | ListEventsParams
): Promise<ListEventsResponse> {
  const params: ListEventsParams =
    typeof paramsOrUpcoming === "boolean"
      ? { upcoming: paramsOrUpcoming }
      : paramsOrUpcoming ?? {};

  if (USE_MOCK) {
    const mockEvents: EventSummary[] = [
      {
        event_id: "evt_001",
        name: "AI Workshop",
        club: "AI Club",
        topic: "AI",
        start_ts: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        end_ts: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        room: "Auditorium",
        attendance_count: 42,
        status: "upcoming",
      },
      {
        event_id: "evt_002",
        name: "Robotics Demo Day",
        club: "Robotics Society",
        topic: "Hardware",
        start_ts: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        end_ts: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
        room: "Lab 204",
        attendance_count: 18,
        status: "ongoing",
      },
      {
        event_id: "evt_003",
        name: "Design Sprint",
        club: "Design Club",
        topic: "Design",
        start_ts: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        end_ts: new Date(Date.now() + 28 * 60 * 60 * 1000).toISOString(),
        room: null,
        attendance_count: 0,
        status: "upcoming",
      },
      {
        event_id: "evt_004",
        name: "Web3 Hackathon Prep",
        club: "Coding Club",
        topic: "Blockchain",
        start_ts: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        end_ts: new Date(Date.now() + 52 * 60 * 60 * 1000).toISOString(),
        room: "Classroom 101",
        attendance_count: 15,
        status: "upcoming",
      },
      {
        event_id: "evt_005",
        name: "Photography Walk",
        club: "Arts Club",
        topic: "Arts",
        start_ts: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        end_ts: new Date(Date.now() - 46 * 60 * 60 * 1000).toISOString(),
        room: "Quad",
        attendance_count: 8,
        status: "completed",
      },
      {
        event_id: "evt_006",
        name: "Guest Lecture: Quantum Computing",
        club: "Physics Society",
        topic: "Quantum",
        start_ts: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        end_ts: new Date(Date.now() + 74 * 60 * 60 * 1000).toISOString(),
        room: "Auditorium",
        attendance_count: 0,
        status: "cancelled",
      },
    ];

    let filtered = [...mockEvents];
    if (params?.club_id) {
      filtered = filtered.filter((e) => e.club.toLowerCase().includes(params.club_id!.toLowerCase()));
    }
    if (params?.q) {
      const query = params.q.toLowerCase();
      filtered = filtered.filter((e) => e.name.toLowerCase().includes(query) || (e.topic && e.topic.toLowerCase().includes(query)));
    }
    if (params?.status) {
      filtered = filtered.filter((e) => e.status === params.status);
    } else if (params?.upcoming !== false) {
      filtered = filtered.filter((e) => e.status !== "cancelled" && e.status !== "completed");
    }

    return { events: filtered };
  }

  const query = new URLSearchParams();
  if (params?.upcoming !== undefined) query.set("upcoming", String(params.upcoming));
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  if (params?.club_id) query.set("club_id", params.club_id);
  if (params?.status) query.set("status", params.status);
  if (params?.q) query.set("q", params.q);

  const qs = query.toString() ? `?${query}` : "";
  return apiFetch<ListEventsResponse>(`/api/events${qs}`);
}

/** Get detail for a specific event (GET /api/events/{event_id}). */
export async function getEvent(eventId: string): Promise<EventDetailResponse> {
  if (USE_MOCK) {
    return {
      event_id: eventId,
      name: "AI Workshop",
      club: "AI Club",
      club_id: "club_001",
      topic: "AI & Machine Learning",
      description: "Hands-on intro to large language models, agents, and modern fine-tuning workflows.",
      room: "Auditorium",
      room_id: "room_005",
      start_ts: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      end_ts: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      status: "scheduled",
      attendance_count: 42,
      created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    };
  }
  return apiFetch<EventDetailResponse>(`/api/events/${encodeURIComponent(eventId)}`);
}

/** Get live campus pulse snapshot (GET /api/campus/pulse). */
export async function getCampusPulse(): Promise<CampusPulseResponse> {
  if (USE_MOCK) {
    return {
      at: new Date().toISOString(),
      events_now: [
        {
          event_id: "evt_002",
          name: "Robotics Demo Day",
          club: "Robotics Society",
          room: "Lab 204",
          end_ts: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
        },
      ],
      events_upcoming: [
        {
          event_id: "evt_001",
          name: "AI Workshop",
          club: "AI Club",
          start_ts: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          event_id: "evt_003",
          name: "Design Sprint",
          club: "Design Club",
          start_ts: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
      rooms_available_count: 5,
      rooms_total_count: 9,
      registrations_today: 12,
      next_major_event: {
        event_id: "evt_001",
        name: "AI Workshop",
        club: "AI Club",
        start_ts: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      },
    };
  }
  return apiFetch<CampusPulseResponse>("/api/campus/pulse");
}

/** Get room availability at a given time. Powers Home + Admin Panel. */
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
      rows: [{ name: "Lab 204", room_id: "room_005" }],
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

/** List internship opportunities. Powers Home internships section. */
export async function listInternships(openOnly = true): Promise<ListInternshipsResponse> {
  if (USE_MOCK) {
    return {
      internships: [
        {
          internship_id: "int_001",
          company_name: "Databricks",
          role_title: "Data Engineering Intern",
          location: "Bangalore / Hybrid",
          stipend: "Rs 75,000/month",
          eligibility: "3rd & 4th Year CS/IT",
          deadline_ts: "2026-09-30T23:59:59",
          apply_url: "https://databricks.com/careers",
          status: "open",
        },
      ],
    };
  }
  return apiFetch<ListInternshipsResponse>(`/api/internships?open_only=${openOnly}`);
}

/** Register for an event directly from Almanac UI or Ask Genie link. */
export async function registerForEvent(payload: RegisterEventRequest): Promise<RegisterEventResponse> {
  if (USE_MOCK) {
    return {
      status: "ok",
      attendance_id: "att_mock",
    };
  }
  return apiFetch<RegisterEventResponse>("/api/events/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Cancel an event (council only, PATCH /api/events/{event_id}). */
export async function cancelEvent(eventId: string): Promise<CancelEventResponse> {
  if (USE_MOCK) {
    return {
      event_id: eventId,
      status: "cancelled",
    };
  }
  return apiFetch<CancelEventResponse>(`/api/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "cancelled" }),
  });
}

/** Get council operational overview analytics (GET /api/analytics/overview). */
export async function getAnalyticsOverview(
  from?: string,
  to?: string
): Promise<AnalyticsOverviewResponse> {
  if (USE_MOCK) {
    return {
      range: { from: from ?? null, to: to ?? null },
      total_events: 12,
      upcoming_events: 4,
      total_registrations: 47,
      average_attendance_per_event: 3.9,
      active_clubs: 5,
      rooms_booked_now: 4,
      rooms_total: 9,
    };
  }
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString() ? `?${params}` : "";
  return apiFetch<AnalyticsOverviewResponse>(`/api/analytics/overview${qs}`);
}

/** Get event analytics breakdown (GET /api/analytics/events). */
export async function getAnalyticsEvents(
  from?: string,
  to?: string,
  limit = 10
): Promise<AnalyticsEventsResponse> {
  if (USE_MOCK) {
    return {
      range: { from: from ?? null, to: to ?? null },
      popular_events: [
        { event_id: "evt_001", name: "AI Workshop", attendance_count: 42 },
        { event_id: "evt_002", name: "Robotics Demo Day", attendance_count: 18 },
        { event_id: "evt_004", name: "Web3 Hackathon Prep", attendance_count: 15 },
      ],
      low_attendance_events: [
        { event_id: "evt_005", name: "Photography Walk", attendance_count: 8 },
      ],
      zero_attendance_events: [
        { event_id: "evt_003", name: "Design Sprint", attendance_count: 0 },
        { event_id: "evt_006", name: "Guest Lecture: Quantum Computing", attendance_count: 0 },
      ],
    };
  }
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (limit) params.set("limit", String(limit));
  const qs = params.toString() ? `?${params}` : "";
  return apiFetch<AnalyticsEventsResponse>(`/api/analytics/events${qs}`);
}

/** Get room utilization analytics (GET /api/analytics/rooms). */
export async function getAnalyticsRooms(
  from?: string,
  to?: string
): Promise<AnalyticsRoomsResponse> {
  if (USE_MOCK) {
    return {
      range: { from: from ?? null, to: to ?? null },
      room_utilization: [
        { room_id: "room_005", name: "Lab 204", type: "Lab", confirmed_bookings: 6, total_booked_hours: 12.0 },
        { room_id: "room_006", name: "Auditorium", type: "Auditorium", confirmed_bookings: 4, total_booked_hours: 10.5 },
        { room_id: "room_001", name: "Classroom 101", type: "Classroom", confirmed_bookings: 3, total_booked_hours: 6.0 },
      ],
      peak_booking_periods: [
        { hour_of_day: 14, booking_count: 5 },
        { hour_of_day: 15, booking_count: 8 },
        { hour_of_day: 16, booking_count: 6 },
        { hour_of_day: 17, booking_count: 4 },
      ],
    };
  }
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString() ? `?${params}` : "";
  return apiFetch<AnalyticsRoomsResponse>(`/api/analytics/rooms${qs}`);
}

/** Get club activity analytics (GET /api/analytics/clubs). */
export async function getAnalyticsClubs(
  from?: string,
  to?: string
): Promise<AnalyticsClubsResponse> {
  if (USE_MOCK) {
    return {
      range: { from: from ?? null, to: to ?? null },
      club_activity: [
        { club_id: "club_001", name: "AI Club", active: true, event_count: 3, total_registrations: 58 },
        { club_id: "club_002", name: "Robotics Society", active: true, event_count: 2, total_registrations: 28 },
        { club_id: "club_003", name: "Coding Club", active: true, event_count: 2, total_registrations: 20 },
        { club_id: "club_004", name: "Design Club", active: true, event_count: 1, total_registrations: 10 },
      ],
    };
  }
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString() ? `?${params}` : "";
  return apiFetch<AnalyticsClubsResponse>(`/api/analytics/clubs${qs}`);
}

/** Get recent activity feed (GET /api/activity). */
export async function getActivity(limit = 20): Promise<ActivityResponse> {
  if (USE_MOCK) {
    return {
      activity: [
        {
          type: "room_booked",
          at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          booking_id: "bk_0004",
          room: "Lab 204",
          event_id: "evt_002",
          event_name: "Robotics Demo Day",
        },
        {
          type: "event_created",
          at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          event_id: "evt_004",
          name: "Web3 Hackathon Prep",
        },
        {
          type: "room_booked",
          at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          booking_id: "bk_0001",
          room: "Auditorium",
          event_id: "evt_001",
          event_name: "AI Workshop",
        },
        {
          type: "event_created",
          at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          event_id: "evt_001",
          name: "AI Workshop",
        },
      ],
    };
  }
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));
  const qs = params.toString() ? `?${params}` : "";
  return apiFetch<ActivityResponse>(`/api/activity${qs}`);
}



