import React from 'react';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';

const NavBar = () => {
  const location = useLocation();
  
  // Function to check if a path is active
  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
      <Container>
        <Navbar.Brand as={Link} to="/">
          <img
            src="/assets/images/logo.svg"
            width="30"
            height="30"
            className="d-inline-block align-top me-2"
            alt="StoryboardAI Logo"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/assets/placeholder-100.svg';
            }}
          />
          StoryboardAI
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-navbar" />
        <Navbar.Collapse id="main-navbar">
          <Nav className="ms-auto">
            <Nav.Link as={Link} to="/" active={isActive('/')}>
              Home
            </Nav.Link>
            <Nav.Link as={Link} to="/projects" active={isActive('/projects')}>
              Projects
            </Nav.Link>
            <Nav.Link as={Link} to="/actors" active={isActive('/actors')}>
              Actors
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default NavBar; 