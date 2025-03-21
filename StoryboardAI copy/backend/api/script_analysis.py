import os
import logging
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import openai
from database.mongo_connector import get_db, MongoDBConnector
import re

# Configure logger
logger = logging.getLogger(__name__)

# Initialize OpenAI client
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Create router
router = APIRouter()

# Models
class ScriptInput(BaseModel):
    script_text: str
    frame_count: int = 6

class FrameDescription(BaseModel):
    index: int
    description: str

class FrameAnalysisResponse(BaseModel):
    frames: List[FrameDescription]


@router.post("/analyze", response_model=FrameAnalysisResponse)
async def analyze_script(
    script_input: ScriptInput,
    db: MongoDBConnector = Depends(get_db)
) -> Dict[str, Any]:
    """
    Analyze a script and extract key frames for storyboarding.
    """
    try:
        # Extract key frames using LLM
        frames = extract_key_frames(
            script_input.script_text, 
            frame_count=script_input.frame_count
        )
        
        # Format the response - handle both string and object formats
        frame_descriptions = []
        for i, frame_data in enumerate(frames):
            if isinstance(frame_data, dict):
                description = frame_data["description"]
            else:
                description = frame_data
                
            frame_descriptions.append(
                FrameDescription(index=i, description=description)
            )
        
        # Store analysis in database
        analysis_data = {
            "script_text": script_input.script_text,
            "frame_count": script_input.frame_count,
            "frames": [{"index": f.index, "description": f.description} for f in frame_descriptions]
        }
        db.insert_one("script_analyses", analysis_data)
        
        return {"frames": frame_descriptions}
    
    except Exception as e:
        logger.error(f"Error in script analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Script analysis failed: {str(e)}")


def extract_key_frames(script_text: str, frame_count: int = 6) -> List[str]:
    """
    Use LLM to extract key frames from a script.
    If the script is long, it will be divided into multiple sets of frames.
    Each set will have the specified frame_count.
    
    Also detects and processes pre-formatted scripts with explicit frame markers.
    """
    # Estimate script length to determine number of frame sets needed
    word_count = len(script_text.split())
    
    # Log script information for debugging
    logger.info(f"Script analysis - word count: {word_count}")
    logger.info(f"First 200 characters: {script_text[:200]}...")
    
    # Check if this is a pre-formatted script with explicit frame markers
    if "Frame " in script_text and ":" in script_text:
        logger.info("Detected pre-formatted script with Frame markers - bypassing LLM analysis")
        
        # Use the custom parser directly on the script
        frames = parse_frames_response(script_text, frame_count=100)  # Allow up to 100 frames
        
        # Return frames with metadata
        return frames
        
    # Heuristic: about 1 frame per 150-200 words for average scripts
    # For scripts with more than 900-1000 words, we'll create multiple pages
    estimated_total_frames = max(frame_count, word_count // 175)
    num_sets = max(1, estimated_total_frames // frame_count)
    
    # For very short scripts, just use one set
    if word_count < 1000:
        num_sets = 1
    
    # For extremely long scripts, cap the number of sets (increased from 20 to 50)
    num_sets = min(num_sets, 50)  # Support up to 50 sets (300 frames)
    
    logger.info(f"Extracting {num_sets} sets of {frame_count} frames from script with {word_count} words")
    
    all_frames = []
    
    if num_sets == 1:
        # Simple case - just analyze the whole script for one set of frames
        prompt = (
            "You are a film storyboard assistant. Read the script below and divide it into "
            f"{frame_count} key visual scenes. Provide a brief description for each of the "
            "frames, focusing on distinct important moments, with any key characters and actions.\n\n"
            "Script:\n" + script_text + "\n\nFrames:\n1."
        )
        
        try:
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "system", "content": prompt}],
                max_tokens=1000,
                temperature=0.7
            )
            
            frames_text = response.choices[0].message.content.strip()
            all_frames = parse_frames_response(frames_text, frame_count)
            
        except Exception as e:
            logger.error(f"Error extracting key frames: {str(e)}")
            raise
    else:
        # Split the script into logical segments
        # Improved approach to split by natural scene breaks if possible
        segments = []
        
        # First, try to detect scene headings (e.g., "INT. COFFEE SHOP - DAY")
        scene_pattern = r"(?:INT\.|EXT\.|INT/EXT\.|I/E\.)\s+[\w\s\-]+"
        scenes = re.findall(scene_pattern, script_text, re.IGNORECASE)
        
        if len(scenes) >= num_sets:
            # We have enough scene markers to use them for segmentation
            scene_indices = []
            for scene in scenes:
                index = script_text.find(scene)
                if index >= 0:
                    scene_indices.append(index)
            
            # Sort indices
            scene_indices.sort()
            
            # Group scenes into segments
            scenes_per_segment = max(1, len(scene_indices) // num_sets)
            segment_boundaries = [0] + scene_indices[::scenes_per_segment] + [len(script_text)]
            
            for i in range(len(segment_boundaries) - 1):
                start = segment_boundaries[i]
                end = segment_boundaries[i + 1]
                if i > 0 and start == 0:
                    continue  # Skip duplicate start
                segment = script_text[start:end].strip()
                if segment:
                    segments.append(segment)
        else:
            # Fall back to paragraph-based approach
            paragraphs = [p for p in script_text.split('\n\n') if p.strip()]
            
            # Distribute paragraphs across num_sets
            paragraphs_per_segment = max(1, len(paragraphs) // num_sets)
            
            for i in range(0, len(paragraphs), paragraphs_per_segment):
                segment = '\n\n'.join(paragraphs[i:i + paragraphs_per_segment])
                segments.append(segment)
        
        # Make sure we don't have more segments than num_sets
        segments = segments[:num_sets]
        
        # Process each segment to get frames
        for i, segment in enumerate(segments):
            segment_prompt = (
                "You are a film storyboard assistant. Read the script segment below and divide it into "
                f"{frame_count} key visual scenes. This is segment {i+1} of {len(segments)} from a longer script. "
                "Provide a brief description for each frame, focusing on distinct important moments, "
                "with any key characters and actions.\n\n"
                f"Script Segment {i+1}:\n" + segment + "\n\nFrames:\n1."
            )
            
            try:
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "system", "content": segment_prompt}],
                    max_tokens=1000,
                    temperature=0.7
                )
                
                frames_text = response.choices[0].message.content.strip()
                segment_frames = parse_frames_response(frames_text, frame_count)
                
                # Add page identifier to each frame's metadata but not the description
                for j, frame_description in enumerate(segment_frames):
                    frame_with_metadata = {
                        "description": frame_description,
                        "page": i + 1,
                        "frame_on_page": j + 1
                    }
                    all_frames.append(frame_with_metadata)
                
            except Exception as e:
                logger.error(f"Error extracting frames for segment {i+1}: {str(e)}")
                # Continue with other segments even if one fails
                continue
    
    # If it's a single segment script, format the results to match the multi-segment format
    if num_sets == 1:
        all_frames = [
            {
                "description": frame,
                "page": 1,
                "frame_on_page": i + 1
            } for i, frame in enumerate(all_frames)
        ]
    
    return all_frames


def parse_frames_response(frames_text: str, frame_count: int) -> List[str]:
    """
    Parse the response from the LLM to extract frame descriptions.
    Also handles direct parsing of user-formatted scripts with explicit frame markers.
    """
    frames = []
    
    # First, check if this looks like a pre-formatted script with "Frame X:" markers
    if "Frame " in frames_text and ":" in frames_text:
        logger.info("Detected pre-formatted script with Frame markers")
        # Split by lines for processing
        lines = frames_text.splitlines()
        
        current_frame = ""
        frame_started = False
        frame_content = ""
        
        for line in lines:
            line = line.strip()
            
            # Check for Frame markers like "Frame 1: Title"
            frame_match = re.match(r"(?:Frame|FRAME)\s+(\d+):\s*(.*)", line)
            
            if frame_match:
                # If we were processing a previous frame, save it
                if frame_started and frame_content:
                    frames.append(frame_content)
                
                # Start new frame
                frame_started = True
                frame_number = int(frame_match.group(1))
                
                # Get the title/description from the same line as the frame marker
                frame_title = frame_match.group(2).strip()
                
                # Initialize with both the frame number and title
                frame_content = frame_title
                
            # If we have a frame in progress and this isn't a new frame marker
            elif frame_started:
                # Check if this is the start of another frame (without using the exact "Frame X:" format)
                if re.match(r"\d+\.", line) and len(frames) > 0:
                    # Save the previous frame
                    frames.append(frame_content)
                    
                    # Start new frame with this content
                    frame_content = line.split(".", 1)[1].strip()
                    
                # Otherwise add to current frame
                elif line:
                    frame_content += "\n" + line
        
        # Add the last frame if we have one in progress
        if frame_started and frame_content:
            frames.append(frame_content)
        
        logger.info(f"Found {len(frames)} frames from pre-formatted script")
    
    # Process the AI response format (or other formats with numbered points)
    else:
        # Look for numbered entries like "1." or "1)"
        pattern = r"(?:\n|^)(\d+)[\.\)]\s+(.*?)(?=(?:\n|^)(?:\d+)[\.\)]|$)"
        matches = re.findall(pattern, frames_text, re.DOTALL)
        
        if matches:
            for number, content in matches:
                frames.append(content.strip())
        else:
            # Try a simpler approach - split by blank lines or numbers at the start of lines
            frame_sections = []
            current_section = ""
            
            for line in frames_text.splitlines():
                # Check if line starts with a number (possibly a new frame)
                if re.match(r"^\d+[\.\)]", line.strip()):
                    if current_section:
                        frame_sections.append(current_section.strip())
                    current_section = line.strip()
                    
                    # Try to remove the frame number prefix
                    match = re.match(r"^\d+[\.\)]\s*(.*?)$", line.strip())
                    if match:
                        current_section = match.group(1).strip()
                else:
                    if current_section:
                        current_section += "\n" + line.strip()
                    else:
                        current_section = line.strip()
            
            # Add the last section
            if current_section:
                frame_sections.append(current_section.strip())
                
            frames = frame_sections
    
    # Limit to the requested frame count
    frames = frames[:frame_count]
    
    # If no frames were found, try a simpler sentence-based approach
    if not frames:
        sentences = re.split(r'(?<=[.!?])\s+', frames_text)
        frames = [s.strip() for s in sentences if s.strip()][:frame_count]
    
    # Debug information
    for i, frame in enumerate(frames):
        logger.info(f"Frame {i+1}: {frame[:50]}...")
    
    return frames 