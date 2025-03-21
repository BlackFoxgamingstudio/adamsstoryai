import os
import logging
import datetime
import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from openai import OpenAI

from database.mongo_connector import get_db, MongoDBConnector
from database.mongo_utils import serialize_mongo_doc, prepare_for_mongo

# Configure logger
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Initialize OpenAI client
client = OpenAI()

# Models
class Question(BaseModel):
    question: str
    explanation: str

    def dict(self, *args, **kwargs):
        d = super().dict(*args, **kwargs)
        return serialize_mongo_doc(d)

class Answer(BaseModel):
    question_id: int
    answer: str

    def dict(self, *args, **kwargs):
        d = super().dict(*args, **kwargs)
        return serialize_mongo_doc(d)

class Evaluation(BaseModel):
    ratings: Dict[str, int]
    strengths: List[str]
    improvements: List[str]

    def dict(self, *args, **kwargs):
        d = super().dict(*args, **kwargs)
        return serialize_mongo_doc(d)

class QuestionResponse(BaseModel):
    current_stage: str
    questions: List[Question]

class EvaluationResponse(BaseModel):
    evaluation: Evaluation
    next_questions: Optional[List[Question]] = None
    next_stage: Optional[str] = None

class ProjectCreate(BaseModel):
    initial_concept: str
    project_id: Optional[str] = None

# Film School Agent
class FilmSchoolAgent:
    def __init__(self, api_key=None):
        """Initialize the film school agent with OpenAI API key."""
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key not found")
        
        self.client = OpenAI(api_key=self.api_key)
    
    def generate_interview_questions(self, project_context: str, stage: str = "initial") -> List[Question]:
        """Generate film school level questions based on project context and stage."""
        question_categories = {
            "initial": [
                "genre and inspiration",
                "thematic elements",
                "core conflict",
                "audience and purpose"
            ],
            "character_development": [
                "protagonist motivation",
                "character arcs",
                "internal vs external conflicts",
                "relationship dynamics"
            ],
            "plot_structure": [
                "narrative architecture",
                "pacing and tension",
                "subplot integration",
                "climax construction"
            ],
            "visual_style": [
                "visual motifs",
                "color palette and symbolism",
                "camera techniques",
                "editing rhythm"
            ]
        }
        
        selected_categories = question_categories.get(stage, question_categories["initial"])
        
        prompt = f"""
        You are a USC Film School professor conducting a creative consultation with a filmmaker.
        Project Context: {project_context}
        
        Generate 5 thoughtful, probing questions about {', '.join(selected_categories)} that will:
        1. Challenge the filmmaker to think deeply about their creative choices
        2. Guide them toward professional-grade storytelling
        3. Help refine their narrative and visual approach
        4. Draw on established film theory and industry best practices
        
        Format each question with a brief explanation of why it's important to consider.
        
        Return the questions in the following JSON format:
        {{
            "questions": [
                {{
                    "question": "What is your question here?",
                    "explanation": "Why this question is important to consider..."
                }},
                ...
            ]
        }}
        """
        
        try:
            from openai import OpenAI
            client = OpenAI(api_key=self.api_key)
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=1500
            )
            
            result_text = response.choices[0].message.content

            print(result_text)
            # Parse the JSON response
            try:
                parsed_result = json.loads(result_text)
                questions = parsed_result.get("questions", [])
                
                # Convert to Question objects
                return [
                    Question(question=q["question"], explanation=q["explanation"])
                    for q in questions
                ]
            except json.JSONDecodeError:
                # If JSON parsing fails, try a simple parsing approach
                questions = []
                lines = result_text.split("\n")
                
                current_question = None
                current_explanation = ""
                
                for line in lines:
                    line = line.strip()
                    if not line:
                        continue
                    
                    if line.startswith("Question") or line.startswith("Q"):
                        # Save previous question if exists
                        if current_question:
                            questions.append({
                                "question": current_question,
                                "explanation": current_explanation.strip()
                            })
                        
                        # Start new question
                        parts = line.split(":", 1)
                        if len(parts) > 1:
                            current_question = parts[1].strip()
                        else:
                            current_question = ""
                        current_explanation = ""
                    
                    elif line.startswith("Explanation") or line.startswith("E"):
                        parts = line.split(":", 1)
                        if len(parts) > 1:
                            current_explanation = parts[1].strip()
                    
                    elif current_question:
                        # Continue explanation
                        current_explanation += " " + line
                
                # Add the last question
                if current_question:
                    questions.append({
                        "question": current_question,
                        "explanation": current_explanation.strip()
                    })
                
                # Convert to Question objects
                return [
                    Question(question=q["question"], explanation=q["explanation"])
                    for q in questions
                ]
        
        except Exception as e:
            logger.error(f"Error generating film school questions: {str(e)}")
            raise
    
    def evaluate_answers(self, questions: List[Question], answers: List[str]) -> Evaluation:
        """Evaluate user answers against film industry best practices."""
        evaluation_prompt = "As a film professor, evaluate these answers to screenwriting questions:\n\n"
        
        for q, a in zip(questions, answers):
            evaluation_prompt += f"Question: {q.question}\nAnswer: {a}\n\n"
        
        evaluation_prompt += """
        Provide an assessment with:
        1. Overall creative strength (1-10)
        2. Technical storytelling quality (1-10)
        3. Character development depth (1-10)
        4. Visual storytelling potential (1-10)
        5. Three specific strengths
        6. Three areas for improvement with professional guidance
        
        Return the evaluation in the following JSON format:
        {
            "ratings": {
                "creative": 7,
                "technical": 6,
                "character": 8,
                "visual": 7
            },
            "strengths": [
                "Strength 1",
                "Strength 2",
                "Strength 3"
            ],
            "improvements": [
                "Improvement area 1",
                "Improvement area 2",
                "Improvement area 3"
            ]
        }
        """
        
        try:
            from openai import OpenAI
            client = OpenAI(api_key=self.api_key)
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": evaluation_prompt
                    }
                ],
            )
            
            result_text = response.choices[0].message.content
            
            # Parse the evaluation
            try:
                parsed_result = json.loads(result_text)
                
                return Evaluation(
                    ratings=parsed_result.get("ratings", {
                        "creative": 5,
                        "technical": 5,
                        "character": 5,
                        "visual": 5
                    }),
                    strengths=parsed_result.get("strengths", ["Not specified"]),
                    improvements=parsed_result.get("improvements", ["Not specified"])
                )
            except json.JSONDecodeError:
                # Fallback if JSON parsing fails - extract data from text
                ratings = {
                    "creative": 5,
                    "technical": 5,
                    "character": 5,
                    "visual": 5
                }
                strengths = []
                improvements = []
                
                lines = result_text.split("\n")
                section = None
                
                for line in lines:
                    line = line.strip()
                    if not line:
                        continue
                    
                    # Look for rating patterns
                    if "creative" in line.lower() and "strength" in line.lower():
                        try:
                            ratings["creative"] = int(line[-2:].strip())
                        except:
                            pass
                    elif "technical" in line.lower() and "quality" in line.lower():
                        try:
                            ratings["technical"] = int(line[-2:].strip())
                        except:
                            pass
                    elif "character" in line.lower() and "depth" in line.lower():
                        try:
                            ratings["character"] = int(line[-2:].strip())
                        except:
                            pass
                    elif "visual" in line.lower() and "potential" in line.lower():
                        try:
                            ratings["visual"] = int(line[-2:].strip())
                        except:
                            pass
                    
                    # Look for section headers
                    if "strength" in line.lower() and ":" in line:
                        section = "strengths"
                        continue
                    elif ("improvement" in line.lower() or "area" in line.lower()) and ":" in line:
                        section = "improvements"
                        continue
                    
                    # Process section content
                    if section == "strengths" and line.strip():
                        # If line starts with a number or bullet point, clean it
                        if line[0].isdigit() or line[0] in ['•', '-', '*']:
                            line = line[2:].strip()
                        strengths.append(line)
                    elif section == "improvements" and line.strip():
                        if line[0].isdigit() or line[0] in ['•', '-', '*']:
                            line = line[2:].strip()
                        improvements.append(line)
                
                # Limit to 3 each
                strengths = strengths[:3]
                improvements = improvements[:3]
                
                # If we couldn't find any, add placeholders
                if not strengths:
                    strengths = ["Strong creative potential", "Good conceptual foundation", "Interesting premise"]
                if not improvements:
                    improvements = ["Develop character motivations further", "Clarify narrative structure", "Enhance visual storytelling elements"]
                
                return Evaluation(
                    ratings=ratings,
                    strengths=strengths,
                    improvements=improvements
                )
        
        except Exception as e:
            logger.error(f"Error evaluating answers: {str(e)}")
            raise

    def generate_answer_suggestion(self, question: str, explanation: str, context: dict) -> str:
        """Generate a suggested answer to a film school question."""
        # Extract context information
        project_title = context.get("projectTitle", "")
        project_description = context.get("projectDescription", "")
        current_stage = context.get("currentStage", "initial")
        previous_answers = context.get("previousAnswers", [])
        
        # Build previous answers context if available
        previous_context = ""
        if previous_answers:
            previous_context = "Previous answers in this consultation:\n"
            for qa in previous_answers:
                previous_context += f"Q: {qa.get('question', '')}\nA: {qa.get('answer', '')}\n\n"
        
        # Build the prompt
        prompt = f"""
        You are an experienced filmmaker assisting with a film school consultation.
        
        Project Title: {project_title}
        Project Description: {project_description}
        Current Stage: {current_stage}
        
        {previous_context}
        
        The following question has been asked:
        Question: {question}
        Context: {explanation}
        
        Generate a thoughtful, professional response to this question that demonstrates:
        1. Deep understanding of filmmaking principles
        2. Creative and original thinking
        3. Practical knowledge of film production
        4. Awareness of storytelling techniques
        
        The response should be 3-5 sentences and showcase what a skilled filmmaker would answer.
        """
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo", # Using 3.5-turbo for faster response
                messages=[
                    {
                        "role": "system",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=300
            )
            
            return response.choices[0].message.content.strip()
        
        except Exception as e:
            logger.error(f"Error generating answer suggestion: {str(e)}")
            raise


# Story Development Pipeline
class StoryDevelopmentPipeline:
    """Pipeline for the story development process."""
    
    def __init__(self):
        """Initialize the story development pipeline."""
        self.agent = FilmSchoolAgent()
        self.development_stages = ["initial", "character_development", "plot_structure", "visual_style"]
    
    def process_answers(self, project_id: str, questions: List[Question], answers: List[str], 
                        db: MongoDBConnector) -> Dict:
        """Process user answers and advance the development pipeline."""
        # Get project data
        project = db.find_one("film_school_projects", {"project_id": project_id})
        if not project:
            raise ValueError(f"Project with ID {project_id} not found")
        
        current_stage_idx = project.get("current_stage", 0)
        current_stage = self.development_stages[current_stage_idx]
        
        # Store answers
        if "stage_data" not in project:
            project["stage_data"] = {}
        
        project["stage_data"][current_stage] = {
            "questions": [q.dict() for q in questions],
            "answers": answers
        }
        
        # Evaluate answers
        evaluation = self.agent.evaluate_answers(questions, answers)
        
        # Store the evaluation
        if "feedback_history" not in project:
            project["feedback_history"] = []
        
        feedback_entry = {
            "stage": current_stage,
            "evaluation": evaluation.dict(),
            "timestamp": datetime.datetime.now()
        }
        
        project["feedback_history"].append(feedback_entry)
        
        # Update the project in the database
        update_data = {
            "updated_at": datetime.datetime.now(),
            "stage_data": project["stage_data"],
            "feedback_history": project["feedback_history"]
        }
        
        # Prepare data for MongoDB
        update_data = prepare_for_mongo(update_data)
        
        # Update in database
        db.update_one("film_school_projects", {"project_id": project_id}, {"$set": update_data})
        
        # Move to the next stage if available
        next_questions = None
        next_stage = None
        
        if current_stage_idx < len(self.development_stages) - 1:
            current_stage_idx += 1
            next_stage = self.development_stages[current_stage_idx]
            
            # Update the project's current stage
            db.update_one(
                "film_school_projects", 
                {"project_id": project_id}, 
                {"$set": {"current_stage": current_stage_idx}}
            )
            
            # Generate questions for the next stage
            # Serialize project for JSON
            context = json.dumps(serialize_mongo_doc(project))
            next_questions = self.agent.generate_interview_questions(context, next_stage)
        
        return {
            "evaluation": evaluation,
            "next_questions": next_questions,
            "next_stage": next_stage
        }


# Global instances
film_school_agent = FilmSchoolAgent()
story_pipeline = StoryDevelopmentPipeline()

# Endpoints
@router.post("/projects", response_model=QuestionResponse)
async def create_film_school_project(
    project_data: ProjectCreate,
    db: MongoDBConnector = Depends(get_db)
) -> Dict[str, Any]:
    """
    Create a new film school consultation project.
    """
    try:
        logger.info(f"Creating new film school project with data: {project_data}")
        
        # Create a story development pipeline
        pipeline = StoryDevelopmentPipeline()
        
        # Generate initial questions
        context = project_data.initial_concept
        questions = pipeline.agent.generate_interview_questions(context)
        
        # Get the associated storyboard project if available
        linked_project = None
        if project_data.project_id:
            try:
                linked_project = db.find_one("projects", {"project_id": project_data.project_id})
                if linked_project:
                    logger.info(f"Linked to storyboard project: {project_data.project_id}")
                    context = json.dumps(serialize_mongo_doc(linked_project))
                    questions = pipeline.agent.generate_interview_questions(context)
            except Exception as e:
                logger.warning(f"Failed to get linked project {project_data.project_id}: {str(e)}")
                # Continue with basic questions if project retrieval fails
        
        # Create consultation project
        consultation_id = project_data.project_id or f"fs_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Prepare project document
        project = {
            "project_id": consultation_id,
            "initial_concept": project_data.initial_concept,
            "linked_project_id": project_data.project_id,
            "current_stage": 0,  # Index of the current stage (initial stage)
            "stage_data": {
                "initial": {
                    "questions": [q.dict() for q in questions]
                }
            },
            "created_at": datetime.datetime.now(),
            "updated_at": datetime.datetime.now()
        }
        
        # Check if project already exists
        existing = db.find_one("film_school_projects", {"project_id": consultation_id})
        if existing:
            # Update existing project
            update_data = {
                "updated_at": datetime.datetime.now(),
                "stage_data.initial.questions": [q.dict() for q in questions]
            }
            db.update_one("film_school_projects", {"project_id": consultation_id}, {"$set": update_data})
            logger.info(f"Updated existing film school project: {consultation_id}")
        else:
            # Insert new project
            db.insert_one("film_school_projects", project)
            logger.info(f"Created new film school project: {consultation_id}")
        
        return {
            "current_stage": "initial",
            "questions": questions
        }
    
    except Exception as e:
        logger.error(f"Error creating film school project: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create film school project: {str(e)}")

@router.get("/projects/{project_id}/questions", response_model=QuestionResponse)
async def get_project_questions(
    project_id: str,
    db: MongoDBConnector = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get the questions for a specific project stage.
    """
    try:
        logger.info(f"Fetching questions for project: {project_id}")
        
        # Find the film school project
        project = db.find_one("film_school_projects", {"project_id": project_id})
        if not project:
            # Check if it's a regular storyboard project ID
            storyboard_project = db.find_one("projects", {"project_id": project_id})
            if storyboard_project:
                # Check if a film school project exists for this storyboard project
                film_project = db.find_one("film_school_projects", {"linked_project_id": project_id})
                if film_project:
                    project = film_project
                else:
                    raise HTTPException(status_code=404, detail=f"Film school project for '{project_id}' not found")
            else:
                raise HTTPException(status_code=404, detail=f"Project with ID '{project_id}' not found")
        
        # Get current stage
        current_stage_idx = project.get("current_stage", 0)
        stage_names = ["initial", "character_development", "plot_structure", "visual_style"]
        if current_stage_idx >= len(stage_names):
            current_stage_idx = len(stage_names) - 1
        current_stage = stage_names[current_stage_idx]
        
        # Get stage data
        if "stage_data" not in project or current_stage not in project["stage_data"]:
            raise HTTPException(status_code=404, detail=f"No questions found for stage '{current_stage}'")
            
        # Get questions for the current stage
        stage_data = project["stage_data"][current_stage]
        questions_data = stage_data.get("questions", [])
        
        # Convert to Question objects
        questions = [Question(**q) for q in questions_data]
        
        logger.info(f"Retrieved {len(questions)} questions for project {project_id} at stage {current_stage}")
        
        return {
            "current_stage": current_stage,
            "questions": questions
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting project questions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get project questions: {str(e)}")

@router.post("/projects/{project_id}/answers", response_model=EvaluationResponse)
async def submit_answers(
    project_id: str,
    answers: List[Answer],
    db: MongoDBConnector = Depends(get_db)
) -> Dict[str, Any]:
    """
    Submit answers to project questions and advance to the next stage.
    """
    try:
        logger.info(f"Submitting answers for project {project_id}")
        
        # Get project data
        project = db.find_one("film_school_projects", {"project_id": project_id})
        if not project:
            # Try to find it as a linked project
            film_project = db.find_one("film_school_projects", {"linked_project_id": project_id})
            if film_project:
                project = film_project
                project_id = project["project_id"]
            else:
                raise HTTPException(status_code=404, detail=f"Project with ID {project_id} not found")
        
        # Get current stage
        current_stage_idx = project.get("current_stage", 0)
        stage_names = ["initial", "character_development", "plot_structure", "visual_style"]
        if current_stage_idx >= len(stage_names):
            current_stage_idx = len(stage_names) - 1
        current_stage = stage_names[current_stage_idx]
        
        # Get the questions for the current stage
        if ("stage_data" not in project or 
            current_stage not in project["stage_data"] or
            "questions" not in project["stage_data"][current_stage]):
            
            raise HTTPException(status_code=400, detail="No questions found for current stage")
        
        questions_data = project["stage_data"][current_stage]["questions"]
        questions = [Question(**q) for q in questions_data]
        
        # Validate answers match questions
        if len(answers) != len(questions):
            raise HTTPException(
                status_code=400, 
                detail=f"Expected {len(questions)} answers, got {len(answers)}"
            )
        
        # Sort answers by question ID
        sorted_answers = sorted(answers, key=lambda a: a.question_id)
        answer_texts = [a.answer for a in sorted_answers]
        
        # Process the answers using the pipeline
        pipeline = StoryDevelopmentPipeline()
        result = pipeline.process_answers(project_id, questions, answer_texts, db)
        
        logger.info(f"Successfully processed answers for project {project_id}")
        
        return {
            "evaluation": result["evaluation"],
            "next_questions": result["next_questions"],
            "next_stage": result["next_stage"]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting answers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to submit answers: {str(e)}")

@router.get("/projects/{project_id}/characters")
async def get_project_characters(
    project_id: str,
    db: MongoDBConnector = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get the characters extracted from a project.
    """
    try:
        # Get project data
        project = db.find_one("projects", {"project_id": project_id})
        if not project:
            raise HTTPException(status_code=404, detail=f"Project with ID {project_id} not found")
        
        # Return characters
        characters = project.get("characters", {})
        
        return {"characters": characters}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting project characters: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get project characters: {str(e)}")

@router.get("/projects/{project_id}/scenes")
async def get_project_scenes(
    project_id: str,
    db: MongoDBConnector = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get the scenes extracted from a project.
    """
    try:
        # Get project data
        project = db.find_one("projects", {"project_id": project_id})
        if not project:
            raise HTTPException(status_code=404, detail=f"Project with ID {project_id} not found")
        
        # Return scenes
        scenes = project.get("scenes", [])
        
        return {"scenes": scenes}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting project scenes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get project scenes: {str(e)}")

# Add the new endpoint for answer suggestions
class SuggestionRequest(BaseModel):
    question: str
    explanation: str
    context: Dict[str, Any]

class SuggestionResponse(BaseModel):
    suggestion: str

@router.post("/generate-suggestion", response_model=SuggestionResponse)
async def generate_answer_suggestion(
    request: SuggestionRequest
) -> Dict[str, str]:
    """Generate an AI-suggested answer to a film school consultation question."""
    try:
        # Initialize the film school agent
        agent = FilmSchoolAgent()
        
        # Generate the answer suggestion
        suggestion = agent.generate_answer_suggestion(
            request.question,
            request.explanation,
            request.context
        )
        
        return {"suggestion": suggestion}
    
    except Exception as e:
        logger.error(f"Error generating answer suggestion: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate suggestion: {str(e)}") 