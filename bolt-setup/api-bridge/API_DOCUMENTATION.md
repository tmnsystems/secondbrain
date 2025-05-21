# API Bridge Documentation

This document describes the available endpoints for the API Bridge connecting Bolt.diy with the SecondBrain ecosystem. The API Bridge serves as a central integration layer that connects:

1. **Bolt DIY Frontend**: The modern UI layer for building applications
2. **CoachTinaMarieAI**: The coaching application with content generation
3. **Agent System**: The specialized agents for various tasks
4. **Content Generation**: Style-based content creation
5. **Notion Integration**: Document and database management
6. **LangGraph**: Workflow management for AI agents

## Base URL

By default, the API runs at:
```
http://localhost:3030
```

## Authentication

Most endpoints require authentication using Supabase. Authentication is provided via a Bearer token in the Authorization header:

```
Authorization: Bearer YOUR_TOKEN_HERE
```

### Authentication Endpoints

#### Login
- **URL**: `/api/auth/login`
- **Method**: `POST`
- **Auth Required**: No
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "yourpassword"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      ...
    },
    "session": {
      "access_token": "your-access-token",
      ...
    }
  }
  ```

#### Register
- **URL**: `/api/auth/register`
- **Method**: `POST`
- **Auth Required**: No
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "yourpassword",
    "name": "User Name"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      ...
    },
    "session": {
      "access_token": "your-access-token",
      ...
    }
  }
  ```

#### Logout
- **URL**: `/api/auth/logout`
- **Method**: `POST`
- **Auth Required**: Yes
- **Response**:
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

#### Get Current User
- **URL**: `/api/auth/user`
- **Method**: `GET`
- **Auth Required**: Yes
- **Response**:
  ```json
  {
    "success": true,
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      ...
    }
  }
  ```

## Style Profiles

### Get All Style Profiles
- **URL**: `/api/style-profiles`
- **Method**: `GET`
- **Auth Required**: Yes
- **Response**:
  ```json
  {
    "success": true,
    "profiles": [
      {
        "id": "tina_style",
        "name": "tina style",
        "path": "/path/to/profile",
        "sample": "Sample content from the profile..."
      },
      ...
    ]
  }
  ```

### Get Specific Style Profile
- **URL**: `/api/style-profiles/:id`
- **Method**: `GET`
- **Auth Required**: Yes
- **Response**:
  ```json
  {
    "success": true,
    "profile": {
      // Full profile data
    }
  }
  ```

## Content Generation

### Generate Content
- **URL**: `/api/generate`
- **Method**: `POST`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "styleProfileId": "tina_style",
    "prompt": "Generate content about business systems",
    "contentType": "article",
    "options": {
      "style_emphasis": 0.7,
      "formality": 0.4,
      "detail_level": 0.6
    }
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "content": {
      "id": "content_1234567890",
      "content": "Generated content text...",
      "metadata": {
        "styleProfileId": "tina_style",
        "contentType": "article",
        "generatedAt": "2023..",
        "options": {
          // Options passed in request
        }
      }
    }
  }
  ```

## LangGraph Agent Integration

### Run Agent
- **URL**: `/api/agent`
- **Method**: `POST`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "agentId": "content_generator",
    "input": "Create a coaching guide for business systems",
    "context": {
      "styleProfile": "tina_style",
      "targetAudience": "service businesses"
    }
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "response": {
      "id": "run_1234567890",
      "agentId": "content_generator",
      "input": "Create a coaching guide for business systems",
      "output": "Generated response from agent...",
      "steps": [
        "Received input",
        "Processed through LangGraph workflow",
        "Generated response"
      ],
      "metadata": {
        "executionTime": 345.6,
        "completedAt": "2023...",
        "context": {
          // Context passed in request
        }
      }
    }
  }
  ```

## Feedback System

### Submit Feedback
- **URL**: `/api/feedback`
- **Method**: `POST`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "contentId": "content_1234567890",
    "contentType": "article",
    "feedbackType": "style",
    "rating": 4,
    "comments": "The style sounds close to my own, but could use more analogies",
    "suggestions": "Add more business metaphors in the introduction"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "feedback": {
      "id": "fb_1234567890",
      "contentId": "content_1234567890",
      "contentType": "article",
      "feedbackType": "style",
      "rating": 4,
      "comments": "The style sounds close to my own, but could use more analogies",
      "suggestions": "Add more business metaphors in the introduction",
      "createdAt": "2023..."
    }
  }
  ```

## Notion Integration

### Get Notion Pages
- **URL**: `/api/notion/pages`
- **Method**: `GET`
- **Auth Required**: Yes
- **Response**:
  ```json
  {
    "success": true,
    "pages": [
      {
        "id": "page_1",
        "title": "Business Systems Documentation",
        "icon": "📝",
        "created_time": "2023-07-15T10:30:00.000Z",
        "last_edited_time": "2023-07-15T10:30:00.000Z"
      },
      ...
    ]
  }
  ```

### Get Notion Page Content
- **URL**: `/api/notion/pages/:pageId`
- **Method**: `GET`
- **Auth Required**: Yes
- **Response**:
  ```json
  {
    "success": true,
    "page": {
      "id": "page_1",
      "title": "Business Systems Documentation",
      "icon": "📝",
      "blocks": [
        { "type": "heading_1", "content": "Business Systems Documentation" },
        { "type": "paragraph", "content": "Effective business systems are the backbone of scalable service businesses." },
        ...
      ]
    }
  }
  ```

### Create Notion Page
- **URL**: `/api/notion/pages`
- **Method**: `POST`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "title": "New Page Title",
    "content": "Page content in markdown format",
    "icon": "📊"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "page": {
      "id": "page_1234567890",
      "title": "New Page Title",
      "icon": "📊",
      "created_time": "2023-07-15T10:30:00.000Z",
      "last_edited_time": "2023-07-15T10:30:00.000Z",
      "url": "https://notion.so/1234567890"
    }
  }
  ```

### Update Notion Page
- **URL**: `/api/notion/pages/:pageId`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "title": "Updated Page Title",
    "content": "Updated page content in markdown format",
    "icon": "🚀"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "page": {
      "id": "page_1",
      "title": "Updated Page Title",
      "icon": "🚀",
      "last_edited_time": "2023-07-15T11:30:00.000Z",
      "url": "https://notion.so/page_1"
    }
  }
  ```

### Generate Content and Save to Notion
- **URL**: `/api/notion/generate`
- **Method**: `POST`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "prompt": "Create a business systems guide for coaching businesses",
    "styleProfileId": "tina_style",
    "contentType": "documentation"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "page": {
      "id": "page_1234567890",
      "title": "Generated: Create a business systems guide for coaching businesses",
      "icon": "✨",
      "created_time": "2023-07-15T10:30:00.000Z",
      "last_edited_time": "2023-07-15T10:30:00.000Z",
      "url": "https://notion.so/1234567890",
      "content": "# Generated from prompt: \"Create a business systems guide...\"\n\nThis is the generated content..."
    },
    "content": "# Generated from prompt: \"Create a business systems guide...\"\n\nThis is the generated content..."
  }
  ```

## Error Responses

When an error occurs, the response will follow this format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `400`: Bad request (missing or invalid parameters)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not found
- `500`: Server error
- `503`: Service unavailable (e.g., Supabase not configured)

## Health Check

### Get API Status
- **URL**: `/api/health`
- **Method**: `GET`
- **Auth Required**: No
- **Response**:
  ```json
  {
    "status": "ok",
    "message": "API Bridge is running",
    "version": "1.0.0",
    "config": {
      "hasSupabase": true,
      "environment": "development"
    }
  }
  ```

## Agent System

The SecondBrain system includes a set of specialized agents for various tasks, including planning, code execution, Notion integration, refactoring, building, reviewing, and orchestration.

### Get All Agents
- **URL**: `/api/agents`
- **Method**: `GET`
- **Auth Required**: Yes
- **Response**:
  ```json
  {
    "success": true,
    "agents": [
      {
        "type": "planner",
        "status": "available",
        "capabilities": ["project_planning", "task_breakdown", "timeline_generation"],
        "lastSeen": "2023-05-15T10:30:00.000Z"
      },
      {
        "type": "executor",
        "status": "available",
        "capabilities": ["code_generation", "task_execution", "implementation"],
        "lastSeen": "2023-05-15T10:30:00.000Z"
      },
      // ... other agents
    ]
  }
  ```

### Get Agent Information
- **URL**: `/api/agents/:agentType`
- **Method**: `GET`
- **Auth Required**: Yes
- **Response**:
  ```json
  {
    "success": true,
    "agent": {
      "type": "planner",
      "status": "available",
      "capabilities": ["project_planning", "task_breakdown", "timeline_generation"],
      "lastSeen": "2023-05-15T10:30:00.000Z",
      "metrics": {
        "taskCount": 10,
        "successCount": 9,
        "failureCount": 1,
        "averageDuration": 2.5
      }
    }
  }
  ```

### Execute Agent Task
- **URL**: `/api/agents/:agentType/execute`
- **Method**: `POST`
- **Auth Required**: Yes
- **Request Body**: Depends on the agent type, but generally:
  ```json
  {
    "type": "createPlan",
    "projectName": "My Project",
    "description": "A project to build..."
  }
  ```
- **Response**: Depends on the agent type, but generally:
  ```json
  {
    "success": true,
    "result": {
      "taskId": "task_1234567890",
      "plan": {
        "name": "Plan for My Project",
        "description": "Project plan generated based on: A project to build...",
        "tasks": [
          {
            "id": "task-1",
            "name": "Research and Design",
            "description": "Initial research and design phase",
            "priority": "high",
            "dependencies": []
          },
          // ... more tasks
        ],
        "timeline": {
          "estimatedDuration": "2 weeks",
          "milestones": [
            // ... milestones
          ]
        }
      }
    }
  }
  ```

### Generic Agent Execution
- **URL**: `/api/agent`
- **Method**: `POST`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "agentId": "planner_agent",
    "input": "Create a plan for building a modern web application with authentication",
    "context": {
      "projectName": "Web App",
      "teamSize": 3
    }
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "response": {
      "id": "run_1234567890",
      "agentId": "planner_agent",
      "input": "Create a plan for building a modern web application with authentication",
      "output": "...", // Generated output
      "steps": [
        "Received input",
        "Processed through agent workflow",
        "Generated response"
      ],
      "metadata": {
        "executionTime": 345.6,
        "completedAt": "2023-05-15T10:30:00.000Z",
        "context": {
          "projectName": "Web App",
          "teamSize": 3
        }
      }
    }
  }
  ```