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

import base64
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


def _b64(value: str) -> str:
    return base64.urlsafe_b64encode(value.encode("utf-8")).decode("ascii")


def _unb64(value: str) -> str:
    return base64.urlsafe_b64decode(value.encode("ascii")).decode("utf-8")


def issue_cookie_value(
    role: str,
    display_name: str | None = None,
    display_email: str | None = None,
) -> str:
    """Signed cookie value. Two shapes, both `<payload>:<signature>`:

    - No display fields (the V1 case, unchanged): payload is `role:expiry`.
    - With a V2 display name/email (student sessions only, per
      v2-api-contracts.md §2.1): payload is `role:expiry:<b64 name>:<b64 email>`.
      The values are base64url-encoded so they can never contain the `:`
      delimiter. They are UX convenience only and are never an authorization
      signal — only `role` is.

    See read_session() for the matching parse."""
    assert role in _VALID_ROLES
    expiry = str(int(time.time()) + _COOKIE_MAX_AGE_SECONDS)
    if not display_name and not display_email:
        payload = f"{role}:{expiry}"
    else:
        payload = f"{role}:{expiry}:{_b64(display_name or '')}:{_b64(display_email or '')}"
    return f"{payload}:{_sign(payload)}"


def resolve_role(access_code: str | None) -> str:
    """The session endpoint's role derivation. Never errors — an incorrect or
    missing code simply yields 'student', per the frozen Session contract."""
    if access_code and hmac.compare_digest(access_code, settings.council_access_code):
        return "council"
    return "student"


def read_session(request: Request) -> dict[str, str]:
    """Re-derive the caller's session claims from the signed cookie, independent
    of anything the client claims elsewhere. A missing, malformed, expired, or
    tampered cookie always resolves to `{"role": "student"}` — never an error to
    retry, never defaulted to 'council'. This is the ONLY authorization
    mechanism for the protected endpoints; the frontend hiding a button is never
    sufficient (context/code-standards.md, Authentication and Authorization).

    Returns `{"role": ...}` and, for a valid V2 display-carrying cookie, the
    optional `display_name` / `display_email` claims (v2-api-contracts.md §2.2).
    """
    raw = request.cookies.get(COOKIE_NAME)
    if not raw:
        return {"role": "student"}
    parts = raw.split(":")
    display: dict[str, str] = {}
    if len(parts) == 3:
        role, expiry, signature = parts
        payload = f"{role}:{expiry}"
    elif len(parts) == 5:
        role, expiry, enc_name, enc_email, signature = parts
        payload = f"{role}:{expiry}:{enc_name}:{enc_email}"
        try:
            name = _unb64(enc_name) if enc_name else ""
            email = _unb64(enc_email) if enc_email else ""
        except Exception:
            return {"role": "student"}
        if name:
            display["display_name"] = name
        if email:
            display["display_email"] = email
    else:
        return {"role": "student"}

    if role not in _VALID_ROLES:
        return {"role": "student"}
    if not hmac.compare_digest(signature, _sign(payload)):
        return {"role": "student"}
    if not expiry.isdigit() or int(expiry) < time.time():
        return {"role": "student"}
    return {"role": role, **display}


def verify_role(request: Request) -> str:
    """The role claim only — used by the write endpoints' authorization check."""
    return read_session(request)["role"]


def require_council(request: Request) -> None:
    """Raise if the caller is not an authenticated council session. Routers
    call this before constructing or executing any write."""
    from fastapi import HTTPException

    if verify_role(request) != "council":
        raise HTTPException(status_code=403, detail={"error": "forbidden"})
