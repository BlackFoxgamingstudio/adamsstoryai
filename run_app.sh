#!/bin/bash

# Load environment variables
if [ -f ./backend/config/.env ]; then
  export $(cat ./backend/config/.env | grep -v '#' | sed 's/\r$//' | awk '/=/ {print $1}')
fi

# Check if Docker is available
if command -v docker >/dev/null 2>&1 && command -v docker-compose >/dev/null 2>&1; then
  echo "Docker and Docker Compose found. Do you want to run using Docker? (y/n)"
  read -r use_docker
  if [[ "$use_docker" =~ ^[Yy]$ ]]; then
    echo "Starting services with Docker Compose..."
    docker-compose up
    exit 0
  fi
fi

# Create required directories - create these at the root level 
# to be consistent with the Docker setup
mkdir -p ./generated_images
mkdir -p ./actor_images
mkdir -p ./frame_images
mkdir -p ./exports

# Create symlinks from backend directory to root to ensure 
# both locations can access the same files
ln -sf $(pwd)/generated_images $(pwd)/backend/generated_images
ln -sf $(pwd)/actor_images $(pwd)/backend/actor_images
ln -sf $(pwd)/frame_images $(pwd)/backend/frame_images
ln -sf $(pwd)/exports $(pwd)/backend/exports

# Set MongoDB URI to Atlas connection string
export MONGODB_URI="mongodb+srv://blackloin:naruto45@cluster0.fmktl.mongodb.net/storyboardai_db?retryWrites=true&w=majority"
export DOCKER_ENV=false
echo "Using MongoDB Atlas at: ${MONGODB_URI}"

# Start the backend server in the background
echo "Starting backend server..."
cd backend
python3 main.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Start the frontend server
echo "Starting frontend server..."
cd ../frontend
npm start

# Function to handle script termination
cleanup() {
  echo "Shutting down servers..."
  kill $BACKEND_PID
  exit 0
}

# Register the cleanup function for the SIGINT signal
trap cleanup SIGINT

# Wait for the frontend process to finish
wait 