"""Session/role cookie issuance and verification. See
context/architecture.md's Authentication and Authorization section and
context/code-standards.md's Authentication and Authorization section.

No account system exists — the only "authentication" is comparing a
submitted access code to the server-side COUNCIL_ACCESS_CODE. The resulting
role is carried in a signed, HTTP-only cookie. No third-party JWT/signing
library is used (none is in the approved dependency list per
context/code-standards.md's Dependencies and Libraries) — a minimal
HMAC-SHA256 signature over stdlib `hmac`/`hashlib` is sufficient and keeps
the dependency footprint at zero for this one piece.
"""

from __future__ import annotations

import hashlib
import hmac
import time

from fastapi import Request

from app.config import settings

COOKIE_NAME = "cc_session"
_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8  # 8-hour session, ample for a demo day
_VALID_ROLES = ("student", "council")


def _sign(payload: str) -> str:
    return hmac.new(
        settings.session_signing_secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def issue_cookie_value(role: str) -> str:
    """role:expiry:signature — see verify_role() for the matching parse."""
    assert role in _VALID_ROLES
    expiry = str(int(time.time()) + _COOKIE_MAX_AGE_SECONDS)
    payload = f"{role}:{expiry}"
    return f"{payload}:{_sign(payload)}"


def resolve_role(access_code: str | None) -> str:
    """The session endpoint's role derivation. Never errors — an incorrect or
    missing code simply yields 'student', per the frozen Session contract."""
    if access_code and hmac.compare_digest(access_code, settings.council_access_code):
        return "council"
    return "student"


def verify_role(request: Request) -> str:
    """Re-derive the caller's role from the signed cookie, independent of
    anything the client claims elsewhere. A missing, malformed, expired, or
    tampered cookie is always treated as 'student' — never as an error to
    retry, never defaulted to 'council'. This is the ONLY authorization
    mechanism for the two protected write endpoints; the frontend hiding a
    button is never sufficient (context/code-standards.md, Authentication and
    Authorization)."""
    raw = request.cookies.get(COOKIE_NAME)
    if not raw:
        return "student"
    parts = raw.split(":")
    if len(parts) != 3:
        return "student"
    role, expiry, signature = parts
    if role not in _VALID_ROLES:
        return "student"
    expected_signature = _sign(f"{role}:{expiry}")
    if not hmac.compare_digest(signature, expected_signature):
        return "student"
    if not expiry.isdigit() or int(expiry) < time.time():
        return "student"
    return role


def require_council(request: Request) -> None:
    """Raise if the caller is not an authenticated council session. Routers
    call this before constructing or executing any write."""
    from fastapi import HTTPException

    if verify_role(request) != "council":
        raise HTTPException(status_code=403, detail={"error": "forbidden"})
