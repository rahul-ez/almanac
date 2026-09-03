from datetime import datetime

from fastapi import APIRouter, HTTPException, Query, Request

from app import db
from app.auth import require_council
from app.models import (
    AnalyticsClubsResponse,
    AnalyticsEventsResponse,
    AnalyticsOverviewResponse,
    AnalyticsRoomsResponse,
)

router = APIRouter(prefix="/analytics")


@router.get("/overview", response_model=AnalyticsOverviewResponse)
def get_analytics_overview(
    request: Request,
    from_ts: datetime | None = Query(None, alias="from"),
    to_ts: datetime | None = Query(None, alias="to"),
) -> AnalyticsOverviewResponse:
    require_council(request)
    try:
        data = db.get_analytics_overview(from_ts=from_ts, to_ts=to_ts)
    except db.WarehouseError as exc:
        raise HTTPException(status_code=502, detail={"error": str(exc)})
    return AnalyticsOverviewResponse(**data)


@router.get("/events", response_model=AnalyticsEventsResponse)
def get_analytics_events(
    request: Request,
    from_ts: datetime | None = Query(None, alias="from"),
    to_ts: datetime | None = Query(None, alias="to"),
    limit: int = Query(10, ge=1, le=50),
) -> AnalyticsEventsResponse:
    require_council(request)
    try:
        data = db.get_analytics_events(from_ts=from_ts, to_ts=to_ts, limit=limit)
    except db.WarehouseError as exc:
        raise HTTPException(status_code=502, detail={"error": str(exc)})
    return AnalyticsEventsResponse(**data)


@router.get("/rooms", response_model=AnalyticsRoomsResponse)
def get_analytics_rooms(
    request: Request,
    from_ts: datetime | None = Query(None, alias="from"),
    to_ts: datetime | None = Query(None, alias="to"),
) -> AnalyticsRoomsResponse:
    require_council(request)
    try:
        data = db.get_analytics_rooms(from_ts=from_ts, to_ts=to_ts)
    except db.WarehouseError as exc:
        raise HTTPException(status_code=502, detail={"error": str(exc)})
    return AnalyticsRoomsResponse(**data)


@router.get("/clubs", response_model=AnalyticsClubsResponse)
def get_analytics_clubs(
    request: Request,
    from_ts: datetime | None = Query(None, alias="from"),
    to_ts: datetime | None = Query(None, alias="to"),
) -> AnalyticsClubsResponse:
    require_council(request)
    try:
        data = db.get_analytics_clubs(from_ts=from_ts, to_ts=to_ts)
    except db.WarehouseError as exc:
        raise HTTPException(status_code=502, detail={"error": str(exc)})
    return AnalyticsClubsResponse(**data)
