"""V2 session contract (v2-api-contracts.md §2): the additive POST fields,
GET /api/session, and POST /api/session/end. No DB is touched by any of these —
they only read/issue/clear the signed cookie."""

from fastapi.testclient import TestClient

from app.auth import COOKIE_NAME


class TestPostSessionV2:
    def test_student_session_with_display_fields_echoed(self, client: TestClient):
        resp = client.post(
            "/api/session",
            json={"display_name": "Aditi Sharma", "display_email": "aditi.sharma@campus.edu"},
        )
        assert resp.status_code == 200
        assert resp.json() == {
            "role": "student",
            "display_name": "Aditi Sharma",
            "display_email": "aditi.sharma@campus.edu",
        }
        assert COOKIE_NAME in resp.cookies

    def test_student_session_without_display_fields_is_bare(self, client: TestClient):
        resp = client.post("/api/session", json={})
        assert resp.status_code == 200
        assert resp.json() == {"role": "student"}

    def test_council_session_ignores_display_fields(self, client: TestClient):
        from app.config import settings

        resp = client.post(
            "/api/session",
            json={"access_code": settings.council_access_code, "display_name": "Should Ignore"},
        )
        assert resp.status_code == 200
        assert resp.json() == {"role": "council"}

    def test_invalid_access_code_resolves_to_student_never_errors(self, client: TestClient):
        resp = client.post("/api/session", json={"access_code": "nope"})
        assert resp.status_code == 200
        assert resp.json() == {"role": "student"}


class TestGetSession:
    def test_no_cookie_reports_student(self, client: TestClient):
        resp = client.get("/api/session")
        assert resp.status_code == 200
        assert resp.json() == {"role": "student"}

    def test_reflects_council_cookie(self, council_client: TestClient):
        resp = council_client.get("/api/session")
        assert resp.status_code == 200
        assert resp.json() == {"role": "council"}

    def test_round_trips_student_display_fields_from_cookie(self, client: TestClient):
        client.post(
            "/api/session",
            json={"display_name": "Aditi Sharma", "display_email": "aditi.sharma@campus.edu"},
        )
        resp = client.get("/api/session")
        assert resp.status_code == 200
        assert resp.json() == {
            "role": "student",
            "display_name": "Aditi Sharma",
            "display_email": "aditi.sharma@campus.edu",
        }

    def test_tampered_cookie_reports_student(self, client: TestClient):
        client.cookies.set(COOKIE_NAME, "council:99999999999:deadbeef")
        resp = client.get("/api/session")
        assert resp.status_code == 200
        assert resp.json() == {"role": "student"}


class TestEndSession:
    def test_end_clears_cookie_and_reports_student(self, council_client: TestClient):
        assert council_client.get("/api/session").json() == {"role": "council"}
        resp = council_client.post("/api/session/end")
        assert resp.status_code == 200
        assert resp.json() == {"role": "student"}
        # The response carries a cookie-clearing Set-Cookie header (Max-Age=0).
        set_cookie = resp.headers.get("set-cookie", "").lower()
        assert "cc_session=" in set_cookie and "max-age=0" in set_cookie
        # And the client's jar no longer carries a council session.
        council_client.cookies.pop(COOKIE_NAME, None)
        assert council_client.get("/api/session").json() == {"role": "student"}

    def test_end_never_errors_without_a_session(self, client: TestClient):
        resp = client.post("/api/session/end")
        assert resp.status_code == 200
        assert resp.json() == {"role": "student"}
