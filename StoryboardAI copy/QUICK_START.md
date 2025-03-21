# StoryboardAI Quick Start Guide

This guide will help you get started with StoryboardAI quickly, walking you through the most essential features of the application.

## Setup

### Option 1: Docker (Recommended)

1. Make sure you have Docker and Docker Compose installed
2. Clone the repository: `git clone https://github.com/yourusername/storyboardai.git`
3. Navigate to the project directory: `cd storyboardai`
4. Create a `.env` file in the root directory with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```
5. Run: `docker-compose up -d`

   To redeploy the application after making changes, simply run the above command again. This will restart the Docker containers with the updated configurations or code.
6. Open your browser and go to: `http://localhost:8000`

 // Start Generation Here
### Verify the Backend is Running

After running `docker-compose up -d`, you can verify that the backend is running by executing the following `curl` command:

```bash
curl http://localhost:8000
```

You should receive a response from the server indicating it is operational, such as:

```json
{
  "message": "StoryboardAI backend is running."
}
```

If you see this response, your backend is up and running. You can now open your browser and navigate to [http://localhost:8000](http://localhost:8000).

### Option 2: Local Development

1. Make sure you have Python 3.9+ and Node.js 14+ installed
2. Clone the repository: `git clone https://github.com/yourusername/storyboardai.git`
3. Navigate to the project directory: `cd storyboardai`
4. Set up the backend:
   ```
   cd backend
   pip install -r requirements.txt
   cp config/.env.example config/.env
   # Edit .env file to add your OpenAI API key and MongoDB URI
   ```
5. Set up the frontend:
   ```
   cd ../frontend
   npm install
   cp .env.example .env
   ```
6. Run the application: `./run_app.sh`
7. Open your browser and go to: `http://localhost:3000`

## Basic Workflow

### 1. Create a Project

1. From the home page, click "Create New Project"
2. Fill in the project details:
   - **Title:** Give your project a name
   - **Description:** (Optional) Add a description of your project
   - **Script:** Add your script or scene description
3. Click "Create Project"

### 2. Generate Storyboard Frames

1. From the project detail page, go to the "Frames" tab
2. Click "Generate All Frames" to create images for all frames extracted from your script
3. Alternatively, you can generate individual frames by clicking "Generate Image" under each frame

### 3. Create Actor Profiles

1. Go to the "Actors" section from the main navigation
2. Click "Create Actor"
3. Fill in the actor details:
   - **Name:** The actor's name
   - **Description:** Physical traits, mannerisms, or other characteristics
   - **Reference Images:** Upload images that represent this actor
4. Click "Create Actor"

### 4. Provide Feedback to Refine Images

1. From the project detail page, click "View Storyboard"
2. For any frame, click "Provide Feedback"
3. Enter your specific feedback about the image
4. If your feedback mentions specific actors, check the boxes for those actors
5. Click "Submit Feedback"
6. The image will be regenerated based on your feedback

### 5. Use Film School Consultation

1. From the project detail page, click "Film School Consultation"
2. Answer the questions provided by the film school agent
3. Click "Submit Answers" to get professional feedback
4. Continue through the stages to improve your project's storytelling

### 6. Export Your Storyboard

1. From the project detail page, click "Export Storyboard"
2. The system will generate a complete storyboard with frame images and descriptions
3. You'll receive a path to the exported storyboard files

## Tips & Tricks

- **Better Prompts:** Be specific in your script descriptions for better frame generation
- **Actor References:** Use multiple reference images for each actor to improve consistency
- **Feedback Cycles:** Use the feedback system iteratively to refine images
- **Character Variants:** Generate variants of actors in different scenes to find the best representation
- **Film School Guidance:** Use the film school consultation to improve the storytelling aspects of your project

## Troubleshooting

- **Image Generation Fails:** Try simplifying your description or breaking it into simpler components
- **MongoDB Connection Issues:** Make sure your MongoDB instance is running and accessible
- **API Rate Limits:** If you encounter OpenAI API rate limits, wait a few minutes and try again
- **UI Issues:** Try clearing your browser cache or using a different browser

## Next Steps

After getting familiar with the basic workflow, explore:

- Generate character variants in different scenes and poses
- Use the feedback system to fine-tune actor appearances
- Complete all stages of the film school consultation
- Export and review your storyboard with others

For more detailed information, refer to the full documentation in the README.md file. 