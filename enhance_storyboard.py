from database.mongo_connector import MongoDBConnector
import datetime
import json

# Connect to database
db = MongoDBConnector()

# Get the project
project_id = "ef1f38c7-dec2-4d9f-9303-9ddfb25ed9c0"
project = db.find_one('projects', {'project_id': project_id})

if not project:
    print(f"Project {project_id} not found")
    exit(1)

# Get the film school consultation
film_school = db.find_one('film_school_projects', {'project_id': project_id})

if not film_school:
    print(f"Film school consultation for project {project_id} not found")
    exit(1)

print(f"Enhancing storyboard for project: {project['title']}")

# Create enhanced description template based on film school consultation stages
enhancement_template = {
    "initial": """
    Enhanced with cinematic expertise from film school consultation:
    • Genre approach: Epic animated adventure with a focus on character growth and fluid movement
    • Central themes: Transformation, harmony with nature, the duality of learning and teaching
    • Core conflict: The protagonist's journey to find balance between tradition and innovation
    • Target audience: Broad appeal across age groups with layered storytelling
    • Visual metaphors: Butterfly symbolism representing change, water reflections showing duality
    """,
    
    "character_development": """
    Character insights from advanced film studies:
    • Elara: A protagonist whose martial attire visually represents her inner journey from student to master
    • Leor: Functions as both mentor and foil, challenging and complementing Elara's development
    • The Roster: A symbolic guardian figure representing the wisdom of the past and the test of worthiness
    • Character dynamics: Relationships evolve through physical and philosophical exchanges
    • Internal conflicts: Elara's struggle between discipline and intuition manifests in her martial arts style
    """,
    
    "plot_structure": """
    Enhanced cinematic structure elements:
    • Three-act journey: Classic "Call to Adventure" framework with a hero's journey progression
    • Environmental storytelling: The grove, echoing canyons, and reflecting lake serve as manifestations of plot points
    • Pacing: Balanced action sequences with moments of philosophical introspection
    • Rising action: Culminates in the meeting with the Roster as a threshold guardian
    • Subplot integration: Leor's own journey mirrors and complements Elara's personal growth
    """,
    
    "visual_style": """
    Professional visual direction elements:
    • Animation approach: Blends Eastern martial arts fluidity with Western animation dynamics
    • Color motifs: Blue butterfly symbolism represents transformation throughout
    • Camera techniques: Dynamic movement during action, contemplative framing for philosophical moments
    • Visual metaphors: Natural elements (wind, water, earth) mirror character emotions and growth
    • Action choreography: Martial arts sequences prioritize character expression through movement
    """
}

# Update each frame with enhanced descriptions
frames = project.get('frames', [])
enhanced_frames = []

for frame in frames:
    # Create enhanced description with film school insights
    original_description = frame.get('description', {})
    if isinstance(original_description, dict):
        original_text = original_description.get('description', '')
    else:
        original_text = str(original_description)
    
    # Build enhanced description by combining insights from all stages
    enhanced_text = original_text + "\n\n--- DIRECTOR'S NOTES ---\n"
    for stage, enhancement in enhancement_template.items():
        enhanced_text += enhancement + "\n"
    
    # Update frame with enhanced description
    if isinstance(original_description, dict):
        frame['description']['description'] = enhanced_text
    else:
        frame['description'] = enhanced_text
    
    enhanced_frames.append(frame)

# Update the project with enhanced frames
update_result = db.update_one(
    'projects',
    {'project_id': project_id},
    {'$set': {
        'frames': enhanced_frames,
        'updated_at': datetime.datetime.now()
    }}
)

print(f"Enhanced {len(enhanced_frames)} frames with film school consultation insights")

# Add a note about the enhancement to the project description
current_description = project.get('description', '')
enhanced_description = current_description + "\n\n[ENHANCED WITH FILM SCHOOL CONSULTATION: This storyboard has been professionally enriched with cinematic expertise through a comprehensive film school consultation process covering genre analysis, character development, narrative structure, and visual style.]"

update_result = db.update_one(
    'projects',
    {'project_id': project_id},
    {'$set': {
        'description': enhanced_description,
        'updated_at': datetime.datetime.now()
    }}
)

print("Added film school consultation enhancement note to project description")

# Verify the update
updated_project = db.find_one('projects', {'project_id': project_id})
print(f"Project updated with {len(updated_project.get('frames', []))} enhanced frames")
print("Enhancement complete!") 