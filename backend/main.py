import os
import logging
import uvicorn
from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from pydantic import BaseModel
from api import projects, image_generation, script_analysis, actor_profiles
from database.mongo_connector import MongoDBConnector, get_db

# Import API routers
from api.script_analysis import router as script_router
from api.image_generation import router as image_router
from api.actor_profiles import router as actor_router
from api.feedback import router as feedback_router
from api.film_school import router as film_school_router
from api.projects import router as project_router

# Load environment variables
load_dotenv("config/.env")

# Configure MongoDB - preferring the environment variable set in run_app.sh
mongodb_uri = os.getenv("MONGODB_URI")
if not mongodb_uri:
    # Fallback options in order of preference
    if os.getenv("DOCKER_ENV") == "true":
        mongodb_uri = os.getenv("MONGODB_URI_DOCKER", "mongodb://mongo:27017/storyboard")
    else:
        mongodb_uri = os.getenv("MONGODB_URI_LOCAL", "mongodb://localhost:27017/storyboard")

# Export the MongoDB URI for other modules to use
os.environ["MONGODB_URI"] = mongodb_uri

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("storyboard_api.log")
    ]
)
logger = logging.getLogger(__name__)

# Log MongoDB connection info (sanitized for security)
connection_parts = mongodb_uri.split('@')
if len(connection_parts) > 1:
    # This is an Atlas URI with credentials - log only the host part
    logger.info(f"Connecting to MongoDB Atlas: {connection_parts[-1].split('/')[0]}")
else:
    # Local MongoDB - safe to log full URI
    logger.info(f"Connecting to MongoDB: {mongodb_uri}")

# Initialize FastAPI app
app = FastAPI(
    title="StoryboardAI API",
    description="API for AI-powered storyboard generation",
    version="1.0.0",
)

# Configure CORS with all possible frontend URLs
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "ws://localhost:3000",
        "ws://127.0.0.1:3000",
        "ws://localhost:8000",
        "ws://127.0.0.1:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(f"Message: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast("Client disconnected")

# Determine directories based on environment
# In Docker, files are stored at root level, otherwise in backend subdirectories
if os.getenv("DOCKER_ENV") == "true":
    # In Docker, images are mounted directly to /app/images, not in the backend directory
    generated_images_dir = "/app/generated_images"
    actor_images_dir = "/app/actor_images"
    frame_images_dir = "/app/frame_images"
    exports_dir = "/app/exports"
    logger.info("Running in Docker environment, using absolute paths")
else:
    base_dir = "."
    # Check if images are in the backend subdirectory
    if os.path.exists("backend/frame_images"):
        base_dir = "backend"
    logger.info(f"Running in local environment, using directory: {base_dir}")
    
    # Create base directory paths
    generated_images_dir = os.path.join(base_dir, "generated_images")
    actor_images_dir = os.path.join(base_dir, "actor_images")
    frame_images_dir = os.path.join(base_dir, "frame_images")
    exports_dir = os.path.join(base_dir, "exports")

# Create directories if they don't exist
os.makedirs(generated_images_dir, exist_ok=True)
os.makedirs(actor_images_dir, exist_ok=True)
os.makedirs(exports_dir, exist_ok=True)
os.makedirs(frame_images_dir, exist_ok=True)

logger.info(f"Using frame_images directory: {os.path.abspath(frame_images_dir)}")

# Mount static file directories
app.mount("/images", StaticFiles(directory=generated_images_dir), name="generated_images")
app.mount("/actor-images", StaticFiles(directory=actor_images_dir), name="actor_images")
app.mount("/frame-images", StaticFiles(directory=frame_images_dir), name="frame_images")

# Include routers
app.include_router(script_router, prefix="/api/script", tags=["Script Analysis"])
app.include_router(image_router, prefix="/api/images", tags=["Image Generation"])
app.include_router(actor_router, prefix="/api/actors", tags=["Actor Profiles"])
app.include_router(feedback_router, prefix="/api/feedback", tags=["Feedback"])
app.include_router(film_school_router, prefix="/api/film-school", tags=["Film School"])
app.include_router(project_router, prefix="/api/projects", tags=["Projects"])

@app.get("/")
async def root():
    return {"message": "Welcome to StoryboardAI API"}

@app.get("/health", status_code=200)
async def health_check():
    """
    Simple health check endpoint to verify the API is running.
    """
    return {"status": "ok", "message": "API is healthy"}

@app.get("/api/health", status_code=200)
async def api_health_check():
    """
    Simple health check endpoint to verify the API is running (with /api prefix).
    """
    return {"status": "ok", "message": "API is healthy"}

# Add initialization endpoint to ensure directories exist
class InitializeRequest(BaseModel):
    ensure_directories: bool = True

@app.post("/initialize", status_code=200)
async def initialize_app(request: InitializeRequest):
    """
    Initialize the application, creating necessary directories.
    """
    if request.ensure_directories:
        # Create directories if they don't exist
        directories = [
            generated_images_dir,
            actor_images_dir,
            exports_dir,
            frame_images_dir
        ]
        
        created_dirs = []
        for directory in directories:
            if not os.path.exists(directory):
                os.makedirs(directory, exist_ok=True)
                created_dirs.append(directory)
                logger.info(f"Created directory: {directory}")
        
        if created_dirs:
            return {"status": "ok", "message": "Directories created", "created": created_dirs}
        else:
            return {"status": "ok", "message": "All directories already exist"}

@app.post("/api/initialize", status_code=200)
async def api_initialize_app(request: InitializeRequest):
    """
    Initialize the application, creating necessary directories (with /api prefix).
    """
    if request.ensure_directories:
        # Create directories if they don't exist
        directories = [
            generated_images_dir,
            actor_images_dir,
            exports_dir,
            frame_images_dir
        ]
        
        created_dirs = []
        for directory in directories:
            if not os.path.exists(directory):
                os.makedirs(directory, exist_ok=True)
                created_dirs.append(directory)
                logger.info(f"Created directory: {directory}")
        
        if created_dirs:
            return {"status": "ok", "message": "Directories created", "created": created_dirs}
        else:
            return {"status": "ok", "message": "All directories already exist"}

if __name__ == "__main__":
    port = int(os.getenv("BACKEND_PORT", 8000))
    host = os.getenv("BACKEND_HOST", "0.0.0.0")
    
    logger.info(f"Starting server on http://{host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=True) 