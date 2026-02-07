#!/bin/bash
set -e

RESET_DB=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --reset)
      RESET_DB=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: ./run.sh [--reset]"
      echo "  --reset  Reset database to default seed data"
      exit 1
      ;;
  esac
done

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Start Postgres if docker compose is available and not already running
if command -v docker &> /dev/null; then
  if ! docker compose ps --status running 2>/dev/null | grep -q postgres; then
    echo "Starting Postgres..."
    docker compose up -d
    echo "Waiting for Postgres to be ready..."
    sleep 2
  fi
fi

# Generate Prisma client (ensures it's up to date with schema)
echo "Generating Prisma client..."
npx prisma generate

# Handle database reset or initial setup
if [ "$RESET_DB" = true ]; then
  echo "Resetting database to default state..."
  npx prisma db push --force-reset
  echo "Seeding database..."
  npx tsx prisma/seed.ts
else
  echo "Setting up database..."
  npx prisma db push
fi

echo "Starting server on http://localhost:3000"
npm run dev
