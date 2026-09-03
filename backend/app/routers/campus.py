"""GET /api/campus/pulse — the "what's true on campus right now" summary
(v2-api-contracts.md §4.1). One composite read, evaluated against a single
`now` instant. Any underlying query failure fails the whole response (502) —
never a partially-populated payload."""

from datetime import datetime

from fastapi import APIRouter, HTTPException

from app import db
from app.models import CampusPulseResponse

router = APIRouter()


@router.get("/campus/pulse", response_model=CampusPulseResponse)
def campus_pulse() -> CampusPulseResponse:
    try:
        data = db.get_campus_pulse(datetime.now())
    except db.WarehouseError as exc:
        raise HTTPException(status_code=502, detail={"error": str(exc)})
    return CampusPulseResponse(**data)
