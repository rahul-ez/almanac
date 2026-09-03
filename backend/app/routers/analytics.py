"""Council Control Center analytics endpoints (v2-api-contracts.md §5).

All four are council-only: a `student` (or session-less) caller gets
`403 {"error": "forbidden"}` before any query is constructed, via
`require_council`. Every metric is a direct aggregate over existing governed
tables — no new table, no new derived semantic, no predictive modeling.
"""

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

router = APIRouter()


@router.get("/analytics/overview", response_model=AnalyticsOverviewResponse)
def analytics_overview(
    request: Request,
    date_from: datetime | None = Query(default=None, alias="from"),
    date_to: datetime | None = Query(default=None, alias="to"),
) -> AnalyticsOverviewResponse:
    require_council(request)
    try:
        data = db.get_analytics_overview(date_from, date_to)
    except db.WarehouseError as exc:
        raise HTTPException(status_code=502, detail={"error": str(exc)})
    return AnalyticsOverviewResponse.model_validate(data)


@router.get("/analytics/events", response_model=AnalyticsEventsResponse)
def analytics_events(
    request: Request,
    date_from: datetime | None = Query(default=None, alias="from"),
    date_to: datetime | None = Query(default=None, alias="to"),
    limit: int = Query(default=10, ge=1, le=100),
) -> AnalyticsEventsResponse:
    require_council(request)
    try:
        data = db.get_analytics_events(date_from, date_to, limit)
    except db.WarehouseError as exc:
        raise HTTPException(status_code=502, detail={"error": str(exc)})
    return AnalyticsEventsResponse.model_validate(data)


@router.get("/analytics/rooms", response_model=AnalyticsRoomsResponse)
def analytics_rooms(
    request: Request,
    date_from: datetime | None = Query(default=None, alias="from"),
    date_to: datetime | None = Query(default=None, alias="to"),
) -> AnalyticsRoomsResponse:
    require_council(request)
    try:
        data = db.get_analytics_rooms(date_from, date_to)
    except db.WarehouseError as exc:
        raise HTTPException(status_code=502, detail={"error": str(exc)})
    return AnalyticsRoomsResponse.model_validate(data)


@router.get("/analytics/clubs", response_model=AnalyticsClubsResponse)
def analytics_clubs(
    request: Request,
    date_from: datetime | None = Query(default=None, alias="from"),
    date_to: datetime | None = Query(default=None, alias="to"),
) -> AnalyticsClubsResponse:
    require_council(request)
    try:
        data = db.get_analytics_clubs(date_from, date_to)
    except db.WarehouseError as exc:
        raise HTTPException(status_code=502, detail={"error": str(exc)})
    return AnalyticsClubsResponse.model_validate(data)
