"""V2 event endpoints (v2-api-contracts.md §3.1, §3.2, §8.2).

`db` is monkeypatched — these assert routing, query-param plumbing, response
shape, and role enforcement, not live Databricks behavior. The filter SQL
itself is exercised by inspecting the kwargs the router forwards to `db.get_events`.
"""

from datetime import datetime

from fastapi.testclient import TestClient

from app import db


def _row(**over):
    base = {
        "event_id": "evt_001",
        "name": "AI Workshop",
        "club": "AI Club",
        "topic": "AI",
        "start_ts": datetime(2026, 9, 5, 15, 0, 0),
        "end_ts": datetime(2026, 9, 5, 17, 0, 0),
        "room": "Auditorium",
        "status": "scheduled",
        "attendance_count": 42,
    }
    base.update(over)
    return base


class TestListEventsV2Filters:
    def test_v2_fields_present_in_response(self, client: TestClient, monkeypatch):
        monkeypatch.setattr(db, "get_events", lambda **kw: [_row()])
        body = client.get("/api/events").json()["events"][0]
        assert body["topic"] == "AI"
        assert body["end_ts"] == "2026-09-05T17:00:00"
        assert body["status"] == "scheduled"
        assert body["attendance_count"] == 42

    def test_all_filters_are_forwarded_to_db(self, client: TestClient, monkeypatch):
        seen = {}

        def capture(**kw):
            seen.update(kw)
            return []

        monkeypatch.setattr(db, "get_events", capture)
        resp = client.get(
            "/api/events",
            params={
                "upcoming": "false",
                "from": "2026-09-01",
                "to": "2026-09-08",
                "club_id": "club_001",
                "status": "cancelled",
                "q": "workshop",
            },
        )
        assert resp.status_code == 200
        assert seen["upcoming"] is False
        assert seen["date_from"] == datetime(2026, 9, 1, 0, 0, 0)
        assert seen["date_to"] == datetime(2026, 9, 8, 0, 0, 0)
        assert seen["club_id"] == "club_001"
        assert seen["status"] == "cancelled"
        assert seen["q"] == "workshop"

    def test_unknown_club_id_returns_empty_list_not_error(self, client: TestClient, monkeypatch):
        monkeypatch.setattr(db, "get_events", lambda **kw: [])
        resp = client.get("/api/events", params={"club_id": "club_999"})
        assert resp.status_code == 200
        assert resp.json() == {"events": []}

    def test_invalid_status_value_is_422(self, client: TestClient, monkeypatch):
        monkeypatch.setattr(db, "get_events", lambda **kw: [])
        resp = client.get("/api/events", params={"status": "postponed"})
        assert resp.status_code == 422

    def test_cancelled_events_excluded_by_default_upcoming(self, client: TestClient, monkeypatch):
        # The router forwards upcoming=True by default; db is responsible for the
        # actual exclusion, so we assert the default reaches it.
        seen = {}
        monkeypatch.setattr(db, "get_events", lambda **kw: seen.update(kw) or [])
        client.get("/api/events")
        assert seen["upcoming"] is True
        assert seen["status"] is None

    def test_warehouse_error_shape_unchanged(self, client: TestClient, monkeypatch):
        def boom(**kw):
            raise db.WarehouseError("timeout")

        monkeypatch.setattr(db, "get_events", boom)
        resp = client.get("/api/events")
        assert resp.status_code == 502
        assert resp.json()["events"] == []
        assert "error" in resp.json()


class TestEventDetail:
    DETAIL = {
        "event_id": "evt_001",
        "name": "AI Workshop",
        "club": "AI Club",
        "club_id": "club_001",
        "topic": "AI",
        "description": "Hands-on intro to LLMs",
        "room": "Auditorium",
        "room_id": "room_005",
        "start_ts": datetime(2026, 9, 5, 15, 0, 0),
        "end_ts": datetime(2026, 9, 5, 17, 0, 0),
        "status": "scheduled",
        "attendance_count": 42,
        "created_at": datetime(2026, 9, 1, 9, 0, 0),
    }

    def test_success_shape(self, client: TestClient, monkeypatch):
        monkeypatch.setattr(db, "get_event_detail", lambda eid: dict(self.DETAIL))
        body = client.get("/api/events/evt_001").json()
        assert body["event_id"] == "evt_001"
        assert body["club_id"] == "club_001"
        assert body["room_id"] == "room_005"
        assert body["description"] == "Hands-on intro to LLMs"
        assert body["attendance_count"] == 42
        assert body["created_at"] == "2026-09-01T09:00:00"

    def test_unbooked_event_has_null_room(self, client: TestClient, monkeypatch):
        row = dict(self.DETAIL, room=None, room_id=None, description=None)
        monkeypatch.setattr(db, "get_event_detail", lambda eid: row)
        body = client.get("/api/events/evt_001").json()
        assert body["room"] is None
        assert body["room_id"] is None

    def test_missing_event_is_404(self, client: TestClient, monkeypatch):
        monkeypatch.setattr(db, "get_event_detail", lambda eid: None)
        resp = client.get("/api/events/evt_404")
        assert resp.status_code == 404
        assert resp.json() == {"error": "event_not_found"}

    def test_warehouse_error_is_502(self, client: TestClient, monkeypatch):
        def boom(eid):
            raise db.WarehouseError("down")

        monkeypatch.setattr(db, "get_event_detail", boom)
        resp = client.get("/api/events/evt_001")
        assert resp.status_code == 502


class TestPatchEventCancel:
    def test_forbidden_without_council_session(self, client: TestClient):
        resp = client.patch("/api/events/evt_001", json={"status": "cancelled"})
        assert resp.status_code == 403
        assert resp.json() == {"error": "forbidden"}

    def test_success_cancels_and_returns_status(self, council_client: TestClient, monkeypatch):
        called = {}
        monkeypatch.setattr(
            db,
            "cancel_event",
            lambda eid: called.update(eid=eid) or {"event_id": eid, "status": "cancelled"},
        )
        resp = council_client.patch("/api/events/evt_001", json={"status": "cancelled"})
        assert resp.status_code == 200
        assert resp.json() == {"event_id": "evt_001", "status": "cancelled"}
        assert called["eid"] == "evt_001"

    def test_non_cancel_status_is_422_transition_error(self, council_client: TestClient, monkeypatch):
        monkeypatch.setattr(db, "cancel_event", lambda eid: {"event_id": eid, "status": "x"})
        resp = council_client.patch("/api/events/evt_001", json={"status": "scheduled"})
        assert resp.status_code == 422
        assert resp.json() == {"error": "invalid_status_transition"}

    def test_unknown_event_is_404(self, council_client: TestClient, monkeypatch):
        def boom(eid):
            raise db.NotFoundError("event_not_found")

        monkeypatch.setattr(db, "cancel_event", boom)
        resp = council_client.patch("/api/events/evt_404", json={"status": "cancelled"})
        assert resp.status_code == 404
        assert resp.json() == {"error": "event_not_found"}

    def test_already_cancelled_is_422_transition_error(self, council_client: TestClient, monkeypatch):
        def boom(eid):
            raise db.InvalidStatusTransitionError()

        monkeypatch.setattr(db, "cancel_event", boom)
        resp = council_client.patch("/api/events/evt_001", json={"status": "cancelled"})
        assert resp.status_code == 422
        assert resp.json() == {"error": "invalid_status_transition"}

    def test_warehouse_error_is_502(self, council_client: TestClient, monkeypatch):
        def boom(eid):
            raise db.WarehouseError("down")

        monkeypatch.setattr(db, "cancel_event", boom)
        resp = council_client.patch("/api/events/evt_001", json={"status": "cancelled"})
        assert resp.status_code == 502


class TestEventAttendees:
    def test_forbidden_for_student(self, client: TestClient):
        resp = client.get("/api/events/evt_001/attendees")
        assert resp.status_code == 403
        assert resp.json() == {"error": "forbidden"}

    def test_success_returns_attendee_list(self, council_client: TestClient, monkeypatch):
        mock_data = {
            "event_id": "evt_001",
            "event_name": "AI Workshop",
            "total_count": 2,
            "attendees": [
                {
                    "attendance_id": "att_001",
                    "event_id": "evt_001",
                    "registrant_name": "Alice Chen",
                    "registrant_email": "alice@campus.edu",
                    "registered_at": datetime(2026, 9, 2, 10, 0),
                    "student_id": "stu_001",
                    "major": "Computer Science",
                    "year": 3,
                },
                {
                    "attendance_id": "att_002",
                    "event_id": "evt_001",
                    "registrant_name": "Bob Smith",
                    "registrant_email": "bob@campus.edu",
                    "registered_at": datetime(2026, 9, 2, 11, 0),
                    "student_id": None,
                    "major": None,
                    "year": None,
                },
            ],
        }
        monkeypatch.setattr(db, "get_event_attendees", lambda eid: mock_data)
        resp = council_client.get("/api/events/evt_001/attendees")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_count"] == 2
        assert len(data["attendees"]) == 2
        assert data["attendees"][0]["registrant_name"] == "Alice Chen"
        assert data["attendees"][0]["registrant_email"] == "alice@campus.edu"

    def test_not_found_is_404(self, council_client: TestClient, monkeypatch):
        def boom(eid):
            raise db.NotFoundError("event_not_found")

        monkeypatch.setattr(db, "get_event_attendees", boom)
        resp = council_client.get("/api/events/evt_404/attendees")
        assert resp.status_code == 404
        assert resp.json() == {"error": "event_not_found"}
