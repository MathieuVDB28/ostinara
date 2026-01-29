#!/bin/bash

echo "🚀 Starting Ostinara with ngrok tunnel..."
echo ""

# Start Next.js in background
npm run dev &
NEXT_PID=$!

# Wait for Next.js to start
echo "⏳ Waiting for Next.js to start..."
sleep 5

# Start ngrok
echo "📡 Creating ngrok tunnel..."
echo ""

./node_modules/.bin/ngrok http 3000 --region eu --log stdout

# Cleanup on exit
trap "kill $NEXT_PID 2>/dev/null" EXIT
