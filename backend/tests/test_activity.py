"""GET /api/activity (v2-api-contracts.md §6.1) — council-only, derived feed.
`db.get_activity` is monkeypatched; ordering/merge logic is also exercised
directly against the real `db.get_activity` with `db._query` stubbed."""

from datetime import datetime

from fastapi.testclient import TestClient

from app import db

_FEED = [
    {"type": "room_booked", "at": datetime(2026, 9, 1, 9, 5, 0), "booking_id": "bk_0001",
     "room": "Auditorium", "event_id": "evt_001", "event_name": "AI Workshop"},
    {"type": "event_created", "at": datetime(2026, 9, 1, 9, 0, 0), "event_id": "evt_002",
     "name": "Robotics Meetup"},
]


class TestActivityEndpoint:
    def test_forbidden_for_student(self, client: TestClient, monkeypatch):
        monkeypatch.setattr(db, "get_activity", lambda limit: (_ for _ in ()).throw(AssertionError))
        resp = client.get("/api/activity")
        assert resp.status_code == 403
        assert resp.json() == {"error": "forbidden"}

    def test_success_shape_and_type_specific_fields(self, council_client: TestClient, monkeypatch):
        monkeypatch.setattr(db, "get_activity", lambda limit: [dict(x) for x in _FEED])
        body = council_client.get("/api/activity").json()
        assert [it["type"] for it in body["activity"]] == ["room_booked", "event_created"]
        booked = body["activity"][0]
        assert booked["booking_id"] == "bk_0001"
        assert booked["room"] == "Auditorium"
        assert booked["event_name"] == "AI Workshop"
        assert "name" not in booked  # excluded via response_model_exclude_none
        created = body["activity"][1]
        assert created["name"] == "Robotics Meetup"
        assert "booking_id" not in created

    def test_empty_activity_is_valid(self, council_client: TestClient, monkeypatch):
        monkeypatch.setattr(db, "get_activity", lambda limit: [])
        resp = council_client.get("/api/activity")
        assert resp.status_code == 200
        assert resp.json() == {"activity": []}

    def test_limit_bounds_are_enforced_by_query_validation(self, council_client: TestClient, monkeypatch):
        monkeypatch.setattr(db, "get_activity", lambda limit: [])
        assert council_client.get("/api/activity", params={"limit": 0}).status_code == 422
        assert council_client.get("/api/activity", params={"limit": 51}).status_code == 422
        assert council_client.get("/api/activity", params={"limit": 50}).status_code == 200

    def test_warehouse_error_is_502(self, council_client: TestClient, monkeypatch):
        def boom(limit):
            raise db.WarehouseError("down")

        monkeypatch.setattr(db, "get_activity", boom)
        assert council_client.get("/api/activity").status_code == 502


class TestActivityMergeOrdering:
    """Exercise the real db.get_activity merge/sort with _query stubbed."""

    def test_merges_and_sorts_descending_by_timestamp(self, monkeypatch):
        events_rows = [
            {"event_id": "evt_003", "name": "Late Event", "created_at": datetime(2026, 9, 2, 12, 0, 0)},
            {"event_id": "evt_001", "name": "Early Event", "created_at": datetime(2026, 9, 1, 8, 0, 0)},
        ]
        booking_rows = [
            {"booking_id": "bk_0002", "event_id": "evt_003", "created_at": datetime(2026, 9, 2, 9, 0, 0),
             "room": "Lab 204", "event_name": "Late Event"},
        ]

        def fake_query(sql, params=None):
            return booking_rows if "room_bookings b" in sql else events_rows

        monkeypatch.setattr(db, "_query", fake_query)
        feed = db.get_activity(limit=10)
        assert [it["at"] for it in feed] == sorted((it["at"] for it in feed), reverse=True)
        assert feed[0]["event_id"] == "evt_003" and feed[0]["type"] == "event_created"
        assert feed[1]["type"] == "room_booked"
        assert feed[-1]["name"] == "Early Event"

    def test_limit_truncates_merged_feed(self, monkeypatch):
        many_events = [
            {"event_id": f"evt_{i:03d}", "name": f"E{i}", "created_at": datetime(2026, 9, 1, i, 0, 0)}
            for i in range(1, 6)
        ]
        monkeypatch.setattr(db, "_query", lambda sql, params=None: many_events if "room_bookings" not in sql else [])
        feed = db.get_activity(limit=2)
        assert len(feed) == 2
        assert feed[0]["name"] == "E5"  # most recent first
