import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Button, Spinner, Alert, Form,
  ProgressBar, ListGroup, Badge, Row, Col
} from 'react-bootstrap';
import { filmSchoolAPI, projectsAPI } from '../services/api';

const FilmSchoolConsultation = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [evaluation, setEvaluation] = useState(null);
  const [currentStage, setCurrentStage] = useState("");
  const [nextStage, setNextStage] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [generatingAnswer, setGeneratingAnswer] = useState({});
  const [forceCreatingConsultation, setForceCreatingConsultation] = useState(false);
  const [stageProgress, setStageProgress] = useState(0);

  useEffect(() => {
    fetchProjectAndQuestions();
  }, [projectId]);

  const fetchProjectAndQuestions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch project details
      let projectData;
      try {
        // Regular flow for projects
        const projectResponse = await projectsAPI.getProject(projectId);
        projectData = projectResponse.data;
        setProject(projectData);
      } catch (err) {
        console.error('Error fetching project:', err);
        setError('Failed to load project details. Please try again.');
        setLoading(false);
        return;
      }
      
      // Fetch consultation questions
      try {
        console.log("Fetching questions for project:", projectId);
        const questionsResponse = await filmSchoolAPI.getProjectQuestions(projectId);
        console.log("Questions response:", questionsResponse.data);
        
        if (questionsResponse.data.questions && questionsResponse.data.questions.length > 0) {
          setQuestions(questionsResponse.data.questions);
          setCurrentStage(questionsResponse.data.current_stage || "initial");
          updateStageProgress(questionsResponse.data.current_stage || "initial");
        } else {
          console.log("No questions found in response");
          setQuestions([]);
          setCurrentStage("initial");
          setStageProgress(25);
        }
      } catch (err) {
        console.error('Error fetching consultation questions:', err);
        
        // If this is the first time, create a new consultation
        if (err.response?.status === 404 || !err.response) {
          setForceCreatingConsultation(true);
          try {
            const initialConcept = projectData.description || projectData.title;
            console.log("Creating new consultation with concept:", initialConcept);
            const newConsultationResponse = await filmSchoolAPI.createProject(initialConcept, projectId);
            console.log("New consultation response:", newConsultationResponse.data);
            
            if (newConsultationResponse.data.questions && newConsultationResponse.data.questions.length > 0) {
              setQuestions(newConsultationResponse.data.questions);
              setCurrentStage(newConsultationResponse.data.current_stage || "initial");
              updateStageProgress(newConsultationResponse.data.current_stage || "initial");
            } else {
              console.log("Successfully created consultation but no questions returned");
              // Try fetching questions again
              try {
                const retryQuestionsResponse = await filmSchoolAPI.getProjectQuestions(projectId);
                if (retryQuestionsResponse.data.questions && retryQuestionsResponse.data.questions.length > 0) {
                  setQuestions(retryQuestionsResponse.data.questions);
                  setCurrentStage(retryQuestionsResponse.data.current_stage || "initial");
                  updateStageProgress(retryQuestionsResponse.data.current_stage || "initial");
                } else {
                  setError("Created consultation but couldn't retrieve questions. Please try again.");
                }
              } catch (retryErr) {
                console.error("Error in retry fetching questions:", retryErr);
                setError("Created consultation but couldn't retrieve questions. Please try again.");
              }
            }
            setForceCreatingConsultation(false);
          } catch (createErr) {
            console.error('Error creating new consultation:', createErr);
            setError('Failed to create new consultation. Please try again.');
            setForceCreatingConsultation(false);
          }
        } else {
          setError('Failed to load consultation questions. Please try again.');
        }
      }
    } catch (err) {
      console.error('Error in fetchProjectAndQuestions:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateStageProgress = (stage) => {
    const stages = ["initial", "character_development", "plot_structure", "visual_style"];
    const currentIndex = stages.indexOf(stage);
    if (currentIndex >= 0) {
      const progress = Math.round(((currentIndex + 1) / stages.length) * 100);
      setStageProgress(progress);
    }
  };

  const handleAnswerChange = (questionIndex, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: value
    }));
  };

  const generateAnswerSuggestion = async (questionIndex) => {
    try {
      // Set loading state for this specific question
      setGeneratingAnswer(prev => ({ ...prev, [questionIndex]: true }));
      
      // Get the question
      const question = questions[questionIndex];
      
      // Prepare the context from project and previous answers
      const context = {
        projectTitle: project?.title || '',
        projectDescription: project?.description || '',
        currentStage: currentStage,
        previousAnswers: Object.entries(answers)
          .filter(([idx, _]) => parseInt(idx) < questionIndex)
          .map(([idx, ans]) => ({ 
            question: questions[parseInt(idx)]?.question, 
            answer: ans 
          }))
      };
      
      // Call API to generate suggestion
      const response = await filmSchoolAPI.generateAnswerSuggestion(
        question.question,
        question.explanation,
        context
      );
      
      // Update the answer with the suggestion
      if (response.data && response.data.suggestion) {
        handleAnswerChange(questionIndex, response.data.suggestion);
      }
    } catch (err) {
      console.error('Error generating answer suggestion:', err);
      setError('Failed to generate answer suggestion. Please try again.');
    } finally {
      setGeneratingAnswer(prev => ({ ...prev, [questionIndex]: false }));
    }
  };

  const handleSubmitAnswers = async () => {
    // Validate all questions have answers
    if (Object.keys(answers).length !== questions.length) {
      setError('Please answer all questions before submitting');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Format answers for submission - convert from object to array format
      const formattedAnswers = questions.map((_, index) => ({
        question_id: index,
        answer: answers[index] || ""
      }));
      
      console.log("Submitting answers:", formattedAnswers);
      
      // Submit answers
      const response = await filmSchoolAPI.submitAnswers(projectId, formattedAnswers);
      console.log("Submit answers response:", response.data);
      
      // Update state with evaluation and next questions
      if (response.data.evaluation) {
        setEvaluation(response.data.evaluation);
      }
      
      if (response.data.next_questions) {
        // We have questions for the next stage
        setQuestions(response.data.next_questions);
        if (response.data.next_stage) {
          setCurrentStage(response.data.next_stage);
          updateStageProgress(response.data.next_stage);
        }
        setAnswers({});  // Clear answers for next stage
        setNextStage(null); // No manual advancing needed
      } else if (response.data.next_stage) {
        // We need to manually advance to the next stage
        setNextStage(response.data.next_stage);
        setQuestions([]);
      } else {
        // No more questions or stages - consultation complete
        setQuestions([]);
        setNextStage(null);
      }
      
    } catch (err) {
      console.error('Error submitting answers:', err);
      setError(err.response?.data?.detail || 'Failed to submit answers');
    } finally {
      setSubmitting(false);
    }
  };

  const proceedToNextStage = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Update current stage
      const nextStageValue = nextStage;
      setCurrentStage(nextStageValue);
      setEvaluation(null);
      updateStageProgress(nextStageValue);
      
      // Fetch questions for the next stage
      try {
        console.log("Fetching questions for next stage:", nextStageValue);
        
        // Special handling to get questions for the next stage directly
        const project = await filmSchoolAPI.getProjectQuestions(projectId);
        
        if (project.data && project.data.questions && project.data.questions.length > 0) {
          setQuestions(project.data.questions);
        } else {
          console.error("No questions found for next stage");
          setError(`No questions available for the ${formatStageName(nextStageValue)} stage.`);
          setQuestions([]);
        }
      } catch (err) {
        console.error("Error fetching questions for next stage:", err);
        setError(`Failed to load questions for the ${formatStageName(nextStageValue)} stage.`);
        setQuestions([]);
      }
      
      setNextStage(null);
      window.scrollTo(0, 0);
    } catch (err) {
      console.error("Error in proceedToNextStage:", err);
      setError("Failed to proceed to the next stage. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Function to manually create or update the film school consultation
  const handleForceCreateConsultation = async () => {
    try {
      setForceCreatingConsultation(true);
      setError(null);
      
      if (!project) {
        setError("Project data not available");
        return;
      }
      
      const initialConcept = project.description || project.title;
      console.log("Forcing creation of new consultation with concept:", initialConcept);
      
      const newConsultationResponse = await filmSchoolAPI.createProject(initialConcept, projectId);
      console.log("New forced consultation response:", newConsultationResponse.data);
      
      // Get questions from response or fetch them
      if (newConsultationResponse.data.questions && newConsultationResponse.data.questions.length > 0) {
        setQuestions(newConsultationResponse.data.questions);
        setCurrentStage(newConsultationResponse.data.current_stage || "initial");
        updateStageProgress(newConsultationResponse.data.current_stage || "initial");
      } else {
        // Try fetching questions directly
        try {
          const questionsResponse = await filmSchoolAPI.getProjectQuestions(projectId);
          if (questionsResponse.data.questions && questionsResponse.data.questions.length > 0) {
            setQuestions(questionsResponse.data.questions);
            setCurrentStage(questionsResponse.data.current_stage || "initial");
            updateStageProgress(questionsResponse.data.current_stage || "initial");
          } else {
            setError("Created consultation but couldn't retrieve questions. Please try reloading the page.");
          }
        } catch (err) {
          console.error("Error fetching questions after creation:", err);
          setError("Created consultation but couldn't retrieve questions. Please try reloading the page.");
        }
      }
    } catch (err) {
      console.error('Error forcing consultation creation:', err);
      setError('Failed to create new consultation. Please try again.');
    } finally {
      setForceCreatingConsultation(false);
    }
  };

  // Format the stage name for display
  const formatStageName = (stage) => {
    return stage
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Calculate progress
  const calculateProgress = () => {
    return stageProgress;
  };

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">Loading consultation data...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Film School Consultation</h1>
        <Button 
          variant="outline-primary"
          onClick={() => navigate(`/projects/${projectId}`)}
        >
          Back to Project
        </Button>
      </div>

      <Card className="mb-4">
        <Card.Body>
          <Card.Title>{project?.title}</Card.Title>
          {project?.description && (
            <Card.Text>{project.description}</Card.Text>
          )}
          
          <div className="mt-3">
            <p className="mb-1">
              <strong>Consultation Progress:</strong> {formatStageName(currentStage)}
            </p>
            <ProgressBar 
              now={calculateProgress()} 
              label={`${calculateProgress()}%`} 
              variant={calculateProgress() < 50 ? "info" : 
                      calculateProgress() < 75 ? "primary" : 
                      calculateProgress() < 100 ? "success" : "success"}
            />
          </div>
        </Card.Body>
      </Card>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {evaluation ? (
        <div className="mb-4">
          <Card border="info">
            <Card.Header as="h5" className="text-center bg-info text-white">
              Feedback from Your Film School Professor
            </Card.Header>
            <Card.Body>
              <h6 className="mb-3">Ratings:</h6>
              <div className="d-flex flex-wrap mb-4">
                {Object.entries(evaluation.ratings).map(([category, rating]) => (
                  <div key={category} className="mb-3 me-4" style={{minWidth: '120px'}}>
                    <div className="fw-bold text-capitalize mb-1">
                      {category.replace(/_/g, ' ')}
                    </div>
                    <div className="d-flex align-items-center">
                      <div className="progress" style={{height: '8px', width: '100px'}}>
                        <div 
                          className="progress-bar" 
                          role="progressbar"
                          style={{width: `${rating * 10}%`}}
                          aria-valuenow={rating}
                          aria-valuemin="0"
                          aria-valuemax="10"
                        ></div>
                      </div>
                      <span className="ms-2">{rating}/10</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <Row>
                <Col md={6}>
                  <h6 className="mb-3">Strengths:</h6>
                  <ListGroup variant="flush" className="mb-4">
                    {evaluation.strengths.map((strength, idx) => (
                      <ListGroup.Item key={idx} className="ps-0 border-0">
                        <Badge bg="success" className="me-2">+</Badge>
                        {strength}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </Col>
                
                <Col md={6}>
                  <h6 className="mb-3">Areas for Improvement:</h6>
                  <ListGroup variant="flush" className="mb-4">
                    {evaluation.improvements.map((improvement, idx) => (
                      <ListGroup.Item key={idx} className="ps-0 border-0">
                        <Badge bg="warning" text="dark" className="me-2">△</Badge>
                        {improvement}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </Col>
              </Row>
              
              {nextStage && (
                <div className="text-center mt-4">
                  <Button 
                    onClick={proceedToNextStage} 
                    variant="primary" 
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Loading...
                      </>
                    ) : (
                      `Proceed to ${formatStageName(nextStage)}`
                    )}
                  </Button>
                </div>
              )}
              
              {!nextStage && stageProgress >= 100 && (
                <Alert variant="success" className="mt-4">
                  <Alert.Heading>Consultation Complete!</Alert.Heading>
                  <p>
                    You've completed all stages of the film school consultation.
                    You can now apply this knowledge to your storyboard project.
                  </p>
                  <div className="d-flex justify-content-end">
                    <Button variant="success" onClick={() => navigate(`/projects/${projectId}`)}>
                      Return to Project
                    </Button>
                  </div>
                </Alert>
              )}
            </Card.Body>
          </Card>
        </div>
      ) : (
        questions.length > 0 ? (
          <div className="mb-4">
            <Card>
              <Card.Header as="h5" className="bg-primary text-white">
                {formatStageName(currentStage)} Questions
              </Card.Header>
              <Card.Body>
                <p className="text-muted mb-4">
                  Answer the following questions to receive professional feedback on your project from a film school perspective.
                </p>
                
                {questions.map((question, index) => (
                  <div key={index} className="mb-4 p-3 border rounded">
                    <Form.Group>
                      <Form.Label className="fw-bold">{question.question}</Form.Label>
                      <div className="text-muted mb-3 small">
                        <i className="bi bi-info-circle me-1"></i>
                        {question.explanation}
                      </div>
                      <Form.Control
                        as="textarea"
                        rows={4}
                        value={answers[index] || ''}
                        onChange={(e) => handleAnswerChange(index, e.target.value)}
                        placeholder="Type your answer here..."
                      />
                      <div className="d-flex justify-content-end mt-2">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          disabled={generatingAnswer[index]}
                          onClick={() => generateAnswerSuggestion(index)}
                        >
                          {generatingAnswer[index] ? (
                            <>
                              <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                className="me-1"
                              />
                              Generating...
                            </>
                          ) : (
                            'Get Answer Suggestion'
                          )}
                        </Button>
                      </div>
                    </Form.Group>
                  </div>
                ))}
                
                <div className="d-grid gap-2">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleSubmitAnswers}
                    disabled={submitting || Object.keys(answers).length !== questions.length}
                  >
                    {submitting ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        Submitting...
                      </>
                    ) : (
                      'Submit Answers'
                    )}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </div>
        ) : (
          <div className="mb-4">
            <Card className="text-center">
              <Card.Header as="h5" className="bg-info text-white">
                No Questions Available
              </Card.Header>
              <Card.Body>
                <Alert variant="info">
                  <p>There are no consultation questions available for the {formatStageName(currentStage)} stage.</p>
                  {forceCreatingConsultation ? (
                    <>
                      <Spinner animation="border" role="status" size="sm" className="me-2" />
                      Creating consultation...
                    </>
                  ) : (
                    <Button 
                      variant="primary" 
                      onClick={handleForceCreateConsultation}
                      disabled={forceCreatingConsultation}
                    >
                      Create Consultation
                    </Button>
                  )}
                </Alert>
              </Card.Body>
            </Card>
          </div>
        )
      )}
    </div>
  );
};

export default FilmSchoolConsultation; 