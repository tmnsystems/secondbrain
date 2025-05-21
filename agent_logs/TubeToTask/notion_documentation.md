# TubeToTask Project Documentation

## Project Overview

TubeToTask is a web application that helps users extract actionable insights from YouTube videos and aligns them with their business goals. The application analyzes video transcripts using AI, compares them against the user's master plan, and provides actionable tasks and insights.

### Key Features

- YouTube video transcript extraction and analysis
- AI-powered content summarization and insight generation
- Comparison of video content against user's master plan
- Daily reports and actionable task extraction
- Dashboard for tracking analyzed videos

### Target Users

- Business owners and entrepreneurs
- Content creators and marketers
- Anyone following educational YouTube content with specific goals

## System Architecture

### Technology Stack

- **Backend**: Flask (Python)
- **Database**: SQLAlchemy with PostgreSQL/SQLite
- **Frontend**: HTML, CSS, JavaScript, Bootstrap
- **AI Integration**: OpenAI GPT-4o
- **External APIs**: YouTube Data API

### Data Models

1. **User**
   - Stores user session information
   - Manages user-specific settings

2. **MasterPlan**
   - Stores the user's master plan or goals
   - Used for comparing video content

3. **Channel**
   - Stores YouTube channel information
   - Links to videos from the channel

4. **Video**
   - Stores metadata about YouTube videos
   - Links to analysis results

5. **VideoAnalysis**
   - Stores AI-generated analysis of videos
   - Contains summary, insights, and relevance scores

6. **DailyReport**
   - Aggregates video analyses for a specific day
   - Provides overview of content consumption

### Application Flow

1. User configures their OpenAI API key, YouTube channels, and master plan
2. Application fetches recent videos from configured channels
3. User selects videos to analyze
4. Application extracts transcript and sends to OpenAI for analysis
5. AI analyzes content against the master plan and generates insights
6. Application stores analysis and presents results to the user
7. Daily reports are generated to summarize insights

## Setup and Installation

### Prerequisites

- Python 3.11 or higher
- PostgreSQL (optional, SQLite for development)
- OpenAI API key with GPT-4o access
- YouTube Data API key

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/tubetotask.git
   cd tubetotask
   ```

2. **Create and activate virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\\Scripts\\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Create .env file**
   ```
   FLASK_APP=main.py
   FLASK_ENV=development
   OPENAI_API_KEY=your_openai_key
   YOUTUBE_API_KEY=your_youtube_key
   DATABASE_URL=sqlite:///tubeToTask.db
   SESSION_SECRET=random_secret_key
   ```

5. **Initialize database**
   ```bash
   flask db upgrade
   ```

6. **Run the application**
   ```bash
   flask run
   ```

### Docker Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/tubetotask.git
   cd tubetotask
   ```

2. **Create .env file**
   ```
   OPENAI_API_KEY=your_openai_key
   YOUTUBE_API_KEY=your_youtube_key
   SESSION_SECRET=random_secret_key
   ```

3. **Build and run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

## User Guide

### Initial Configuration

1. **API Key Setup**
   - Obtain an OpenAI API key from [OpenAI Platform](https://platform.openai.com/)
   - Enter the API key in the settings page

2. **YouTube Channel Configuration**
   - Add YouTube channels you want to follow
   - Enter channel URLs one per line
   - Alternatively, import channels from a playlist

3. **Master Plan Setup**
   - Enter your business goals or learning objectives
   - Be specific about priorities and focus areas
   - This plan will be used to evaluate video content

### Using the Application

1. **Dashboard**
   - View recent videos from your followed channels
   - See which videos have been analyzed
   - Access daily reports

2. **Video Analysis**
   - Select a video to analyze
   - View the video summary and key insights
   - See relevance score to your master plan
   - View extracted actionable tasks

3. **Reports**
   - Access daily summaries of analyzed content
   - View aggregated insights across videos
   - See trend analysis over time

## Administration

### Database Management

- Database migrations are handled via Flask-Migrate
- Run `flask db upgrade` after schema changes
- Backup database regularly in production

### API Usage Monitoring

- Monitor OpenAI API usage to control costs
- YouTube API has daily quota limits
- Implement caching to reduce API calls

### Error Handling

- Check application logs for errors
- Most common issues relate to API keys or rate limits
- Ensure proper error messages are displayed to users

## Deployment

### Production Considerations

1. **Environment**
   - Use production-grade web server (Gunicorn, uWSGI)
   - Set up reverse proxy (Nginx, Apache)
   - Configure HTTPS with valid SSL certificate

2. **Security**
   - Set secure SESSION_SECRET
   - Store API keys securely
   - Configure proper CORS settings
   - Remove debug mode in production

3. **Performance**
   - Use PostgreSQL for production database
   - Implement proper caching
   - Configure appropriate timeouts

### Deployment Options

1. **Traditional Server**
   - Deploy on VPS or dedicated server
   - Set up with Nginx and Gunicorn
   - Configure proper service management

2. **Docker Deployment**
   - Use provided Docker and docker-compose files
   - Configure volume persistence
   - Set up reverse proxy and SSL

3. **PaaS Deployment**
   - Deploy to Heroku, Render, or similar services
   - Configure add-ons for database
   - Set environment variables

## Development Guide

### Project Structure

```
tubetotask/
├── main.py              # Application entry point
├── models.py            # Database models
├── static/              # Static assets
│   ├── css/             # CSS files
│   └── js/              # JavaScript files
├── templates/           # HTML templates
│   ├── base.html        # Base template
│   ├── index.html       # Settings page
│   ├── dashboard.html   # Main dashboard
│   └── ...              # Other templates
├── requirements.txt     # Python dependencies
└── pyproject.toml       # Python project metadata
```

### Key Components

1. **Flask Application (`main.py`)**
   - Core application logic
   - Route definitions
   - API integrations

2. **Database Models (`models.py`)**
   - SQLAlchemy ORM models
   - Table relationships
   - Data validation

3. **Templates**
   - Jinja2 templates for HTML rendering
   - Bootstrap-based responsive design
   - Form definitions

### Development Workflow

1. **Feature Implementation**
   - Define requirements
   - Implement database models if needed
   - Create/update routes and views
   - Design and implement templates
   - Test functionality

2. **Testing**
   - Test with various YouTube channels
   - Verify analysis with different content types
   - Check mobile responsiveness
   - Validate error handling

3. **Code Quality**
   - Follow PEP 8 guidelines for Python code
   - Use consistent HTML/CSS structure
   - Document code with appropriate comments
   - Keep dependencies updated

## Maintenance and Support

### Regular Maintenance Tasks

1. **Dependency Updates**
   - Regularly check for security updates
   - Update Python packages
   - Update JavaScript libraries

2. **Database Maintenance**
   - Implement regular backups
   - Monitor database size and performance
   - Clean up old data when appropriate

3. **API Maintenance**
   - Monitor API usage and costs
   - Stay updated on API changes from OpenAI and YouTube
   - Adjust prompts for optimal results

### Common Issues and Solutions

1. **YouTube API Issues**
   - Problem: Rate limiting or quota exceeded
   - Solution: Implement proper caching and rate limiting

2. **OpenAI API Issues**
   - Problem: Token limit exceeded for large transcripts
   - Solution: Implement chunking for large transcripts

3. **Database Issues**
   - Problem: Database connection errors
   - Solution: Check database configuration and credentials

## Future Development

### Planned Features

1. **Enhanced Analysis**
   - Deeper content analysis with custom metrics
   - Topic clustering across videos
   - Sentiment analysis of content

2. **User Experience**
   - Improved dashboard with better visualizations
   - Customizable report formats
   - Email notifications for new content

3. **Integration**
   - Integration with other content platforms
   - Export to task management systems
   - Calendar integration for scheduling content consumption

### Technical Roadmap

1. **Short-term**
   - Improve error handling
   - Enhance mobile responsiveness
   - Optimize database queries

2. **Medium-term**
   - Implement user authentication
   - Add multi-user support
   - Create API for external integrations

3. **Long-term**
   - Develop machine learning models for content classification
   - Implement recommendation system
   - Create subscription-based service model

## Conclusion

TubeToTask is designed to help users extract value from YouTube content by aligning it with their business goals. By following this documentation, users can set up, use, and maintain the application effectively. The project is actively developed, with ongoing improvements and new features planned for future releases.