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
  getProjects: () => {
    return api.get('/projects');
  },
  
  // Get a single project by ID
  getProject: (projectId) => {
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
  
  // Export storyboard
  exportStoryboard: (projectId) => {
    return api.post(`/projects/${projectId}/export`);
  }
};

// Actor-related API calls
export const actorsAPI = {
  // Get all actors
  getActors: () => {
    return api.get('/actors');
  },
  
  // Get a single actor by name
  getActor: (actorName) => {
    return api.get(`/actors/${actorName}`);
  },
  
  // Create a new actor
  createActor: (actorData) => {
    // Use FormData for file uploads
    const formData = new FormData();
    formData.append('name', actorData.name);
    
    if (actorData.description) {
      formData.append('description', actorData.description);
    }
    
    // Handle auto-generate image flag
    if (actorData.auto_generate_image) {
      formData.append('auto_generate_image', 'true');
    }
    // Append images if available
    else if (actorData.images && actorData.images.length > 0) {
      actorData.images.forEach((image, index) => {
        formData.append('images', image);
      });
    }
    
    return api.post('/actors', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  
  // Update an actor
  updateActor: (actorName, actorData) => {
    // If there's a new image, use FormData
    if (actorData.new_image) {
      const formData = new FormData();
      
      if (actorData.description) {
        formData.append('description', actorData.description);
      }
      
      if (actorData.prompt_hint) {
        formData.append('prompt_hint', actorData.prompt_hint);
      }
      
      if (actorData.feedback_notes) {
        formData.append('feedback_notes', actorData.feedback_notes);
      }
      
      formData.append('new_image', actorData.new_image);
      
      return api.put(`/actors/${actorName}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    }
    
    // If no new image, send as JSON
    const updateData = {
      description: actorData.description,
      prompt_hint: actorData.prompt_hint,
      feedback_notes: actorData.feedback_notes
    };
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    return api.put(`/actors/${actorName}`, updateData);
  },
  
  // Delete an actor
  deleteActor: (actorName) => {
    return api.delete(`/actors/${actorName}`);
  },
  
  // Generate character variants
  generateCharacterVariants: (variantData) => {
    return api.post('/images/generate-character-variants', variantData);
  }
};

// Script analysis API calls
export const scriptAPI = {
  // Analyze script
  analyzeScript: (scriptData) => {
    return api.post('/script/analyze', scriptData);
  }
};

// Feedback API calls
export const feedbackAPI = {
  // Submit feedback for a frame
  submitFrameFeedback: (frameId, feedbackData) => {
    return api.post(`/feedback/frames/${frameId}`, feedbackData);
  }
};

// Film school consultation API calls
export const filmSchoolAPI = {
  // Create a new film school project
  createProject: (initialConcept, projectId = null) => {
    const data = { 
      initial_concept: initialConcept
    };
    
    // Only include project_id if it's not null or undefined
    if (projectId) {
      data.project_id = projectId;
    }
    
    return api.post('/film-school/projects', data);
  },
  
  // Get questions for a project
  getProjectQuestions: (projectId) => {
    return api.get(`/film-school/projects/${projectId}/questions`);
  },
  
  // Submit answers to questions
  submitAnswers: (projectId, answers) => {
    return api.post(`/film-school/projects/${projectId}/answers`, answers);
  },
  
  // Get characters extracted from a project
  getProjectCharacters: (projectId) => {
    return api.get(`/film-school/projects/${projectId}/characters`);
  },
  
  // Get scenes extracted from a project
  getProjectScenes: (projectId) => {
    return api.get(`/film-school/projects/${projectId}/scenes`);
  },
  
  // Generate answer suggestion using AI
  generateAnswerSuggestion: (question, explanation, context) => {
    return api.post('/film-school/generate-suggestion', {
      question,
      explanation,
      context
    });
  }
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