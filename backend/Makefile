.PHONY: help install infra-up infra-down infra-logs migrate api worker dev stop

SHELL := /bin/bash

API_HOST ?= 127.0.0.1
API_PORT ?= 8080
CELERY_APP ?= app.core.celery_app:celery_app

help:
	@echo "Targets:"
	@echo "  make install     - uv sync"
	@echo "  make infra-up    - start postgres+redis via docker compose"
	@echo "  make infra-down  - stop postgres+redis"
	@echo "  make migrate     - alembic upgrade head"
	@echo "  make api         - start FastAPI (uvicorn --reload)"
	@echo "  make worker      - start Celery worker"
	@echo "  make dev         - start worker + api (single command; 2 processes)"

install:
	uv sync

infra-up:
	docker compose up -d

infra-down:
	docker compose down

infra-logs:
	docker compose logs -f --tail=200

migrate:
	alembic upgrade head

api:
	uv run uvicorn app.main:app --reload --host $(API_HOST) --port $(API_PORT)

worker:
	uv run celery -A $(CELERY_APP) worker -l info

# Single command convenience. Still spawns two OS processes (required by Celery).
dev:
	uv run sh -c 'celery -A $(CELERY_APP) worker -l info & uvicorn app.main:app --reload --host $(API_HOST) --port $(API_PORT)'


