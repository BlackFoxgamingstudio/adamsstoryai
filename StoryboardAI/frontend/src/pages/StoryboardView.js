import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, Row, Col, Card, Button, Spinner, Alert,
  Form, Modal, Nav, Tab, Pagination
} from 'react-bootstrap';
import { projectsAPI, feedbackAPI, actorsAPI, utils } from '../services/api';

// Use the shared utility function
const { formatImageUrl, getFallbackImage } = utils;

// Add CSS styles for frame descriptions
const styles = {
  frameDescription: {
    fontSize: '0.9rem',
    lineHeight: '1.4'
  },
  frameTitle: {
    fontWeight: 'bold',
    fontSize: '1rem',
    marginBottom: '0.5rem'
  },
  frameContent: {
    whiteSpace: 'pre-line',
    textAlign: 'left'
  },
  frameSetting: {
    backgroundColor: '#f8f9fa',
    padding: '0.4rem',
    borderRadius: '0.25rem',
    marginBottom: '0.5rem'
  },
  characterActions: {
    marginBottom: '0.5rem'
  },
  characterName: {
    fontWeight: 'bold',
    color: '#0d6efd'
  },
  generalDescription: {
    marginTop: '0.5rem'
  },
  cardText: {
    maxHeight: '250px',
    overflowY: 'auto'
  }
};

const StoryboardView = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [frames, setFrames] = useState([]);
  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [framesPerPage] = useState(6);
  
  // Feedback state
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [selectedActors, setSelectedActors] = useState([]);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  
  // Image generation state
  const [generatingImage, setGeneratingImage] = useState({});

  // Wrap fetchData in useCallback to prevent infinite loops
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch project details
      const projectResponse = await projectsAPI.getProject(projectId);
      setProject(projectResponse.data);
      
      // Fetch page information
      const pagesResponse = await projectsAPI.getProjectPages(projectId);
      setTotalPages(pagesResponse.data.total_pages);
      
      // Fetch frames for the first page
      await fetchFramesForPage(1);
      
      // Fetch actors
      const actorsResponse = await actorsAPI.getActors();
      setActors(actorsResponse.data);
      
    } catch (err) {
      console.error('Error fetching storyboard data:', err);
      setError('Failed to load storyboard data');
    } finally {
      setLoading(false);
    }
  }, [projectId]); // Add dependencies to useCallback

  // Wrap fetchFramesForPage in useCallback
  const fetchFramesForPage = useCallback(async (page) => {
    try {
      setLoading(true);
      const framesResponse = await projectsAPI.getProjectFrames(projectId, page);
      
      // Ensure we have exactly 6 frames per page (fill with placeholders if needed)
      let framesData = framesResponse.data;
      
      // If we have fewer than 6 frames, add placeholders
      if (framesData.length < framesPerPage) {
        const placeholders = Array(framesPerPage - framesData.length).fill().map((_, i) => ({
          frame_id: `placeholder-${page}-${i}`,
          description: "Empty frame slot",
          page: page,
          frame_on_page: framesData.length + i + 1,
          is_placeholder: true
        }));
        framesData = [...framesData, ...placeholders];
      }
      
      setFrames(framesData);
      setLoading(false);
    } catch (err) {
      console.error(`Error fetching frames for page ${page}:`, err);
      setError(`Failed to load frames for page ${page}`);
      setLoading(false);
    }
  }, [projectId, framesPerPage]); // Add dependencies to useCallback

  useEffect(() => {
    fetchData();
  }, [fetchData]); // Add fetchData as a dependency

  useEffect(() => {
    // Fetch frames for the current page when page changes
    if (project) {
      fetchFramesForPage(currentPage);
    }
  }, [currentPage, project, fetchFramesForPage]); // Add fetchFramesForPage as a dependency

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedFrame || !feedbackText.trim()) return;
    
    try {
      setSubmittingFeedback(true);
      
      const response = await feedbackAPI.submitFrameFeedback(selectedFrame.frame_id, {
        frame_id: selectedFrame.frame_id,
        feedback_text: feedbackText,
        actor_names: selectedActors.length > 0 ? selectedActors : undefined
      });
      
      // Update the frame with the new version
      const updatedFrames = frames.map(frame => 
        frame.frame_id === selectedFrame.frame_id ? 
        {
          ...frame,
          image_url: response.data.new_image_url, // Update with new image URL
          feedback_history: [...(frame.feedback_history || []), {
            text: feedbackText,
            timestamp: new Date().toISOString()
          }]
        } : frame
      );
      
      setFrames(updatedFrames);
      setShowFeedbackModal(false);
      setFeedbackText('');
      setSelectedActors([]);
      
    } catch (err) {
      console.error('Error submitting feedback:', err);
      alert('Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleActorSelection = (actorName) => {
    setSelectedActors(prev => {
      if (prev.includes(actorName)) {
        return prev.filter(name => name !== actorName);
      } else {
        return [...prev, actorName];
      }
    });
  };

  const openFeedbackModal = (frame) => {
    if (frame.is_placeholder) return; // Don't open feedback modal for placeholder frames
    setSelectedFrame(frame);
    setShowFeedbackModal(true);
  };
  
  // Add pagination handler
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const parseFrameDescription = (description) => {
    if (!description) return 'No description available';

    // Handle object description format
    if (typeof description === 'object' && description !== null) {
      description = description.description || 'No description available';
    }
    
    // Convert to string if it's not already
    description = String(description);
    
    // Parse the description into structured parts
    const parts = {};
    let hasStructuredData = false;
    
    // Try to extract location info (often starts with "INT." or "EXT.")
    const locationMatch = description.match(/^(INT\.|EXT\.|INT\/EXT\.)\s+([\w\s-]+)(?:\s*-\s*|\s+)(DAY|NIGHT|MORNING|EVENING|AFTERNOON)/i);
    if (locationMatch) {
      parts.setting = `${locationMatch[1]} ${locationMatch[2]} - ${locationMatch[3]}`;
      // Remove the location part from description
      description = description.replace(locationMatch[0], '').trim();
      hasStructuredData = true;
    }
    
    // Try to extract character actions
    const characterActions = [];
    
    // First, try to match "CHARACTER: Action." format
    const colonFormat = description.matchAll(/([A-Z][A-Z\s]+):\s+([^\.]+\.)/g);
    for (const match of colonFormat) {
      const character = match[1].trim();
      const action = match[2].trim();
      if (character && action) {
        // Check for duplicates
        const isDuplicate = characterActions.some(
          item => item.character === character && item.action === action
        );
        
        if (!isDuplicate) {
          characterActions.push({ character, action });
          // Remove the matched part from description
          description = description.replace(match[0], '').trim();
          hasStructuredData = true;
        }
      }
    }
    
    // Then, try classic screenplay format "CHARACTER does something."
    const screenplayFormat = description.matchAll(/\b([A-Z][A-Z\s]+)\b(?:\s+)([^\.]+\.)/g);
    for (const match of screenplayFormat) {
      const character = match[1].trim();
      // Skip if it's a setting term like "INT" or "EXT"
      if (character === "INT" || character === "EXT" || character === "INT/EXT") {
        continue;
      }
      const action = match[2].trim();
      if (character && action) {
        // Check for duplicates
        const isDuplicate = characterActions.some(
          item => item.character === character && item.action === action
        );
        
        if (!isDuplicate) {
          characterActions.push({ character, action });
          // Remove the matched part from description
          description = description.replace(match[0], '').trim();
          hasStructuredData = true;
        }
      }
    }
    
    // Try to extract scene information
    if (description.includes("SCENE INFORMATION:") || description.includes("SCENE INFO:")) {
      const sceneInfoRegex = /(SCENE INFORMATION:|SCENE INFO:)([\s\S]+?)(?=CHARACTER ACTIONS:|DESCRIPTION:|$)/i;
      const sceneInfoMatch = description.match(sceneInfoRegex);
      if (sceneInfoMatch) {
        parts.sceneInfo = sceneInfoMatch[2].trim();
        description = description.replace(sceneInfoMatch[0], '').trim();
        hasStructuredData = true;
      }
    }
    
    // Try to extract description section
    if (description.includes("DESCRIPTION:")) {
      const descriptionRegex = /DESCRIPTION:([\s\S]+?)(?=CHARACTER ACTIONS:|SCENE INFO:|$)/i;
      const descriptionMatch = description.match(descriptionRegex);
      if (descriptionMatch) {
        parts.explicitDescription = descriptionMatch[1].trim();
        description = description.replace(descriptionMatch[0], '').trim();
        hasStructuredData = true;
      }
    }
    
    // The rest is general description
    if (description.trim() && !parts.explicitDescription) {
      parts.generalDescription = description.trim();
    }
    
    // If no structured data was found, just return the plain description with minimal formatting
    if (!hasStructuredData) {
      // Split by double newlines for paragraph breaks
      const paragraphs = description.split(/\n\n+/).filter(p => p.trim());
      if (paragraphs.length > 1) {
        return (
          <div style={styles.frameDescription}>
            {paragraphs.map((paragraph, idx) => (
              <p key={idx} className={idx < paragraphs.length - 1 ? 'mb-2' : 'mb-0'}>
                {paragraph.trim()}
              </p>
            ))}
          </div>
        );
      }
      
      return (
        <div style={styles.frameDescription}>
          {description}
        </div>
      );
    }
    
    // Return JSX for structured display
    return (
      <div style={styles.frameDescription} className="storyboard-frame-description">
        {parts.setting && (
          <div style={styles.frameSetting} className="storyboard-frame-setting">
            <strong>Setting:</strong> {parts.setting}
          </div>
        )}
        
        {parts.sceneInfo && (
          <div style={{...styles.frameSetting, backgroundColor: '#e8f4f8', marginTop: '0.5rem'}} className="storyboard-frame-scene-info">
            <strong>Scene Information:</strong> {parts.sceneInfo}
          </div>
        )}
        
        {characterActions.length > 0 && (
          <div style={styles.characterActions} className="storyboard-frame-character-actions">
            <strong>Character Actions:</strong>
            <ul className="mb-1 ps-3">
              {characterActions.map((item, index) => (
                <li key={index}>
                  <span style={styles.characterName} className="storyboard-character-name">{item.character}:</span> {item.action}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {(parts.explicitDescription || parts.generalDescription) && (
          <div style={styles.generalDescription} className="storyboard-frame-general-description">
            <strong>Description:</strong> {parts.explicitDescription || parts.generalDescription}
          </div>
        )}
      </div>
    );
  };

  const handleGenerateImage = async (frame) => {
    try {
      if (frame.is_placeholder) return;
      
      // Set loading state for this specific frame
      setGeneratingImage(prev => ({ ...prev, [frame.frame_id]: true }));
      
      // Generate image for the frame
      const response = await projectsAPI.generateFrameImage(projectId, frame.frame_id, {
        description: frame.description,
        actor_names: frame.actors || []
      });
      
      // Update the frame with the new image
      if (response.data && response.data.image_url) {
        const updatedFrames = frames.map(f => 
          f.frame_id === frame.frame_id ? 
          {
            ...f,
            image_url: response.data.image_url
          } : f
        );
        setFrames(updatedFrames);
      }
    } catch (err) {
      console.error('Error generating image:', err);
      setError('Failed to generate image. Please try again.');
    } finally {
      setGeneratingImage(prev => ({ ...prev, [frame.frame_id]: false }));
    }
  };

  const renderFrameCard = (frame) => {
    // Handle case where frame is a placeholder
    if (frame.is_placeholder) {
      return (
        <Card className="h-100 frame-card">
          <Card.Body className="d-flex flex-column align-items-center justify-content-center">
            <p className="text-muted">Empty frame slot</p>
          </Card.Body>
        </Card>
      );
    }
    
    // For actual frames
    const frameDescription = frame.description || 'No description available';
    
    // Parse the frame description to separate title from content if possible
    let frameTitle = '';
    let frameContent = frameDescription;
    
    // Check if description has multiple lines
    if (frameDescription.includes('\n')) {
      const lines = frameDescription.split('\n');
      frameTitle = lines[0]; // First line as title
      frameContent = lines.slice(1).join('\n'); // Rest as content
    } else if (frameDescription.includes(':')) {
      // If single line with colon, split at first colon
      const parts = frameDescription.split(':', 2);
      frameTitle = parts[0].trim();
      frameContent = parts.length > 1 ? parts[1].trim() : '';
    }
    
    // If no splitting was possible, use the whole description
    if (!frameContent && frameTitle) {
      frameContent = frameTitle;
      frameTitle = `Frame ${frame.frame_on_page || ''}`;
    }
    
    return (
      <Card 
        className="h-100 frame-card"
        onClick={() => !generatingImage[frame.frame_id] && openFeedbackModal(frame)}
      >
        <Card.Header className="d-flex justify-content-between align-items-center">
          <span>Frame {frame.frame_on_page || ''}</span>
          {generatingImage[frame.frame_id] && (
            <Spinner animation="border" size="sm" />
          )}
        </Card.Header>
        
        {/* Frame image */}
        <div className="frame-image-container">
          {frame.image_url ? (
            <Card.Img 
              variant="top" 
              src={formatImageUrl(frame.image_url)} 
              className="frame-image"
              alt={`Frame ${frame.frame_on_page || ''}`}
              onError={(e) => {
                console.error('Error loading frame image:', frame.image_url);
                e.target.onerror = null;
                e.target.src = getFallbackImage(300, 'Image Error');
              }}
            />
          ) : (
            <div className="no-image-placeholder d-flex flex-column align-items-center justify-content-center">
              <p className="text-muted mb-2">No image generated</p>
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleGenerateImage(frame);
                }}
                disabled={generatingImage[frame.frame_id]}
              >
                {generatingImage[frame.frame_id] ? 'Generating...' : 'Generate Image'}
              </Button>
            </div>
          )}
        </div>
        
        {/* Frame description */}
        <Card.Body>
          {frameTitle && (
            <div style={styles.frameTitle}>{frameTitle}</div>
          )}
          <div style={styles.cardText}>
            <div style={styles.frameContent}>{frameContent}</div>
          </div>
        </Card.Body>
      </Card>
    );
  };

  const renderFeedbackModal = () => {
    if (!selectedFrame) return null;
    
    // Parse the frame description to separate title from content if possible
    let frameTitle = '';
    let frameContent = selectedFrame.description || 'No description available';
    
    // Check if description has multiple lines
    if (frameContent.includes('\n')) {
      const lines = frameContent.split('\n');
      frameTitle = lines[0]; // First line as title
      frameContent = lines.slice(1).join('\n'); // Rest as content
    } else if (frameContent.includes(':')) {
      // If single line with colon, split at first colon
      const parts = frameContent.split(':', 2);
      frameTitle = parts[0].trim();
      frameContent = parts.length > 1 ? parts[1].trim() : '';
    }
    
    // If no splitting was possible, use the whole description
    if (!frameContent && frameTitle) {
      frameContent = frameTitle;
      frameTitle = `Frame ${selectedFrame.frame_on_page || ''}`;
    }
    
    return (
      <Modal 
        show={showFeedbackModal} 
        onHide={() => setShowFeedbackModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Provide Feedback - Frame {selectedFrame.frame_on_page}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Display frame */}
          <div className="mb-4">
            <Card>
              {selectedFrame.image_url && (
                <Card.Img 
                  variant="top" 
                  src={formatImageUrl(selectedFrame.image_url)} 
                  alt={`Frame ${selectedFrame.frame_on_page || ''}`}
                />
              )}
              <Card.Body>
                {frameTitle && (
                  <div style={styles.frameTitle}>{frameTitle}</div>
                )}
                <div style={styles.cardText}>
                  <div style={styles.frameContent}>{frameContent}</div>
                </div>
              </Card.Body>
            </Card>
          </div>
          {/* Feedback form */}
          <Form onSubmit={handleFeedbackSubmit}>
            <Form.Group controlId="feedbackText">
              <Form.Label>Feedback</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
              />
            </Form.Group>
            <Form.Group controlId="selectedActors" className="mt-3">
              <Form.Label>Select Actors</Form.Label>
              {actors.map((actor) => (
                <Form.Check 
                  key={actor.id} 
                  type="checkbox" 
                  label={actor.name}
                  checked={selectedActors.includes(actor.name)}
                  onChange={() => handleActorSelection(actor.name)}
                />
              ))}
            </Form.Group>
            <Button 
              variant="primary" 
              type="submit"
              className="mt-3"
              disabled={submittingFeedback}
            >
              {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    );
  };

  return (
    <Container className="mt-4">
      <h1>Storyboard View</h1>
      {error && <Alert variant="danger">{error}</Alert>}
      {loading ? (
        <Spinner animation="border" />
      ) : (
        <>
          <Row xs={1} md={2} lg={3} className="g-4">
            {frames.map((frame) => (
              <Col key={frame.frame_id}>
                {renderFrameCard(frame)}
              </Col>
            ))}
          </Row>
          <Pagination className="mt-4">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Pagination.Item 
                key={page} 
                active={page === currentPage}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </Pagination.Item>
            ))}
          </Pagination>
          {renderFeedbackModal()}
        </>
      )}
    </Container>
  );
};

export default StoryboardView;
