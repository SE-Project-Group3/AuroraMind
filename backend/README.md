# Backend Overview

`TODO`

## Tech Stack

- Python 3.12.10, manage with [uv](https://github.com/astral-sh/uv)
- FastAPI for the API layer

## Project Architecture

`TODO`

## Getting Started

**(Important)From the `backend/` directory:**

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

3. **Seed test data**

   ```bash
   docker compose exec api uv run python scripts/seed_test_data.py
   ```

   Seeded user:
   - Username: `test_user`
   - Password: `password`

4. **View logs / status**

   ```bash
   docker compose ps
   docker compose logs -f --tail=200
   ```

5. **Stop**

   ```bash
   docker compose down
   ```

   Because the worker is managed by Compose, it won’t stay running after you stop the stack (no more “orphan celery” processes).
