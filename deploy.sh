#!/usr/bin/env bash
# Deploy Force frontend — build, copy static assets, restart on port 3001
set -e

FRONTEND=/home/pruthvi/Projects/force/frontend
STANDALONE=$FRONTEND/.next/standalone

echo "Building..."
cd "$FRONTEND"
npm run build

echo "Copying static assets..."
cp -r .next/static "$STANDALONE/.next/static"
cp -r public "$STANDALONE/public" 2>/dev/null || true

echo "Restarting frontend (port 3001)..."
pkill -f "next-server" 2>/dev/null || true
sleep 1
cd "$STANDALONE"
export PORT=3001
nohup node server.js >> /tmp/force-frontend.log 2>&1 &

sleep 2
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/ | grep -q "200\|304"; then
  echo "Frontend up on :3001"
else
  echo "ERROR: frontend not responding on :3001" >&2
  exit 1
fi
