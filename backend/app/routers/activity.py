from fastapi import APIRouter, HTTPException, Query, Request

from app import db
from app.auth import require_council
from app.models import ActivityResponse

router = APIRouter()


@router.get("/activity", response_model=ActivityResponse)
def get_activity(request: Request, limit: int = Query(20, ge=1, le=50)) -> ActivityResponse:
    require_council(request)
    try:
        data = db.get_activity(limit=limit)
    except db.WarehouseError as exc:
        raise HTTPException(status_code=502, detail={"error": str(exc)})
    return ActivityResponse(activity=data)
