# StoryboardAI

An AI-powered storyboard generation tool that helps filmmakers and storytellers visualize their scripts using OpenAI's DALL-E.

## Features

- Script analysis and scene breakdown
- AI-powered image generation for storyboard frames
- Actor visualization and casting suggestions
- Export options for storyboards
- Modern, responsive UI

## Prerequisites

- Python 3.8+
- Node.js 18+
- Docker and Docker Compose
- OpenAI API key

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/StoryboardAI.git
cd StoryboardAI
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your OpenAI API key and other configurations
```

3. Start the application using Docker Compose:
```bash
docker-compose up --build
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

## Development

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 