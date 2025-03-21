from database.mongo_connector import MongoDBConnector
import pymongo
import json
import bson
import datetime

# Custom encoder to handle MongoDB ObjectId and datetime types
class MongoJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime.datetime, datetime.date)):
            return obj.isoformat()
        if isinstance(obj, bson.objectid.ObjectId):
            return str(obj)
        return super().default(obj)

# Function to print result in a nice format
def print_result(result):
    if result:
        print(json.dumps(result, cls=MongoJSONEncoder, indent=2))
    else:
        print("No result found")

# Create a MongoDB connector
db = MongoDBConnector()
print(f"Connected to database: {db.db.name}")

# Try direct pymongo query first
project_id = 'e0a912e3-b57b-44d3-829a-9cd6503f43bf'
print(f"\nDirect pymongo query for project: {project_id}")
raw_result = db.db['projects'].find_one({"project_id": project_id})
print("Raw result from pymongo:")
print_result(raw_result)

# Try with our connector
print("\nUsing MongoDB connector:")
connector_result = db.find_one("projects", {"project_id": project_id})
print("Result from connector:")
print_result(connector_result)

# List all projects
print("\nAll projects in database:")
all_projects = list(db.db['projects'].find())
for project in all_projects:
    print(f"- {project.get('project_id')}: {project.get('title')}") 