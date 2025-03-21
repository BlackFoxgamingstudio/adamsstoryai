FROM node:18 AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements and install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Create necessary directories
RUN mkdir -p generated_images actor_images exports
RUN touch ./backend/__init__.py
RUN touch ./backend/api/__init__.py
RUN touch ./backend/database/__init__.py

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Set environment variables
ENV PYTHONPATH=/app/backend
ENV FRONTEND_BUILD_DIR=/app/frontend/build

# Expose port for the application
EXPOSE 8000

# Working directory for execution
WORKDIR /app/backend

# Start command
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 