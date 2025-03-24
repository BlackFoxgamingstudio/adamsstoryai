import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { feedbackAPI } from '../services/api';
import './FeedbackModal.css';

// Helper function to format image URL
const formatImageUrl = (url) => {
  if (!url) return '/placeholder-image.png';
  if (url.startsWith('http')) return url;
  return `${process.env.REACT_APP_API_URL}${url}`;
};

function FeedbackModal({
  show,
  onHide,
  frame,
  actors,
  feedbackText,
  setFeedbackText,
  selectedActors,
  setSelectedActors,
  submitting,
  setSubmitting,
  projectId,
  onFeedbackSubmitted
}) {
  const [error, setError] = useState(null);
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch feedback history when modal opens
  useEffect(() => {
    if (show && frame) {
      setLoadingHistory(true);
      setError(null);
      
      console.log('Fetching feedback for frame:', frame.frame_id);
      feedbackAPI.getFrameFeedback(projectId, frame.frame_id)
        .then(response => {
          if (!response.data) {
            throw new Error('No data received from server');
          }
          setFeedbackHistory(response.data);
        })
        .catch(err => {
          console.error('Error fetching feedback history:', err);
          const errorMessage = err.response?.data?.message || 
                             err.response?.data?.error ||
                             err.message ||
                             'Failed to load feedback history. Please try refreshing.';
          setError(errorMessage);
        })
        .finally(() => {
          setLoadingHistory(false);
        });
    }
  }, [show, frame, projectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!frame || !feedbackText.trim()) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      const feedbackData = {
        frame_id: frame.frame_id,
        feedback_text: feedbackText,
        actor_names: selectedActors.length > 0 ? selectedActors : undefined,
        project_id: projectId
      };
      
      console.log('Submitting feedback:', feedbackData);
      const response = await feedbackAPI.submitFrameFeedback(frame.frame_id, feedbackData);
      
      if (!response.data) {
        throw new Error('No data received from server');
      }
      
      // Update feedback history
      setFeedbackHistory(prev => [...prev, response.data]);
      
      // Clear form
      setFeedbackText('');
      setSelectedActors([]);
      
      // Notify parent component
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(response.data);
      }
      
      // Close modal
      onHide();
      
    } catch (err) {
      console.error('Error submitting feedback:', err);
      const errorMessage = err.response?.data?.message || 
                         err.response?.data?.error ||
                         err.message ||
                         'Failed to submit feedback. Please try again.';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleActorSelection = (actorName) => {
    setSelectedActors(prev => {
      if (prev.includes(actorName)) {
        return prev.filter(name => name !== actorName);
      }
      return [...prev, actorName];
    });
  };

  if (!frame) return null;

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      className="feedback-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title>
          Frame Feedback
          <div className="frame-subtitle">
            {frame.scene_title || `Scene ${frame.scene_number}`}
          </div>
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <div className="frame-preview mb-4">
          <img
            src={formatImageUrl(frame.image_url || frame.image_path)}
            alt={frame.description}
            className="frame-image"
            onError={(e) => {
              console.log('Image failed to load:', frame.image_url);
              e.target.src = '/placeholder-image.png';
            }}
          />
          <div className="frame-details">
            <h5>Frame Description</h5>
            <p>{frame.description}</p>
          </div>
        </div>

        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}

        {/* Feedback History */}
        <div className="feedback-history mb-4">
          <h5>Previous Feedback</h5>
          {loadingHistory ? (
            <div className="text-center py-3">
              <Spinner animation="border" size="sm" />
            </div>
          ) : feedbackHistory.length > 0 ? (
            <div className="feedback-list">
              {feedbackHistory.map((feedback, index) => (
                <div key={index} className="feedback-item">
                  <div className="feedback-text">{feedback.feedback_text}</div>
                  {feedback.actor_names && feedback.actor_names.length > 0 && (
                    <div className="feedback-actors">
                      Characters: {feedback.actor_names.join(', ')}
                    </div>
                  )}
                  <div className="feedback-timestamp">
                    {new Date(feedback.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted">No previous feedback</p>
          )}
        </div>

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-4">
            <Form.Label>Your Feedback</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Describe what changes you'd like to see in this frame..."
              required
              disabled={submitting}
            />
          </Form.Group>

          <Form.Group>
            <Form.Label>Relevant Characters</Form.Label>
            <div className="actor-selection">
              {actors.map((actor) => (
                <Form.Check
                  key={actor.name}
                  type="checkbox"
                  id={`actor-${actor.name}`}
                  label={actor.name}
                  checked={selectedActors.includes(actor.name)}
                  onChange={() => handleActorSelection(actor.name)}
                  className="actor-checkbox"
                  disabled={submitting}
                />
              ))}
            </div>
          </Form.Group>

          <div className="modal-actions">
            <Button
              variant="secondary"
              onClick={onHide}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={submitting || !feedbackText.trim()}
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
                'Submit Feedback'
              )}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default FeedbackModal; 