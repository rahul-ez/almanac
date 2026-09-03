"""V2 events tests: filters, detail endpoint, cancellation endpoint, and permissions."""

from datetime import datetime
from unittest.mock import patch
from fastapi.testclient import TestClient

from app import db


def test_list_events_with_filters(client: TestClient) -> None:
    mock_events = [
        {
            "event_id": "evt_001",
            "name": "AI Workshop",
            "club": "AI Club",
            "start_ts": datetime(2026, 9, 5, 14, 0),
            "end_ts": datetime(2026, 9, 5, 16, 0),
            "room": "Lab 204",
            "topic": "AI",
            "status": "scheduled",
            "attendance_count": 12,
        }
    ]
    with patch("app.db.get_events", return_value=mock_events) as mock_get:
        res = client.get("/api/events?from=2026-09-01T00:00:00&to=2026-09-07T23:59:59&club_id=AI%20Club&q=Workshop")
        assert res.status_code == 200
        assert len(res.json()["events"]) == 1
        assert res.json()["events"][0]["event_id"] == "evt_001"
        assert mock_get.called


def test_get_event_detail_success(client: TestClient) -> None:
    mock_event = {
        "event_id": "evt_001",
        "name": "AI Workshop",
        "club": "AI Club",
        "start_ts": datetime(2026, 9, 5, 14, 0),
        "end_ts": datetime(2026, 9, 5, 16, 0),
        "room_id": "room_005",
        "room": "Lab 204",
        "topic": "AI",
        "description": "Hands-on machine learning.",
        "status": "scheduled",
        "attendance_count": 15,
    }
    with patch("app.db.get_event_detail", return_value=mock_event):
        res = client.get("/api/events/evt_001")
        assert res.status_code == 200
        data = res.json()
        assert data["name"] == "AI Workshop"
        assert data["attendance_count"] == 15


def test_get_event_detail_not_found(client: TestClient) -> None:
    with patch("app.db.get_event_detail", side_effect=db.NotFoundError("event_not_found")):
        res = client.get("/api/events/evt_999")
        assert res.status_code == 404
        assert res.json() == {"error": "event_not_found"}


def test_cancel_event_forbidden_for_student(client: TestClient) -> None:
    res = client.patch("/api/events/evt_001", json={"status": "cancelled"})
    assert res.status_code == 403
    assert res.json() == {"error": "forbidden"}


def test_cancel_event_success_for_council(council_client: TestClient) -> None:
    with patch("app.db.cancel_event", return_value={"event_id": "evt_001", "status": "cancelled"}):
        res = council_client.patch("/api/events/evt_001", json={"status": "cancelled"})
        assert res.status_code == 200
        assert res.json() == {"event_id": "evt_001", "status": "cancelled"}


def test_cancel_event_invalid_status_transition(council_client: TestClient) -> None:
    with patch("app.db.cancel_event", side_effect=db.InvalidStatusTransitionError("invalid_status_transition")):
        res = council_client.patch("/api/events/evt_001", json={"status": "cancelled"})
        assert res.status_code == 422
        assert res.json() == {"error": "invalid_status_transition"}
