"""Pydantic request/response models, mirroring context/v2-api-contracts.md field-for-field."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


# --- Session -----------------------------------------------------------------
class SessionRequest(BaseModel):
    access_code: str | None = None
    display_name: str | None = None
    display_email: str | None = None


class SessionResponse(BaseModel):
    role: Literal["student", "council"]
    display_name: str | None = None
    display_email: str | None = None


# --- Ask Genie -----------------------------------------------------------------
class AskGenieRequest(BaseModel):
    question: str


class AskGenieResponse(BaseModel):
    status: Literal["ok", "no_answer", "error"]
    answer: str | None = None
    sql: str | None = None
    rows: list[dict[str, Any]] | None = None
    message: str | None = None


# --- Events --------------------------------------------------------------------
class EventSummary(BaseModel):
    event_id: str
    name: str
    club: str
    start_ts: datetime
    end_ts: datetime | None = None
    room: str | None = None
    topic: str | None = None
    attendance_count: int
    status: Literal["scheduled", "cancelled", "completed", "ongoing"] = "scheduled"


class EventsResponse(BaseModel):
    events: list[EventSummary]


class EventDetailResponse(BaseModel):
    event_id: str
    name: str
    club: str
    start_ts: datetime
    end_ts: datetime | None = None
    room_id: str | None = None
    room: str | None = None
    topic: str | None = None
    description: str | None = None
    status: Literal["scheduled", "cancelled", "completed", "ongoing"]
    attendance_count: int


class CreateEventRequest(BaseModel):
    name: str
    club: str
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


class PatchEventRequest(BaseModel):
    status: Literal["cancelled"]


class CancelEventResponse(BaseModel):
    event_id: str
    status: Literal["cancelled"]


class RegisterEventRequest(BaseModel):
    event_id: str
    registrant_name: str
    registrant_email: str


class RegisterEventResponse(BaseModel):
    status: Literal["ok"]
    attendance_id: str


class IngestAttendanceRequest(BaseModel):
    token: str
    event_id: str
    registrant_name: str
    registrant_email: str
    submitted_at: datetime


class IngestAttendanceResponse(BaseModel):
    status: Literal["ok"]
    attendance_id: str


# --- Campus Pulse -----------------------------------------------------------
class PulseEventSummary(BaseModel):
    event_id: str
    name: str
    club: str
    room: str | None = None
    start_ts: datetime | None = None
    end_ts: datetime | None = None


class CampusPulseResponse(BaseModel):
    events_now: list[PulseEventSummary]
    events_upcoming: list[PulseEventSummary]
    rooms_available_count: int
    rooms_total_count: int
    registrations_today: int
    next_major_event: PulseEventSummary | None = None
    timestamp: datetime | None = None


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


# --- Internships -----------------------------------------------------------
class InternshipSummary(BaseModel):
    internship_id: str
    company_name: str
    role_title: str
    location: str
    stipend: str
    eligibility: str
    deadline_ts: datetime
    apply_url: str
    status: str


class ListInternshipsResponse(BaseModel):
    internships: list[InternshipSummary]


InternshipsResponse = ListInternshipsResponse


# --- Analytics --------------------------------------------------------------
class AnalyticsOverviewResponse(BaseModel):
    range: dict[str, str | None]
    total_events: int
    upcoming_events: int
    total_registrations: int
    average_attendance_per_event: float
    active_clubs: int
    rooms_booked_now: int
    rooms_total: int


class PopularEventItem(BaseModel):
    event_id: str
    name: str
    attendance_count: int


class AnalyticsEventsResponse(BaseModel):
    range: dict[str, str | None]
    popular_events: list[PopularEventItem]
    low_attendance_events: list[PopularEventItem]
    zero_attendance_events: list[PopularEventItem]


class RoomUtilizationItem(BaseModel):
    room_id: str
    name: str
    type: str
    confirmed_bookings: int
    total_booked_hours: float


class PeakBookingPeriodItem(BaseModel):
    hour_of_day: int
    booking_count: int


class AnalyticsRoomsResponse(BaseModel):
    range: dict[str, str | None]
    room_utilization: list[RoomUtilizationItem]
    peak_booking_periods: list[PeakBookingPeriodItem]


class ClubActivityItem(BaseModel):
    club_id: str
    name: str
    active: bool
    event_count: int
    total_registrations: int


class AnalyticsClubsResponse(BaseModel):
    range: dict[str, str | None]
    club_activity: list[ClubActivityItem]


# --- Activity ----------------------------------------------------------------
class ActivityItem(BaseModel):
    type: Literal["event_created", "room_booked", "event_cancelled"]
    at: datetime
    event_id: str | None = None
    name: str | None = None
    booking_id: str | None = None
    room: str | None = None
    event_name: str | None = None


class ActivityResponse(BaseModel):
    activity: list[ActivityItem]
