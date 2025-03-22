#!/usr/bin/env python3
"""
MongoDB Atlas Connection Test Script

This script tests the connection to MongoDB Atlas and verifies that
collections can be accessed and basic operations performed.
"""

import os
import sys
import logging
from database.mongo_connector import MongoDBConnector
from database.mongo_utils import serialize_mongo_doc
import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("mongodb_test")

def test_mongodb_connection():
    """Test MongoDB Atlas connection and operations"""
    # Get MongoDB URI from environment or use Atlas URI
    mongodb_uri = os.getenv("MONGODB_URI", "mongodb+srv://blackloin:naruto45@cluster0.fmktl.mongodb.net/storyboardai_db?retryWrites=true&w=majority")
    
    # Log connection info (sanitized)
    connection_parts = mongodb_uri.split('@')
    if len(connection_parts) > 1:
        logger.info(f"Testing connection to MongoDB Atlas: {connection_parts[-1].split('/')[0]}")
    else:
        logger.info(f"Testing connection to MongoDB: {mongodb_uri}")
    
    try:
        # Create MongoDB connector
        connector = MongoDBConnector(mongodb_uri)
        
        # Test collection access
        logger.info("Testing collection access...")
        projects = connector.find_many("projects", {})
        logger.info(f"Found {len(projects)} projects in database")
        
        # Test film_school_projects access
        film_school_projects = connector.find_many("film_school_projects", {})
        logger.info(f"Found {len(film_school_projects)} film school projects in database")
        
        # Test insert and delete operations with a temporary test document
        logger.info("Testing write operations...")
        test_doc = {
            "test_id": f"test_{datetime.datetime.now().timestamp()}",
            "created_at": datetime.datetime.now(),
            "test_data": "MongoDB Atlas connection test"
        }
        
        # Insert test document
        test_collection = "test_collection"
        result = connector.insert_one(test_collection, test_doc)
        if result and result.inserted_id:
            logger.info(f"Successfully inserted test document: {result.inserted_id}")
            
            # Retrieve the document
            test_query = {"test_id": test_doc["test_id"]}
            found_doc = connector.find_one(test_collection, test_query)
            if found_doc:
                logger.info(f"Successfully retrieved test document: {found_doc['test_id']}")
                
                # Delete the test document
                delete_result = connector.delete_one(test_collection, test_query)
                if delete_result and delete_result.deleted_count:
                    logger.info("Successfully deleted test document")
                else:
                    logger.warning("Failed to delete test document")
            else:
                logger.warning("Failed to retrieve test document")
        else:
            logger.warning("Failed to insert test document")
        
        # Close the connection
        connector.close()
        
        logger.info("✅ MongoDB Atlas connection test completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"❌ MongoDB connection test failed: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_mongodb_connection()
    sys.exit(0 if success else 1) 