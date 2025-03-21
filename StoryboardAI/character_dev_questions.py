from database.mongo_connector import MongoDBConnector
import datetime

# Create character development questions
character_dev_questions = [
    {
        "question": "How does Elara's martial attire, which fuses traditional and modern styles, reflect her character's inner journey and development throughout the story?",
        "explanation": "Character design elements often serve as visual metaphors for internal development. Understanding this connection can enhance the coherence between visual storytelling and character arcs."
    },
    {
        "question": "What defining traits make Elara a compelling protagonist, and how do these traits both help and hinder her throughout her journey?",
        "explanation": "Complex protagonists need both strengths and flaws that create internal conflict. This balance makes characters more realistic and their growth more meaningful."
    },
    {
        "question": "How does Leor's character serve as both a mentor and a foil to Elara, and what does this relationship reveal about both characters?",
        "explanation": "Mentor-student relationships often reveal character depth through contrast and parallel development. Exploring this dynamic can add richness to both characters."
    },
    {
        "question": "What inner conflicts does Elara face, and how do these conflicts manifest in her external actions and relationships?",
        "explanation": "Internal conflicts externalized through action is a cornerstone of character development. This connection between inner and outer conflicts drives compelling character arcs."
    },
    {
        "question": "How does the mythical Roster character serve as more than just an obstacle, and what thematic purpose does this character fulfill in the story?",
        "explanation": "Secondary characters often embody thematic elements of the story. Understanding their symbolic role helps strengthen the narrative's thematic coherence."
    }
]

# Connect to database
db = MongoDBConnector()

# Get the project
project_id = "ef1f38c7-dec2-4d9f-9303-9ddfb25ed9c0"
project = db.find_one('film_school_projects', {'project_id': project_id})

if not project:
    print(f"Project {project_id} not found")
    exit(1)

# Update the project with character development questions
if 'stage_data' not in project:
    project['stage_data'] = {}

# Add the character development stage
project['stage_data']['character_development'] = {
    "questions": character_dev_questions
}

# Update the project in the database
update_result = db.update_one(
    'film_school_projects', 
    {'project_id': project_id}, 
    {'$set': {
        'stage_data.character_development': {
            'questions': character_dev_questions
        },
        'updated_at': datetime.datetime.now()
    }}
)

print(f"Updated film school project with {len(character_dev_questions)} character development questions, result: {update_result}")

# Add plot structure questions
plot_structure_questions = [
    {
        "question": "How does the 'Call to Adventure' structure of Chapter 1 establish the narrative framework for the entire story?",
        "explanation": "Understanding how the first chapter fits into the larger narrative structure helps ensure a coherent and compelling story arc throughout all chapters."
    },
    {
        "question": "How do the different environments (the grove, echoing canyons, reflecting lake) serve as plot points that drive the story forward?",
        "explanation": "Settings often function as more than backdrop—they can serve as catalysts for plot progression and character development."
    },
    {
        "question": "What narrative techniques are you using to balance action, dialogue, and introspection in your storytelling?",
        "explanation": "The pacing and balance between different narrative elements significantly impacts audience engagement and emotional investment."
    },
    {
        "question": "How do you structure the rising action throughout the five parts of this chapter, and where does the climactic moment occur?",
        "explanation": "Effective story structure requires a carefully crafted progression of tension and resolution that maintains audience interest."
    },
    {
        "question": "How do the subplot elements involving the Roster and the relationship between Elara and Leor integrate with and enhance the main plot?",
        "explanation": "Subplots should meaningfully connect to and reinforce the main narrative, adding depth without distracting from the core story."
    }
]

# Add the plot structure stage
update_result = db.update_one(
    'film_school_projects', 
    {'project_id': project_id}, 
    {'$set': {
        'stage_data.plot_structure': {
            'questions': plot_structure_questions
        },
        'updated_at': datetime.datetime.now()
    }}
)

print(f"Updated film school project with {len(plot_structure_questions)} plot structure questions, result: {update_result}")

# Add visual style questions
visual_style_questions = [
    {
        "question": "How does your visual approach to 'The Way of the Blue Butterfly' blend Eastern and Western animation traditions?",
        "explanation": "Understanding the cultural influences on your visual style can help create a cohesive aesthetic that resonates with diverse audiences."
    },
    {
        "question": "What color palette and symbolic color motifs have you chosen for different environments, and how do these choices reflect the emotional journey?",
        "explanation": "Color theory significantly impacts storytelling and audience perception, with intentional color choices reinforcing themes and emotional beats."
    },
    {
        "question": "How do you plan to use camera techniques like framing, movement, and perspective to enhance key moments in the story?",
        "explanation": "Camera choices are powerful storytelling tools that can emphasize character relationships, power dynamics, and emotional states."
    },
    {
        "question": "What visual metaphors and symbols recur throughout Chapter 1, and how do they foreshadow developments in future chapters?",
        "explanation": "Visual motifs create narrative cohesion and can subtly communicate thematic ideas without explicit exposition."
    },
    {
        "question": "How does your approach to action sequences balance clarity of movement with stylistic expression?",
        "explanation": "The tension between readable action and artistic stylization is particularly important in martial arts storytelling, where movement itself tells a story."
    }
]

# Add the visual style stage
update_result = db.update_one(
    'film_school_projects', 
    {'project_id': project_id}, 
    {'$set': {
        'stage_data.visual_style': {
            'questions': visual_style_questions
        },
        'updated_at': datetime.datetime.now()
    }}
)

print(f"Updated film school project with {len(visual_style_questions)} visual style questions, result: {update_result}")

# Update the current stage to initial so the frontend displays the right questions
update_result = db.update_one(
    'film_school_projects', 
    {'project_id': project_id}, 
    {'$set': {
        'current_stage': 0,
        'updated_at': datetime.datetime.now()
    }}
)

print(f"Set current stage to initial, result: {update_result}")

# Verify all stages are properly set up
project = db.find_one('film_school_projects', {'project_id': project_id})
print("\nFinal project state:")
print(f"Project ID: {project['project_id']}")
print(f"Current stage: {project.get('current_stage', 0)}")
print("Stages available:")
for stage, data in project.get('stage_data', {}).items():
    question_count = len(data.get('questions', []))
    print(f"  - {stage}: {question_count} questions") 