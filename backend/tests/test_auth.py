"""Unit tests for app/auth.py's role resolution and cookie verification — the
single highest-risk security path in the product per
context/code-standards.md's Critical Path."""

import time
from unittest.mock import Mock

from app.auth import COOKIE_NAME, issue_cookie_value, resolve_role, verify_role
from app.config import settings


def _request_with_cookie(value: str | None) -> Mock:
    req = Mock()
    req.cookies = {COOKIE_NAME: value} if value is not None else {}
    return req


class TestResolveRole:
    def test_correct_code_yields_council(self):
        assert resolve_role(settings.council_access_code) == "council"

    def test_incorrect_code_yields_student_not_error(self):
        assert resolve_role("definitely-wrong-code") == "student"

    def test_missing_code_yields_student(self):
        assert resolve_role(None) == "student"

    def test_empty_string_code_yields_student(self):
        assert resolve_role("") == "student"


class TestVerifyRole:
    def test_valid_council_cookie_verifies_as_council(self):
        cookie = issue_cookie_value("council")
        assert verify_role(_request_with_cookie(cookie)) == "council"

    def test_valid_student_cookie_verifies_as_student(self):
        cookie = issue_cookie_value("student")
        assert verify_role(_request_with_cookie(cookie)) == "student"

    def test_missing_cookie_is_student(self):
        assert verify_role(_request_with_cookie(None)) == "student"

    def test_malformed_cookie_is_student(self):
        assert verify_role(_request_with_cookie("not-a-real-cookie")) == "student"

    def test_tampered_role_is_rejected(self):
        """Changing 'student' to 'council' in an otherwise-valid cookie must
        invalidate the signature — this is the single highest-risk shortcut a
        rushed implementation could get wrong."""
        cookie = issue_cookie_value("student")
        role, expiry, signature = cookie.split(":")
        tampered = f"council:{expiry}:{signature}"
        assert verify_role(_request_with_cookie(tampered)) == "student"

    def test_tampered_signature_is_rejected(self):
        cookie = issue_cookie_value("council")
        role, expiry, signature = cookie.split(":")
        tampered = f"{role}:{expiry}:{'0' * len(signature)}"
        assert verify_role(_request_with_cookie(tampered)) == "student"

    def test_expired_cookie_is_rejected(self):
        expired_payload = f"council:{int(time.time()) - 10}"
        import hashlib
        import hmac as hmac_module

        sig = hmac_module.new(
            settings.session_signing_secret.encode(), expired_payload.encode(), hashlib.sha256
        ).hexdigest()
        assert verify_role(_request_with_cookie(f"{expired_payload}:{sig}")) == "student"
