"""POST /api/session — see context/architecture.md's "Contract: Session /
role selection"."""

from fastapi import APIRouter, Response

from app.auth import COOKIE_NAME, issue_cookie_value, resolve_role
from app.models import SessionRequest, SessionResponse

router = APIRouter()


@router.post("/session", response_model=SessionResponse)
def create_session(body: SessionRequest, response: Response) -> SessionResponse:
    role = resolve_role(body.access_code)
    response.set_cookie(
        key=COOKIE_NAME,
        value=issue_cookie_value(role),
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 8,
    )
    return SessionResponse(role=role)
