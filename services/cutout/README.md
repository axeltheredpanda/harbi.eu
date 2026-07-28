---
title: harbi-cutout
emoji: ✂️
colorFrom: yellow
colorTo: red
sdk: docker
app_port: 7860
pinned: false
---

# harbi.eu Cutout (transparent-background)

FastAPI microservice wrapping [`transparent-background`](https://github.com/plemeri/transparent-background)
(InSPyReNet). Deploy as a **Docker** Hugging Face Space (free tier).

## Modes (API)

| Form `mode` | Library mode | UI label |
|-------------|--------------|----------|
| `fast`      | `fast`       | Fast     |
| `quality`   | `base`       | Quality  |

## Endpoints

- `GET /health` — `{ ok, ready, models_loaded, uptime_s }`
- `POST /remove` — multipart: `file`, `mode=fast|quality` → PNG bytes

Optional auth: set Space secret `CUTOUT_SERVICE_KEY`, send `Authorization: Bearer …`.

## Local run

```bash
cd services/cutout
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 7860
```

Then in the Next app `.env.local`:

```
CUTOUT_SERVICE_URL=http://127.0.0.1:7860
CUTOUT_SERVICE_KEY=dev-secret
```

## Hugging Face Space

1. Create a new Space → SDK **Docker** → push this folder (or connect the repo subdirectory).
2. After build, public URL looks like `https://<user>-<space>.hf.space`
3. Put that URL in `.env.local` as `CUTOUT_SERVICE_URL` (and on Vercel if you deploy the site there).

Free Spaces sleep after idle — the Next.js route pings `/health` and shows “warming up”.
