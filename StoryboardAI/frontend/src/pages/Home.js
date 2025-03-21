import React from 'react';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <Container>
      <Row className="mb-5">
        <Col md={12} className="text-center">
          <h1 className="display-4 mb-4">Welcome to StoryboardAI</h1>
          <p className="lead">
            Create incredible storyboards with the power of AI.
            Turn your scripts into visual narratives with just a few clicks.
          </p>
          <Link to="/projects">
            <Button variant="primary" size="lg" className="mt-3">
              View Projects
            </Button>
          </Link>
        </Col>
      </Row>

      <Row className="mb-5">
        <Col md={4} className="mb-4">
          <Card className="h-100">
            <Card.Body className="d-flex flex-column">
              <Card.Title>Create Storyboards</Card.Title>
              <Card.Text>
                Upload your script and let AI transform it into a complete storyboard with detailed scenes.
              </Card.Text>
              <div className="mt-auto">
                <Link to="/projects">
                  <Button variant="outline-primary">Get Started</Button>
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-4">
          <Card className="h-100">
            <Card.Body className="d-flex flex-column">
              <Card.Title>Manage Characters</Card.Title>
              <Card.Text>
                Create detailed character profiles and generate consistent character images across scenes.
              </Card.Text>
              <div className="mt-auto">
                <Link to="/actors">
                  <Button variant="outline-primary">Manage Actors</Button>
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-4">
          <Card className="h-100">
            <Card.Body className="d-flex flex-column">
              <Card.Title>Refine with Feedback</Card.Title>
              <Card.Text>
                Provide feedback and iterate on scenes until you get exactly what you're looking for.
              </Card.Text>
              <div className="mt-auto">
                <Button variant="outline-primary" as={Link} to="/projects">
                  Try It Out
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Home; 