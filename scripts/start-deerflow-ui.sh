#!/usr/bin/env bash
# Start the Deer-Flow web interface (backend + frontend)
set -e

# Determine Deer-Flow directory based on script location
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEER_DIR="$ROOT_DIR/deer-flow"

echo "🚀 Starting Deer-Flow Web Interface"
if command -v docker-compose >/dev/null 2>&1; then
  echo "🔹 Attempting to launch Deer-Flow via docker-compose..."
  # Temporarily disable exit-on-error for docker-compose step
  set +e
  (cd "$DEER_DIR" && docker-compose up -d --build)
  DOCKER_STATUS=$?
  set -e
  if [ $DOCKER_STATUS -eq 0 ]; then
    echo "✅ Docker Compose started Deer-Flow services"
    echo "   Backend:  http://localhost:8000"
    echo "   Frontend: http://localhost:3000"
  else
    echo "⚠️ Docker Compose start failed (exit code $DOCKER_STATUS). Falling back to manual start."
    echo "🔹 Starting backend manually"
    (cd "$DEER_DIR" && python3 server.py --reload &) 
    echo "   Backend API running at http://localhost:8000"
    echo "➡️ To start frontend: cd deer-flow/web && npm install && npm run dev"
  fi
else
  echo "⚠️ docker-compose not found. Starting backend manually"
  (cd "$DEER_DIR" && python3 server.py --reload &) 
  echo "🔹 Backend API running at http://localhost:8000"
  echo "➡️ To start frontend: cd deer-flow/web && npm install && npm run dev"
fi