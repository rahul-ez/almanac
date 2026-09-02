"""GET /api/rooms/availability and POST /api/bookings — both live here per
context/architecture.md's folder structure. See "Contract: Room availability"
and "Contract: Create booking"."""

from datetime import datetime

from fastapi import APIRouter, HTTPException, Request

from app import db
from app.auth import require_council
from app.models import BookingResponse, CreateBookingRequest, RoomAvailabilityResponse

router = APIRouter()


@router.get("/rooms/availability", response_model=RoomAvailabilityResponse)
def room_availability(
    type: str | None = None, at: datetime | None = None
) -> RoomAvailabilityResponse:
    query_at = at or datetime.now()
    try:
        rows = db.get_free_rooms(room_type=type, at=query_at)
    except db.WarehouseError as exc:
        raise HTTPException(status_code=502, detail={"free_rooms": [], "error": str(exc)})
    return RoomAvailabilityResponse(at=query_at, free_rooms=rows)


@router.post("/bookings", response_model=BookingResponse, status_code=201)
def create_booking(body: CreateBookingRequest, request: Request) -> BookingResponse:
    require_council(request)
    try:
        created = db.create_booking(
            room_id=body.room_id,
            event_id=body.event_id,
            start_ts=body.start_ts,
            end_ts=body.end_ts,
        )
    except db.NotFoundError as exc:
        # Same documented-gap convention as events.py's create_event — see
        # that router's comment. architecture.md documents only 403/409/502
        # for this endpoint.
        raise HTTPException(status_code=422, detail={"error": exc.kind})
    except db.BookingConflictError as exc:
        raise HTTPException(
            status_code=409,
            detail={"error": "conflict", "conflicting_booking": exc.conflicting_booking},
        )
    except db.WarehouseError as exc:
        raise HTTPException(status_code=502, detail={"error": str(exc)})
    return BookingResponse(**created)
