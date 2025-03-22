import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import axios from 'axios';

// Import api service
import api from './services/api';

// Components
import NavBar from './components/common/NavBar';
import Footer from './components/common/Footer';

// Pages
import Home from './pages/Home';
import ProjectList from './pages/ProjectList';
import ProjectDetail from './pages/ProjectDetail';
import StoryboardView from './pages/StoryboardView';
import ActorList from './pages/ActorList';
import ActorDetail from './pages/ActorDetail';
import FilmSchoolConsultation from './pages/FilmSchoolConsultation';
import NotFound from './pages/NotFound';
import CreateProject from './pages/CreateProject';

function App() {
  
  useEffect(() => {
    // Create necessary directories on app startup
    async function ensureDirectories() {
      try {
        // Set up direct axios calls to avoid the /api prefix that's in our API service
        const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
        
        // Ping the API to check if it's up
        await axios.get(`${baseUrl}/api/health`);
        
        // Call an initialization endpoint to create necessary directories
        await axios.post(`${baseUrl}/api/initialize`, {
          ensure_directories: true
        });
        
        console.log('Backend directories initialized successfully');
      } catch (error) {
        console.error('Error initializing backend directories:', error);
      }
    }
    
    ensureDirectories();
  }, []);
  
  return (
    <Router>
      <div className="app">
        <NavBar />
        <div className="content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/projects" element={<ProjectList />} />
            <Route path="/projects/create" element={<CreateProject />} />
            <Route path="/projects/:projectId" element={<ProjectDetail />} />
            <Route path="/projects/:projectId/storyboard" element={<StoryboardView />} />
            <Route path="/actors" element={<ActorList />} />
            <Route path="/actors/:actorName" element={<ActorDetail />} />
            <Route path="/projects/:projectId/consultation" element={<FilmSchoolConsultation />} />
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
