# StoryboardAI - AI-Powered Storyboard Generator

StoryboardAI is an advanced AI-driven storyboarding system that enables filmmakers to generate professional storyboards from scripts. It features AI-powered image generation with consistent character depiction, a comprehensive actor profile system, and iterative feedback loops to refine your storyboards.

## Features

- **Script Analysis**: Analyze scripts using Large Language Models to extract key frames
- **AI Image Generation**: Generate storyboard frames with consistent character depiction
- **Actor Profiles**: Create and manage actor profiles with reference images
- **Feedback System**: Provide feedback to refine frames and characters
- **Film School Consultation**: Get professional film school-level guidance for your projects
- **Character Variants**: Generate character variants for different scenes
- **Storyboard Export**: Export complete storyboards with character reports

## Technology Stack

- **Backend**: Python with FastAPI
- **Frontend**: React with Bootstrap
- **Database**: MongoDB
- **AI Models**: OpenAI GPT and DALL-E (configurable to use other models)
- **Image Processing**: Python Image Library (PIL)

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 14+
- MongoDB (or Docker for containerized setup)
- OpenAI API key

### Local Development Setup

1. **Clone the repository**
   ```
   git clone https://github.com/yourusername/storyboardai.git
   cd storyboardai
   ```

2. **Setup the backend**
   ```
   cd backend
   pip install -r requirements.txt
   cp config/.env.example config/.env
   # Edit .env file to add your OpenAI API key and MongoDB URI
   ```

3. **Setup the frontend**
   ```
   cd ../frontend
   npm install
   cp .env.example .env
   ```

4. **Run the application**
   ```
   # In the root directory:
   ./run_app.sh
   ```
   The backend will be available at http://localhost:8000 and the frontend at http://localhost:3000

### Docker Setup

1. **Clone the repository**
   ```
   git clone https://github.com/yourusername/storyboardai.git
   cd storyboardai
   ```

2. **Create environment file**
   ```
   cp backend/config/.env.example .env
   # Edit .env file to add your OpenAI API key
   ```

3. **Build and run with Docker Compose**
   ```
   docker-compose up -d
   ```
   The application will be available at http://localhost:8000

## Usage Guide

### Creating a Project

1. Click on "Create New Project" button on the home page
2. Enter project title, description, and script
3. Submit the form to create your project
4. The script will be analyzed and frames will be extracted

### Managing Actors

1. Go to the "Actors" page
2. Click "Create Actor" to add a new actor
3. Enter the actor's name, description, and upload reference images
4. Use the feedback system to refine the actor's appearance

### Generating Storyboards

1. Open a project and navigate to the "Frames" tab
2. Click "Generate All Frames" to create images for each frame
3. Provide feedback on individual frames to refine them
4. View the complete storyboard in "Storyboard View"

### Film School Consultation

1. Open a project and click "Film School Consultation"
2. Answer the questions provided by the film school agent
3. Receive professional feedback on your answers
4. Continue through the development stages to improve your project

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- OpenAI for GPT and DALL-E models
- React and FastAPI communities for the fantastic frameworks
- All the contributors who have helped shape this project 