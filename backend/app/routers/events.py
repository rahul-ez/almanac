from datetime import datetime
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Request

from app import db
from app.auth import require_council
from app.models import (
    CancelEventResponse,
    CreateEventRequest,
    CreateEventResponse,
    EventAttendeesResponse,
    EventDetailResponse,
    EventsResponse,
    PatchEventRequest,
    RegisterEventRequest,
    RegisterEventResponse,
)

router = APIRouter()


@router.get("/events", response_model=EventsResponse)
def list_events(
    upcoming: bool = True,
    date_from: datetime | None = Query(default=None, alias="from"),
    date_to: datetime | None = Query(default=None, alias="to"),
    club_id: str | None = None,
    status: Literal["scheduled", "cancelled"] | None = None,
    q: str | None = None,
) -> EventsResponse:
    """v2-api-contracts.md §3.1 — additive filters (`from`/`to`/`club_id`/
    `status`/`q`) and additive response fields (`topic`/`end_ts`/`status`). An
    unrecognized `status` value is rejected by the `Literal` type as HTTP 422."""
    try:
        rows = db.get_events(
            upcoming=upcoming,
            date_from=date_from,
            date_to=date_to,
            club_id=club_id,
            status=status,
            q=q,
        )
    except db.WarehouseError as exc:
        raise HTTPException(status_code=502, detail={"events": [], "error": str(exc)})
    return EventsResponse(events=rows)


@router.get("/events/{event_id}", response_model=EventDetailResponse)
def get_event(event_id: str) -> EventDetailResponse:
    """v2-api-contracts.md §3.2 — full single-event record for Event Detail."""
    try:
        row = db.get_event_detail(event_id)
    except db.WarehouseError as exc:
        raise HTTPException(status_code=502, detail={"error": str(exc)})
    if row is None:
        raise HTTPException(status_code=404, detail={"error": "event_not_found"})
    return EventDetailResponse(**row)


@router.get("/events/{event_id}/attendees", response_model=EventAttendeesResponse)
def get_event_attendees(event_id: str, request: Request) -> EventAttendeesResponse:
    """Council endpoint: get full list of registered students for an event."""
    require_council(request)
    try:
        data = db.get_event_attendees(event_id)
    except db.NotFoundError:
        raise HTTPException(status_code=404, detail={"error": "event_not_found"})
    except db.WarehouseError as exc:
        raise HTTPException(status_code=502, detail={"error": str(exc)})
    return EventAttendeesResponse(**data)


@router.post("/events/register", response_model=RegisterEventResponse, status_code=201)
def register_event(body: RegisterEventRequest) -> RegisterEventResponse:
    try:
        attendance_id = db.insert_attendance(
            event_id=body.event_id,
            registrant_name=body.registrant_name,
            registrant_email=body.registrant_email,
            registered_at=datetime.now(),
        )
    except db.NotFoundError:
        raise HTTPException(status_code=404, detail={"status": "unknown_event"})
    except db.DuplicateRegistrationError:
        raise HTTPException(
            status_code=409,
            detail={
                "status": "duplicate",
                "error": "already_registered",
                "message": "You are already registered for this event with this email address.",
            },
        )
    except db.WarehouseError as exc:
        raise HTTPException(status_code=502, detail={"status": "error", "error": str(exc)})
    return RegisterEventResponse(status="ok", attendance_id=attendance_id)


@router.post("/events", response_model=CreateEventResponse, status_code=201)
def create_event(body: CreateEventRequest, request: Request) -> CreateEventResponse:
    require_council(request)
    try:
        created = db.create_event(
            name=body.name,
            club_name=body.club,
            start_ts=body.start_ts,
            end_ts=body.end_ts,
            topic=body.topic,
            description=body.description,
            room_id=body.room_id,
        )
    except db.NotFoundError as exc:
        raise HTTPException(status_code=422, detail={"error": exc.kind})
    except db.BookingConflictError as exc:
        raise HTTPException(
            status_code=409,
            detail={"error": "conflict", "conflicting_booking": exc.conflicting_booking},
        )
    except db.WarehouseError as exc:
        raise HTTPException(status_code=502, detail={"error": str(exc)})
    return CreateEventResponse(**created)


@router.patch("/events/{event_id}", response_model=CancelEventResponse)
def patch_event(event_id: str, body: PatchEventRequest, request: Request) -> CancelEventResponse:
    """v2-api-contracts.md §8.2 — narrow scope: the `scheduled → cancelled`
    transition only. council-only; cascades booking cancellation in `db.py`."""
    require_council(request)
    if body.status != "cancelled":
        raise HTTPException(status_code=422, detail={"error": "invalid_status_transition"})
    try:
        result = db.cancel_event(event_id)
    except db.NotFoundError:
        raise HTTPException(status_code=404, detail={"error": "event_not_found"})
    except db.InvalidStatusTransitionError:
        raise HTTPException(status_code=422, detail={"error": "invalid_status_transition"})
    except db.WarehouseError as exc:
        raise HTTPException(status_code=502, detail={"error": str(exc)})
    return CancelEventResponse(**result)
