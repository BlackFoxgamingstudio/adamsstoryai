import React from 'react';
import { Container } from 'react-bootstrap';

const Footer = () => {
  return (
    <footer className="footer mt-auto py-3 bg-light">
      <Container className="text-center">
        <span className="text-muted">
          StoryboardAI © {new Date().getFullYear()}
        </span>
      </Container>
    </footer>
  );
};

export default Footer; 