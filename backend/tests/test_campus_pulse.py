"""V2 Campus Pulse tests."""

from datetime import datetime
from unittest.mock import patch
from fastapi.testclient import TestClient


def test_get_campus_pulse(client: TestClient) -> None:
    mock_pulse = {
        "events_now": [
            {
                "event_id": "evt_002",
                "name": "Robotics Demo Day",
                "club": "Robotics Society",
                "room": "Lab 204",
                "start_ts": datetime(2026, 9, 2, 13, 0),
                "end_ts": datetime(2026, 9, 2, 15, 0),
            }
        ],
        "events_upcoming": [
            {
                "event_id": "evt_001",
                "name": "AI Workshop",
                "club": "AI Club",
                "room": "Auditorium",
                "start_ts": datetime(2026, 9, 2, 16, 0),
                "end_ts": datetime(2026, 9, 2, 18, 0),
            }
        ],
        "rooms_available_count": 5,
        "rooms_total_count": 9,
        "registrations_today": 14,
        "next_major_event": {
            "event_id": "evt_001",
            "name": "AI Workshop",
            "club": "AI Club",
            "room": "Auditorium",
            "start_ts": datetime(2026, 9, 2, 16, 0),
            "end_ts": datetime(2026, 9, 2, 18, 0),
        },
        "timestamp": datetime(2026, 9, 2, 14, 0),
    }
    with patch("app.db.get_campus_pulse", return_value=mock_pulse):
        res = client.get("/api/campus/pulse")
        assert res.status_code == 200
        data = res.json()
        assert data["rooms_available_count"] == 5
        assert data["rooms_total_count"] == 9
        assert len(data["events_now"]) == 1
        assert data["next_major_event"]["name"] == "AI Workshop"
