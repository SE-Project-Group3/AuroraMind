# STAGE 1: Builder
# We use this stage to compile dependencies and setup the venv
FROM python:3.12-slim AS builder

# Optimization: Copy uv binary directly (faster than pip install)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app

# Optimization: Cache apt directories to speed up repeated builds
# We install build-essential here, but it won't be in the final image
RUN --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt \
    apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv

# Optimization: Copy ONLY dependency files first
COPY pyproject.toml uv.lock ./

# Optimization: Mount uv cache and sync dependencies WITHOUT the project code
# This ensures this layer is cached unless dependencies change, regardless of code changes
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project

# STAGE 2: Runner
# This is the final image, kept small and clean
FROM python:3.12-slim

WORKDIR /app

# Add venv to path
ENV PATH="/opt/venv/bin:$PATH"

# Copy the pre-built virtual environment from the builder stage
COPY --from=builder /opt/venv /opt/venv

# Optimization: We still need 'uv' for the 'uv run' command in your compose file
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Copy application code
COPY alembic.ini ./
COPY alembic ./alembic
COPY app ./app

# Place the sync here for the project itself, though purely optional 
# if you mount code in dev. It ensures the image is self-contained.
# COPY pyproject.toml uv.lock ./

EXPOSE 8080

# Use direct executable path which is slightly faster, 
# though 'uv run' is fine if you prefer it.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]