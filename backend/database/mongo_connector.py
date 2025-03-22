import os
import logging
import time
import re
from typing import Dict, Any, List
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from pymongo.collection import Collection
from pymongo.database import Database
from .mongo_utils import serialize_mongo_doc, prepare_for_mongo

# Configure logger
logger = logging.getLogger(__name__)

class MongoDBConnector:
    def __init__(self, connection_string: str = None):
        """Initialize MongoDB connection."""
        self.connection_string = connection_string or os.getenv("MONGODB_URI", "mongodb://localhost:27017/storyboard")
        self.client = None
        self.db = None
        self.connect()
    
    def connect(self, max_retries=3, retry_delay=2):
        """Establish connection to MongoDB with retry logic."""
        retries = 0
        while retries <= max_retries:
            try:
                # Close any existing connection
                if self.client is not None:
                    self.client.close()
                
                # Set MongoDB driver settings optimized for Atlas
                # - serverSelectionTimeoutMS: How long to wait for server selection
                # - connectTimeoutMS: How long to wait for an initial connection
                # - maxPoolSize: Maximum number of connections to maintain
                # - retryWrites: Auto retry for write operations
                self.client = MongoClient(
                    self.connection_string,
                    serverSelectionTimeoutMS=5000,
                    connectTimeoutMS=10000,
                    maxPoolSize=20,
                    retryWrites=True
                )
                
                # Test connection
                self.client.admin.command('ping')
                
                # Get database name from connection string
                # Handle both standard and Atlas formats
                match = re.search(r'/([^/?]+)(\?|$)', self.connection_string)
                if match:
                    db_name = match.group(1)
                else:
                    # Default database name
                    db_name = "storyboardai_db"
                
                self.db = self.client[db_name]
                
                # Log successful connection (sanitize connection string)
                if '@' in self.connection_string:
                    # Atlas connection with credentials
                    host_part = self.connection_string.split('@')[-1].split('/')[0]
                    logger.info(f"Successfully connected to MongoDB Atlas at {host_part}")
                else:
                    # Local MongoDB
                    logger.info(f"Successfully connected to MongoDB at {self.connection_string}")
                
                # Create indexes for better performance
                self._ensure_indexes()
                
                return
            
            except (ConnectionFailure, ServerSelectionTimeoutError) as e:
                retries += 1
                if retries <= max_retries:
                    logger.warning(f"MongoDB connection attempt {retries} failed: {str(e)}. Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                else:
                    logger.error(f"Failed to connect to MongoDB after {max_retries} attempts: {str(e)}")
                    # Don't raise here - we'll handle errors in the operations
            except Exception as e:
                logger.error(f"Unexpected error connecting to MongoDB: {str(e)}")
                # Don't raise here - we'll handle errors in the operations
    
    def _ensure_indexes(self):
        """Create indexes for better query performance"""
        try:
            # Create indexes on project and film_school collections
            self.db["projects"].create_index("project_id", unique=True)
            self.db["film_school_projects"].create_index("project_id", unique=True)
            self.db["film_school_projects"].create_index("linked_project_id")
            logger.info("Database indexes created or verified")
        except Exception as e:
            logger.warning(f"Failed to create indexes: {str(e)}")
    
    def _ensure_connection(self):
        """Ensure we have a valid connection before operations."""
        if self.client is None or self.db is None:
            self.connect()
    
    def get_collection(self, collection_name: str) -> Collection:
        """Get MongoDB collection."""
        self._ensure_connection()
        return self.db[collection_name]
    
    def find_one(self, collection_name: str, query: Dict) -> Dict:
        """Find one document in collection."""
        try:
            self._ensure_connection()
            logger.info(f"MongoDB find_one: {collection_name}, query: {query}")
            
            if self.client is None or self.db is None:
                logger.error("MongoDB client or database is None")
                return None
            
            collection = self.get_collection(collection_name)
            result = collection.find_one(query)
            logger.info(f"MongoDB find_one result: {result is not None}")
            
            if result is not None:
                return serialize_mongo_doc(result)
            logger.warning(f"MongoDB find_one: No document found for query: {query}")
            return None
        except Exception as e:
            logger.error(f"Error in find_one operation: {str(e)}")
            # Return None instead of raising to allow application to continue
            return None
    
    def find_many(self, collection_name: str, query: Dict) -> List[Dict]:
        """Find multiple documents in collection."""
        try:
            self._ensure_connection()
            logger.info(f"MongoDB find_many: {collection_name}, query: {query}")
            
            if self.client is None or self.db is None:
                logger.error("MongoDB client or database is None")
                return []
            
            collection = self.get_collection(collection_name)
            results = list(collection.find(query))
            logger.info(f"MongoDB find_many results: {len(results)}")
            
            return [serialize_mongo_doc(doc) for doc in results]
        except Exception as e:
            logger.error(f"Error in find_many operation: {str(e)}")
            # Return empty list instead of raising
            return []
    
    def insert_one(self, collection_name: str, document: Dict) -> Any:
        """Insert one document into collection."""
        try:
            self._ensure_connection()
            
            if self.client is None or self.db is None:
                logger.error("MongoDB client or database is None")
                raise Exception("MongoDB connection failed")
            
            prepared_doc = prepare_for_mongo(document)
            collection = self.get_collection(collection_name)
            return collection.insert_one(prepared_doc)
        except Exception as e:
            logger.error(f"Error in insert_one operation: {str(e)}")
            raise
    
    def update_one(self, collection_name: str, query: Dict, update: Dict) -> Any:
        """Update one document in collection."""
        try:
            self._ensure_connection()
            
            if self.client is None or self.db is None:
                logger.error("MongoDB client or database is None")
                raise Exception("MongoDB connection failed")
            
            prepared_update = prepare_for_mongo(update)
            collection = self.get_collection(collection_name)
            return collection.update_one(query, prepared_update)
        except Exception as e:
            logger.error(f"Error in update_one operation: {str(e)}")
            raise
    
    def delete_one(self, collection_name: str, query: Dict) -> Any:
        """Delete one document from collection."""
        try:
            self._ensure_connection()
            
            if self.client is None or self.db is None:
                logger.error("MongoDB client or database is None")
                raise Exception("MongoDB connection failed")
            
            collection = self.get_collection(collection_name)
            return collection.delete_one(query)
        except Exception as e:
            logger.error(f"Error in delete_one operation: {str(e)}")
            raise
    
    def close(self):
        """Close MongoDB connection."""
        if self.client is not None:
            try:
                self.client.close()
                logger.info("MongoDB connection closed")
            except Exception as e:
                logger.error(f"Error closing MongoDB connection: {str(e)}")

def get_db() -> MongoDBConnector:
    """Dependency to get MongoDB connector instance."""
    db = MongoDBConnector()
    try:
        yield db
    finally:
        db.close() 