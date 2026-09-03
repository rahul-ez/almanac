"""Session / role-aware entry endpoints.

- `POST /api/session` — see context/architecture.md's "Contract: Session /
  role selection"; V2 adds optional `display_name`/`display_email` for student
  sessions (v2-api-contracts.md §2.1).
- `GET /api/session` — reflect the current cookie's claims (v2-api-contracts.md §2.2).
- `POST /api/session/end` — clear the cookie (v2-api-contracts.md §2.3).

None of these endpoints ever error — a missing/invalid/tampered cookie or a
wrong access code always resolves to `role: "student"`.
"""

from fastapi import APIRouter, Request, Response

from app.auth import COOKIE_NAME, issue_cookie_value, read_session, resolve_role
from app.models import SessionRequest, SessionResponse

router = APIRouter()

_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8


@router.post("/session", response_model=SessionResponse, response_model_exclude_none=True)
def create_session(body: SessionRequest, response: Response) -> SessionResponse:
    role = resolve_role(body.access_code)
    # display fields are a UX convenience for student sessions only; ignored for
    # council and never used as an authorization signal (v2-api-contracts.md §2.1).
    display_name = body.display_name if role == "student" else None
    display_email = body.display_email if role == "student" else None

    response.set_cookie(
        key=COOKIE_NAME,
        value=issue_cookie_value(role, display_name, display_email),
        httponly=True,
        samesite="lax",
        max_age=_COOKIE_MAX_AGE_SECONDS,
    )
    return SessionResponse(
        role=role,
        display_name=display_name or None,
        display_email=display_email or None,
    )


@router.get("/session", response_model=SessionResponse, response_model_exclude_none=True)
def get_current_session(request: Request) -> SessionResponse:
    return SessionResponse(**read_session(request))


@router.post("/session/end", response_model=SessionResponse, response_model_exclude_none=True)
def end_session(response: Response) -> SessionResponse:
    response.delete_cookie(key=COOKIE_NAME, samesite="lax")
    return SessionResponse(role="student")
