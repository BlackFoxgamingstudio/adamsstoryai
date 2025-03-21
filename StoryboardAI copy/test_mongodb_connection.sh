#!/bin/bash

# Set MongoDB Atlas connection string
export MONGODB_URI="mongodb+srv://blackloin:naruto45@cluster0.fmktl.mongodb.net/storyboardai_db?retryWrites=true&w=majority"

echo "Testing MongoDB Atlas connection..."
echo "URI: ${MONGODB_URI}"
echo ""

# Change to backend directory and run the test script
cd backend
python3 test_mongodb.py

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ MongoDB Atlas connection test PASSED!"
    echo "Your MongoDB Atlas integration is working correctly."
    echo ""
    echo "You can now run the application with:"
    echo "  ./run_app.sh"
else
    echo ""
    echo "❌ MongoDB Atlas connection test FAILED!"
    echo "Please check your connection string and network settings."
    echo ""
fi 