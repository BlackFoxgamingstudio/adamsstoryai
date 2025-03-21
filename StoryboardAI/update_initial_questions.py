from database.mongo_connector import MongoDBConnector
import datetime

# Create initial questions
initial_questions = [
    {
        "question": "How does the choice of genre as an epic animated adventure influence the storytelling techniques and visual style you are employing?",
        "explanation": "Understanding how genre conventions shape narrative elements and visual aesthetics can help ensure consistency and appeal, and allows you to engage the audience's expectations effectively."
    },
    {
        "question": "What are the central themes you aim to explore in 'The Way of the Blue Butterfly: Chapter 1 - The Call to Adventure,' and how do these themes resonate with contemporary audiences?",
        "explanation": "Identifying and articulating the themes can guide the narrative and character development, while ensuring the story remains relevant and meaningful to modern viewers."
    },
    {
        "question": "What is the core conflict driving the protagonist's journey, and how does it evolve to maintain tension and interest throughout the film?",
        "explanation": "A well-defined and dynamic core conflict is crucial for sustaining narrative momentum and engaging the audience emotionally, ultimately leading to a satisfying resolution."
    },
    {
        "question": "Who is your target audience, and how do you intend to balance complex storytelling with accessibility to ensure broad appeal?",
        "explanation": "Identifying the target audience helps tailor the narrative's complexity and thematic depth, ensuring it is both engaging and comprehensible, thus maximizing its reach and impact."
    },
    {
        "question": "What is the purpose or message you wish to convey through this film, and how will you use visual metaphors and narrative devices to communicate this effectively?",
        "explanation": "Clarifying the film's purpose or message can help unify the narrative and visual elements, ensuring that every creative decision contributes to a coherent and impactful storytelling experience."
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

# Update the project with initial questions
update_result = db.update_one(
    'film_school_projects', 
    {'project_id': project_id}, 
    {'$set': {
        'stage_data.initial.questions': initial_questions,
        'updated_at': datetime.datetime.now()
    }}
)

print(f"Updated film school project with {len(initial_questions)} initial questions, result: {update_result}")

# Verify all stages are properly set up
project = db.find_one('film_school_projects', {'project_id': project_id})
print("\nFinal project state:")
print(f"Project ID: {project['project_id']}")
print(f"Current stage: {project.get('current_stage', 0)}")
print("Stages available:")
for stage, data in project.get('stage_data', {}).items():
    question_count = len(data.get('questions', []))
    print(f"  - {stage}: {question_count} questions") 