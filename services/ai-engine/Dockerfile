# ─── Stage: base Python image (no Node.js, no npm, no nest-cli) ───────────────
FROM python:3.11-slim

# System deps required by Prophet (C++ compiler) and psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (layer cached unless requirements change)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY app/ ./app/
COPY scripts/ ./scripts/

# Copy pre-trained models if they exist (optional — volume-mount in production)
COPY models/ ./models/

# Non-root user for security
RUN addgroup --system aiengine && adduser --system --ingroup aiengine aiengine
RUN chown -R aiengine:aiengine /app
USER aiengine

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
