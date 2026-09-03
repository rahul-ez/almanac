"""Analytics endpoints (v2-api-contracts.md §5) — all council-only. `db` is
monkeypatched; these assert the exact response shapes, the range echo, the
403-before-any-query rule, and that empty aggregates are valid (not errors)."""

import pytest
from fastapi.testclient import TestClient

from app import db

_ANALYTICS_PATHS = [
    "/api/analytics/overview",
    "/api/analytics/events",
    "/api/analytics/rooms",
    "/api/analytics/clubs",
]

_OVERVIEW = {
    "range": {"from": None, "to": None},
    "total_events": 12,
    "upcoming_events": 4,
    "total_registrations": 47,
    "average_attendance_per_event": 3.9,
    "active_clubs": 5,
    "rooms_booked_now": 4,
    "rooms_total": 9,
}
_EVENTS = {
    "range": {"from": None, "to": None},
    "popular_events": [{"event_id": "evt_001", "name": "AI Workshop", "attendance_count": 42}],
    "low_attendance_events": [{"event_id": "evt_009", "name": "Civil Info", "attendance_count": 1}],
    "zero_attendance_events": [{"event_id": "evt_011", "name": "Photo Walk", "attendance_count": 0}],
}
_ROOMS = {
    "range": {"from": None, "to": None},
    "room_utilization": [
        {"room_id": "room_005", "name": "Lab 204", "type": "lab", "confirmed_bookings": 6, "total_booked_hours": 12.0}
    ],
    "peak_booking_periods": [{"hour_of_day": 15, "booking_count": 8}],
}
_CLUBS = {
    "range": {"from": None, "to": None},
    "club_activity": [
        {"club_id": "club_001", "name": "AI Club", "active": True, "event_count": 3, "total_registrations": 58}
    ],
}


@pytest.mark.parametrize("path", _ANALYTICS_PATHS)
def test_student_session_forbidden_before_any_query(path, client: TestClient, monkeypatch):
    def tripwire(*a, **k):  # must never be reached for a student
        raise AssertionError("query constructed for a forbidden caller")

    monkeypatch.setattr(db, "get_analytics_overview", tripwire)
    monkeypatch.setattr(db, "get_analytics_events", tripwire)
    monkeypatch.setattr(db, "get_analytics_rooms", tripwire)
    monkeypatch.setattr(db, "get_analytics_clubs", tripwire)
    resp = client.get(path)
    assert resp.status_code == 403
    assert resp.json() == {"error": "forbidden"}


class TestOverview:
    def test_success_shape(self, council_client: TestClient, monkeypatch):
        monkeypatch.setattr(db, "get_analytics_overview", lambda f, t: dict(_OVERVIEW))
        body = council_client.get("/api/analytics/overview").json()
        assert body["range"] == {"from": None, "to": None}
        assert body["total_events"] == 12
        assert body["average_attendance_per_event"] == 3.9
        assert body["rooms_total"] == 9

    def test_range_is_echoed_from_query_params(self, council_client: TestClient, monkeypatch):
        seen = {}

        def capture(f, t):
            seen["f"], seen["t"] = f, t
            return dict(_OVERVIEW, range={"from": f.isoformat() if f else None, "to": t.isoformat() if t else None})

        monkeypatch.setattr(db, "get_analytics_overview", capture)
        body = council_client.get(
            "/api/analytics/overview", params={"from": "2026-09-01", "to": "2026-09-30"}
        ).json()
        assert str(seen["f"]) == "2026-09-01 00:00:00"
        assert body["range"] == {"from": "2026-09-01T00:00:00", "to": "2026-09-30T00:00:00"}

    def test_empty_campus_zeros_are_valid(self, council_client: TestClient, monkeypatch):
        empty = dict(_OVERVIEW, total_events=0, total_registrations=0, average_attendance_per_event=0.0,
                     upcoming_events=0, active_clubs=0, rooms_booked_now=0)
        monkeypatch.setattr(db, "get_analytics_overview", lambda f, t: empty)
        resp = council_client.get("/api/analytics/overview")
        assert resp.status_code == 200
        assert resp.json()["total_events"] == 0
        assert resp.json()["average_attendance_per_event"] == 0.0


class TestEventsAnalytics:
    def test_success_shape(self, council_client: TestClient, monkeypatch):
        monkeypatch.setattr(db, "get_analytics_events", lambda f, t, limit: dict(_EVENTS))
        body = council_client.get("/api/analytics/events").json()
        assert body["popular_events"][0]["attendance_count"] == 42
        assert body["zero_attendance_events"][0]["attendance_count"] == 0

    def test_limit_is_forwarded(self, council_client: TestClient, monkeypatch):
        seen = {}
        monkeypatch.setattr(
            db, "get_analytics_events",
            lambda f, t, limit: seen.update(limit=limit) or dict(_EVENTS),
        )
        council_client.get("/api/analytics/events", params={"limit": 3})
        assert seen["limit"] == 3

    def test_empty_lists_are_valid(self, council_client: TestClient, monkeypatch):
        empty = {"range": {"from": None, "to": None}, "popular_events": [],
                 "low_attendance_events": [], "zero_attendance_events": []}
        monkeypatch.setattr(db, "get_analytics_events", lambda f, t, limit: empty)
        resp = council_client.get("/api/analytics/events")
        assert resp.status_code == 200
        assert resp.json()["popular_events"] == []


class TestRoomsAnalytics:
    def test_success_shape(self, council_client: TestClient, monkeypatch):
        monkeypatch.setattr(db, "get_analytics_rooms", lambda f, t: dict(_ROOMS))
        body = council_client.get("/api/analytics/rooms").json()
        util = body["room_utilization"][0]
        assert util["room_id"] == "room_005"
        assert util["confirmed_bookings"] == 6
        assert util["total_booked_hours"] == 12.0
        assert body["peak_booking_periods"][0] == {"hour_of_day": 15, "booking_count": 8}

    def test_warehouse_error_is_502(self, council_client: TestClient, monkeypatch):
        def boom(f, t):
            raise db.WarehouseError("down")

        monkeypatch.setattr(db, "get_analytics_rooms", boom)
        assert council_client.get("/api/analytics/rooms").status_code == 502


class TestClubsAnalytics:
    def test_success_shape(self, council_client: TestClient, monkeypatch):
        monkeypatch.setattr(db, "get_analytics_clubs", lambda f, t: dict(_CLUBS))
        body = council_client.get("/api/analytics/clubs").json()
        row = body["club_activity"][0]
        assert row == {
            "club_id": "club_001",
            "name": "AI Club",
            "active": True,
            "event_count": 3,
            "total_registrations": 58,
        }

    def test_empty_is_valid(self, council_client: TestClient, monkeypatch):
        monkeypatch.setattr(
            db, "get_analytics_clubs",
            lambda f, t: {"range": {"from": None, "to": None}, "club_activity": []},
        )
        resp = council_client.get("/api/analytics/clubs")
        assert resp.status_code == 200
        assert resp.json()["club_activity"] == []
