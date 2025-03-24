import axios from 'axios';

// Configure base API URL - in production, use environment variable
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    // Handle CORS errors specifically
    if (error.message === 'Network Error') {
      console.error('CORS or Network Error:', error);
      return Promise.reject({
        ...error,
        message: 'Network Error: This may be due to CORS configuration or server unavailability'
      });
    }
    
    return Promise.reject(error);
  }
);

// Project-related API calls
export const projectsAPI = {
  // Get all projects
  getAllProjects: () => {
    return api.get('/projects');
  },
  
  // Get a single project by ID
  getProjectById: (projectId) => {
    return api.get(`/projects/${projectId}`);
  },
  
  // Create a new project
  createProject: (projectData) => {
    return api.post('/projects', projectData);
  },
  
  // Update a project
  updateProject: (projectId, projectData) => {
    return api.put(`/projects/${projectId}`, projectData);
  },
  
  // Delete a project
  deleteProject: (projectId) => {
    return api.delete(`/projects/${projectId}`);
  },
  
  // Generate storyboard
  generateStoryboard: (projectId) => {
    return api.post(`/projects/${projectId}/generate-storyboard`);
  },
  
  // Get storyboard
  getStoryboard: (projectId) => {
    return api.get(`/projects/${projectId}/storyboard`);
  },
  
  // Export storyboard
  exportStoryboard: (projectId, format = 'pdf') => {
    return api.get(`/projects/${projectId}/export?format=${format}`, { responseType: 'blob' });
  },
  
  // Get project frames
  getProjectFrames: (projectId, page = null) => {
    const params = page ? { page } : {};
    return api.get(`/projects/${projectId}/frames`, { params });
  },
  
  // Get project pagination info
  getProjectPages: (projectId) => {
    return api.get(`/projects/${projectId}/pages`);
  },
  
  // Generate image for a frame
  generateFrameImage: (projectId, frameId, frameData) => {
    return api.post(`/projects/${projectId}/frames/${frameId}/generate`, frameData);
  },
  
  // Generate all frames
  generateAllFrames: (projectId) => {
    return api.post(`/projects/${projectId}/generate-all`);
  },
};

// Actor-related API calls
export const actorsAPI = {
  // Get all actors for a project
  getProjectActors: (projectId) => {
    return api.get(`/projects/${projectId}/actors`);
  },
  
  // Get a single actor by ID
  getActorById: (actorId) => {
    return api.get(`/actors/${actorId}`);
  },
  
  // Create a new actor
  createActor: (projectId, actorData) => {
    return api.post(`/projects/${projectId}/actors`, actorData);
  },
  
  // Update an actor
  updateActor: (actorId, actorData) => {
    return api.put(`/actors/${actorId}`, actorData);
  },
  
  // Delete an actor
  deleteActor: (actorId) => {
    return api.delete(`/actors/${actorId}`);
  },
  
  // Generate actor image
  generateActorImage: (actorId) => {
    return api.post(`/actors/${actorId}/generate-image`);
  },
};

// Script analysis API calls
export const scriptAPI = {
  // Analyze script
  analyzeScript: (projectId, scriptText) => {
    return api.post(`/projects/${projectId}/analyze-script`, { script_text: scriptText });
  },
  
  // Get script analysis
  getScriptAnalysis: (projectId) => {
    return api.get(`/projects/${projectId}/script-analysis`);
  },
};

// Feedback API calls
export const feedbackAPI = {
  // Get frame feedback
  getFrameFeedback: (projectId, frameId) => {
    return api.get(`/projects/${projectId}/frames/${frameId}/feedback`);
  },
  
  // Submit feedback for a frame
  submitFrameFeedback: (frameId, feedbackData) => {
    return api.post(`/frames/${frameId}/feedback`, feedbackData);
  },
  
  // Get project feedback
  getProjectFeedback: (projectId) => {
    return api.get(`/projects/${projectId}/feedback`);
  },
  
  // Apply feedback to a frame
  applyFeedback: (projectId, frameId) => {
    return api.post(`/projects/${projectId}/frames/${frameId}/apply-feedback`);
  },
};

// Film school consultation API calls
export const filmSchoolAPI = {
  // Get consultation
  getConsultation: (projectId, question) => {
    return api.post(`/film-school/consultation`, { project_id: projectId, question });
  },
  
  // Get preset questions
  getPresetQuestions: () => {
    return api.get('/film-school/preset-questions');
  },
};

// Utility functions
export const utils = {
  // Format image URLs consistently across the application
  formatImageUrl: (imageUrl) => {
    if (!imageUrl) return null;
    
    // If it's already a full URL, return it
    if (imageUrl.startsWith('http')) return imageUrl;
    
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    
    // Handle paths with actor_images directory
    if (imageUrl.includes('actor_images/')) {
      return `${baseUrl}/actor-images/${imageUrl.split('actor_images/')[1]}`;
    }
    
    // Handle /actor-images paths
    if (imageUrl.startsWith('/actor-images/') || imageUrl.startsWith('actor-images/')) {
      return `${baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
    }
    
    // Format paths for frame images
    if (imageUrl.includes('frame_images/')) {
      return `${baseUrl}/frame-images/${imageUrl.split('frame_images/')[1]}`;
    }
    
    // Handle paths that already have the correct format
    if (imageUrl.startsWith('/images/') || imageUrl.startsWith('/frame-images/')) {
      return `${baseUrl}${imageUrl}`;
    }
    
    // Default case: just append to baseUrl with proper slash handling
    const normalizedPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    return `${baseUrl}${normalizedPath}`;
  },
  
  // Get a fallback image when an image fails to load
  getFallbackImage: (size = 300, text = 'Image Not Found') => {
    // Return the appropriate SVG placeholder based on size
    const availableSizes = [100, 200, 250, 300];
    
    // Find the closest size
    const closestSize = availableSizes.reduce((prev, curr) => {
      return (Math.abs(curr - size) < Math.abs(prev - size) ? curr : prev);
    });
    
    // Return the path to the SVG
    return `/assets/placeholder-${closestSize}.svg`;
  }
};

// Create API object before exporting
const apiService = {
  projects: projectsAPI,
  actors: actorsAPI,
  script: scriptAPI,
  feedback: feedbackAPI,
  filmSchool: filmSchoolAPI,
  utils
};

export default apiService; 