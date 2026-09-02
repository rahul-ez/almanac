"""POST /api/ingest/attendance — see context/architecture.md's "Contract:
Attendance ingestion webhook". Called by the Apps Script bound to the Google
Form. Gated by the shared INGEST_TOKEN only — not by role/session, per
context/code-standards.md's Authentication and Authorization ("never combined
with the session-cookie mechanism")."""

import hmac
import logging

from fastapi import APIRouter, HTTPException

from app import db
from app.config import settings
from app.models import IngestAttendanceRequest, IngestAttendanceResponse

logger = logging.getLogger("campus_companion.ingest")

router = APIRouter()


@router.post("/ingest/attendance", response_model=IngestAttendanceResponse, status_code=201)
def ingest_attendance(body: IngestAttendanceRequest) -> IngestAttendanceResponse:
    if not hmac.compare_digest(body.token, settings.ingest_token):
        raise HTTPException(status_code=401, detail={"status": "unauthorized"})

    try:
        attendance_id = db.insert_attendance(
            event_id=body.event_id,
            registrant_name=body.registrant_name,
            registrant_email=body.registrant_email,
            registered_at=body.submitted_at,
        )
    except db.NotFoundError:
        raise HTTPException(status_code=404, detail={"status": "unknown_event"})
    except db.WarehouseError as exc:
        logger.error("Attendance ingestion failed for event_id=%s: %s", body.event_id, exc)
        raise HTTPException(status_code=502, detail={"status": "error"})

    logger.info("Attendance ingested: event_id=%s attendance_id=%s", body.event_id, attendance_id)
    return IngestAttendanceResponse(status="ok", attendance_id=attendance_id)
