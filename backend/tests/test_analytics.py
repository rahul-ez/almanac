"""V2 Analytics tests: authorization and payload contracts."""

from unittest.mock import patch
from fastapi.testclient import TestClient


def test_analytics_forbidden_for_student(client: TestClient) -> None:
    assert client.get("/api/analytics/overview").status_code == 403
    assert client.get("/api/analytics/events").status_code == 403
    assert client.get("/api/analytics/rooms").status_code == 403
    assert client.get("/api/analytics/clubs").status_code == 403


def test_analytics_overview_success(council_client: TestClient) -> None:
    mock_overview = {
        "range": {"from": None, "to": None},
        "total_events": 11,
        "upcoming_events": 4,
        "total_registrations": 47,
        "average_attendance_per_event": 4.3,
        "active_clubs": 5,
        "rooms_booked_now": 3,
        "rooms_total": 9,
    }
    with patch("app.db.get_analytics_overview", return_value=mock_overview):
        res = council_client.get("/api/analytics/overview")
        assert res.status_code == 200
        data = res.json()
        assert data["total_events"] == 11
        assert data["active_clubs"] == 5


def test_analytics_events_success(council_client: TestClient) -> None:
    mock_events = {
        "range": {"from": None, "to": None},
        "popular_events": [{"event_id": "evt_001", "name": "AI Workshop", "attendance_count": 42}],
        "low_attendance_events": [],
        "zero_attendance_events": [{"event_id": "evt_004", "name": "Prep", "attendance_count": 0}],
    }
    with patch("app.db.get_analytics_events", return_value=mock_events):
        res = council_client.get("/api/analytics/events")
        assert res.status_code == 200
        data = res.json()
        assert len(data["popular_events"]) == 1


def test_analytics_rooms_success(council_client: TestClient) -> None:
    mock_rooms = {
        "range": {"from": None, "to": None},
        "room_utilization": [{"room_id": "room_005", "name": "Lab 204", "type": "Lab", "confirmed_bookings": 5, "total_booked_hours": 10.0}],
        "peak_booking_periods": [{"hour_of_day": 10, "booking_count": 3}],
    }
    with patch("app.db.get_analytics_rooms", return_value=mock_rooms):
        res = council_client.get("/api/analytics/rooms")
        assert res.status_code == 200
        data = res.json()
        assert len(data["room_utilization"]) == 1


def test_analytics_clubs_success(council_client: TestClient) -> None:
    mock_clubs = {
        "range": {"from": None, "to": None},
        "club_activity": [{"club_id": "club_001", "name": "AI Club", "active": True, "event_count": 3, "total_registrations": 47}],
    }
    with patch("app.db.get_analytics_clubs", return_value=mock_clubs):
        res = council_client.get("/api/analytics/clubs")
        assert res.status_code == 200
        data = res.json()
        assert len(data["club_activity"]) == 1
