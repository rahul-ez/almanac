"""GET /api/campus/pulse (v2-api-contracts.md §4.1). `db.get_campus_pulse` is
monkeypatched; these assert the composite response shape, the empty-campus
case, and the 502-no-partial-payload rule."""

from datetime import datetime

from fastapi.testclient import TestClient

from app import db

_FULL = {
    "at": datetime(2026, 9, 5, 15, 0, 0),
    "events_now": [
        {
            "event_id": "evt_001",
            "name": "AI Workshop",
            "club": "AI Club",
            "room": "Auditorium",
            "end_ts": datetime(2026, 9, 5, 17, 0, 0),
        }
    ],
    "events_upcoming": [
        {
            "event_id": "evt_004",
            "name": "Robotics Meetup",
            "club": "Robotics Club",
            "start_ts": datetime(2026, 9, 5, 18, 0, 0),
        }
    ],
    "rooms_available_count": 5,
    "rooms_total_count": 9,
    "registrations_today": 12,
    "next_major_event": {
        "event_id": "evt_004",
        "name": "Robotics Meetup",
        "start_ts": datetime(2026, 9, 5, 18, 0, 0),
    },
}

_EMPTY = {
    "at": datetime(2026, 9, 5, 3, 0, 0),
    "events_now": [],
    "events_upcoming": [],
    "rooms_available_count": 9,
    "rooms_total_count": 9,
    "registrations_today": 0,
    "next_major_event": None,
}


def test_full_snapshot_shape(client: TestClient, monkeypatch):
    monkeypatch.setattr(db, "get_campus_pulse", lambda at: dict(_FULL))
    body = client.get("/api/campus/pulse").json()
    assert body["at"] == "2026-09-05T15:00:00"
    assert body["events_now"][0]["event_id"] == "evt_001"
    assert body["events_now"][0]["end_ts"] == "2026-09-05T17:00:00"
    assert body["events_upcoming"][0]["event_id"] == "evt_004"
    assert body["rooms_available_count"] == 5
    assert body["rooms_total_count"] == 9
    assert body["registrations_today"] == 12
    assert body["next_major_event"]["event_id"] == "evt_004"


def test_empty_campus_is_valid_not_error(client: TestClient, monkeypatch):
    monkeypatch.setattr(db, "get_campus_pulse", lambda at: dict(_EMPTY))
    resp = client.get("/api/campus/pulse")
    assert resp.status_code == 200
    body = resp.json()
    assert body["events_now"] == []
    assert body["events_upcoming"] == []
    assert body["next_major_event"] is None
    assert body["registrations_today"] == 0


def test_next_major_event_is_first_upcoming(client: TestClient, monkeypatch):
    data = dict(
        _FULL,
        events_upcoming=[
            {"event_id": "evt_007", "name": "Talk", "club": "X", "start_ts": datetime(2026, 9, 5, 16, 0)},
            {"event_id": "evt_004", "name": "Robotics Meetup", "club": "Robotics Club", "start_ts": datetime(2026, 9, 5, 18, 0)},
        ],
        next_major_event={"event_id": "evt_007", "name": "Talk", "start_ts": datetime(2026, 9, 5, 16, 0)},
    )
    monkeypatch.setattr(db, "get_campus_pulse", lambda at: data)
    body = client.get("/api/campus/pulse").json()
    assert body["next_major_event"]["event_id"] == "evt_007"


def test_warehouse_failure_is_502_with_no_partial_payload(client: TestClient, monkeypatch):
    def boom(at):
        raise db.WarehouseError("warehouse unreachable")

    monkeypatch.setattr(db, "get_campus_pulse", boom)
    resp = client.get("/api/campus/pulse")
    assert resp.status_code == 502
    assert resp.json() == {"error": "warehouse unreachable"}
    assert "events_now" not in resp.json()


def test_available_open_to_any_session_no_auth_required(council_client: TestClient, monkeypatch):
    monkeypatch.setattr(db, "get_campus_pulse", lambda at: dict(_FULL))
    assert council_client.get("/api/campus/pulse").status_code == 200
