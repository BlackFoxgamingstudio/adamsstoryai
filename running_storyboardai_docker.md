# Running StoryboardAI Docker Image on Another Computer

This guide explains how to run the StoryboardAI Docker image that you've published to Docker Hub on any computer with Docker installed.

## Prerequisites

- Docker installed on the target computer
- Internet connection to pull the image
- OpenAI API key for image generation features

## Step 1: Pull the Docker Image

Open a terminal or command prompt and run:

```bash
docker pull blackfox45me/test:tagname
```

This will download the StoryboardAI Docker image from Docker Hub to the local machine.

## Step 2: Set Up MongoDB

The application requires MongoDB to store project data. You have two options:

### Option A: Use Your Existing MongoDB Atlas Account

If you're using the same MongoDB Atlas account, you can use the connection string that's already in the image. The application will connect to:

```
mongodb+srv://blackloin:naruto45@cluster0.fmktl.mongodb.net/storyboardai_db
```

### Option B: Set Up a New MongoDB Instance

1. Create a free MongoDB Atlas account at [https://www.mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register)
2. Create a free shared cluster
3. Set up a database user and password
4. Get your connection string from the Connect dialog

## Step 3: Run the Docker Container

### Basic Run Command

```bash
docker run -d -p 8000:8000 -e OPENAI_API_KEY="your-openai-api-key" blackfox45me/test:tagname
```

Replace `your-openai-api-key` with your actual OpenAI API key.

### Run With Your Own MongoDB Connection

If using a different MongoDB instance:

```bash
docker run -d -p 8000:8000 \
  -e MONGODB_URI="your-mongodb-connection-string" \
  -e OPENAI_API_KEY="your-openai-api-key" \
  blackfox45me/test:tagname
```

### Run With Persistent Storage for Generated Images

To save generated images to your local machine:

```bash
docker run -d -p 8000:8000 \
  -e OPENAI_API_KEY="your-openai-api-key" \
  -v $(pwd)/generated_images:/app/generated_images \
  -v $(pwd)/actor_images:/app/actor_images \
  -v $(pwd)/exports:/app/exports \
  blackfox45me/test:tagname
```

This mounts directories from your current location to store generated content.

## Step 4: Access the Application

1. Open a web browser
2. Navigate to `http://localhost:8000`
3. The StoryboardAI interface should appear

## Common Issues and Troubleshooting

### 404 Errors for Actor Images

If you see 404 errors for image files in the logs (like `GET /actor_images/OUT_generated.png HTTP/1.1 404 Not Found`), this is normal when first setting up. The system will generate these images when you use the application.

### MongoDB Connection Issues

If the application can't connect to MongoDB:
1. Check that your MongoDB Atlas instance is running
2. Verify the connection string is correct
3. Ensure network access is allowed from your IP address in the MongoDB Atlas settings

### Container Crashes on Startup

If the container crashes immediately:
1. Check logs with `docker logs [container_id]`
2. Verify your OpenAI API key is valid
3. Ensure you've set all required environment variables

## Using Docker Compose (Recommended)

For easier management, create a file named `docker-compose.yml` with the following content:

```yaml
version: '3'

services:
  storyboardai:
    image: blackfox45me/test:tagname
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=your-openai-api-key
      # Uncomment and change if using your own MongoDB
      # - MONGODB_URI=your-mongodb-connection-string
    volumes:
      - ./generated_images:/app/generated_images
      - ./actor_images:/app/actor_images
      - ./exports:/app/exports
    restart: unless-stopped
```

Then run:

```bash
docker-compose up -d
```

This will start the container in detached mode with all the proper settings.

## Testing the API

To verify the API is working, run:

```bash
curl http://localhost:8000
```

You should get a response indicating the StoryboardAI backend is running. 