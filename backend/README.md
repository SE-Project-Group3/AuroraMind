# Backend Overview

`TODO`

## Tech Stack

- Python 3.12.10, manage with [uv](https://github.com/astral-sh/uv)
- FastAPI for the API layer

## Project Architecture

`TODO`

## Getting Started

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

4. **Configure environment variables**

   - Copy `backend/.env.example` to `backend/.env`
   - Ensure the `POSTGRES_*` values in `.env` match the defaults in `docker-compose.yml` (`aurora` / `password` / `auroramind`) so Alembic can connect to the database.

5. **Start infrastructure (Postgres + Redis)**

   ```bash
   docker compose up -d
   ```

   Run this from the `backend/` directory with Docker Desktop (or another compatible runtime) installed.

   After the containers are running, you can open a psql shell directly into Postgres to inspect data:

   ```bash
   docker compose exec postgres psql -U aurora -d auroramind
   ```

6. **(maybe obsolete, replaced by pgvector image) Install `pgvector` inside the Postgres container (Knowledge Base depends on it)**

   The Knowledge Base uses Postgres `vector` types and indexes. Our Alembic migrations already run:
   `CREATE EXTENSION IF NOT EXISTS vector`
   but **the extension must be installed in the Postgres image/container first**.

   - Enter the running Postgres container:

   ```bash
   docker compose exec postgres bash
   ```

   - Inside the container, install `pgvector` for Postgres 16:

   ```bash
   apt-get update
   apt-get install -y postgresql-16-pgvector
   ```

   > Tip: If you rebuild containers frequently, consider baking `pgvector` into a custom Postgres image (or switching to a pgvector-enabled Postgres image) to avoid repeating the `apt-get` steps.

7. **Initialize the database / run Alembic migrations**

   ```bash
   alembic upgrade head
   ```

   Execute this inside the activated virtual environment. The first run creates all tables; subsequent runs keep the schema up to date.

8. **Start the API**
   ```bash
   uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8080
   ```
   The server listens on `http://127.0.0.1:8080` by default.

9. **Start Celery worker (Knowledge ingestion)**

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
make infra-up
make migrate
make dev
```
