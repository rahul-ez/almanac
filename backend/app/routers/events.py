"""GET/POST /api/events — see context/architecture.md's "Contract: List
events" and "Contract: Create event"."""

from fastapi import APIRouter, HTTPException, Request

from app import db
from app.auth import require_council
from app.models import CreateEventRequest, CreateEventResponse, EventsResponse

router = APIRouter()


@router.get("/events", response_model=EventsResponse)
def list_events(upcoming: bool = True) -> EventsResponse:
    try:
        rows = db.get_events(upcoming=upcoming)
    except db.WarehouseError as exc:
        raise HTTPException(status_code=502, detail={"events": [], "error": str(exc)})
    return EventsResponse(events=rows)


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
        # Not explicitly enumerated in architecture.md's frozen contract for
        # this endpoint (only 403/502 are documented there) — 422 with a
        # `{"error": "<reason>"}` body follows the same shape convention used
        # by the endpoints that DO document an error code, per
        # data-contracts.md's requirement that an invalid write be rejected
        # with "the documented error shape" rather than attempted. Flagged in
        # this workstream's summary as a filled gap, not a silent contract
        # change.
        raise HTTPException(status_code=422, detail={"error": exc.kind})
    except db.BookingConflictError as exc:
        raise HTTPException(
            status_code=409,
            detail={"error": "conflict", "conflicting_booking": exc.conflicting_booking},
        )
    except db.WarehouseError as exc:
        raise HTTPException(status_code=502, detail={"error": str(exc)})
    return CreateEventResponse(**created)
