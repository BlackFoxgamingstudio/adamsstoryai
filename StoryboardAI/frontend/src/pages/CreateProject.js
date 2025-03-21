import React, { useState } from 'react';
import { Container, Form, Button, Alert, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../services/api';

const CreateProject = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    script: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      const response = await projectsAPI.createProject(formData);
      navigate(`/projects/${response.data.project_id}`);
    } catch (err) {
      console.error('Error creating project:', err);
      setError(err.response?.data?.detail || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const scriptFormatExample = `Part 1 of 5: The Awakening

Frame 1: Establishing Shot
Wide shot of the secluded grove in WonderLand. The sun filters through ancient trees, casting shifting patterns on the ground. A breeze moves through the leaves.

Frame 2: Elara's Introduction
Mid-shot of Elara sitting cross-legged in meditation. Her eyes are closed, absorbing the tranquility of the grove. Her martial attire is a fusion of traditional and modern styles.

Frame 3: Inspiration & Training Begins
Close-up of Elara's determined expression as she rises. She assumes a Wing Chun stance, focusing her energy.

Frame 4: Experimenting with Movement
Sequence of Elara striking, blocking, and shifting, mimicking the fluidity of nature. Leaves swirl around her, caught in her movements.`;

  return (
    <Container className="py-4">
      <h1 className="mb-4">Create New Storyboard Project</h1>
      
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}
      
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Project Title</Form.Label>
          <Form.Control
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter project title"
            required
          />
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Label>Project Description</Form.Label>
          <Form.Control
            as="textarea"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Enter a brief description of your storyboard project"
            rows={3}
          />
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Label>Storyboard Script</Form.Label>
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>Script Format Instructions</Card.Title>
              <Card.Text>
                Use the following format for your script to create structured frames:
                <ul>
                  <li>Use <code>Part X of Y: Title</code> to indicate sections/pages</li>
                  <li>Use <code>Frame X: Title</code> to mark each frame</li>
                  <li>Follow the frame title with the detailed description</li>
                  <li>Leave a blank line between frames</li>
                </ul>
              </Card.Text>
              <Card.Subtitle className="mb-2 text-muted">Example Format:</Card.Subtitle>
              <pre style={{ whiteSpace: 'pre-wrap', background: '#f8f9fa', padding: '1rem', borderRadius: '.25rem' }}>
                {scriptFormatExample}
              </pre>
            </Card.Body>
          </Card>
          <Form.Control
            as="textarea"
            name="script"
            value={formData.script}
            onChange={handleChange}
            placeholder="Enter your storyboard script"
            rows={15}
          />
        </Form.Group>
        
        <Button variant="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Project'}
        </Button>
      </Form>
    </Container>
  );
};

export default CreateProject; 