"""Background removal microservice — rembg + FastAPI.

Modes (internal model names, not exposed to end users):
  fast    -> u2net
  quality -> birefnet-general
"""

from __future__ import annotations

import io
import os
import time
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import Response
from rembg import new_session, remove

APP_STARTED_AT = time.time()
SERVICE_KEY = os.environ.get("REMBG_SERVICE_KEY", "").strip()
MODELS = {
    "fast": "u2net",
    "quality": "birefnet-general",
}
_sessions: dict[str, object] = {}


def get_session(model: str):
    session = _sessions.get(model)
    if session is None:
        session = new_session(model)
        _sessions[model] = session
    return session


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if os.environ.get("REMBG_PRELOAD_FAST", "1") == "1":
        try:
            get_session(MODELS["fast"])
        except Exception:
            # Model download may fail on first boot without network — ignore.
            pass
    yield


app = FastAPI(title="harbi.eu rembg", version="1.0.0", lifespan=lifespan)


def require_key(authorization: str | None = Header(default=None)) -> None:
    if not SERVICE_KEY:
        return
    expected = f"Bearer {SERVICE_KEY}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/health")
def health() -> dict:
    return {
        "ok": True,
        "uptime_s": round(time.time() - APP_STARTED_AT, 1),
        "models_loaded": list(_sessions.keys()),
    }


@app.post("/remove", dependencies=[Depends(require_key)])
async def remove_bg(
    file: UploadFile = File(...),
    mode: Literal["fast", "quality"] = Form("quality"),
) -> Response:
    model = MODELS.get(mode)
    if not model:
        raise HTTPException(status_code=400, detail="Invalid mode")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(data) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 20 MB)")

    try:
        session = get_session(model)
        output = remove(data, session=session)
    except Exception as exc:  # noqa: BLE001 — surface as 502 for the app
        raise HTTPException(status_code=502, detail=f"rembg failed: {exc}") from exc

    if isinstance(output, bytes):
        png = output
    else:
        buf = io.BytesIO()
        output.save(buf, format="PNG")
        png = buf.getvalue()

    return Response(
        content=png,
        media_type="image/png",
        headers={
            "X-Rembg-Mode": mode,
            "X-Rembg-Model": model,
        },
    )
