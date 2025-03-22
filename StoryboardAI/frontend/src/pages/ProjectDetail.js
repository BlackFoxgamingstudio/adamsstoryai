import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Row, Col, Card, Button, Spinner, Alert, Tabs, Tab, 
  Form, Modal, Badge, Container, Pagination
} from 'react-bootstrap';
import { projectsAPI, scriptAPI, utils } from '../services/api';

// Use the shared utility function
const { formatImageUrl } = utils;

const ProjectDetail = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  
  // Edit project state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    script: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);
  
  // Generate frames state
  const [generatingFrames, setGeneratingFrames] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [framesPerPage] = useState(6);
  
  // Calculate pagination values
  const currentFrames = frames.filter(frame => frame.page === currentPage || !frame.page);

  useEffect(() => {
    // Skip fetching data if we're on the create route
    if (projectId === 'create') {
      setLoading(false);
      return;
    }
    fetchProjectData();
  }, [projectId]);

  useEffect(() => {
    // Filter frames for the current page when page changes
    const filteredFrames = frames.filter(frame => (frame.page || 1) === currentPage);
    
    // If the current page is empty but we have frames, reset to page 1
    if (filteredFrames.length === 0 && frames.length > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, frames]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      
      // Fetch project details
      const projectResponse = await projectsAPI.getProject(projectId);
      setProject(projectResponse.data);
      
      // Fetch frames
      const framesResponse = await projectsAPI.getProjectFrames(projectId);
      setFrames(framesResponse.data);
      
      // Get pagination info
      if (framesResponse.data.length > 0) {
        const pageSet = new Set(framesResponse.data.map(frame => frame.page || 1));
        setTotalPages(Math.max(...pageSet) || 1);
      }
      
      // Initialize edit form with project data
      setEditFormData({
        title: projectResponse.data.title,
        description: projectResponse.data.description || '',
        script: projectResponse.data.script || ''
      });
      
    } catch (err) {
      console.error('Error fetching project data:', err);
      setError('Failed to load project data');
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

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError(null);
    
    try {
      const response = await projectsAPI.updateProject(projectId, editFormData);
      setProject(response.data);
      setShowEditModal(false);
      
      // If script was updated, we should refresh frames
      if (editFormData.script !== project.script) {
        fetchProjectData();
      }
    } catch (err) {
      console.error('Error updating project:', err);
      setEditError(err.response?.data?.detail || 'Failed to update project');
    } finally {
      setEditLoading(false);
    }
  };

  const handleGenerateAllFrames = async () => {
    try {
      setGeneratingFrames(true);
      setGenerationError(null);
      
      const response = await projectsAPI.generateAllFrames(projectId);
      setFrames(response.data);
      
    } catch (err) {
      console.error('Error generating frames:', err);
      setGenerationError(err.response?.data?.detail || 'Failed to generate frames');
    } finally {
      setGeneratingFrames(false);
    }
  };

  const handleGenerateFrame = async (frameId) => {
    try {
      // Find the frame
      const frameIndex = frames.findIndex(f => f.frame_id === frameId);
      if (frameIndex === -1) return;
      
      // Create a copy of frames array to update
      const updatedFrames = [...frames];
      updatedFrames[frameIndex] = {
        ...updatedFrames[frameIndex],
        generating: true
      };
      setFrames(updatedFrames);
      
      setGenerationError(null); // Clear any previous errors
      
      // Generate the frame
      const response = await projectsAPI.generateFrameImage(projectId, frameId, {
        // Include selected actors if any
        actors: updatedFrames[frameIndex].selected_actors || []
      });
      
      // Update the frames array with the new frame data
      const newUpdatedFrames = [...frames];
      newUpdatedFrames[frameIndex] = {
        ...newUpdatedFrames[frameIndex],
        ...response.data,
        generating: false
      };
      setFrames(newUpdatedFrames);
      
    } catch (err) {
      console.error('Error generating frame:', err);
      
      // Reset generating flag on the frame
      const frameIndex = frames.findIndex(f => f.frame_id === frameId);
      if (frameIndex !== -1) {
        const updatedFrames = [...frames];
        updatedFrames[frameIndex] = {
          ...updatedFrames[frameIndex],
          generating: false
        };
        setFrames(updatedFrames);
      }
      
      // Set error message
      const errorDetail = err.response?.data?.detail || err.message || 'Failed to generate frame';
      setGenerationError(errorDetail);
      
      // Auto-dismiss error after 10 seconds
      setTimeout(() => {
        setGenerationError(null);
      }, 10000);
    }
  };

  const handleExportStoryboard = async () => {
    try {
      const response = await projectsAPI.exportStoryboard(projectId);
      // In a real app, you might download the exported files or redirect to view them
      alert(`Storyboard exported successfully to: ${response.data.export_path}`);
    } catch (err) {
      console.error('Error exporting storyboard:', err);
      alert('Failed to export storyboard');
    }
  };

  // Add this function to handle page changes
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Add styles for frame title and content
  const styles = {
    frameTitle: {
      fontWeight: 'bold',
      fontSize: '1rem',
      marginBottom: '0.5rem'
    },
    frameContent: {
      whiteSpace: 'pre-line',
      textAlign: 'left'
    },
    cardText: {
      maxHeight: '250px',
      overflowY: 'auto'
    }
  };

  const renderFrame = (frame) => {
    // Parse the frame description to separate title from content if possible
    let frameTitle = '';
    let frameContent = frame.description || 'No description available';
    
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
      frameTitle = `Frame ${frame.frame_number || ''}`;
    }
    
    return (
      <Card key={frame.frame_id} className="mb-3">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <span>Frame {frame.frame_number || (frames.indexOf(frame) + 1)}</span>
          {frame.generating ? <Spinner animation="border" size="sm" /> : null}
        </Card.Header>
        <div className="position-relative">
          {frame.image_url ? (
            <Card.Img 
              variant="top" 
              src={formatImageUrl(frame.image_url)} 
              alt={`Frame ${frame.frame_number || (frames.indexOf(frame) + 1)}`}
            />
          ) : (
            <div className="bg-light text-center p-5">
              <p>No image generated</p>
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => handleGenerateFrame(frame.frame_id)}
                disabled={frame.generating}
              >
                {frame.generating ? 'Generating...' : 'Generate Image'}
              </Button>
            </div>
          )}
        </div>
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
        <p>If this error persists, please contact the system administrator. There may be an issue with the API configuration.</p>
        <Button variant="outline-primary" onClick={() => navigate('/projects')}>
          Back to Projects
        </Button>
      </Alert>
    );
  }

  if (!project) {
    return (
      <Alert variant="warning">
        <Alert.Heading>Project Not Found</Alert.Heading>
        <p>The requested project could not be found.</p>
        <Button variant="outline-primary" onClick={() => navigate('/')}>
          Back to Projects
        </Button>
      </Alert>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>{project.title}</h1>
        <div>
          <Button 
            variant="outline-primary" 
            className="me-2"
            onClick={() => setShowEditModal(true)}
          >
            Edit Project
          </Button>
          <Button 
            variant="primary"
            onClick={() => navigate(`/projects/${projectId}/storyboard`)}
          >
            View Storyboard
          </Button>
        </div>
      </div>

      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-4"
      >
        <Tab eventKey="details" title="Project Details">
          <Card>
            <Card.Body>
              <Row>
                <Col md={8}>
                  <h5>Description</h5>
                  <p>{project.description || 'No description available.'}</p>
                  
                  {project.script && (
                    <>
                      <h5 className="mt-4">Script</h5>
                      <pre className="p-3 bg-light rounded" style={{ maxHeight: '300px', overflow: 'auto' }}>
                        {project.script}
                      </pre>
                    </>
                  )}
                </Col>
                <Col md={4}>
                  <Card className="mb-3">
                    <Card.Body>
                      <h5>Project Info</h5>
                      <p><strong>Created:</strong> {new Date(project.created_at).toLocaleString()}</p>
                      {project.updated_at && (
                        <p><strong>Last Updated:</strong> {new Date(project.updated_at).toLocaleString()}</p>
                      )}
                      <p><strong>Frame Count:</strong> {frames.length}</p>
                    </Card.Body>
                  </Card>
                  
                  <Card>
                    <Card.Body>
                      <h5>Actions</h5>
                      <div className="d-grid gap-2">
                        <Button 
                          variant="outline-primary" 
                          onClick={() => navigate(`/projects/${projectId}/consultation`)}
                        >
                          Film School Consultation
                        </Button>
                        <Button 
                          variant="outline-success"
                          onClick={handleExportStoryboard}
                        >
                          Export Storyboard
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="frames" title="Storyboard Frames">
          {generationError && (
            <Alert variant="danger" dismissible onClose={() => setGenerationError(null)}>
              {generationError}
            </Alert>
          )}
          
          {frames.length === 0 ? (
            <Alert variant="info">
              No frames available. If you provided a script, frames will be generated automatically.
              Otherwise, you can edit the project to add a script.
            </Alert>
          ) : (
            <>
              {currentPage > totalPages && totalPages > 0 && (
                <Alert variant="info">
                  This page is empty. <Button variant="link" className="p-0" onClick={() => setCurrentPage(1)}>Go to page 1</Button>
                </Alert>
              )}
              
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center">
                  <h4 className="mb-0 me-3">Frames</h4>
                  {totalPages > 1 && (
                    <div className="page-indicator">
                      Page {currentPage} of {totalPages}
                    </div>
                  )}
                </div>
                <Button 
                  variant="primary" 
                  onClick={handleGenerateAllFrames}
                  disabled={generatingFrames || frames.length === 0}
                >
                  {generatingFrames ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Generating...
                    </>
                  ) : (
                    'Generate All Frames'
                  )}
                </Button>
              </div>
              
              <Row xs={1} md={2} lg={3} className="g-4">
                {currentFrames.map((frame, index) => (
                  <Col key={frame.frame_id}>
                    {renderFrame(frame)}
                  </Col>
                ))}
              </Row>
              
              {totalPages > 1 && (
                <div className="storyboard-pagination">
                  <Pagination>
                    <Pagination.First 
                      onClick={() => handlePageChange(1)} 
                      disabled={currentPage === 1}
                    />
                    <Pagination.Prev 
                      onClick={() => handlePageChange(currentPage - 1)} 
                      disabled={currentPage === 1}
                    />
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        // Show pages: first, last, current, and pages within 1 of current
                        return page === 1 || 
                              page === totalPages || 
                              page === currentPage || 
                              Math.abs(page - currentPage) <= 1;
                      })
                      .map((page, index, array) => {
                        // Add ellipsis if pages are skipped
                        const items = [];
                        if (index > 0 && array[index - 1] !== page - 1) {
                          items.push(<Pagination.Ellipsis key={`ellipsis-${page}`} disabled />);
                        }
                        
                        items.push(
                          <Pagination.Item
                            key={page}
                            active={page === currentPage}
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </Pagination.Item>
                        );
                        
                        return items;
                      })
                      .flat()}
                    
                    <Pagination.Next 
                      onClick={() => handlePageChange(currentPage + 1)} 
                      disabled={currentPage === totalPages}
                    />
                    <Pagination.Last 
                      onClick={() => handlePageChange(totalPages)} 
                      disabled={currentPage === totalPages}
                    />
                  </Pagination>
                </div>
              )}
            </>
          )}
        </Tab>
      </Tabs>

      {/* Edit Project Modal */}
      <Modal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit Project</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editError && <Alert variant="danger">{editError}</Alert>}
          
          <Form onSubmit={handleEditSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Project Title*</Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={editFormData.title}
                onChange={handleEditChange}
                placeholder="Enter project title"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                name="description"
                value={editFormData.description}
                onChange={handleEditChange}
                placeholder="Enter project description"
                rows={3}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Script</Form.Label>
              <Form.Text className="text-muted d-block mb-2">
                {frames.length > 0 ? (
                  <span className="text-warning">
                    Warning: Changing the script will regenerate all frames.
                  </span>
                ) : (
                  "Enter your script or scene description. We'll analyze it to generate storyboard frames."
                )}
              </Form.Text>
              <Form.Control
                as="textarea"
                name="script"
                value={editFormData.script}
                onChange={handleEditChange}
                placeholder="Enter your script or scene description"
                rows={10}
              />
            </Form.Group>
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
    </div>
  );
};

export default ProjectDetail; 