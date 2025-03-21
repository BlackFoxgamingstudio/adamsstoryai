import os
import io
import base64
import logging
import datetime
import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from pydantic import BaseModel
from openai import OpenAI
import requests
from PIL import Image
import torch
from database.mongo_connector import get_db, MongoDBConnector

# Configure logger
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Models
class ImageGenerationRequest(BaseModel):
    prompt: str
    model: Optional[str] = None
    num_variants: int = 1

class CharacterVariantRequest(BaseModel):
    actor_name: str
    scene_description: str
    num_variants: int = 5

class FrameGenerationRequest(BaseModel):
    description: str
    actor_names: List[str] = []
    background_description: Optional[str] = None

class ImageResponse(BaseModel):
    image_url: str
    image_id: str
    prompt: str

class VariantResponse(BaseModel):
    variants: List[ImageResponse]
    
# Base image generator interface
class ImageGeneratorBase:
    def generate(self, prompt: str) -> Image.Image:
        raise NotImplementedError

# Stable Diffusion generator
class StableDiffusionGenerator(ImageGeneratorBase):
    def __init__(self, model_path=None):
        from diffusers import StableDiffusionPipeline
        
        if not model_path:
            model_path = os.getenv("STABLE_DIFFUSION_MODEL_PATH", "stabilityai/stable-diffusion-XL-base-1.0")
        
        try:
            self.pipe = StableDiffusionPipeline.from_pretrained(
                model_path, 
                torch_dtype=torch.float16
            )
            
            # Move to GPU if available
            if torch.cuda.is_available():
                self.pipe = self.pipe.to("cuda")
            else:
                logger.warning("CUDA not available, using CPU for Stable Diffusion (will be slow)")
        
        except Exception as e:
            logger.error(f"Error loading Stable Diffusion model: {str(e)}")
            raise
    
    def generate(self, prompt: str) -> Image.Image:
        try:
            result = self.pipe(
                prompt, 
                num_inference_steps=50, 
                guidance_scale=7.5
            )
            return result.images[0]
        except Exception as e:
            logger.error(f"Error generating image with Stable Diffusion: {str(e)}")
            raise

# DALL-E generator
class DalleGenerator(ImageGeneratorBase):
    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key not found")
        
        self.client = OpenAI(api_key=self.api_key)
    
    def generate(self, prompt: str) -> Image.Image:
        try:
            from openai import OpenAI

            client = OpenAI(api_key=self.api_key)
            response = client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size="1024x1024",
                quality="standard",
                n=1,
    )
            # Get image URL from response
            image_url = response.data[0].url
            
            # Download image
            img_data = requests.get(image_url).content
            image = Image.open(io.BytesIO(img_data))
            
            return image
        
        except Exception as e:
            logger.error(f"Error generating image with DALL-E: {str(e)}")
            raise

# Model factory
def get_image_generator(model_name: str = None) -> ImageGeneratorBase:
    model_name = model_name or os.getenv("DEFAULT_IMAGE_MODEL", "dalle")
    
    if model_name == "stable_diffusion":
        return StableDiffusionGenerator()
    elif model_name == "dalle":
        return DalleGenerator()
    else:
        raise ValueError(f"Unsupported model: {model_name}")

# Generate frame image function to be used by other modules
def generate_frame_image(description: str, actors: List[str], model_name: str = None):
    """
    Generate a frame image based on description and actors.
    """
    try:
        # Build the prompt
        prompt = description
        if actors:
            actor_list = ", ".join(actors)
            if ", with " in prompt or " with " in prompt:
                # If prompt already has "with", just add actors list
                prompt += f": {actor_list}"
            else:
                prompt += f" with {actor_list}"
        
        # Get image generator
        generator = get_image_generator(model_name)
        
        # Generate the image
        image = generator.generate(prompt)
        
        return image
    
    except Exception as e:
        logger.error(f"Error generating frame image: {str(e)}")
        raise

# Endpoints
@router.post("/generate", response_model=ImageResponse)
async def generate_image(
    request: ImageGenerationRequest,
    db: MongoDBConnector = Depends(get_db)
) -> Dict[str, Any]:
    """
    Generate an image from a text prompt.
    """
    try:
        # Get image generator for requested model
        generator = get_image_generator(request.model)
        
        # Generate image
        image = generator.generate(request.prompt)
        
        # Save image to file system (in production, use cloud storage)
        os.makedirs("generated_images", exist_ok=True)
        
        # Create unique, descriptive filename
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        # Create a short prompt summary for the filename
        short_prompt = request.prompt.replace(" ", "_")[:30].lower()
        image_id = f"image_{short_prompt}_{timestamp}"
        image_path = f"generated_images/{image_id}.png"
        image.save(image_path)
        
        logger.info(f"Saved generated image: {image_path}")
        
        # Store metadata in database
        image_data = {
            "image_id": image_id,
            "prompt": request.prompt,
            "model": request.model or os.getenv("DEFAULT_IMAGE_MODEL", "dalle"),
            "path": image_path,
            "created_at": datetime.datetime.now()
        }
        db.insert_one("images", image_data)
        
        # Build response
        image_url = f"/images/{image_id}.png"  # In production, use a proper URL
        
        return {
            "image_url": image_url,
            "image_id": image_id,
            "prompt": request.prompt
        }
    
    except Exception as e:
        logger.error(f"Error generating image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")

@router.post("/generate-character-variants", response_model=VariantResponse)
async def generate_character_variants(
    request: CharacterVariantRequest,
    db: MongoDBConnector = Depends(get_db)
) -> Dict[str, Any]:
    """
    Generate multiple variants of a character in a scene.
    """
    try:
        # Get actor profile from database
        actor_data = db.find_one("actors", {"name": request.actor_name})
        if not actor_data:
            raise HTTPException(status_code=404, detail=f"Actor '{request.actor_name}' not found")
        
        # Build base prompt with actor characteristics
        actor_prompt_hint = actor_data.get("prompt_hint", "")
        base_prompt = f"{request.actor_name}, {actor_prompt_hint}, in a scene where {request.scene_description}"
        
        # Define variant aspects to emphasize
        variant_aspects = [
            "emotional state and facial expression",
            "body language and posture",
            "interaction with environment",
            "lighting and mood",
            "cinematography and framing"
        ]
        
        variants = []
        
        # Generate for each variant
        for i in range(request.num_variants):
            # Add different emphasis for each variant
            aspect = variant_aspects[i % len(variant_aspects)]
            variant_prompt = f"{base_prompt}, with emphasis on {aspect}"
            
            # Generate image using default model
            generator = get_image_generator()
            image = generator.generate(variant_prompt)
            
            # Save image with clear naming
            os.makedirs("generated_images", exist_ok=True)
            
            # Create a clean actor name for the filename
            clean_name = request.actor_name.replace(' ', '_').lower()
            timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
            image_id = f"{clean_name}_variant_{i+1}_{timestamp}"
            image_path = f"generated_images/{image_id}.png"
            image.save(image_path)
            
            logger.info(f"Saved character variant image: {image_path}")
            
            # Store metadata
            image_data = {
                "image_id": image_id,
                "prompt": variant_prompt,
                "actor_name": request.actor_name,
                "variant_aspect": aspect,
                "path": image_path,
                "created_at": datetime.datetime.now()
            }
            db.insert_one("character_variants", image_data)
            
            # Add to result
            variants.append({
                "image_url": f"/images/{image_id}.png",
                "image_id": image_id,
                "prompt": variant_prompt
            })
        
        return {"variants": variants}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating character variants: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Character variant generation failed: {str(e)}")

@router.post("/generate-frame", response_model=ImageResponse)
async def generate_frame(
    request: FrameGenerationRequest,
    db: MongoDBConnector = Depends(get_db)
) -> Dict[str, Any]:
    """
    Generate a full scene with optional multiple actors.
    """
    try:
        # If no actors specified, generate a simple scene
        if not request.actor_names:
            # Generate scene with default model
            generator = get_image_generator()
            scene_prompt = request.description
            if request.background_description:
                scene_prompt = f"{request.background_description}, {scene_prompt}"
                
            image = generator.generate(scene_prompt)
            
            # Save image
            os.makedirs("generated_images", exist_ok=True)
            image_id = f"scene_{uuid.uuid4()}"
            image_path = f"generated_images/{image_id}.png"
            image.save(image_path)
            
            # Store metadata
            image_data = {
                "image_id": image_id,
                "prompt": scene_prompt,
                "path": image_path,
                "created_at": datetime.datetime.now()
            }
            db.insert_one("frames", image_data)
            
            return {
                "image_url": f"/images/{image_id}.png",
                "image_id": image_id,
                "prompt": scene_prompt
            }
        
        # For scenes with actors, use more complex composition
        # This is a simplified version - in production, use more sophisticated composition techniques
        scene_prompt = f"A scene showing {request.description} with "
        actor_list = ", ".join(request.actor_names)
        scene_prompt += f"{actor_list}"
        
        if request.background_description:
            scene_prompt += f" in {request.background_description}"
        
        # Generate image
        generator = get_image_generator()
        image = generator.generate(scene_prompt)
        
        # Save image
        os.makedirs("generated_images", exist_ok=True)
        image_id = f"scene_with_actors_{uuid.uuid4()}"
        image_path = f"generated_images/{image_id}.png"
        image.save(image_path)
        
        # Store metadata
        image_data = {
            "image_id": image_id,
            "prompt": scene_prompt,
            "actors": request.actor_names,
            "description": request.description,
            "background": request.background_description,
            "path": image_path,
            "created_at": datetime.datetime.now()
        }
        db.insert_one("frames", image_data)
        
        return {
            "image_url": f"/images/{image_id}.png",
            "image_id": image_id,
            "prompt": scene_prompt
        }
    
    except Exception as e:
        logger.error(f"Error generating frame: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Frame generation failed: {str(e)}")

@router.post("/generate-storyboard", response_model=List[ImageResponse])
async def generate_storyboard(
    frame_descriptions: List[str],
    db: MongoDBConnector = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Generate a complete storyboard from frame descriptions.
    """
    try:
        results = []
        timestamp_base = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        
        for i, description in enumerate(frame_descriptions):
            # Generate frame image
            generator = get_image_generator()
            image = generator.generate(description)
            
            # Save image with sequential naming
            os.makedirs("generated_images", exist_ok=True)
            
            # Create descriptive, sequential filename
            frame_num = str(i+1).zfill(2)  # Pad with zeros for proper sorting
            image_id = f"storyboard_frame_{frame_num}_{timestamp_base}"
            image_path = f"generated_images/{image_id}.png"
            image.save(image_path)
            
            logger.info(f"Saved storyboard frame {i+1}: {image_path}")
            
            # Store metadata
            image_data = {
                "image_id": image_id,
                "prompt": description,
                "path": image_path,
                "frame_number": i+1,
                "storyboard_id": timestamp_base,
                "created_at": datetime.datetime.now()
            }
            db.insert_one("storyboard_frames", image_data)
            
            # Add to results
            results.append({
                "image_url": f"/images/{image_id}.png",
                "image_id": image_id,
                "prompt": description
            })
        
        return results
    
    except Exception as e:
        logger.error(f"Error generating storyboard: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Storyboard generation failed: {str(e)}") 