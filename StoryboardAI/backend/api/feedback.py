import os
import logging
import datetime
import uuid
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from database.mongo_connector import get_db, MongoDBConnector
from api.image_generation import get_image_generator, generate_frame_image

# Configure logger
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Models
class FeedbackInput(BaseModel):
    frame_id: str
    feedback_text: str
    actor_names: Optional[List[str]] = None

class FeedbackResponse(BaseModel):
    frame_id: str
    new_image_url: str
    revised_description: str
    feedback_text: str

@router.post("/frames/{frame_id}", response_model=FeedbackResponse)
async def process_frame_feedback(
    frame_id: str,
    feedback: FeedbackInput,
    db: MongoDBConnector = Depends(get_db)
) -> Dict[str, Any]:
    """
    Incorporate user feedback into a frame and regenerate it.
    """
    try:
        # Get existing frame data
        frame_data = db.find_one("frames", {"image_id": frame_id})
        if not frame_data:
            frame_data = db.find_one("storyboard_frames", {"image_id": frame_id})
            
        if not frame_data:
            raise HTTPException(status_code=404, detail=f"Frame with ID {frame_id} not found")
        
        # Get original description/prompt
        original_description = frame_data.get("prompt", "")
        
        # Build revised description
        revised_description = original_description + ". Note: " + feedback.feedback_text
        
        # Get actors mentioned in this frame
        actors = feedback.actor_names or frame_data.get("actors", [])
        
        # Update actor profiles if feedback mentions an actor by name
        for actor_name in actors:
            if actor_name.lower() in feedback.feedback_text.lower():
                update_actor_from_feedback(actor_name, feedback.feedback_text, db)
        
        # Regenerate the image with the same model as before
        model_name = frame_data.get("model", os.getenv("DEFAULT_IMAGE_MODEL", "dalle"))
        new_image = generate_frame_image(revised_description, actors, model_name)
        
        # Save the new image
        new_frame_id = f"revised_{frame_id}_{uuid.uuid4().hex[:8]}"
        image_path = f"generated_images/{new_frame_id}.png"
        os.makedirs("generated_images", exist_ok=True)
        new_image.save(image_path)
        
        # Store the feedback and new frame
        feedback_data = {
            "original_frame_id": frame_id,
            "new_frame_id": new_frame_id,
            "feedback_text": feedback.feedback_text,
            "original_description": original_description,
            "revised_description": revised_description,
            "actors": actors,
            "created_at": datetime.datetime.now()
        }
        db.insert_one("feedback", feedback_data)
        
        # Store the new frame
        new_frame_data = {
            "image_id": new_frame_id,
            "prompt": revised_description,
            "original_frame_id": frame_id,
            "actors": actors,
            "path": image_path,
            "created_at": datetime.datetime.now()
        }
        db.insert_one("frames", new_frame_data)
        
        # Return the response
        return {
            "frame_id": new_frame_id,
            "new_image_url": f"/images/{new_frame_id}.png",
            "revised_description": revised_description,
            "feedback_text": feedback.feedback_text
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing feedback: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process feedback: {str(e)}")

def update_actor_from_feedback(actor_name: str, feedback_text: str, db: MongoDBConnector):
    """
    Update actor profile based on feedback that mentions the actor.
    """
    try:
        # Get the actor data
        actor = db.find_one("actors", {"name": actor_name})
        if not actor:
            logger.warning(f"Actor '{actor_name}' mentioned in feedback not found in database")
            return
        
        # In a production system, use NLP to analyze feedback and extract relevant updates
        # For now, we'll just append feedback to prompt hint
        
        # Simple analysis: check for adjectives or traits
        # This is a very simplified approach - in production, use proper NLP
        if "more" in feedback_text.lower() or "less" in feedback_text.lower():
            current_hint = actor.get("prompt_hint", "")
            # Update the prompt hint
            if current_hint:
                new_hint = f"{current_hint}. {feedback_text}"
            else:
                new_hint = feedback_text
                
            # Update in database
            db.update_one("actors", {"name": actor_name}, {"$set": {"prompt_hint": new_hint}})
            
            logger.info(f"Updated actor '{actor_name}' prompt hint with feedback: {feedback_text}")
    
    except Exception as e:
        logger.error(f"Error updating actor from feedback: {str(e)}")
        # Don't raise the exception - just log it and continue 