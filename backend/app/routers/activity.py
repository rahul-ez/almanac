"""GET /api/activity — a lightweight feed of recent governed writes
(v2-api-contracts.md §6.1). council-only. Derived from existing
`events.created_at` / `room_bookings.created_at` — no new table."""

from fastapi import APIRouter, HTTPException, Query, Request

from app import db
from app.auth import require_council
from app.models import ActivityResponse

router = APIRouter()


@router.get("/activity", response_model=ActivityResponse, response_model_exclude_none=True)
def activity(
    request: Request,
    limit: int = Query(default=20, ge=1, le=50),
) -> ActivityResponse:
    require_council(request)
    try:
        items = db.get_activity(limit)
    except db.WarehouseError as exc:
        raise HTTPException(status_code=502, detail={"error": str(exc)})
    return ActivityResponse(activity=items)
