from database.mongo_connector import MongoDBConnector
from api.film_school import Question

# Create questions
questions = [
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

# Update the film school project with these questions
project_id = "ef1f38c7-dec2-4d9f-9303-9ddfb25ed9c0"
update_result = db.update_one('film_school_projects', {'project_id': project_id}, {'$set': {'stage_data.initial.questions': questions}})

print(f"Updated film school project with {len(questions)} questions, result: {update_result}")

# Verify update
project = db.find_one('film_school_projects', {'project_id': project_id})
updated_questions = project.get('stage_data', {}).get('initial', {}).get('questions', [])
print(f"Project now has {len(updated_questions)} questions") 