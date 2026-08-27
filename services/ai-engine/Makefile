.PHONY: serve train export install health evaluate lint format typecheck

VENV := ./venv/bin
PORT ?= 8000

# ── Desarrollo local ──────────────────────────────────────────────────────────

serve:
	$(VENV)/uvicorn app.main:app --reload --port $(PORT)

health:
	@curl -s http://127.0.0.1:$(PORT)/health | python3 -m json.tool

# ── Pipeline ML ───────────────────────────────────────────────────────────────

train:
	$(VENV)/python -m scripts.train_all

export:
	$(VENV)/python -m scripts.export_training_data

evaluate:
	$(VENV)/python -m scripts.evaluate_models

# ── Setup ─────────────────────────────────────────────────────────────────────

install:
	python3 -m venv venv
	$(VENV)/pip install --upgrade pip
	$(VENV)/pip install -r requirements.txt

# ── Calidad de código ─────────────────────────────────────────────────────────

lint:
	$(VENV)/ruff check app/ scripts/

format:
	$(VENV)/ruff format app/ scripts/

typecheck:
	$(VENV)/mypy app/

# ── Docker ────────────────────────────────────────────────────────────────────

docker-build:
	docker build -t nm-ai-engine:local .

docker-run:
	docker run --rm -p $(PORT):8000 --env-file .env nm-ai-engine:local
