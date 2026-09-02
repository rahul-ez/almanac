"""Test env vars must be set BEFORE any `app.*` module is imported, since
app.config loads Settings at import time. This module has no `from app...`
import above the os.environ block below, and pytest imports conftest.py
before collecting test modules in the same directory."""

import os

os.environ.setdefault("SQL_WAREHOUSE_ID", "test-warehouse-id")
os.environ.setdefault("GENIE_SPACE_ID", "test-genie-space-id")
os.environ.setdefault("UNITY_CATALOG_SCHEMA", "campus_companion.campus")
os.environ.setdefault("COUNCIL_ACCESS_CODE", "test-council-code")
os.environ.setdefault("SESSION_SIGNING_SECRET", "test-signing-secret")
os.environ.setdefault("INGEST_TOKEN", "test-ingest-token")
# DATABRICKS_HOST / DATABRICKS_TOKEN intentionally left unset — tests never
# open a real connection; db.py and genie_client.py are monkeypatched.

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture()
def council_client(client: TestClient) -> TestClient:
    """A TestClient carrying a valid, signed 'council' session cookie."""
    from app.auth import COOKIE_NAME, issue_cookie_value

    client.cookies.set(COOKIE_NAME, issue_cookie_value("council"))
    return client
