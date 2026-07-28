"""Cutout microservice — transparent-background (InSPyReNet) + FastAPI.

Deployed as a Hugging Face Space (Docker SDK) on port 7860.

UI modes → library modes:
  fast    → Remover(mode="fast")
  quality → Remover(mode="base")
"""

from __future__ import annotations

import asyncio
import io
import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from typing import Literal

import numpy as np
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import JSONResponse, Response
from PIL import Image, UnidentifiedImageError
from transparent_background import Remover

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
log = logging.getLogger("cutout")

APP_STARTED_AT = time.time()
SERVICE_KEY = os.environ.get("CUTOUT_SERVICE_KEY", "").strip() or os.environ.get(
    "REMBG_SERVICE_KEY", ""
).strip()
DEVICE = os.environ.get("CUTOUT_DEVICE", "cpu")
PRELOAD = os.environ.get("CUTOUT_PRELOAD", "fast")  # fast | both | none
MAX_CONCURRENCY = max(1, int(os.environ.get("CUTOUT_MAX_CONCURRENCY", "1")))
PROCESS_TIMEOUT_S = float(os.environ.get("CUTOUT_PROCESS_TIMEOUT_S", "90"))
MAX_UPLOAD_BYTES = int(os.environ.get("CUTOUT_MAX_UPLOAD_BYTES", str(12 * 1024 * 1024)))
ALLOWED_MIME = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/octet-stream",
}

# UI mode → library mode
MODE_MAP = {
    "fast": "fast",
    "quality": "base",
}

_removers: dict[str, Remover] = {}
_ready = False
_executor = ThreadPoolExecutor(max_workers=MAX_CONCURRENCY)
_semaphore: asyncio.Semaphore | None = None


def _load_remover(library_mode: str) -> Remover:
    if library_mode in _removers:
        return _removers[library_mode]
    log.info("loading Remover mode=%s device=%s", library_mode, DEVICE)
    started = time.time()
    remover = Remover(mode=library_mode, device=DEVICE)
    _removers[library_mode] = remover
    log.info(
        "Remover ready mode=%s duration_s=%.1f",
        library_mode,
        time.time() - started,
    )
    return remover


def _preload() -> None:
    global _ready
    try:
        if PRELOAD in ("fast", "both"):
            _load_remover("fast")
        if PRELOAD == "both":
            _load_remover("base")
        _ready = True
    except Exception:
        log.exception("model preload failed")
        # Stay not-ready; first request may still try to load.
        _ready = False


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global _semaphore
    _semaphore = asyncio.Semaphore(MAX_CONCURRENCY)
    # Load off the event loop — first Space boot can take minutes.
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(_executor, _preload)
    if not _ready and PRELOAD != "none":
        # Allow serving; /health reports ready=False until a successful load.
        log.warning("preload incomplete — will load on first request")
    yield
    _executor.shutdown(wait=False, cancel_futures=True)


app = FastAPI(title="harbi.eu cutout", version="2.0.0", lifespan=lifespan)


def require_key(authorization: str | None = Header(default=None)) -> None:
    if not SERVICE_KEY:
        return
    if authorization != f"Bearer {SERVICE_KEY}":
        raise HTTPException(status_code=401, detail="Unauthorized")


def _to_png_bytes(output: object) -> bytes:
    if isinstance(output, bytes):
        return output
    if isinstance(output, Image.Image):
        buf = io.BytesIO()
        output.save(buf, format="PNG")
        return buf.getvalue()
    if isinstance(output, np.ndarray):
        img = Image.fromarray(output)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()
    raise TypeError(f"Unexpected remover output type: {type(output)}")


def _process_sync(data: bytes, library_mode: str) -> bytes:
    remover = _load_remover(library_mode)
    global _ready
    _ready = True
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except UnidentifiedImageError as exc:
        raise ValueError("Unrecognized or corrupt image") from exc

    # Normalize for the model
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA")

    result = remover.process(img, type="rgba")
    return _to_png_bytes(result)


@app.get("/health")
def health() -> dict:
    return {
        "ok": True,
        "ready": _ready and bool(_removers),
        "models_loaded": list(_removers.keys()),
        "uptime_s": round(time.time() - APP_STARTED_AT, 1),
        "concurrency": MAX_CONCURRENCY,
    }


@app.post("/remove", dependencies=[Depends(require_key)])
async def remove_bg(
    file: UploadFile = File(...),
    mode: Literal["fast", "quality"] = Form("fast"),
) -> Response:
    library_mode = MODE_MAP.get(mode)
    if not library_mode:
        raise HTTPException(
            status_code=400,
            detail="Invalid mode — use fast or quality",
        )

    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type and content_type not in ALLOWED_MIME:
        raise HTTPException(
            status_code=400,
            detail="Unsupported format — use PNG, JPEG, WebP, or GIF",
        )

    data = await file.read()
    size = len(data)
    if size == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    if size > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large (max {MAX_UPLOAD_BYTES // (1024 * 1024)} MB)",
        )

    # Sniff image before the model
    try:
        probe = Image.open(io.BytesIO(data))
        probe.verify()
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail="Unrecognized or corrupt image",
        ) from exc

    assert _semaphore is not None
    started = time.time()
    log.info(
        "remove start mode=%s lib_mode=%s size_bytes=%s",
        mode,
        library_mode,
        size,
    )

    try:
        async with _semaphore:
            loop = asyncio.get_running_loop()
            png = await asyncio.wait_for(
                loop.run_in_executor(_executor, _process_sync, data, library_mode),
                timeout=PROCESS_TIMEOUT_S,
            )
    except ValueError as exc:
        log.warning(
            "remove validation mode=%s size_bytes=%s err=%s",
            mode,
            size,
            exc,
        )
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except asyncio.TimeoutError as exc:
        duration = time.time() - started
        log.error(
            "remove timeout mode=%s size_bytes=%s duration_s=%.1f",
            mode,
            size,
            duration,
        )
        return JSONResponse(
            status_code=504,
            content={
                "error": "timeout",
                "detail": "Processing took too long — try a smaller image or Fast mode.",
            },
        )
    except Exception as exc:  # noqa: BLE001
        duration = time.time() - started
        log.exception(
            "remove failed mode=%s size_bytes=%s duration_s=%.1f",
            mode,
            size,
            duration,
        )
        raise HTTPException(
            status_code=502,
            detail="Processing failed — try again in a moment.",
        ) from exc

    duration = time.time() - started
    log.info(
        "remove ok mode=%s size_bytes=%s duration_s=%.1f out_bytes=%s",
        mode,
        size,
        duration,
        len(png),
    )

    return Response(
        content=png,
        media_type="image/png",
        headers={
            "X-Cutout-Mode": mode,
            "X-Cutout-Lib-Mode": library_mode,
            "X-Cutout-Duration-Ms": str(int(duration * 1000)),
        },
    )
