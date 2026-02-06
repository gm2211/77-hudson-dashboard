#!/bin/bash
set -e

IMAGE_NAME="hudson-dashboard"
CONTAINER_NAME="hudson-dashboard"
PORT="${PORT:-3000}"
RESET=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --reset)
      RESET=true
      shift
      ;;
    --port)
      PORT="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: ./run-docker.sh [--reset] [--port PORT]"
      echo "  --reset  Remove volumes and rebuild from scratch"
      echo "  --port   Host port to bind (default: 3000)"
      exit 1
      ;;
  esac
done

# Handle reset: stop container and remove volumes
if [ "$RESET" = true ]; then
  echo "Resetting: stopping container and removing volumes..."
  docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
  docker volume rm hudson-db hudson-uploads 2>/dev/null || true
fi

# Build the image
echo "Building Docker image..."
docker build -t "$IMAGE_NAME" .

# Stop existing container if running
docker rm -f "$CONTAINER_NAME" 2>/dev/null || true

# Run with persistent volumes
echo "Starting container on http://localhost:$PORT"
docker run -d \
  --name "$CONTAINER_NAME" \
  -p "$PORT:3000" \
  -v hudson-db:/app/prisma \
  -v hudson-uploads:/app/public/images/uploads \
  "$IMAGE_NAME"

echo "Container '$CONTAINER_NAME' is running."
echo "  Logs:  docker logs -f $CONTAINER_NAME"
echo "  Stop:  docker rm -f $CONTAINER_NAME"
