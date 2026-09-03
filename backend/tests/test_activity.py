"""V2 Activity tests."""

from datetime import datetime
from unittest.mock import patch
from fastapi.testclient import TestClient


def test_activity_forbidden_for_student(client: TestClient) -> None:
    res = client.get("/api/activity")
    assert res.status_code == 403
    assert res.json() == {"error": "forbidden"}


def test_activity_success_for_council(council_client: TestClient) -> None:
    mock_act = [
        {
            "type": "event_created",
            "at": datetime(2026, 9, 2, 10, 0),
            "event_id": "evt_001",
            "name": "AI Workshop",
            "booking_id": None,
            "room": None,
            "event_name": None,
        }
    ]
    with patch("app.db.get_activity", return_value=mock_act):
        res = council_client.get("/api/activity?limit=10")
        assert res.status_code == 200
        data = res.json()
        assert len(data["activity"]) == 1
        assert data["activity"][0]["type"] == "event_created"
