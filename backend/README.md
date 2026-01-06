# Backend Overview

`TODO`

## Tech Stack

- Python 3.12.10, manage with [uv](https://github.com/astral-sh/uv)
- FastAPI for the API layer

## Project Architecture

`TODO`

## Getting Started

### Option A (recommended): run everything with Docker Compose (Postgres + Redis + API + Celery worker)

From the `backend/` directory:

1. **Start the stack**

   ```bash
   docker compose up -d --build
   ```

   This starts:
   - `postgres` (Postgres 16 + pgvector)
   - `redis`
   - `api` (FastAPI on `http://localhost:8080`)
   - `worker` (Celery worker consuming from Redis)

2. **Run database migrations**

   ```bash
   docker compose run --rm api alembic upgrade head
   ```

3. **View logs / status**

   ```bash
   docker compose ps
   docker compose logs -f --tail=200
   ```

4. **Stop**

   ```bash
   docker compose down
   ```

   Because the worker is managed by Compose, it won’t stay running after you stop the stack (no more “orphan celery” processes).

### Option B: local development (uv) — only if you prefer not to use Docker for app processes

1. **Install uv**

   Follow the [official instructions](https://docs.astral.sh/uv/getting-started/installation/) for your system.

   After installation, verify:

   ```bash
   uv --version
   ```

2. **Create the virtual environment**

   ```bash
   cd backend
   uv venv --python 3.12.10
   source .venv/bin/activate
   ```

3. **Install dependencies with uv**

   ```bash
   uv sync
   ```

4. **Configure environment variables (local)**

   - Copy `backend/.env.example` to `backend/.env`
   - Ensure the `POSTGRES_*` values in `.env` match the defaults in `docker-compose.yml` (`aurora` / `password` / `auroramind`) so Alembic can connect to the database.

5. **Start infrastructure (Postgres + Redis)**

   ```bash
   make infra-up
   ```

   Run this from the `backend/` directory with Docker Desktop (or another compatible runtime) installed.

   After the containers are running, you can open a psql shell directly into Postgres to inspect data:

   ```bash
   docker compose exec postgres psql -U aurora -d auroramind
   ```

6. **Initialize the database / run Alembic migrations**

   ```bash
   alembic upgrade head
   ```

   Execute this inside the activated virtual environment. The first run creates all tables; subsequent runs keep the schema up to date.

7. **Start the API**
   ```bash
   uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8080
   ```
   The server listens on `http://127.0.0.1:8080` by default.

8. **Start Celery worker (Knowledge ingestion)**

   Celery consumes ingestion jobs from Redis and updates `knowledge_documents.ingest_progress`.

   - Option A (recommended): run worker in a second terminal:

   ```bash
   uv run celery -A app.core.celery_app:celery_app worker -l info
   ```

   - Option B (single command; still spawns two processes under the hood):

   ```bash
   uv run sh -c "celery -A app.core.celery_app:celery_app worker -l info & uvicorn app.main:app --reload --host 127.0.0.1 --port 8080"
   ```

## Makefile shortcuts

From the `backend/` directory:

```bash
make up
make migrate
make logs
make down
```
