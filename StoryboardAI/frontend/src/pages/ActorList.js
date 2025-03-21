import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Row, Col, Card, Button, Spinner, Alert, Modal, Form 
} from 'react-bootstrap';
import { actorsAPI, projectsAPI, utils } from '../services/api';

// Use the shared utility function
const { formatImageUrl, getFallbackImage } = utils;

const ActorList = () => {
  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Create Actor state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    description: '',
    images: [],
    auto_generate_image: false
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Add a new state for script extraction
  const [extracting, setExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState(null);
  const [projectsForExtraction, setProjectsForExtraction] = useState([]);
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  useEffect(() => {
    fetchActors();
  }, []);

  const fetchActors = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await actorsAPI.getActors();
      console.log("Actors response:", response.data);
      
      // Ensure each actor has the images field properly formatted
      const processedActors = response.data.map(actor => {
        if (!actor.images) {
          actor.images = actor.image_paths || [];
          console.log(`Actor ${actor.name} using image_paths:`, actor.images);
        }
        
        // Debug log the first image URL if available
        if (actor.images && actor.images.length > 0) {
          console.log(`Actor ${actor.name} image URL:`, actor.images[0]);
          console.log(`Actor ${actor.name} formatted URL:`, formatImageUrl(actor.images[0]));
        }
        
        return actor;
      });
      
      setActors(processedActors);
      
    } catch (err) {
      console.error('Error fetching actors:', err);
      setError('Failed to load actors. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChange = (e) => {
    const { name, value } = e.target;
    setCreateFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setCreateFormData(prev => ({
      ...prev,
      images: files
    }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    
    if (!createFormData.name.trim()) {
      setCreateError('Actor name is required');
      return;
    }

    // Check if we need either uploaded images or auto-generation
    if (!createFormData.auto_generate_image && (!createFormData.images || createFormData.images.length === 0)) {
      setCreateError('Please either upload images or select auto-generate');
      return;
    }
    
    try {
      setCreateLoading(true);
      setCreateError(null);
      
      await actorsAPI.createActor(createFormData);
      
      // Reset form and close modal
      setCreateFormData({
        name: '',
        description: '',
        images: [],
        auto_generate_image: false
      });
      setShowCreateModal(false);
      
      // Refresh actors list
      fetchActors();
      
    } catch (err) {
      console.error('Error creating actor:', err);
      setCreateError(err.response?.data?.detail || 'Failed to create actor');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteActor = async (actorName) => {
    if (window.confirm(`Are you sure you want to delete actor "${actorName}"?`)) {
      try {
        await actorsAPI.deleteActor(actorName);
        fetchActors();
      } catch (err) {
        console.error('Error deleting actor:', err);
        alert('Failed to delete actor');
      }
    }
  };

  // Add a function to fetch projects for extraction
  const fetchProjectsForExtraction = async () => {
    try {
      const response = await projectsAPI.getProjects();
      setProjectsForExtraction(response.data);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setExtractionError('Failed to load projects for character extraction');
    }
  };

  // Add function to extract characters from script
  const extractCharactersFromScript = async () => {
    if (!selectedProjectId) {
      setExtractionError('Please select a project');
      return;
    }

    try {
      setExtracting(true);
      setExtractionError(null);
      
      // First, get the project to access its script
      const projectResponse = await projectsAPI.getProject(selectedProjectId);
      const script = projectResponse.data.script;
      
      if (!script) {
        setExtractionError('Selected project does not have a script');
        setExtracting(false);
        return;
      }
      
      // Extract character names using a simple regex pattern
      // This looks for character names in ALL CAPS or with character: format
      const characterNameRegex = /\b([A-Z]{2,})\b|\b([A-Z][a-z]+):/g;
      let matches;
      const characterNames = new Set();
      
      while ((matches = characterNameRegex.exec(script)) !== null) {
        const name = matches[1] || matches[2].replace(':', '');
        // Filter out common script elements that might be in caps
        if (!['INT', 'EXT', 'CUT', 'FADE', 'DISSOLVE', 'TO', 'BLACK', 'SCENE', 'ACT'].includes(name)) {
          characterNames.add(name);
        }
      }
      
      // Generate images and create actors for each character
      const characters = Array.from(characterNames);
      for (const characterName of characters) {
        // Create a description based on character name
        const description = `Character named ${characterName} from the project "${projectResponse.data.title}"`;
        
        // Prepare form data for actor creation
        const formData = new FormData();
        formData.append('name', characterName);
        formData.append('description', description);
        
        // Create the actor
        await actorsAPI.createActor({
          name: characterName,
          description: description,
          auto_generate_image: true
        });
      }
      
      // Refresh actors list
      fetchActors();
      
      // Close modal
      setShowExtractModal(false);
      
    } catch (err) {
      console.error('Error extracting characters:', err);
      setExtractionError('Failed to extract and create characters');
    } finally {
      setExtracting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Character Actors</h1>
        <div>
          <Button 
            variant="outline-primary" 
            className="me-2"
            onClick={() => {
              fetchProjectsForExtraction();
              setShowExtractModal(true);
            }}
          >
            Extract Characters
          </Button>
          <Button 
            variant="primary"
            onClick={() => setShowCreateModal(true)}
          >
            Create New Actor
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {actors.length === 0 ? (
        <div className="text-center py-5">
          <p className="lead">You don't have any actors yet.</p>
          <Button 
            variant="primary" 
            size="lg"
            className="mt-3"
            onClick={() => setShowCreateModal(true)}
          >
            Create Your First Actor
          </Button>
        </div>
      ) : (
        <Row xs={1} md={2} lg={3} className="g-4">
          {actors.map((actor) => (
            <Col key={actor.name}>
              <Card className="h-100">
                <div className="actor-image-container" style={{ height: '200px', overflow: 'hidden' }}>
                  {actor.images && actor.images.length > 0 ? (
                    <Card.Img
                      variant="top"
                      src={formatImageUrl(actor.images[0])}
                      alt={actor.name}
                      style={{ height: '200px', objectFit: 'cover' }}
                      onError={(e) => {
                        console.error('Error loading actor thumbnail:', actor.images[0]);
                        e.target.onerror = null;
                        e.target.src = getFallbackImage(200, 'Character');
                      }}
                    />
                  ) : (
                    <div className="bg-light d-flex align-items-center justify-content-center" style={{ height: '100%' }}>
                      <span className="text-muted">No image available</span>
                    </div>
                  )}
                </div>
                <Card.Body>
                  <Card.Title>{actor.name}</Card.Title>
                  <Card.Text>
                    {actor.description || 'No description available.'}
                  </Card.Text>
                </Card.Body>
                <Card.Footer className="bg-white">
                  <div className="d-flex justify-content-between">
                    <Link
                      to={`/actors/${actor.name}`}
                      className="btn btn-outline-primary btn-sm"
                    >
                      View Details
                    </Link>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDeleteActor(actor.name)}
                    >
                      Delete
                    </Button>
                  </div>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Create Actor Modal */}
      <Modal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Create New Actor</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {createError && <Alert variant="danger">{createError}</Alert>}
          
          <Form onSubmit={handleCreateSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Actor Name*</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={createFormData.name}
                onChange={handleCreateChange}
                placeholder="Enter actor name"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                name="description"
                value={createFormData.description}
                onChange={handleCreateChange}
                placeholder="Enter actor description"
                rows={3}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Actor Images</Form.Label>
              <div className="mb-2">
                <Form.Check
                  type="checkbox"
                  id="auto-generate-image"
                  label="Auto-generate character image using AI"
                  checked={createFormData.auto_generate_image}
                  onChange={(e) => setCreateFormData({
                    ...createFormData,
                    auto_generate_image: e.target.checked,
                    images: e.target.checked ? [] : createFormData.images
                  })}
                />
                <small className="text-muted d-block mt-1">
                  The AI will create a portrait based on the character name and description
                </small>
              </div>
              
              {!createFormData.auto_generate_image && (
                <Form.Control
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={createFormData.auto_generate_image}
                />
              )}
            </Form.Group>

            <div className="d-flex justify-content-end">
              <Button 
                variant="secondary" 
                onClick={() => setShowCreateModal(false)}
                className="me-2"
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                type="submit"
                disabled={createLoading}
              >
                {createLoading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Creating...
                  </>
                ) : (
                  'Create Actor'
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Add Extract Characters Modal */}
      <Modal
        show={showExtractModal}
        onHide={() => setShowExtractModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Extract Characters from Script</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {extractionError && <Alert variant="danger">{extractionError}</Alert>}
          
          <p>
            This will analyze the script from a selected project, extract character names, 
            and automatically create actor profiles with AI-generated reference images.
          </p>
          
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Select Project</Form.Label>
              <Form.Select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                <option value="">-- Select a project --</option>
                {projectsForExtraction.map(project => (
                  <option key={project.project_id} value={project.project_id}>
                    {project.title}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowExtractModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={extractCharactersFromScript}
            disabled={extracting || !selectedProjectId}
          >
            {extracting ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Extracting...
              </>
            ) : (
              'Extract Characters'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ActorList; 