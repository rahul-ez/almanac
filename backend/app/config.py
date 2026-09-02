"""Central environment configuration. The ONLY place backend code reads an
environment variable — every other module imports `settings` from here.
See context/architecture.md's Environment Configuration table (the canonical
list) and context/code-standards.md's Configuration and Secrets section.
"""

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()  # no-op in Databricks Apps, where env vars are injected directly


@dataclass(frozen=True)
class Settings:
    databricks_host: str | None
    databricks_token: str | None
    sql_warehouse_id: str
    genie_space_id: str
    unity_catalog_schema: str
    council_access_code: str
    session_signing_secret: str
    ingest_token: str


def _require(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(
            f"Missing required environment variable {name}. See "
            "context/architecture.md's Environment Configuration table."
        )
    return value


def _load_settings() -> Settings:
    return Settings(
        # DATABRICKS_HOST / DATABRICKS_TOKEN are intentionally optional here:
        # inside a deployed Databricks App, workspace credentials are injected
        # automatically and databricks-sdk's WorkspaceClient() picks them up
        # without either variable being set explicitly (see genie_client.py).
        # Locally, both should be set via .env.
        databricks_host=os.environ.get("DATABRICKS_HOST"),
        databricks_token=os.environ.get("DATABRICKS_TOKEN"),
        sql_warehouse_id=_require("SQL_WAREHOUSE_ID"),
        genie_space_id=_require("GENIE_SPACE_ID"),
        unity_catalog_schema=_require("UNITY_CATALOG_SCHEMA"),
        council_access_code=_require("COUNCIL_ACCESS_CODE"),
        session_signing_secret=_require("SESSION_SIGNING_SECRET"),
        ingest_token=_require("INGEST_TOKEN"),
    )


settings = _load_settings()
