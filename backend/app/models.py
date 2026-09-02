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

from pydantic import BaseModel


# --- Session -----------------------------------------------------------------
class SessionRequest(BaseModel):
    access_code: str | None = None


class SessionResponse(BaseModel):
    role: Literal["student", "council"]


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
    start_ts: datetime
    room: str | None = None
    attendance_count: int
    status: str | None = "upcoming"


class EventsResponse(BaseModel):
    events: list[EventSummary]


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

