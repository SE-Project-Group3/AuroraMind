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
   cd backend
   uv venv --python 3.12.10
   source .venv/bin/activate
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

4. **Start the API**
   ```bash
   uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8080
   ```
   The server listens on `http://127.0.0.1:8080` by default.