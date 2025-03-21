from database.mongo_connector import MongoDBConnector

# Create a MongoDB connector
db = MongoDBConnector()

# Print connection details
print(f'Connected to database: {db.db.name}')
print(f'Connection string: {db.connection_string}')
print('All databases on server:')
for database in db.client.list_database_names():
    print(f'  - {database}')

# List all projects
print('\nProjects:')
for p in db.find_many('projects', {}):
    print(f"  - {p['project_id']}: {p['title']}")

# Try to find the specific project
project_id = 'e0a912e3-b57b-44d3-829a-9cd6503f43bf'
project = db.find_one('projects', {'project_id': project_id})
print(f'\nLooking for project {project_id}:')
if project:
    print(f"  Found: {project['title']}")
else:
    print("  Not found") 