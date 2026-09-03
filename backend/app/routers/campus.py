from datetime import datetime

from fastapi import APIRouter, HTTPException, Query

from app import db
from app.models import CampusPulseResponse

router = APIRouter()


@router.get("/campus/pulse", response_model=CampusPulseResponse)
def get_campus_pulse(at: datetime | None = Query(None)) -> CampusPulseResponse:
    try:
        data = db.get_campus_pulse(at=at)
    except db.WarehouseError as exc:
        raise HTTPException(status_code=502, detail={"error": str(exc)})
    return CampusPulseResponse(**data)
