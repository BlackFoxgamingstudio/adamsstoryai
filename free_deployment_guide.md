# StoryboardAI Free Deployment Guide

This guide explains how to deploy the StoryboardAI application for free so you can have users test it without incurring costs.

## Application Overview

StoryboardAI is a full-stack application with:
- **Backend**: Python FastAPI application with MongoDB database
- **Frontend**: React-based web application
- **Docker**: Container-based deployment option
- **Dependencies**: OpenAI API (for AI-powered features)

## Free Deployment Options

### Option 1: Render.com (Recommended)

Render offers a generous free tier that works well for demo purposes.

#### Step 1: Set Up MongoDB Atlas (Free Tier)

1. Sign up for [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a free shared cluster
3. Configure database access:
   - Create a database user with password
   - Add your IP to the access list (or allow access from anywhere for testing)
4. Get your connection string from the Connect dialog

#### Step 2: Deploy Backend on Render

1. Fork the StoryboardAI repository to your GitHub account
2. Sign up for [Render](https://render.com/)
3. Create a new Web Service:
   - Connect your GitHub repo
   - Select the branch to deploy
   - Set build command: `pip install -r backend/requirements.txt`
   - Set start command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Choose the free plan
4. Add these environment variables:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `DOCKER_ENV`: `true`
   - `PORT`: `8000`

#### Step 3: Deploy Frontend on Render

1. Create another Web Service on Render:
   - Connect to the same GitHub repo
   - Set build command: `cd frontend && npm install && npm run build`
   - Set start command: `cd frontend && npm start`
   - Choose the free plan
2. Add these environment variables:
   - `REACT_APP_API_URL`: URL of your backend service + `/api` (e.g., `https://your-backend.onrender.com/api`)

#### Step 4: Configure CORS on Backend

Modify `backend/main.py` to allow requests from your frontend domain:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Option 2: Railway.app

Railway offers a free tier with $5 credit each month that resets.

#### Step 1: Set Up MongoDB Atlas (Same as Option 1)

#### Step 2: Deploy on Railway

1. Sign up for [Railway](https://railway.app/)
2. Create a new project and connect your GitHub repo
3. Add a MongoDB service or use your existing MongoDB Atlas instance
4. Deploy backend:
   - Set up a new service in your project
   - Use Dockerfile deployment method
   - Set environment variables same as Render deployment
5. Deploy frontend:
   - Add another service
   - Set up build command: `cd frontend && npm install && npm run build`
   - Set start command: `cd frontend && npm start`
   - Set environment variables same as Render deployment

### Option 3: Fly.io

Fly.io offers a free tier that includes small virtual machines.

#### Step 1: Set Up MongoDB Atlas (Same as Option 1)

#### Step 2: Deploy with Fly.io

1. Install the [Fly CLI](https://fly.io/docs/getting-started/installing-flyctl/)
2. Sign up and authenticate: `fly auth signup` or `fly auth login`
3. Create a `fly.toml` file in your project root:

```toml
app = "storyboardai"

[build]
  dockerfile = "Dockerfile"

[[services]]
  internal_port = 8000
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

[env]
  DOCKER_ENV = "true"
```

4. Deploy the app: `fly launch`
5. Set environment variables:
   ```
   fly secrets set MONGODB_URI="your-mongodb-connection-string" OPENAI_API_KEY="your-openai-api-key"
   ```

### Option 4: Deploying via Docker Hub

You can use Docker Hub to store your Docker images and then deploy them on various platforms.

#### Step 1: Push StoryboardAI to Docker Hub

1. Login to Docker Hub:
   ```bash
   docker login
   ```

2. Build the Docker image:
   ```bash
   cd StoryboardAI
   docker build -t yourusername/storyboardai:latest .
   ```

3. Push the image to Docker Hub:
   ```bash
   docker push yourusername/storyboardai:latest
   ```

#### Step 2: Deploy Using the Docker Hub Image

From any machine with Docker installed:

1. Pull the image:
   ```bash
   docker pull yourusername/storyboardai:latest
   ```

2. Run the container:
   ```bash
   docker run -d -p 8000:8000 -e MONGODB_URI="your-mongodb-connection-string" -e OPENAI_API_KEY="your-openai-api-key" yourusername/storyboardai:latest
   ```

3. For a complete setup with the frontend, use this docker-compose.yml:
   ```yaml
   version: '3'
   
   services:
     storyboardai:
       image: yourusername/storyboardai:latest
       ports:
         - "8000:8000"
       environment:
         - MONGODB_URI=your-mongodb-connection-string
         - OPENAI_API_KEY=your-openai-api-key
         - DOCKER_ENV=true
       volumes:
         - ./generated_images:/app/generated_images
         - ./actor_images:/app/actor_images
         - ./exports:/app/exports
       restart: unless-stopped
   ```

4. Run with:
   ```bash
   docker-compose up -d
   ```

#### Using with Free Cloud Providers

Many free cloud providers support deploying Docker containers directly from Docker Hub:

- **Render.com**: Connect your Docker Hub registry and deploy the image
- **Railway.app**: Deploy directly from the Docker image on Docker Hub
- **Oracle Cloud Free Tier**: Supports running Docker containers with 4 ARM-based Ampere A1 cores and 24GB memory always free

This method gives you more flexibility when deploying to different environments and makes it easier to share your application with testers.

## Managing Costs: OpenAI API

The most significant cost driver will be the OpenAI API usage. To minimize costs:

1. Apply for OpenAI API academic credits if eligible
2. Set up a spending cap in your OpenAI dashboard
3. Consider these modifications for the testing phase:
   - Reduce image generation quality/resolution
   - Limit the number of feedback iterations
   - Implement a queue system for processing requests during peak testing

## Testing Workflow

1. Share the deployed frontend URL with your users
2. Consider creating test accounts with limited API usage
3. Create a feedback form using Google Forms to collect user feedback
4. Monitor your API usage in the OpenAI dashboard

## Limitations of Free Deployments

- **Performance**: Free tiers generally have limited resources and may be slower
- **Sleep/Idle**: Free services often sleep after periods of inactivity
- **Storage**: Limited storage space for generated images
- **Bandwidth**: Limited data transfer allowances
- **API Costs**: OpenAI API usage will still incur costs based on usage

## Next Steps After Testing

When ready to move beyond testing:
1. Upgrade to paid tiers on your chosen platform
2. Consider setting up a proper CI/CD pipeline
3. Implement user authentication and access controls
4. Set up monitoring and alerts

## Troubleshooting

- If the app doesn't start, check the logs in your deployment platform
- Verify MongoDB connection by running a test connection script
- Check that environment variables are correctly set
- Ensure your OpenAI API key is valid and has sufficient credits 