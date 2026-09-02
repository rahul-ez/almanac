from datetime import datetime

from fastapi import APIRouter, HTTPException, Request

from app import db
from app.auth import require_council
from app.models import (
    CreateEventRequest,
    CreateEventResponse,
    EventsResponse,
    RegisterEventRequest,
    RegisterEventResponse,
)

router = APIRouter()


@router.get("/events", response_model=EventsResponse)
def list_events(upcoming: bool = True) -> EventsResponse:
    try:
        rows = db.get_events(upcoming=upcoming)
    except db.WarehouseError as exc:
        raise HTTPException(status_code=502, detail={"events": [], "error": str(exc)})
    return EventsResponse(events=rows)


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

