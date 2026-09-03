"""V2 session tests: optional display fields, cookie signature, and role persistence."""

from fastapi.testclient import TestClient


def test_session_student_with_display_fields(client: TestClient) -> None:
    res = client.post(
        "/api/session",
        json={"display_name": "Aria", "display_email": "aria@campus.edu"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "student"
    assert data["display_name"] == "Aria"
    assert data["display_email"] == "aria@campus.edu"

    # GET /api/session echoes back claims from cookie
    get_res = client.get("/api/session")
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["role"] == "student"
    assert get_data["display_name"] == "Aria"
    assert get_data["display_email"] == "aria@campus.edu"


def test_session_council_code(client: TestClient) -> None:
    res = client.post("/api/session", json={"access_code": "test-council-code"})
    assert res.status_code == 200
    assert res.json()["role"] == "council"

    get_res = client.get("/api/session")
    assert get_res.status_code == 200
    assert get_res.json()["role"] == "council"


def test_session_end(client: TestClient) -> None:
    # First become council
    client.post("/api/session", json={"access_code": "test-council-code"})
    assert client.get("/api/session").json()["role"] == "council"

    # End session reverts to student
    end_res = client.post("/api/session/end")
    assert end_res.status_code == 200
    assert end_res.json()["role"] == "student"

    assert client.get("/api/session").json()["role"] == "student"
