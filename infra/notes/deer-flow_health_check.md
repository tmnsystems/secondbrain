# Deer-Flow Health Check

**Date:** 2025-05-20

## Docker & Containerization

- `deer-flow/Dockerfile` exists for backend.
- `deer-flow/docker-compose.yml` defines:
  - `backend` service (container `deer-flow-backend`) exposing port 8000.
  - `frontend` service (container `deer-flow-frontend`) exposing port 3000.
  - Both share `deer-flow-network` bridge network.
- `deer-flow/web/Dockerfile` and `deer-flow/web/docker-compose.yml` for web UI.

## Environment & Configuration

- `.env` values loaded via `secondbrain_api_keys.env` (mount in docker-compose).
- Configuration template at `deer-flow/conf.yaml.example`.
- Python requirements in `pyproject.toml`; frontend deps in `deer-flow/web/package.json`.

## Services & Endpoints

- Backend FastAPI in `src/server/app.py`:
  - `/api/chat/stream`
  - `/api/tts`
  - `/api/podcast/generate`
  - `/api/ppt/generate`
  - `/api/prose/generate`
  - `/api/mcp/server/metadata`
- **Missing**: `/api/task` endpoint (planned for integration with SecondBrain CLI).

## Setup & Run Commands

```bash
# Backend
uv sync
uv run main.py

# Web UI
cd web
pnpm install
./bootstrap.sh -d
```

## Recommended Next Steps

- Implement `/api/task` endpoint to handle incoming tasks.
- Add automated Cypress/Puppeteer smoke-tests for basic web UI flows.