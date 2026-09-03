"""FastAPI entrypoint. Mounts routers and (once it exists) the built frontend
static bundle. See context/architecture.md's folder structure and
context/code-standards.md's Error Handling table."""

from __future__ import annotations

import logging
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.routers import (
    activity,
    analytics,
    campus,
    events,
    genie,
    ingest,
    internships,
    rooms,
    session,
    teachers,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("campus_companion")

app = FastAPI(title="Almanac API")

app.include_router(session.router, prefix="/api", tags=["session"])
app.include_router(genie.router, prefix="/api", tags=["genie"])
app.include_router(events.router, prefix="/api", tags=["events"])
app.include_router(rooms.router, prefix="/api", tags=["rooms"])
app.include_router(teachers.router, prefix="/api", tags=["teachers"])
app.include_router(ingest.router, prefix="/api", tags=["ingest"])
app.include_router(internships.router, prefix="/api", tags=["internships"])
app.include_router(campus.router, prefix="/api", tags=["campus"])
app.include_router(analytics.router, prefix="/api", tags=["analytics"])
app.include_router(activity.router, prefix="/api", tags=["activity"])


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Return `exc.detail` as the response body directly — every documented
    error shape in architecture.md's Integration Contracts is a flat object
    (e.g. {"error": "forbidden"}), never wrapped under a "detail" key, which
    is FastAPI's default behavior for HTTPException."""
    body = exc.detail if isinstance(exc.detail, dict) else {"error": str(exc.detail)}
    return JSONResponse(status_code=exc.status_code, content=body)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Never leak a raw traceback or exception message to the client — see
    code-standards.md's Error Handling table ("Unexpected/unhandled
    exception")."""
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=502, content={"error": "internal_error"})


# Serve the built frontend (frontend/dist, produced by `vite build`) as static
# assets from the same app, per architecture.md's "Deployment / Runtime
# Architecture". Mounted last, at "/", so it never shadows an /api/* route.
# Guarded by existence check since the Frontend workstream's build output
# will not exist during Backend-only local development.
_frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if _frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=str(_frontend_dist), html=True), name="frontend")
    logger.info("Serving frontend static assets from %s", _frontend_dist)
else:
    logger.info("No frontend build found at %s — API-only mode", _frontend_dist)
