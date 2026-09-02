"""GET /api/teachers/availability — see context/architecture.md's "Contract:
Teacher availability". A direct (non-Genie) fallback/simple lookup; the
primary teacher-availability experience is via Ask Genie."""

from datetime import datetime

from fastapi import APIRouter, HTTPException

from app import db
from app.models import TeacherAvailabilityResponse

router = APIRouter()


@router.get("/teachers/availability", response_model=TeacherAvailabilityResponse)
def teacher_availability(teacher_name: str, at: datetime) -> TeacherAvailabilityResponse:
    try:
        available = db.is_teacher_free(teacher_name, at)
    except db.WarehouseError as exc:
        raise HTTPException(status_code=502, detail={"error": str(exc)})
    if available is None:
        raise HTTPException(status_code=404, detail={"error": "teacher_not_found"})
    return TeacherAvailabilityResponse(teacher_name=teacher_name, at=at, available=available)
