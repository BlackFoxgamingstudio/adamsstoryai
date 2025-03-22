import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Row, Col, Card, Button, Spinner, Alert, Tab, Tabs,
  Form, Modal
} from 'react-bootstrap';
import { actorsAPI, utils } from '../services/api';

// Use the shared utility function
const { formatImageUrl, getFallbackImage } = utils;

const ActorDetail = () => {
  const { actorName } = useParams();
  const navigate = useNavigate();
  
  const [actor, setActor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  
  // Edit actor state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    description: '',
    prompt_hint: '',
    new_image: null
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);
  
  // Generate variants state
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [variantFormData, setVariantFormData] = useState({
    scene_description: '',
    num_variants: 3
  });
  const [variants, setVariants] = useState([]);
  const [generatingVariants, setGeneratingVariants] = useState(false);
  const [variantError, setVariantError] = useState(null);

  useEffect(() => {
    fetchActorData();
  }, [actorName]);

  const fetchActorData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await actorsAPI.getActor(actorName);
      
      // Ensure images are properly formatted
      const actorData = response.data;
      console.log('Actor data received:', actorData);
      
      // Make sure images field exists with the correct format
      if (!actorData.images) {
        actorData.images = actorData.image_paths || [];
        console.log('Using image_paths instead of images:', actorData.images);
      }
      
      // Debug log the image URLs
      if (actorData.images && actorData.images.length > 0) {
        console.log('First image URL:', actorData.images[0]);
        console.log('Formatted image URL:', formatImageUrl(actorData.images[0]));
      }
      
      setActor(actorData);
      
      // Initialize edit form with actor data
      setEditFormData({
        description: actorData.description || '',
        prompt_hint: actorData.prompt_hint || '',
        new_image: null
      });
      
    } catch (err) {
      console.error('Error fetching actor data:', err);
      setError('Failed to load actor data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditFormData(prev => ({
        ...prev,
        new_image: file
      }));
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setEditLoading(true);
      setEditError(null);
      
      // Prepare update data
      const updateData = { ...editFormData };
      
      // Send update request
      const response = await actorsAPI.updateActor(actorName, updateData);
      
      // Update actor state with the response
      setActor(response.data);
      
      // Close modal
      setShowEditModal(false);
      
    } catch (err) {
      console.error('Error updating actor:', err);
      // Format error message properly
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to update actor';
      setEditError(errorMessage);
    } finally {
      setEditLoading(false);
    }
  };

  const handleVariantChange = (e) => {
    const { name, value } = e.target;
    setVariantFormData(prev => ({
      ...prev,
      [name]: name === 'num_variants' ? parseInt(value, 10) : value
    }));
  };

  const handleGenerateVariants = async (e) => {
    e.preventDefault();
    
    if (!variantFormData.scene_description.trim()) {
      setVariantError('Scene description is required');
      return;
    }
    
    try {
      setGeneratingVariants(true);
      setVariantError(null);
      
      const response = await actorsAPI.generateCharacterVariants({
        actor_name: actorName,
        scene_description: variantFormData.scene_description,
        num_variants: variantFormData.num_variants
      });
      
      console.log('Variant response:', response.data);
      
      // Process variant images to ensure URLs are valid
      const processedVariants = response.data.variants.map(variant => {
        if (variant.image_url) {
          console.log('Original variant image URL:', variant.image_url);
          variant.image_url = formatImageUrl(variant.image_url);
          console.log('Formatted variant image URL:', variant.image_url);
        }
        return variant;
      });
      
      setVariants(processedVariants);
      
    } catch (err) {
      console.error('Error generating variants:', err);
      setVariantError(err.response?.data?.detail || 'Failed to generate variants');
    } finally {
      setGeneratingVariants(false);
    }
  };

  const handleFeedback = async (feedback) => {
    try {
      await actorsAPI.updateActor(actorName, {
        feedback_notes: feedback
      });
      
      // Refresh actor data
      fetchActorData();
      
    } catch (err) {
      console.error('Error submitting feedback:', err);
      alert('Failed to submit feedback');
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

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error</Alert.Heading>
        <p>{error}</p>
        <Button variant="outline-primary" onClick={() => navigate('/actors')}>
          Back to Actors
        </Button>
      </Alert>
    );
  }

  if (!actor) {
    return (
      <Alert variant="warning">
        <Alert.Heading>Actor Not Found</Alert.Heading>
        <p>The requested actor could not be found.</p>
        <Button variant="outline-primary" onClick={() => navigate('/actors')}>
          Back to Actors
        </Button>
      </Alert>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>{actor.name}</h1>
        <div>
          <Button 
            variant="outline-primary" 
            className="me-2"
            onClick={() => setShowEditModal(true)}
          >
            Edit Actor
          </Button>
          <Button 
            variant="primary"
            onClick={() => setShowVariantModal(true)}
          >
            Generate Variants
          </Button>
        </div>
      </div>

      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-4"
      >
        <Tab eventKey="details" title="Actor Details">
          <Row>
            <Col md={4}>
              <Card className="mb-4">
                <div style={{ height: '300px', overflow: 'hidden' }}>
                  {actor.images && actor.images.length > 0 ? (
                    <Card.Img
                      variant="top"
                      src={formatImageUrl(actor.images[0])}
                      alt={actor.name}
                      style={{ height: '300px', objectFit: 'cover' }}
                      onError={(e) => {
                        console.error('Error loading image:', actor.images[0]);
                        e.target.onerror = null;
                        e.target.src = getFallbackImage(300, 'Image Not Found');
                      }}
                    />
                  ) : (
                    <div className="bg-light d-flex align-items-center justify-content-center" style={{ height: '100%' }}>
                      <span className="text-muted">No image available</span>
                    </div>
                  )}
                </div>
              </Card>

              {actor.images && actor.images.length > 1 && (
                <Card className="mb-4">
                  <Card.Header>Additional Reference Images</Card.Header>
                  <Card.Body>
                    <Row xs={3} className="g-2">
                      {actor.images.slice(1).map((image, index) => (
                        <Col key={index}>
                          <img
                            src={formatImageUrl(image)}
                            alt={`${actor.name} reference ${index + 1}`}
                            className="img-fluid rounded"
                            onError={(e) => {
                              console.error('Error loading reference image:', image);
                              e.target.onerror = null;
                              e.target.src = getFallbackImage(100, 'Error');
                            }}
                          />
                        </Col>
                      ))}
                    </Row>
                  </Card.Body>
                </Card>
              )}
            </Col>
            
            <Col md={8}>
              <Card className="mb-4">
                <Card.Body>
                  <h5>Description</h5>
                  <p>{actor.description || 'No description available.'}</p>
                  
                  {actor.prompt_hint && (
                    <>
                      <h5 className="mt-4">Prompt Guidance</h5>
                      <p>{actor.prompt_hint}</p>
                    </>
                  )}
                </Card.Body>
              </Card>

              <Card>
                <Card.Header>Quick Feedback</Card.Header>
                <Card.Body>
                  <p className="text-muted">
                    Select quick feedback options to improve this actor's depiction
                  </p>
                  <div className="d-flex flex-wrap gap-2">
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={() => handleFeedback("Make the character look more serious")}
                    >
                      More Serious
                    </Button>
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={() => handleFeedback("Make the character look more friendly")}
                    >
                      More Friendly
                    </Button>
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={() => handleFeedback("Make the character look older")}
                    >
                      Older
                    </Button>
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={() => handleFeedback("Make the character look younger")}
                    >
                      Younger
                    </Button>
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={() => handleFeedback("Make the character look more professional")}
                    >
                      More Professional
                    </Button>
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={() => handleFeedback("Make the character look more casual")}
                    >
                      More Casual
                    </Button>
                  </div>
                  
                  <Form className="mt-3">
                    <Form.Group>
                      <Form.Label>Custom Feedback</Form.Label>
                      <div className="d-flex">
                        <Form.Control
                          type="text"
                          placeholder="Enter custom feedback..."
                          id="customFeedback"
                        />
                        <Button 
                          variant="primary"
                          className="ms-2"
                          onClick={() => {
                            const feedback = document.getElementById('customFeedback').value;
                            if (feedback.trim()) {
                              handleFeedback(feedback);
                              document.getElementById('customFeedback').value = '';
                            }
                          }}
                        >
                          Submit
                        </Button>
                      </div>
                    </Form.Group>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
        
        <Tab eventKey="variants" title="Character Variants">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4>Generated Variants</h4>
            <Button 
              variant="primary"
              onClick={() => setShowVariantModal(true)}
            >
              Generate New Variants
            </Button>
          </div>

          {variants.length === 0 ? (
            <Alert variant="info">
              No variants have been generated yet. Click the "Generate New Variants" button to create some.
            </Alert>
          ) : (
            <Row xs={1} md={2} lg={3} className="g-4">
              {variants.map((variant, index) => (
                <Col key={index}>
                  <Card>
                    <Card.Img 
                      variant="top" 
                      src={formatImageUrl(variant.image_url)} 
                      alt={`Variant ${index + 1}`}
                      style={{ height: '250px', objectFit: 'cover' }}
                      onError={(e) => {
                        console.error('Error loading variant image:', variant.image_url);
                        e.target.onerror = null;
                        e.target.src = getFallbackImage(250, 'Variant Not Found');
                      }}
                    />
                    <Card.Body>
                      <Card.Title>Variant {index + 1}</Card.Title>
                      <Card.Text className="small text-muted">{variant.prompt}</Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Tab>
      </Tabs>

      {/* Edit Actor Modal */}
      <Modal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit {actor.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editError && (
            <Alert variant="danger">
              {typeof editError === 'string' ? editError : 'An error occurred while updating the actor'}
            </Alert>
          )}
          
          <Form onSubmit={handleEditSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                name="description"
                value={editFormData.description}
                onChange={handleEditChange}
                placeholder="Enter actor description"
                rows={3}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Prompt Hint</Form.Label>
              <Form.Control
                as="textarea"
                name="prompt_hint"
                value={editFormData.prompt_hint}
                onChange={handleEditChange}
                placeholder="Enter specific hints for generating this actor"
                rows={3}
              />
              <Form.Text className="text-muted">
                These hints will guide the AI in generating images of this actor
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Add New Reference Image</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
            </Form.Group>

            {editFormData.new_image && (
              <div className="mb-3">
                <p>New image preview:</p>
                <img
                  src={URL.createObjectURL(editFormData.new_image)}
                  alt="New reference"
                  style={{ width: '200px', height: '200px', objectFit: 'cover' }}
                  className="border rounded"
                />
              </div>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleEditSubmit}
            disabled={editLoading}
          >
            {editLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Generate Variants Modal */}
      <Modal
        show={showVariantModal}
        onHide={() => setShowVariantModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Generate Variants for {actor.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {variantError && <Alert variant="danger">{variantError}</Alert>}
          
          <Form onSubmit={handleGenerateVariants}>
            <Form.Group className="mb-3">
              <Form.Label>Scene Description*</Form.Label>
              <Form.Control
                as="textarea"
                name="scene_description"
                value={variantFormData.scene_description}
                onChange={handleVariantChange}
                placeholder="Describe the scene where the actor appears..."
                rows={4}
                required
              />
              <Form.Text className="text-muted">
                Describe the scene, setting, or context in which the actor should be depicted
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Number of Variants</Form.Label>
              <Form.Select
                name="num_variants"
                value={variantFormData.num_variants}
                onChange={handleVariantChange}
              >
                <option value="1">1 Variant</option>
                <option value="2">2 Variants</option>
                <option value="3">3 Variants</option>
                <option value="4">4 Variants</option>
                <option value="5">5 Variants</option>
              </Form.Select>
            </Form.Group>
          </Form>
          
          {variants.length > 0 && (
            <div className="mt-4">
              <h5>Generated Variants</h5>
              <Row xs={2} md={3} className="g-2">
                {variants.map((variant, index) => (
                  <Col key={index}>
                    <Card>
                      <Card.Img 
                        src={formatImageUrl(variant.image_url)} 
                        alt={`Variant ${index + 1}`}
                        onError={(e) => {
                          console.error('Error loading variant image in modal:', variant.image_url);
                          e.target.onerror = null;
                          e.target.src = getFallbackImage(200, 'Image Error');
                        }}
                      />
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowVariantModal(false)}>
            Close
          </Button>
          <Button 
            variant="primary" 
            onClick={handleGenerateVariants}
            disabled={generatingVariants || !variantFormData.scene_description.trim()}
          >
            {generatingVariants ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Generating...
              </>
            ) : (
              'Generate Variants'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ActorDetail; 