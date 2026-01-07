# AuroraMind
This repository contains the codebase for the AI Personal Growth Platform, a group project developed to help users plan long-term goals, manage learning resources, and improve productivity with AI assistance.

## Structure
- `/backend`: FastAPI backend
- `/frontend`: react frontend

## First time setup
1. **Copy environment file**

   - Copy `./backend/.env.example` to `./backend/.env`.
   - Configure the API keys in `.env` file.

2. **Start the stack**

   ```bash
   docker compose up -d --build
   ```

   This starts:
   - `postgres` (Postgres 16 + pgvector)
   - `redis`
   - `api` (FastAPI on `http://localhost:8080`)
   - `worker` (Celery worker consuming from Redis)
   - `frontend` (React router on `http://localhost:3000`)

3. **Run database migrations**

   ```bash
   docker compose run --rm api alembic upgrade head
   ```

4. **Seed test data**

   ```bash
   docker compose exec api uv run python scripts/seed_test_data.py
   ```

   Seeded user:
   - Username: `test_user`
   - Password: `password`

5. **Use the system**

   Access the website from the browser on http://localhost:3000. You can use the seeded user from the previous step to have an overview of all the available features, or create a new user to explore.

6. **Stop the stack**

   ```bash
   docker compose down
   ```
