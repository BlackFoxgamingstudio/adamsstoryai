import os
import pymongo
import datetime

# Connect to MongoDB Atlas
atlas_uri = "mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.fmktl.mongodb.net/storyboard"
atlas_client = pymongo.MongoClient(atlas_uri)
atlas_db = atlas_client["storyboard"]

# Project to import
project_data = {
    "project_id": "e0a912e3-b57b-44d3-829a-9cd6503f43bf",
    "title": "Sample Project",
    "description": "Created to fix 404 error",
    "frames": [],
    "created_at": datetime.datetime.now(),
    "updated_at": datetime.datetime.now()
}

# Insert into MongoDB Atlas
try:
    result = atlas_db["projects"].insert_one(project_data)
    print(f"Project imported to Atlas with ID: {result.inserted_id}")
except Exception as e:
    print(f"Error importing to Atlas: {str(e)}")

# List all projects in Atlas
print("\nProjects in Atlas:")
for project in atlas_db["projects"].find():
    print(f"- {project.get('project_id')}: {project.get('title')}")

# Close connection
atlas_client.close() 