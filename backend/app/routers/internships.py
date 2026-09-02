"""GET /api/internships — lists active internship opportunities."""

from fastapi import APIRouter, HTTPException

from app import db
from app.models import InternshipsResponse

router = APIRouter()


@router.get("/internships", response_model=InternshipsResponse)
def list_internships(open_only: bool = True) -> InternshipsResponse:
    try:
        rows = db.get_internships(open_only=open_only)
    except db.WarehouseError as exc:
        raise HTTPException(status_code=502, detail={"internships": [], "error": str(exc)})
    return InternshipsResponse(internships=rows)
