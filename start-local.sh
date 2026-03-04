#!/usr/bin/env bash
# Start union-rules app locally (backend + frontend)
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Trap Ctrl+C and kill both child processes
cleanup() {
  echo ""
  echo "Stopping..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  exit 0
}
trap cleanup INT TERM

echo "Starting backend (http://localhost:8080)..."
cd "$REPO_ROOT/server/UnionRulesApi"
DOTNET_SYSTEM_NET_DISABLEIPV6=1 dotnet run --launch-profile dev &
BACKEND_PID=$!

echo "Starting frontend (http://localhost:4200)..."
cd "$REPO_ROOT/client"
npx ng serve --configuration local &
FRONTEND_PID=$!

echo ""
echo "  Backend:  http://localhost:8080"
echo "  Frontend: http://localhost:4200"
echo ""
echo "Press Ctrl+C to stop both."

wait "$BACKEND_PID" "$FRONTEND_PID"
