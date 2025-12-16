.PHONY: help install up down ps logs infra-up infra-down infra-logs migrate api worker dev stop

SHELL := /bin/bash

API_HOST ?= 127.0.0.1
API_PORT ?= 8080
CELERY_APP ?= app.core.celery_app:celery_app

help:
	@echo "Targets:"
	@echo "  make install     - uv sync"
	@echo "  make up          - docker compose up (postgres+redis+api+worker)"
	@echo "  make down        - docker compose down"
	@echo "  make ps          - docker compose ps"
	@echo "  make logs        - docker compose logs -f"
	@echo "  make infra-up    - start postgres+redis only"
	@echo "  make infra-down  - stop postgres+redis only"
	@echo "  make migrate     - alembic upgrade head"
	@echo "  make api         - start FastAPI (uvicorn --reload)"
	@echo "  make worker      - start Celery worker"
	@echo "  make dev         - start worker + api (single command; 2 processes)"

install:
	uv sync

up:
	docker compose up -d --build

down:
	docker compose down

ps:
	docker compose ps

logs:
	docker compose logs -f --tail=200

infra-up:
	docker compose up -d postgres redis

infra-down:
	docker compose stop postgres redis

infra-logs:
	docker compose logs -f --tail=200

migrate:
	# Run migrations inside the API container image (uses same env as compose).
	docker compose run --rm api alembic upgrade head

api:
	uv run uvicorn app.main:app --reload --host $(API_HOST) --port $(API_PORT)

worker:
	uv run celery -A $(CELERY_APP) worker -l info

# Single command convenience. Still spawns two OS processes (required by Celery).
dev:
	uv run sh -c 'celery -A $(CELERY_APP) worker -l info & uvicorn app.main:app --reload --host $(API_HOST) --port $(API_PORT)'


