#!/bin/sh
set -e

echo "========================================================================"
echo " Starting All-in-One e-LMPC RADAR Container (Backend :8000 + Frontend :3000)"
echo "========================================================================"

# Start FastAPI backend in background
echo "[+] Starting FastAPI backend on port 8000..."
cd /app/backend
uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait briefly for backend port to be active
sleep 2

# Start Next.js frontend in foreground
echo "[+] Starting Next.js frontend on port 3000..."
cd /app/frontend
npm run start -- -H 0.0.0.0 -p 3000 &
FRONTEND_PID=$!

# Handle shutdown signals
trap "kill -TERM $BACKEND_PID $FRONTEND_PID 2>/dev/null || true" SIGTERM SIGINT

wait -n
