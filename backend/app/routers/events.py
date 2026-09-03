from datetime import datetime
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Request

from app import db
from app.auth import require_council
from app.models import (
    CancelEventResponse,
    CreateEventRequest,
    CreateEventResponse,
    EventDetailResponse,
    EventsResponse,
    PatchEventRequest,
    RegisterEventRequest,
    RegisterEventResponse,
)

router = APIRouter()


@router.get("/events", response_model=EventsResponse)
def list_events(
    from_ts: datetime | None = Query(None, alias="from"),
    to_ts: datetime | None = Query(None, alias="to"),
    club_id: str | None = None,
    status: Literal["scheduled", "cancelled", "completed", "ongoing"] | None = None,
    q: str | None = None,
    upcoming: bool = True,
) -> EventsResponse:
    try:
        if from_ts is None and to_ts is None and club_id is None and status is None and q is None:
            rows = db.get_events(upcoming)
        else:
            rows = db.get_events(
                from_ts=from_ts,
                to_ts=to_ts,
                club_id=club_id,
                status=status,
                q=q,
                upcoming=upcoming,
            )
    except db.WarehouseError as exc:
        raise HTTPException(status_code=502, detail={"events": [], "error": str(exc)})
    return EventsResponse(events=rows)


@router.get("/events/{event_id}", response_model=EventDetailResponse)
def get_event(event_id: str) -> EventDetailResponse:
    try:
        data = db.get_event_detail(event_id)
    except db.NotFoundError:
        raise HTTPException(status_code=404, detail={"error": "event_not_found"})
    except db.WarehouseError as exc:
        raise HTTPException(status_code=502, detail={"error": str(exc)})
    return EventDetailResponse(**data)


@router.patch("/events/{event_id}", response_model=CancelEventResponse)
def patch_event(event_id: str, body: PatchEventRequest, request: Request) -> CancelEventResponse:
    require_council(request)
    if body.status != "cancelled":
        raise HTTPException(status_code=422, detail={"error": "invalid_status_transition"})

    try:
        res = db.cancel_event(event_id)
    except db.NotFoundError:
        raise HTTPException(status_code=404, detail={"error": "event_not_found"})
    except db.InvalidStatusTransitionError:
        raise HTTPException(status_code=422, detail={"error": "invalid_status_transition"})
    except db.WarehouseError as exc:
        raise HTTPException(status_code=502, detail={"error": str(exc)})
    return CancelEventResponse(**res)


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
