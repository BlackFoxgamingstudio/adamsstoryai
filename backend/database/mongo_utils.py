import json
import datetime
from bson import ObjectId

class MongoJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder for MongoDB objects and datetime"""
    def default(self, obj):
        if isinstance(obj, datetime.datetime):
            return obj.isoformat()
        if isinstance(obj, datetime.date):
            return obj.isoformat()
        if isinstance(obj, ObjectId):
            return str(obj)
        return super().default(obj)

def serialize_mongo_doc(doc):
    """Serialize MongoDB document to JSON-compatible format"""
    if isinstance(doc, dict):
        return {k: serialize_mongo_doc(v) for k, v in doc.items()}
    elif isinstance(doc, list):
        return [serialize_mongo_doc(item) for item in doc]
    elif isinstance(doc, datetime.datetime):
        return doc.isoformat()
    elif isinstance(doc, datetime.date):
        return doc.isoformat()
    elif isinstance(doc, ObjectId):
        return str(doc)
    return doc

def prepare_for_mongo(doc):
    """Prepare document for MongoDB insertion/update"""
    if isinstance(doc, dict):
        return {k: prepare_for_mongo(v) for k, v in doc.items() if v is not None}
    elif isinstance(doc, list):
        return [prepare_for_mongo(item) for item in doc]
    elif isinstance(doc, str):
        try:
            # Try to parse ISO format datetime strings
            return datetime.datetime.fromisoformat(doc)
        except ValueError:
            return doc
    return doc 