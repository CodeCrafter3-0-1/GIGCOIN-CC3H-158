#!/bin/bash
ROOT_DIR=$(pwd)
echo "🛑 Stopping previous processes..."
pkill -f "hardhat node" 2>/dev/null
pkill -f "uvicorn" 2>/dev/null
pkill -f "vite" 2>/dev/null

echo "🚀 Starting Hardhat Node..."
cd "$ROOT_DIR/contracts" && npx hardhat node > "$ROOT_DIR/hardhat.log" 2>&1 &
sleep 5

echo "🚀 Deploying local contracts..."
cd "$ROOT_DIR/contracts" && npx hardhat run --network localhost ./script/deploy.ts >> "$ROOT_DIR/hardhat.log" 2>&1
sleep 2

echo "🚀 Starting Backend..."
cd "$ROOT_DIR"
export PYTHONPATH=$PYTHONPATH:$(pwd)
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload > "$ROOT_DIR/backend.log" 2>&1 &
sleep 3

echo "🚀 Starting Frontend..."
cd "$ROOT_DIR/frontend"
npm run dev > "$ROOT_DIR/frontend.log" 2>&1 &

echo "✅ Stack is up!"
echo "Frontend: http://localhost:5173"
echo "Backend: http://localhost:8000"
echo "Hardhat: http://localhost:8545"
echo ""
echo "Logs: tail -f backend.log frontend.log hardhat.log"
