#!/bin/bash
set -e

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

if [ ! -f "prisma/dev.db" ]; then
  echo "Setting up database..."
  npx prisma migrate dev --name init
fi

echo "Starting server on http://localhost:3000"
npm run dev
