import os
import io
import logging
import datetime
import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Form
from pydantic import BaseModel
import numpy as np
from PIL import Image
import torch
from database.mongo_connector import get_db, MongoDBConnector
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get OpenAI API key from environment
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Configure logger
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Models
class ActorProfile(BaseModel):
    name: str
    description: str = ""
    prompt_hint: str = ""
    images: Optional[List[str]] = None

class ActorUpdateRequest(BaseModel):
    description: Optional[str] = None
    prompt_hint: Optional[str] = None
    feedback_notes: Optional[str] = None

# Function to encode image to vector using CLIP or similar model
# In production, use a proper image embedding model like CLIP
def encode_image_to_vector(image, vector_dim=1024):
    """
    Encodes an image to a vector representation.
    This is a placeholder - in production use a proper model like CLIP.
    """
    try:
        # Resize image for consistency
        image = image.resize((224, 224))
        # Convert to array
        img_array = np.array(image)
        # Normalize
        img_array = img_array / 255.0
        
        # In a real implementation, use a proper embedding model:
        # from transformers import CLIPProcessor, CLIPModel
        # model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        # processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        # inputs = processor(images=image, return_tensors="pt")
        # with torch.no_grad():
        #    outputs = model.get_image_features(**inputs)
        # embedding = outputs.cpu().numpy()[0]
        
        # For now, we'll just use a random vector as a placeholder
        embedding = np.random.rand(vector_dim)
        return embedding
    
    except Exception as e:
        logger.error(f"Error encoding image to vector: {str(e)}")
        # Return a zero vector on error
        return np.zeros(vector_dim)

# Simple vector database for actor profiles
class ActorProfileDB:
    def __init__(self, vector_dim=1024):
        self.vector_dim = vector_dim
        self.vectors = {}  # maps actor name -> embedding vector
        self.metadata = {}  # maps actor name -> metadata
    
    def add_actor(self, name: str, images: List[Image.Image] = None, description: str = ""):
        """
        Compute an initial embedding from reference images and add actor to database.
        """
        if images is None:
            images = []
            
        # Compute embedding from images
        vec = np.zeros(self.vector_dim)
        for img in images:
            vec += encode_image_to_vector(img, self.vector_dim)
        
        if images:
            vec = vec / len(images)
        else:
            vec = np.random.rand(self.vector_dim)
        
        self.vectors[name] = vec
        self.metadata[name] = {"description": description, "prompt_hint": ""}
    
    def get_profile(self, name: str) -> Optional[Dict]:
        """
        Get an actor's profile including vector and metadata.
        """
        if name not in self.vectors:
            return None
        
        vec = self.vectors[name]
        metadata = self.metadata.get(name, {})
        
        return {
            "name": name,
            "vector": vec.tolist(),
            "description": metadata.get("description", ""),
            "prompt_hint": metadata.get("prompt_hint", "")
        }
    
    def update_actor(self, name: str, new_image: Optional[Image.Image] = None, 
                     description: Optional[str] = None, feedback_notes: Optional[str] = None):
        """
        Update actor's vector based on new image or feedback.
        """
        if name not in self.vectors:
            return False
        
        # Update vector with new image if provided
        if new_image is not None:
            new_vec = encode_image_to_vector(new_image, self.vector_dim)
            # Incorporate the new image embedding (weighted average)
            self.vectors[name] = 0.7 * self.vectors[name] + 0.3 * new_vec
        
        # Update metadata if provided
        if description is not None:
            self.metadata[name]["description"] = description
        
        # Incorporate feedback notes
        if feedback_notes:
            # In production, use NLP to extract meaningful updates from feedback
            current_hint = self.metadata[name].get("prompt_hint", "")
            # Simple concatenation for now - in production, use more sophisticated update
            if current_hint:
                self.metadata[name]["prompt_hint"] = f"{current_hint}. {feedback_notes}"
            else:
                self.metadata[name]["prompt_hint"] = feedback_notes
        
        return True
    
    def list_actors(self) -> List[Dict]:
        """
        List all actors with their metadata.
        """
        actors = []
        for name in self.vectors:
            profile = self.get_profile(name)
            # Remove the vector to reduce response size
            if "vector" in profile:
                del profile["vector"]
            actors.append(profile)
        
        return actors

# Global actor profile database instance
actor_db = ActorProfileDB(vector_dim=int(os.getenv("VECTOR_DB_DIM", "1024")))

# In production, replace with proper vector database like Milvus or Pinecone

# Endpoints
@router.post("", response_model=ActorProfile)
async def create_actor(
    name: str = Form(...),
    description: str = Form(""),
    auto_generate_image: str = Form(None),
    images: List[UploadFile] = File(None),
    db: MongoDBConnector = Depends(get_db)
):
    """
    Create a new actor profile with optional reference images.
    If auto_generate_image is true, generate an image using DALL-E.
    """
    try:
        # Check if actor already exists
        existing = db.find_one("actors", {"name": name})
        if existing:
            raise HTTPException(status_code=400, detail=f"Actor '{name}' already exists")
        
        # Process uploaded images or auto-generate
        processed_images = []
        image_paths = []
        
        # Flag for auto image generation
        should_auto_generate = auto_generate_image == "true"
        
        if should_auto_generate:
            # Use OpenAI DALL-E to generate character image
            try:
                logger.info(f"Generating image for actor: {name}")
                
                # Create a prompt based on the character description
                prompt = f"A professional character portrait of {name}"
                if description:
                    prompt += f": {description}"
                
                # Call OpenAI API to generate image
                response = requests.post(
                    "https://api.openai.com/v1/images/generations",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {OPENAI_API_KEY}"
                    },
                    json={
                        "model": "dall-e-3",
                        "prompt": prompt,
                        "n": 1,
                        "size": "1024x1024"
                    }
                )
                
                if response.status_code == 200:
                    image_url = response.json()["data"][0]["url"]
                    
                    # Download the image
                    img_response = requests.get(image_url)
                    if img_response.status_code == 200:
                        img = Image.open(io.BytesIO(img_response.content))
                        processed_images.append(img)
                        
                        # Save image
                        os.makedirs("actor_images", exist_ok=True)
                        img_path = f"actor_images/{name.replace(' ', '_')}_generated.png"
                        img.save(img_path)
                        image_paths.append(img_path)
                    else:
                        logger.error(f"Failed to download generated image: {img_response.status_code}")
                else:
                    logger.error(f"Image generation failed: {response.status_code} - {response.text}")
            
            except Exception as e:
                logger.error(f"Error generating image: {str(e)}")
                # Continue without image if generation fails
        
        elif images:
            os.makedirs("actor_images", exist_ok=True)
            
            for i, img_file in enumerate(images):
                # Read image
                contents = await img_file.read()
                img = Image.open(io.BytesIO(contents))
                processed_images.append(img)
                
                # Save image
                img_path = f"actor_images/{name.replace(' ', '_')}_{i}.png"
                img.save(img_path)
                image_paths.append(img_path)
        
        # Add to vector database
        actor_db.add_actor(name, processed_images, description)
        
        # Get profile data from vector DB
        profile = actor_db.get_profile(name)
        
        # Store in MongoDB
        actor_data = {
            "name": name,
            "description": description,
            "prompt_hint": "",
            "image_paths": image_paths,
            "created_at": datetime.datetime.now()
        }
        db.insert_one("actors", actor_data)
        
        # Return profile without vector
        return {
            "name": name,
            "description": description,
            "prompt_hint": "",
            "images": image_paths
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating actor profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Actor profile creation failed: {str(e)}")

@router.get("", response_model=List[ActorProfile])
async def list_actors(db: MongoDBConnector = Depends(get_db)):
    """
    List all actors in the database.
    """
    try:
        # Get from MongoDB for persistence
        actors = db.find_many("actors", {})
        
        # Format response
        actor_profiles = []
        for actor in actors:
            # Convert the image paths to proper URLs
            image_paths = actor.get("image_paths", [])
            formatted_images = []
            
            for img_path in image_paths:
                if img_path.startswith('actor_images/'):
                    # Convert to the proper URL format for the static file server
                    formatted_path = f"/actor-images/{img_path.split('actor_images/')[1]}"
                    formatted_images.append(formatted_path)
                else:
                    formatted_images.append(img_path)
            
            actor_profiles.append({
                "name": actor["name"],
                "description": actor.get("description", ""),
                "prompt_hint": actor.get("prompt_hint", ""),
                "images": formatted_images
            })
        
        return actor_profiles
    
    except Exception as e:
        logger.error(f"Error listing actors: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list actors: {str(e)}")

@router.get("/{name}", response_model=ActorProfile)
async def get_actor(name: str, db: MongoDBConnector = Depends(get_db)):
    """
    Get an actor profile by name.
    """
    try:
        # Get from MongoDB
        actor = db.find_one("actors", {"name": name})
        if not actor:
            raise HTTPException(status_code=404, detail=f"Actor '{name}' not found")
        
        # Convert the image paths to proper URLs
        image_paths = actor.get("image_paths", [])
        formatted_images = []
        
        for img_path in image_paths:
            if img_path.startswith('actor_images/'):
                # Convert to the proper URL format for the static file server
                formatted_path = f"/actor-images/{img_path.split('actor_images/')[1]}"
                formatted_images.append(formatted_path)
            else:
                formatted_images.append(img_path)
        
        # Format response
        return {
            "name": actor["name"],
            "description": actor.get("description", ""),
            "prompt_hint": actor.get("prompt_hint", ""),
            "images": formatted_images
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting actor profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get actor profile: {str(e)}")

@router.put("/{name}", response_model=ActorProfile)
async def update_actor(
    name: str,
    update: ActorUpdateRequest = None,
    new_image: UploadFile = File(None),
    description: str = Form(None),
    prompt_hint: str = Form(None),
    feedback_notes: str = Form(None),
    db: MongoDBConnector = Depends(get_db)
):
    """
    Update an actor profile with new image, description or feedback.
    Accepts both JSON and form data.
    """
    try:
        # Check if actor exists in database
        actor = db.find_one("actors", {"name": name})
        if not actor:
            raise HTTPException(status_code=404, detail=f"Actor '{name}' not found")
        
        # Process new image if provided
        processed_image = None
        new_image_path = None
        
        if new_image:
            # Read and process image
            contents = await new_image.read()
            processed_image = Image.open(io.BytesIO(contents))
            
            # Save image
            os.makedirs("actor_images", exist_ok=True)
            img_id = uuid.uuid4()
            new_image_path = f"actor_images/{name.replace(' ', '_')}_{img_id}.png"
            processed_image.save(new_image_path)
            
            # Add to existing paths
            image_paths = actor.get("image_paths", [])
            image_paths.append(new_image_path)
        else:
            image_paths = actor.get("image_paths", [])
        
        # Get update data from either JSON or form data
        update_data = {}
        if update:
            # JSON request
            if update.description is not None:
                update_data["description"] = update.description
            if update.prompt_hint is not None:
                update_data["prompt_hint"] = update.prompt_hint
            if update.feedback_notes is not None:
                update_data["feedback_notes"] = update.feedback_notes
        else:
            # Form data request
            if description is not None:
                update_data["description"] = description
            if prompt_hint is not None:
                update_data["prompt_hint"] = prompt_hint
            if feedback_notes is not None:
                update_data["feedback_notes"] = feedback_notes
        
        # Update in vector database
        actor_db.update_actor(
            name, 
            processed_image, 
            update_data.get("description"), 
            update_data.get("feedback_notes")
        )
        
        # Process feedback notes
        if "feedback_notes" in update_data:
            # In a real implementation, use NLP to process feedback and update prompt_hint
            current_hint = actor.get("prompt_hint", "")
            if current_hint:
                update_data["prompt_hint"] = f"{current_hint}. {update_data['feedback_notes']}"
            else:
                update_data["prompt_hint"] = update_data["feedback_notes"]
            del update_data["feedback_notes"]
        
        if new_image_path:
            update_data["image_paths"] = image_paths
        
        if update_data:
            db.update_one("actors", {"name": name}, {"$set": update_data})
        
        # Get updated actor
        updated_actor = db.find_one("actors", {"name": name})
        
        # Format response
        return {
            "name": updated_actor["name"],
            "description": updated_actor.get("description", ""),
            "prompt_hint": updated_actor.get("prompt_hint", ""),
            "images": updated_actor.get("image_paths", [])
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating actor profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update actor profile: {str(e)}")

@router.delete("/{name}")
async def delete_actor(name: str, db: MongoDBConnector = Depends(get_db)):
    """
    Delete an actor profile by name.
    """
    try:
        # Check if actor exists
        actor = db.find_one("actors", {"name": name})
        if not actor:
            raise HTTPException(status_code=404, detail=f"Actor '{name}' not found")
        
        # Delete from database
        result = db.delete_one("actors", {"name": name})
        
        # Delete from vector database
        if name in actor_db.vectors:
            del actor_db.vectors[name]
        if name in actor_db.metadata:
            del actor_db.metadata[name]
        
        # Optionally delete image files
        for img_path in actor.get("image_paths", []):
            try:
                if os.path.exists(img_path):
                    os.remove(img_path)
            except Exception as e:
                logger.warning(f"Error deleting image file: {str(e)}")
        
        return {"message": f"Actor '{name}' deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting actor profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete actor profile: {str(e)}") 