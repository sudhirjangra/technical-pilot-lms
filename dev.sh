#!/usr/bin/env bash

TARGET="${1:-all}"

kill_ports() {
  local pids
  pids=$(lsof -ti :3000,:8000 2>/dev/null)
  if [ -n "$pids" ]; then
    echo "Killing PIDs: $pids"
    kill -9 $pids 2>/dev/null
    sleep 0.5
  else
    echo "No processes on :3000 or :8000"
  fi
}

kill_ports

case "$TARGET" in
  web)
    echo "Starting web..."
    pnpm dev:web
    ;;
  api)
    echo "Starting api..."
    pnpm dev:api
    ;;
  all|*)
    echo "Starting all..."
    pnpm dev
    ;;
esac
