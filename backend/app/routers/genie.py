"""POST /api/genie/ask — see context/architecture.md's "Contract: Ask Genie"
and context/genie.md's Application Integration section. Thin: receive the
question, call genie_client.ask(), shape the documented envelope. No NL
parsing, no rewriting, no fallback answer of its own — see
context/code-standards.md's Genie Integration Standards."""

from fastapi import APIRouter, HTTPException

from app import genie_client
from app.models import AskGenieRequest, AskGenieResponse

router = APIRouter()


@router.post("/genie/ask", response_model=AskGenieResponse, response_model_exclude_none=True)
def ask_genie(body: AskGenieRequest) -> AskGenieResponse:
    result = genie_client.ask(body.question)

    if result.status == "error":
        raise HTTPException(
            status_code=502,
            detail={"status": "error", "message": result.message},
        )

    if result.status == "no_answer":
        return AskGenieResponse(status="no_answer", message=result.message)

    return AskGenieResponse(status="ok", answer=result.answer, sql=result.sql, rows=result.rows)
