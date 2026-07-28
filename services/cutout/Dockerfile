# Hugging Face Spaces Docker SDK — listens on 7860
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# CPU torch comes via transparent-background deps
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

ENV PYTHONUNBUFFERED=1
ENV CUTOUT_DEVICE=cpu
ENV CUTOUT_PRELOAD=fast
ENV CUTOUT_MAX_CONCURRENCY=1
ENV CUTOUT_PROCESS_TIMEOUT_S=90
ENV CUTOUT_MAX_UPLOAD_BYTES=12582912

EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
