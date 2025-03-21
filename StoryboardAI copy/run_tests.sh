#!/bin/bash

# Run tests for StoryboardAI application
# This script runs both API and UI tests

echo "=== StoryboardAI Test Suite ==="
echo

# Check if the app is running
echo "Checking if the application is running..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health)

if [ "$API_STATUS" != "200" ]; then
  echo "ERROR: The API server is not running. Please start the application first using ./run_app.sh"
  exit 1
fi

# Check if the frontend is running
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)

if [ "$FRONTEND_STATUS" != "200" ]; then
  echo "ERROR: The frontend server is not running. Please start the application first using ./run_app.sh"
  exit 1
fi

echo "Application is running properly. Starting tests..."
echo

# Run API tests
echo "=== Running API Tests ==="
cd backend
python3 test_api_comprehensive.py
API_TEST_STATUS=$?
cd ..

echo

# Run UI tests (if puppeteer is installed)
echo "=== Running UI Tests ==="
cd frontend

# Check if puppeteer is installed
if npm list puppeteer > /dev/null 2>&1; then
  echo "Running UI tests..."
  npm run ui-test
  UI_TEST_STATUS=$?
else
  echo "Puppeteer not installed. Installing it now..."
  npm install --save-dev puppeteer
  echo "Running UI tests..."
  npm run ui-test
  UI_TEST_STATUS=$?
fi

cd ..

echo
echo "=== Test Results Summary ==="

# Report overall test status
if [ $API_TEST_STATUS -eq 0 ] && [ $UI_TEST_STATUS -eq 0 ]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "❌ Some tests failed. Check the logs for details."
  exit 1
fi 