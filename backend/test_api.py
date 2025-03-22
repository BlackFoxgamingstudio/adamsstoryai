from fastapi.testclient import TestClient
from main import app
from database.mongo_connector import MongoDBConnector

# Create a test client
client = TestClient(app)

# Get project via API
project_id = 'e0a912e3-b57b-44d3-829a-9cd6503f43bf'
response = client.get(f"/api/projects/{project_id}")
print(f"API Response Status: {response.status_code}")
print(f"API Response Content: {response.content.decode()}")

# Get project directly from DB
db = MongoDBConnector()
project = db.find_one("projects", {"project_id": project_id})
print("\nDirect DB Query:")
if project:
    print(f"  Found: {project['title']}")
    print(f"  ID: {project['project_id']}")
else:
    print("  Not found") 