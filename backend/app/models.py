"""Pydantic request/response models, mirroring context/architecture.md's
Integration Contracts field-for-field. Field names here are frozen by that
document — do not rename without updating architecture.md first, per
context/code-standards.md's API and Integration Standards.

Error-path bodies (403/404/409/502/etc.) are NOT modeled here — they are
raised as `HTTPException(status_code=..., detail={...})` from routers and
returned verbatim (not wrapped under a "detail" key) by the custom exception
handler registered in main.py.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


# --- Session -----------------------------------------------------------------
class SessionRequest(BaseModel):
    access_code: str | None = None
    # V2 (v2-api-contracts.md §2.1): optional UX-convenience display fields for a
    # student session. Stored only in the signed cookie's claims, never written to
    # `students` or used as an authorization signal.
    display_name: str | None = None
    display_email: str | None = None


class SessionResponse(BaseModel):
    role: Literal["student", "council"]
    # Echoed back only when present (routes use response_model_exclude_none=True),
    # matching v2-api-contracts.md §2.1 / §2.2.
    display_name: str | None = None
    display_email: str | None = None


# --- Ask Genie -----------------------------------------------------------------
class AskGenieRequest(BaseModel):
    question: str


class AskGenieResponse(BaseModel):
    status: Literal["ok", "no_answer", "error"]
    answer: str | None = None
    sql: str | None = None
    rows: list[dict] | None = None
    message: str | None = None


# --- Events --------------------------------------------------------------------
class EventSummary(BaseModel):
    event_id: str
    name: str
    club: str
    # V2 additive fields (v2-api-contracts.md §3.1): topic, end_ts, status.
    topic: str | None = None
    start_ts: datetime
    end_ts: datetime | None = None
    room: str | None = None
    status: str | None = None
    attendance_count: int


class EventsResponse(BaseModel):
    events: list[EventSummary]


class EventDetailResponse(BaseModel):
    """v2-api-contracts.md §3.2 — powers the Event Detail surface."""

    event_id: str
    name: str
    club: str
    club_id: str
    topic: str | None = None
    description: str | None = None
    room: str | None = None
    room_id: str | None = None
    start_ts: datetime
    end_ts: datetime
    status: str
    attendance_count: int
    created_at: datetime | None = None


class PatchEventRequest(BaseModel):
    """v2-api-contracts.md §8.2 — cancel-only. `status` is validated in the handler
    (not as a Literal) so every rejected transition returns the documented
    `{"error": "invalid_status_transition"}` body rather than FastAPI's default
    422 shape."""

    status: str


class CancelEventResponse(BaseModel):
    event_id: str
    status: str


class CreateEventRequest(BaseModel):
    name: str
    club: str  # resolved server-side against clubs.name — see db.create_event()
    start_ts: datetime
    end_ts: datetime | None = None
    room_id: str | None = None
    topic: str | None = None
    description: str | None = None


class CreateEventResponse(BaseModel):
    event_id: str
    name: str
    club: str
    start_ts: datetime
    room_id: str | None = None
    topic: str | None = None


class RegisterEventRequest(BaseModel):
    event_id: str
    registrant_name: str
    registrant_email: str


class RegisterEventResponse(BaseModel):
    status: Literal["ok"]
    attendance_id: str


class EventAttendee(BaseModel):
    attendance_id: str
    event_id: str
    registrant_name: str
    registrant_email: str
    registered_at: datetime
    student_id: str | None = None
    major: str | None = None
    year: int | None = None


class EventAttendeesResponse(BaseModel):
    event_id: str
    event_name: str | None = None
    total_count: int
    attendees: list[EventAttendee]


# --- Rooms -----------------------------------------------------------------
class RoomSummary(BaseModel):
    room_id: str
    name: str
    type: str


class RoomAvailabilityResponse(BaseModel):
    at: datetime
    free_rooms: list[RoomSummary]


# --- Teachers --------------------------------------------------------------
class TeacherAvailabilityResponse(BaseModel):
    teacher_name: str
    at: datetime
    available: bool


# --- Bookings ----------------------------------------------------------------
class CreateBookingRequest(BaseModel):
    room_id: str
    event_id: str
    start_ts: datetime
    end_ts: datetime


class BookingResponse(BaseModel):
    booking_id: str
    room_id: str
    event_id: str
    start_ts: datetime
    end_ts: datetime


# --- Ingestion -----------------------------------------------------------------
class IngestAttendanceRequest(BaseModel):
    token: str
    event_id: str
    registrant_name: str
    registrant_email: str
    submitted_at: datetime


class IngestAttendanceResponse(BaseModel):
    status: Literal["ok"]
    attendance_id: str


# --- Internships ---------------------------------------------------------------
class InternshipSummary(BaseModel):
    internship_id: str
    company_name: str
    role_title: str
    location: str
    stipend: str | None = None
    eligibility: str | None = None
    deadline_ts: datetime
    apply_url: str | None = None
    status: str = "open"


class InternshipsResponse(BaseModel):
    internships: list[InternshipSummary]


# --- Campus Pulse (v2-api-contracts.md §4.1) ---------------------------------
class PulseEventNow(BaseModel):
    event_id: str
    name: str
    club: str
    room: str | None = None
    end_ts: datetime


class PulseEventUpcoming(BaseModel):
    event_id: str
    name: str
    club: str
    start_ts: datetime


class NextMajorEvent(BaseModel):
    event_id: str
    name: str
    start_ts: datetime


class CampusPulseResponse(BaseModel):
    at: datetime
    events_now: list[PulseEventNow]
    events_upcoming: list[PulseEventUpcoming]
    rooms_available_count: int
    rooms_total_count: int
    registrations_today: int
    next_major_event: NextMajorEvent | None = None


# --- Analytics (v2-api-contracts.md §5) ------------------------------------------
class AnalyticsRange(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    from_: datetime | None = Field(default=None, alias="from")
    to: datetime | None = None


class AnalyticsOverviewResponse(BaseModel):
    range: AnalyticsRange
    total_events: int
    upcoming_events: int
    total_registrations: int
    average_attendance_per_event: float
    active_clubs: int
    rooms_booked_now: int
    rooms_total: int


class EventAttendanceRef(BaseModel):
    event_id: str
    name: str
    attendance_count: int


class AnalyticsEventsResponse(BaseModel):
    range: AnalyticsRange
    popular_events: list[EventAttendanceRef]
    low_attendance_events: list[EventAttendanceRef]
    zero_attendance_events: list[EventAttendanceRef]


class RoomUtilization(BaseModel):
    room_id: str
    name: str
    type: str
    confirmed_bookings: int
    total_booked_hours: float


class PeakBookingPeriod(BaseModel):
    hour_of_day: int
    booking_count: int


class AnalyticsRoomsResponse(BaseModel):
    range: AnalyticsRange
    room_utilization: list[RoomUtilization]
    peak_booking_periods: list[PeakBookingPeriod]


class ClubActivity(BaseModel):
    club_id: str
    name: str
    active: bool
    event_count: int
    total_registrations: int


class AnalyticsClubsResponse(BaseModel):
    range: AnalyticsRange
    club_activity: list[ClubActivity]


# --- Activity feed (v2-api-contracts.md §6.1) ----------------------------------
class ActivityItem(BaseModel):
    type: Literal["event_created", "room_booked"]
    at: datetime
    event_id: str | None = None
    name: str | None = None
    booking_id: str | None = None
    room: str | None = None
    event_name: str | None = None


class ActivityResponse(BaseModel):
    activity: list[ActivityItem]

