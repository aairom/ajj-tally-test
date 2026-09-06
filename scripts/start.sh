#!/usr/bin/env bash
# start.sh — Launch AJJ-Tally in detached mode
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "================================================"
echo "  AJJ-Tally — Starting services"
echo "================================================"

cd "$PROJECT_ROOT"

# 1. Start infrastructure containers
echo ">> Starting PostgreSQL and Redis..."
docker compose up -d postgres redis

# Wait for PostgreSQL to be ready
echo ">> Waiting for PostgreSQL..."
until docker compose exec -T postgres pg_isready -U ajj -d ajjforms > /dev/null 2>&1; do
  sleep 1
done
echo "   PostgreSQL is ready."

# 2. Run database migrations
echo ">> Running database migrations..."
cd api && npm run db:migrate
cd "$PROJECT_ROOT"

# 3. Start the API in detached mode (background)
echo ">> Starting API server..."
cd api
nohup npm run start > "$PROJECT_ROOT/.api.log" 2>&1 &
API_PID=$!
echo $API_PID > "$PROJECT_ROOT/.api.pid"
cd "$PROJECT_ROOT"

# Give the API a moment to bind its port
sleep 2

API_PORT="${PORT:-8090}"
echo ""
echo "================================================"
echo "  AJJ-Tally is running"
echo "  API URL : http://localhost:${API_PORT}"
echo "  Health  : http://localhost:${API_PORT}/health"
echo "  Logs    : tail -f .api.log"
echo "  Stop    : ./scripts/stop.sh"
echo "================================================"
