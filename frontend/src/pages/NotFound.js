import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <Container className="mt-5">
      <Row className="justify-content-center text-center">
        <Col md={6}>
          <h1 className="display-1">404</h1>
          <h2 className="mb-4">Page Not Found</h2>
          <p className="lead mb-4">
            The page you are looking for might have been removed, had its name changed,
            or is temporarily unavailable.
          </p>
          <Link to="/">
            <Button variant="primary" size="lg">
              Go to Homepage
            </Button>
          </Link>
        </Col>
      </Row>
    </Container>
  );
};

export default NotFound; 