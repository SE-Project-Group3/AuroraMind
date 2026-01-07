# AuroraMind
This repository contains the codebase for the AI Personal Growth Platform, a group project developed to help users plan long-term goals, manage learning resources, and improve productivity with AI assistance.

## Structure
- `/backend`: FastAPI backend
- `/frontend`: react frontend

## Setup
1. **Start the stack**

   ```bash
   docker compose up -d --build
   ```

   This starts:
   - `postgres` (Postgres 16 + pgvector)
   - `redis`
   - `api` (FastAPI on `http://localhost:8080`)
   - `worker` (Celery worker consuming from Redis)
   - `frontend` (React router on `http://localhost:3000`)

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

4. **Use the product**
   Access the website from the browser on `http://localhost:3000`. You can use the seeded user from the previous step to have an overview of all the available features, or create a new user to explore.
