#!/usr/bin/env bash
# stop.sh — Gracefully stop all AJJ-Tally services
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "================================================"
echo "  AJJ-Tally — Stopping services"
echo "================================================"

cd "$PROJECT_ROOT"

# 1. Stop the API process
PID_FILE="$PROJECT_ROOT/.api.pid"
if [ -f "$PID_FILE" ]; then
  API_PID=$(cat "$PID_FILE")
  if kill -0 "$API_PID" 2>/dev/null; then
    echo ">> Stopping API server (PID $API_PID)..."
    kill -SIGTERM "$API_PID"
    sleep 2
    # Force kill if still running
    if kill -0 "$API_PID" 2>/dev/null; then
      kill -SIGKILL "$API_PID"
    fi
    echo "   API server stopped."
  else
    echo "   API server was not running."
  fi
  rm -f "$PID_FILE"
else
  echo "   No API PID file found. Skipping."
fi

# 2. Stop Docker containers
echo ">> Stopping Docker containers..."
docker compose down
echo "   Containers stopped."

echo ""
echo "================================================"
echo "  AJJ-Tally stopped."
echo "================================================"
