"""API/integration tests: one test per endpoint asserting the documented
success shape and at least one documented error shape, per
context/code-standards.md's Testing Standards. `app.db` and
`app.genie_client` are monkeypatched — these tests exercise routing,
contract shape, and role enforcement, not real Databricks connectivity (see
this workstream's summary for what remains to be verified against a live
warehouse/Genie Space)."""

from datetime import datetime

from fastapi.testclient import TestClient

from app import db, genie_client


# --- Session -----------------------------------------------------------------
class TestSession:
    def test_correct_code_returns_council_and_sets_cookie(self, client: TestClient):
        from app.config import settings

        resp = client.post("/api/session", json={"access_code": settings.council_access_code})
        assert resp.status_code == 200
        assert resp.json() == {"role": "council"}
        assert "cc_session" in resp.cookies

    def test_missing_code_returns_student_never_errors(self, client: TestClient):
        resp = client.post("/api/session", json={})
        assert resp.status_code == 200
        assert resp.json() == {"role": "student"}

    def test_wrong_code_returns_student_never_errors(self, client: TestClient):
        resp = client.post("/api/session", json={"access_code": "wrong"})
        assert resp.status_code == 200
        assert resp.json() == {"role": "student"}


# --- Genie -----------------------------------------------------------------
class TestAskGenie:
    def test_ok_answer_shape(self, client: TestClient, monkeypatch):
        monkeypatch.setattr(
            genie_client,
            "ask",
            lambda q: genie_client.GenieAnswer(
                status="ok", answer="Yes.", sql="SELECT 1", rows=[{"a": 1}]
            ),
        )
        resp = client.post("/api/genie/ask", json={"question": "Is Lab 204 free?"})
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ok"
        assert body["answer"] == "Yes."
        assert body["sql"] == "SELECT 1"
        assert body["rows"] == [{"a": 1}]
        assert "message" not in body

    def test_no_answer_shape(self, client: TestClient, monkeypatch):
        monkeypatch.setattr(
            genie_client,
            "ask",
            lambda q: genie_client.GenieAnswer(status="no_answer", message="No governed answer."),
        )
        resp = client.post("/api/genie/ask", json={"question": "What's for lunch?"})
        assert resp.status_code == 200
        body = resp.json()
        assert body == {"status": "no_answer", "message": "No governed answer."}

    def test_error_shape(self, client: TestClient, monkeypatch):
        monkeypatch.setattr(
            genie_client,
            "ask",
            lambda q: genie_client.GenieAnswer(
                status="error", message="Live data unavailable — try again shortly."
            ),
        )
        resp = client.post("/api/genie/ask", json={"question": "Anything"})
        assert resp.status_code == 502
        assert resp.json() == {
            "status": "error",
            "message": "Live data unavailable — try again shortly.",
        }


# --- Events -----------------------------------------------------------------
class TestListEvents:
    def test_success_shape(self, client: TestClient, monkeypatch):
        monkeypatch.setattr(
            db,
            "get_events",
            lambda upcoming=True: [
                {
                    "event_id": "evt_001",
                    "name": "AI Workshop",
                    "club": "AI Club",
                    "start_ts": datetime(2026, 9, 5, 15, 0, 0),
                    "room": "Lab 204",
                    "attendance_count": 5,
                }
            ],
        )
        resp = client.get("/api/events")
        assert resp.status_code == 200
        assert resp.json()["events"][0]["event_id"] == "evt_001"
        assert resp.json()["events"][0]["attendance_count"] == 5

    def test_warehouse_error_shape(self, client: TestClient, monkeypatch):
        def boom(upcoming=True):
            raise db.WarehouseError("connection refused")

        monkeypatch.setattr(db, "get_events", boom)
        resp = client.get("/api/events")
        assert resp.status_code == 502
        assert resp.json()["events"] == []
        assert "error" in resp.json()


class TestCreateEvent:
    def test_forbidden_without_council_session(self, client: TestClient):
        resp = client.post(
            "/api/events",
            json={
                "name": "AI Workshop",
                "club": "AI Club",
                "start_ts": "2026-09-05T15:00:00",
            },
        )
        assert resp.status_code == 403
        assert resp.json() == {"error": "forbidden"}

    def test_success_shape(self, council_client: TestClient, monkeypatch):
        monkeypatch.setattr(
            db,
            "create_event",
            lambda **kwargs: {
                "event_id": "evt_013",
                "name": kwargs["name"],
                "club": "AI Club",
                "start_ts": kwargs["start_ts"],
                "room_id": None,
                "topic": kwargs.get("topic"),
            },
        )
        resp = council_client.post(
            "/api/events",
            json={
                "name": "New Talk",
                "club": "AI Club",
                "start_ts": "2026-09-06T10:00:00",
            },
        )
        assert resp.status_code == 201
        assert resp.json()["event_id"] == "evt_013"

    def test_conflict_shape(self, council_client: TestClient, monkeypatch):
        def boom(**kwargs):
            raise db.BookingConflictError({"booking_id": "bk_0001", "room_id": "room_005"})

        monkeypatch.setattr(db, "create_event", boom)
        resp = council_client.post(
            "/api/events",
            json={
                "name": "Clash",
                "club": "AI Club",
                "start_ts": "2026-09-05T15:30:00",
                "room_id": "room_005",
            },
        )
        assert resp.status_code == 409
        assert resp.json()["error"] == "conflict"
        assert resp.json()["conflicting_booking"]["booking_id"] == "bk_0001"


# --- Rooms -----------------------------------------------------------------
class TestRoomAvailability:
    def test_success_shape(self, client: TestClient, monkeypatch):
        monkeypatch.setattr(
            db,
            "get_free_rooms",
            lambda room_type, at: [{"room_id": "room_009", "name": "Lab 305", "type": "lab"}],
        )
        resp = client.get(
            "/api/rooms/availability", params={"type": "lab", "at": "2026-09-02T15:00:00"}
        )
        assert resp.status_code == 200
        assert resp.json()["free_rooms"][0]["room_id"] == "room_009"

    def test_warehouse_error_shape(self, client: TestClient, monkeypatch):
        def boom(room_type, at):
            raise db.WarehouseError("timeout")

        monkeypatch.setattr(db, "get_free_rooms", boom)
        resp = client.get("/api/rooms/availability")
        assert resp.status_code == 502
        assert resp.json()["free_rooms"] == []


class TestCreateBooking:
    def test_forbidden_without_council_session(self, client: TestClient):
        resp = client.post(
            "/api/bookings",
            json={
                "room_id": "room_005",
                "event_id": "evt_001",
                "start_ts": "2026-09-05T15:00:00",
                "end_ts": "2026-09-05T17:00:00",
            },
        )
        assert resp.status_code == 403
        assert resp.json() == {"error": "forbidden"}

    def test_success_shape(self, council_client: TestClient, monkeypatch):
        monkeypatch.setattr(
            db,
            "create_booking",
            lambda **kwargs: {"booking_id": "bk_0011", **kwargs},
        )
        resp = council_client.post(
            "/api/bookings",
            json={
                "room_id": "room_005",
                "event_id": "evt_001",
                "start_ts": "2026-09-05T15:00:00",
                "end_ts": "2026-09-05T17:00:00",
            },
        )
        assert resp.status_code == 201
        assert resp.json()["booking_id"] == "bk_0011"

    def test_conflict_shape(self, council_client: TestClient, monkeypatch):
        def boom(**kwargs):
            raise db.BookingConflictError(
                {
                    "booking_id": "bk_0001",
                    "room_id": "room_005",
                    "event_id": "evt_001",
                    "start_ts": "2026-09-05T15:00:00",
                    "end_ts": "2026-09-05T17:00:00",
                }
            )

        monkeypatch.setattr(db, "create_booking", boom)
        resp = council_client.post(
            "/api/bookings",
            json={
                "room_id": "room_005",
                "event_id": "evt_099",
                "start_ts": "2026-09-05T16:00:00",
                "end_ts": "2026-09-05T18:00:00",
            },
        )
        assert resp.status_code == 409
        assert resp.json()["error"] == "conflict"
        assert resp.json()["conflicting_booking"]["booking_id"] == "bk_0001"


# --- Teachers -----------------------------------------------------------------
class TestTeacherAvailability:
    def test_free_shape(self, client: TestClient, monkeypatch):
        monkeypatch.setattr(db, "is_teacher_free", lambda name, at: True)
        resp = client.get(
            "/api/teachers/availability",
            params={"teacher_name": "Prof. Iyer", "at": "2026-09-02T13:00:00"},
        )
        assert resp.status_code == 200
        assert resp.json() == {
            "teacher_name": "Prof. Iyer",
            "at": "2026-09-02T13:00:00",
            "available": True,
        }

    def test_unknown_teacher_shape(self, client: TestClient, monkeypatch):
        monkeypatch.setattr(db, "is_teacher_free", lambda name, at: None)
        resp = client.get(
            "/api/teachers/availability",
            params={"teacher_name": "Prof. Nobody", "at": "2026-09-02T13:00:00"},
        )
        assert resp.status_code == 404
        assert resp.json() == {"error": "teacher_not_found"}


# --- Ingestion -----------------------------------------------------------------
class TestIngestAttendance:
    VALID_BODY = {
        "token": "test-ingest-token",
        "event_id": "evt_001",
        "registrant_name": "Test Student",
        "registrant_email": "test@campus.edu",
        "submitted_at": "2026-09-05T14:58:00",
    }

    def test_wrong_token_unauthorized(self, client: TestClient):
        body = {**self.VALID_BODY, "token": "wrong-token"}
        resp = client.post("/api/ingest/attendance", json=body)
        assert resp.status_code == 401
        assert resp.json() == {"status": "unauthorized"}

    def test_success_shape(self, client: TestClient, monkeypatch):
        monkeypatch.setattr(db, "insert_attendance", lambda **kwargs: "att_0048")
        resp = client.post("/api/ingest/attendance", json=self.VALID_BODY)
        assert resp.status_code == 201
        assert resp.json() == {"status": "ok", "attendance_id": "att_0048"}

    def test_unknown_event_shape(self, client: TestClient, monkeypatch):
        def boom(**kwargs):
            raise db.NotFoundError("unknown_event")

        monkeypatch.setattr(db, "insert_attendance", boom)
        resp = client.post("/api/ingest/attendance", json=self.VALID_BODY)
        assert resp.status_code == 404
        assert resp.json() == {"status": "unknown_event"}
