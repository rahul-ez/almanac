"""All Genie Conversation API calls live here — no other backend module may
import `databricks.sdk`'s Genie client. See context/architecture.md's
Client/Server Patterns and context/genie.md's Application Integration section.

The question text is passed through to Genie completely unmodified (no
prompt-prepending, no rewriting) per context/architecture.md Invariant 1 and
context/code-standards.md's Genie Integration Standards — Genie is the only
NL-to-answer component in this product.

Method shapes below (`start_conversation_and_wait`, `GenieMessage`,
`GenieAttachment`, `get_message_attachment_query_result`, ...) were verified
against `databricks-sdk`'s installed `databricks.sdk.service.dashboards`
module (GenieAPI) at the time this was written, not against a live Genie
Space (no workspace credentials were available in the authoring
environment). If a newer/older SDK version has renamed these, this is the
first place to check during Checkpoint 2 integration.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import timedelta

from databricks.sdk import WorkspaceClient
from databricks.sdk.service.dashboards import GenieMessage, MessageStatus

from app.config import settings

logger = logging.getLogger("campus_companion.genie")

_ASK_TIMEOUT = timedelta(seconds=120)


@dataclass
class GenieAnswer:
    status: str  # "ok" | "no_answer" | "error"
    answer: str | None = None
    sql: str | None = None
    rows: list[dict] = field(default_factory=list)
    message: str | None = None  # populated for no_answer / error


def _client() -> WorkspaceClient:
    # Explicit host/token when both are configured (local dev); otherwise let
    # the SDK's default credential chain resolve workspace-injected auth,
    # which is how a deployed Databricks App authenticates (see config.py).
    if settings.databricks_host and settings.databricks_token:
        return WorkspaceClient(host=settings.databricks_host, token=settings.databricks_token)
    return WorkspaceClient()


def _extract_answer(message: GenieMessage) -> tuple[str | None, str | None, list[dict]]:
    """Pull the natural-language answer, generated SQL, and result rows out of
    a completed GenieMessage's attachments."""
    answer_text: str | None = None
    sql_text: str | None = None
    rows: list[dict] = []

    w = _client()
    for attachment in message.attachments or []:
        if attachment.text is not None and attachment.text.content:
            answer_text = attachment.text.content
        if attachment.query is not None:
            sql_text = attachment.query.query
            try:
                result = w.genie.get_message_attachment_query_result(
                    space_id=message.space_id,
                    conversation_id=message.conversation_id,
                    message_id=message.message_id,
                    attachment_id=attachment.attachment_id,
                )
                statement = result.statement_response
                if statement and statement.manifest and statement.result:
                    columns = [c.name for c in (statement.manifest.schema.columns or [])]
                    data = statement.result.data_array or []
                    rows = [dict(zip(columns, row)) for row in data]
            except Exception as exc:  # query result fetch is best-effort evidence
                logger.warning("Could not fetch Genie query result rows: %s", exc)

    return answer_text, sql_text, rows


def ask(question: str) -> GenieAnswer:
    """Submit `question` to the configured Genie Space and return a normalized
    ok/no_answer/error result. Each call starts a fresh conversation — the
    `POST /api/genie/ask` contract carries no conversation_id, so there is no
    server-side conversation state to maintain across calls (see
    context/architecture.md's Ask Genie contract)."""
    try:
        w = _client()
        message = w.genie.start_conversation_and_wait(
            space_id=settings.genie_space_id,
            content=question,
            timeout=_ASK_TIMEOUT,
        )
    except Exception as exc:
        logger.error("Genie call failed for question=%r: %s", question, exc)
        return GenieAnswer(status="error", message="Live data unavailable — try again shortly.")

    if message.status == MessageStatus.COMPLETED:
        answer_text, sql_text, rows = _extract_answer(message)
        if answer_text is None:
            # Completed with no text attachment at all — treat as no_answer
            # rather than fabricating a response, per architecture.md's
            # "fail visibly, never fabricate" invariant.
            logger.info("Genie question=%r status=no_answer", question)
            return GenieAnswer(
                status="no_answer",
                message="Genie could not find a governed answer to that question.",
            )
        logger.info("Genie question=%r status=ok", question)
        return GenieAnswer(status="ok", answer=answer_text, sql=sql_text, rows=rows)

    if message.status in (
        MessageStatus.FAILED,
        MessageStatus.CANCELLED,
        MessageStatus.QUERY_RESULT_EXPIRED,
    ):
        logger.info("Genie question=%r status=error genie_status=%s", question, message.status)
        return GenieAnswer(status="error", message="Live data unavailable — try again shortly.")

    # Any other non-terminal status after start_conversation_and_wait's own
    # wait/timeout is unexpected — treat conservatively as no_answer rather
    # than guessing at partial content.
    logger.warning("Genie question=%r ended in unexpected status=%s", question, message.status)
    return GenieAnswer(
        status="no_answer",
        message="Genie could not find a governed answer to that question.",
    )
