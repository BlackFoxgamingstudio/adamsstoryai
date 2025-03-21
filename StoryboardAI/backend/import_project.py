from database.mongo_connector import MongoDBConnector
import datetime

# Create a MongoDB connector
db = MongoDBConnector()

# Project data to insert
project_data = {
    "project_id": "e0a912e3-b57b-44d3-829a-9cd6503f43bf",
    "title": "Sample Project",
    "description": "Created to fix 404 error",
    "frames": [],
    "created_at": datetime.datetime.now(),
    "updated_at": datetime.datetime.now()
}

# Insert directly into the database
try:
    db.insert_one("projects", project_data)
    print(f"Successfully imported project: {project_data['title']}")
except Exception as e:
    print(f"Failed to import project: {str(e)}")

# Verify the project is now in the database
project = db.find_one("projects", {"project_id": project_data["project_id"]})
if project:
    print(f"Verified project exists: {project['title']}")
else:
    print("Failed to verify project") 