#!/bin/bash
# Start LLM Gateway services
# Run this in a dedicated terminal window

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Starting backend (port 8000)..."
cd "$DIR/backend"
source venv/bin/activate
uvicorn main:app --host 127.0.0.1 --port 8000 --log-level debug 2>&1 | tee /tmp/backend_live.log &
BACKEND_PID=$!

echo "Starting frontend (port 5173)..."
cd "$DIR/frontend"
npx vite --host 127.0.0.1 --port 5173 &
FRONTEND_PID=$!

sleep 2
echo ""
echo "Backend:   http://localhost:8000  (PID $BACKEND_PID)"
echo "Frontend:  http://localhost:5173  (PID $FRONTEND_PID)"
echo "Backend log: /tmp/backend_live.log"
echo ""
echo "Keep this terminal open. Ctrl+C to stop."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
