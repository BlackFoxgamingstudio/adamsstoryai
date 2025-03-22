# StoryboardAI Quick Start Guide

This guide will help you get started with StoryboardAI quickly, walking you through the most essential features of the application.

## Setup

### Prerequisites

Before starting, you'll need:
1. An OpenAI API key (required for image generation)
2. Docker and Docker Compose installed (for Option 1)
   OR
   Python 3.9+ and Node.js 14+ (for Option 2)

### Getting Your OpenAI API Key

1. Go to https://platform.openai.com/
2. Sign up or log in to your OpenAI account
3. Navigate to API keys section: https://platform.openai.com/api-keys
4. Click "Create new secret key"
5. Copy your API key immediately (you won't be able to see it again)

### Option 1: Docker (Recommended)

 // Start of Selection
1. Clone the repository: `git clone https://github.com/BlackFoxgamingstudio/adamsstoryai.git` [GitHub Repository](https://github.com/BlackFoxgamingstudio/adamsstoryai.git)
2. Navigate to the project directory: `cd storyboardai`
3. Create a new `.env` file in the root directory:
   ```bash
   # On macOS/Linux
   touch .env
   
   # On Windows
   type nul > .env
   ```
4. Open the `.env` file in your text editor and add your OpenAI API key:
   ```
   OPENAI_API_KEY=sk-your_api_key_here
   ```
   Replace `sk-your_api_key_here` with your actual OpenAI API key
   
5. Verify your `.env` file:
   ```bash
   # On macOS/Linux
   cat .env
   
   # On Windows
   type .env
   ```
   You should see your API key displayed correctly

6. Run the application:
   ```bash
   docker-compose up -d
   ```

7. Check the logs to verify everything is working:
   ```bash
   docker-compose logs
   ```
   If you see no OpenAI API key errors, the setup was successful

8. Open your browser and go to: `http://localhost:8000`

### Redeploying After Changes

If you make changes to the `.env` file or any other configuration:

1. Stop the current containers:
   ```bash
   docker-compose down
   ```

2. Rebuild and start the containers with the new configuration:
   ```bash
   docker-compose up -d --build
   ```

3. Check the logs to verify everything is working:
   ```bash
   docker-compose logs
   ```

Note: The `--build` flag ensures that Docker rebuilds the containers with your new configuration. This is important when you've made changes to environment variables or other configuration files.

### Troubleshooting API Key Issues

If you see OpenAI API key errors in the logs:
1. Double-check that your `.env` file exists in the root directory
2. Ensure the API key is correctly formatted and not surrounded by quotes
3. Make sure there are no extra spaces or newlines in the `.env` file
4. Verify that the API key is valid by testing it:
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```
5. If issues persist, try stopping and rebuilding the containers:
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

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

1. Clone the repository: `git clone https://github.com/yourusername/storyboardai.git`
2. Navigate to the project directory: `cd storyboardai`
3. Set up the backend:
   ```bash
   cd backend
   pip install -r requirements.txt
   
   # Create environment file
   cp config/.env.example config/.env
   ```
4. Edit the backend's `.env` file:
   ```
   OPENAI_API_KEY=sk-your_api_key_here
   MONGODB_URI=mongodb://localhost:27017/storyboardai
   ```
   Replace `sk-your_api_key_here` with your actual OpenAI API key from the steps above

5. Set up the frontend:
   ```bash
   cd ../frontend
   npm install
   cp .env.example .env
   ```

6. Verify your backend configuration:
   ```bash
   # Check if the .env file is properly set up
   cat config/.env
   
   # Test the OpenAI API key
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```

7. Run the application:
   ```bash
   cd ..
   ./run_app.sh
   ```

8. Open your browser and go to: `http://localhost:3000`

### Troubleshooting Local Development

If you encounter issues:
1. Ensure all environment files are properly set up:
   - Backend: `backend/config/.env`
   - Frontend: `frontend/.env`
2. Check that MongoDB is running locally
3. Verify your Python virtual environment is activated (if using one)
4. Check the application logs for specific error messages
5. For OpenAI API issues, refer to the troubleshooting steps in Option 1

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