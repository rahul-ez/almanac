"""Session routes: POST /api/session, GET /api/session, POST /api/session/end per v2-api-contracts.md §2."""

from fastapi import APIRouter, Request, Response

from app.auth import COOKIE_NAME, issue_cookie_value, read_session, resolve_role
from app.models import SessionRequest, SessionResponse

router = APIRouter()


@router.post("/session", response_model=SessionResponse, response_model_exclude_none=True)
def create_session(body: SessionRequest, response: Response) -> SessionResponse:
    role = resolve_role(body.access_code)
    # If student role, preserve optional display_name / display_email
    display_name = body.display_name if role == "student" else None
    display_email = body.display_email if role == "student" else None

    cookie_val = issue_cookie_value(
        role,
        display_name=display_name,
        display_email=display_email,
    )
    response.set_cookie(
        key=COOKIE_NAME,
        value=cookie_val,
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 8,
    )
    return SessionResponse(
        role=role,
        display_name=display_name,
        display_email=display_email,
    )


@router.get("/session", response_model=SessionResponse, response_model_exclude_none=True)
def get_session(request: Request) -> SessionResponse:
    claims = read_session(request)
    return SessionResponse(
        role=claims["role"] or "student",
        display_name=claims.get("display_name"),
        display_email=claims.get("display_email"),
    )


@router.post("/session/end", response_model=SessionResponse, response_model_exclude_none=True)
def end_session(response: Response) -> SessionResponse:
    cookie_val = issue_cookie_value("student")
    response.set_cookie(
        key=COOKIE_NAME,
        value=cookie_val,
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 8,
    )
    return SessionResponse(role="student")
