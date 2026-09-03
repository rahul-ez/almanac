"""Session/role cookie issuance and verification per architecture.md and v2-api-contracts.md."""

from __future__ import annotations

import base64
import hashlib
import hmac
import time
from typing import Any

from fastapi import Request

from app.config import settings

COOKIE_NAME = "cc_session"
_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8  # 8-hour session
_VALID_ROLES = ("student", "council")


def _sign(payload: str) -> str:
    return hmac.new(
        settings.session_signing_secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def _b64_encode(val: str | None) -> str:
    if not val:
        return ""
    return base64.urlsafe_b64encode(val.encode("utf-8")).decode("ascii")


def _b64_decode(val: str | None) -> str | None:
    if not val:
        return None
    try:
        return base64.urlsafe_b64decode(val.encode("ascii")).decode("utf-8")
    except Exception:
        return None


def issue_cookie_value(
    role: str,
    display_name: str | None = None,
    display_email: str | None = None,
) -> str:
    """Issue a signed session cookie. Supports 3-part or 5-part with optional display info."""
    assert role in _VALID_ROLES
    expiry = str(int(time.time()) + _COOKIE_MAX_AGE_SECONDS)
    if display_name or display_email:
        name_b64 = _b64_encode(display_name)
        email_b64 = _b64_encode(display_email)
        payload = f"{role}:{expiry}:{name_b64}:{email_b64}"
    else:
        payload = f"{role}:{expiry}"
    return f"{payload}:{_sign(payload)}"


def resolve_role(access_code: str | None) -> str:
    """Role derivation: comparison against COUNCIL_ACCESS_CODE."""
    if access_code and hmac.compare_digest(access_code, settings.council_access_code):
        return "council"
    return "student"


def read_session(request: Request) -> dict[str, str | None]:
    """Parse session claims (role, display_name, display_email) from cookie."""
    raw = request.cookies.get(COOKIE_NAME)
    if not raw:
        return {"role": "student", "display_name": None, "display_email": None}

    parts = raw.split(":")
    if len(parts) == 3:
        role, expiry, signature = parts
        if role not in _VALID_ROLES:
            return {"role": "student", "display_name": None, "display_email": None}
        expected_sig = _sign(f"{role}:{expiry}")
        if not hmac.compare_digest(signature, expected_sig):
            return {"role": "student", "display_name": None, "display_email": None}
        if not expiry.isdigit() or int(expiry) < time.time():
            return {"role": "student", "display_name": None, "display_email": None}
        return {"role": role, "display_name": None, "display_email": None}

    if len(parts) == 5:
        role, expiry, name_b64, email_b64, signature = parts
        if role not in _VALID_ROLES:
            return {"role": "student", "display_name": None, "display_email": None}
        payload = f"{role}:{expiry}:{name_b64}:{email_b64}"
        expected_sig = _sign(payload)
        if not hmac.compare_digest(signature, expected_sig):
            return {"role": "student", "display_name": None, "display_email": None}
        if not expiry.isdigit() or int(expiry) < time.time():
            return {"role": "student", "display_name": None, "display_email": None}
        return {
            "role": role,
            "display_name": _b64_decode(name_b64),
            "display_email": _b64_decode(email_b64),
        }

    return {"role": "student", "display_name": None, "display_email": None}


def verify_role(request: Request) -> str:
    """Derive role from verified session cookie."""
    return read_session(request)["role"] or "student"


def require_council(request: Request) -> None:
    """Raise 403 forbidden if not an authenticated council session."""
    from fastapi import HTTPException

    if verify_role(request) != "council":
        raise HTTPException(status_code=403, detail={"error": "forbidden"})
