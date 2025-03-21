# StoryboardAI: Running Guide

This document provides step-by-step instructions for running the StoryboardAI application, ensuring all components are working correctly.

## Prerequisites

- Docker and Docker Compose installed
- Git to clone the repository (if not already done)
- OpenAI API key

## Setup Instructions

### 1. Environment Setup

1. Ensure you're in the StoryboardAI directory:
   ```bash
   cd /Users/russellpowers/Storycode4/storyboardai
   ```

2. Verify or create the `.env` file at the root of the project:
   ```bash
   # If .env doesn't exist, create it with:
   echo "OPENAI_API_KEY=your_openai_api_key_here" > .env
   ```
   Make sure to replace `your_openai_api_key_here` with your actual OpenAI API key.

### 2. Starting the Application

#### Using Docker (Recommended)

1. Clean up any existing containers:
   ```bash
   docker-compose down --remove-orphans
   ```

2. Start the application:
   ```bash
   docker-compose up -d
   ```

3. Verify containers are running:
   ```bash
   docker-compose ps
   ```
   You should see both the app and frontend containers running.

4. Check container logs:
   ```bash
   # To check backend logs:
   docker logs -f storyboardai-app-1
   
   # To check frontend logs:
   docker logs -f storyboardai-frontend-1
   ```

#### Using Local Development (Alternative)

1. Start the application using the provided script:
   ```bash
   ./run_app.sh
   ```
   When prompted, choose whether to use Docker or run locally.

### 3. Verifying the Application

1. Check that the backend API is accessible:
   ```bash
   curl http://localhost:8000/health
   ```
   You should get a response like: `{"status":"ok","message":"API is healthy"}`

2. Check that the frontend is accessible by opening in a browser:
   ```
   http://localhost:3000
   ```
   You should see the StoryboardAI application interface.

### 4. Running Tests

After confirming the application is running:

1. Run the test suite:
   ```bash
   ./run_tests.sh
   ```
   This will run both API and UI tests.

2. Review test results in the terminal output.

#### API Tests

The API tests check various backend endpoints, including:
- Health check
- Project management (create, read, update, delete)
- Actor creation
- Film school consultation

#### UI Tests

UI tests use Puppeteer to test the frontend interface. If you encounter Chrome-related errors:

1. Install Chrome browser if not already installed:
   ```bash
   # On macOS:
   brew install --cask google-chrome
   ```

2. Set the Puppeteer Chrome path explicitly:
   ```bash
   # Navigate to frontend directory
   cd frontend
   
   # Install Puppeteer with Chrome
   npm install puppeteer
   
   # If needed, set Chrome path in your environment
   export PUPPETEER_EXECUTABLE_PATH=/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome
   ```

3. Run UI tests again:
   ```bash
   npm run ui-test
   ```

## Testing Results (Current Status)

- **Backend API**: ✅ PASSING - All API tests pass successfully
- **Frontend UI**: ⚠️ PARTIALLY WORKING - Browser interface accessible, but UI tests encounter Chrome-related issues
- **Application Status**: ✅ FULLY OPERATIONAL - Core functionality working correctly

## Basic Usage Examples

We've confirmed the application works by testing the following key functions:

### 1. Creating a Project

```bash
curl -X POST http://localhost:8000/api/projects -H "Content-Type: application/json" -d '{
  "title": "Test Project", 
  "description": "A test project", 
  "script": "Scene 1: A developer tests the app.\nScene 2: The tests pass successfully."
}'
```

### 2. Viewing Projects

```bash
curl http://localhost:8000/api/projects
```

### 3. Exporting a Storyboard

```bash
curl -X POST http://localhost:8000/api/projects/[PROJECT_ID]/export
```
This creates an export in the `exports/` directory.

### 4. Using the Web Interface

1. Open a browser and navigate to http://localhost:3000
2. Click "Create New Project" to start a new storyboard
3. Enter a title, description, and script content
4. The application will automatically extract frames from your script
5. View and modify generated frames as needed
6. Export your completed storyboard

## Troubleshooting

### Common Issues and Solutions

1. **Frontend Not Starting**
   - Check logs: `docker logs -f storyboardai-frontend-1`
   - Possible solution: Rebuild the frontend container
     ```bash
     docker-compose down
     docker-compose up -d --build frontend
     ```

2. **Backend API Not Responding**
   - Check logs: `docker logs -f storyboardai-app-1`
   - Possible solution: Rebuild the backend container
     ```bash
     docker-compose down
     docker-compose up -d --build app
     ```

3. **MongoDB Connection Issues**
   - Run the MongoDB connection test:
     ```bash
     ./test_mongodb_connection.sh
     ```
   - Ensure network connectivity to MongoDB Atlas

4. **Missing Directories**
   - The application requires several directories for storing images and exports
   - If running locally, ensure these directories exist:
     ```bash
     mkdir -p generated_images actor_images frame_images exports
     ```

5. **Puppeteer Chrome Issues**
   - If UI tests fail with "Could not find Chrome" error:
     ```bash
     # Install Chrome if needed
     brew install --cask google-chrome
     
     # Install puppeteer dependencies
     cd frontend && npm install puppeteer
     ```

## Complete Reset (If Needed)

If you need to completely reset the application:

```bash
# Stop all containers
docker-compose down --remove-orphans

# Remove node_modules (if running issues with frontend)
cd frontend && rm -rf node_modules && cd ..

# Start fresh
docker-compose up -d
```

This will restart the application with a clean state. 