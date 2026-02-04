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

# Generate Prisma client (ensures it's up to date with schema)
echo "Generating Prisma client..."
npx prisma generate

# Handle database reset or initial setup
if [ "$RESET_DB" = true ]; then
  echo "Resetting database to default state..."
  rm -f prisma/dev.db prisma/dev.db-journal
  npx prisma migrate dev --name init --skip-seed
  echo "Seeding database..."
  npx tsx prisma/seed.ts
elif [ ! -f "prisma/dev.db" ]; then
  echo "Setting up database..."
  npx prisma migrate dev --name init --skip-seed
  echo "Seeding database..."
  npx tsx prisma/seed.ts
fi

echo "Starting server on http://localhost:3000"
npm run dev
