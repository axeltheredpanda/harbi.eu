# rembg microservice (harbi.eu)

FastAPI wrapper around [rembg](https://github.com/danielgatis/rembg).

## Endpoints

- `GET /health` — liveness + loaded models
- `POST /remove` — multipart form: `file` (image), `mode` = `fast` | `quality`
  - `fast` → `u2net`
  - `quality` → `birefnet-general`
  - Returns PNG bytes with alpha

Optional auth: set `REMBG_SERVICE_KEY` and send `Authorization: Bearer <key>`.

## Local

```bash
cd services/rembg
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8080
```

## Docker / Railway / Render

```bash
docker build -t harbi-rembg .
docker run -p 8080:8080 -e REMBG_SERVICE_KEY=secret harbi-rembg
```

On free tiers the first request after idle can take 30–90s (cold start + model download).
The Next.js UI shows a “warming up” message after a few seconds.

Point `REMBG_SERVICE_URL` (and matching `REMBG_SERVICE_KEY`) in the Vercel project env
at this service’s public URL (no trailing slash).
