# Notion Agent

The Notion Agent is a specialized agent in our MCP architecture that handles all interactions with Notion, providing a unified interface for creating, updating, and retrieving content from Notion workspaces.

## Core Components

- **Page Operations** - Create, retrieve, update, and archive Notion pages
- **Block Operations** - Manage blocks within pages (text, lists, headings, etc.)
- **Database Operations** - Create and query databases, manage records
- **Search Operations** - Search across the workspace for pages and databases
- **Template Operations** - Create and apply templates with variable substitution
- **Content Extraction** - Extract and format page content as markdown, plaintext, or HTML

## Usage

```typescript
import { NotionAgent } from '../libs/agents/notion';

// Initialize the Notion Agent with your API key
const notion = new NotionAgent({
  apiKey: process.env.NOTION_API_KEY,
  logLevel: 'info'
});

// Create a page
const page = await notion.createPage({
  parent: { database_id: DATABASE_ID },
  properties: {
    Name: { title: [{ text: { content: 'Project Documentation' } }] },
    Status: { select: { name: 'Active' } }
  }
});

// Add content to the page
await notion.createBlocks(page.id, [
  {
    type: 'heading_1',
    heading_1: {
      rich_text: [{ type: 'text', text: { content: 'Project Overview' } }]
    }
  },
  {
    type: 'paragraph',
    paragraph: {
      rich_text: [{ type: 'text', text: { content: 'This is a project description...' } }]
    }
  }
]);

// Query a database
const tasks = await notion.queryDatabase(TASKS_DATABASE_ID, {
  filter: {
    property: 'Status',
    select: {
      equals: 'In Progress'
    }
  },
  sorts: [{
    property: 'Priority',
    direction: 'descending'
  }]
});

// Extract page content as markdown
const markdown = await notion.extractContent(page.id, 'markdown');
```

## Integration with Other Agents

The Notion Agent is designed to work with other agents in our MCP architecture:

- **Planner Agent** - Stores project plans, tasks, and dependencies in Notion
- **Executor Agent** - Logs execution results and system operations in Notion
- **Build Agent** - Creates documentation and component libraries in Notion

## Security Considerations

- API keys are stored securely in environment variables
- Rate limiting is handled with exponential backoff
- All inputs are validated before sending to the Notion API

## Error Handling

The Notion Agent implements robust error handling:

- Consistent error formatting for all operations
- Retry mechanisms for transient errors
- Detailed error messages for debugging

## Template System

The template system allows creating reusable content templates with variable substitution:

```typescript
// Create a template
await notion.createTemplate('Project Overview', [
  {
    type: 'heading_1',
    heading_1: {
      rich_text: [{ type: 'text', text: { content: '{{projectName}} Overview' } }]
    }
  },
  {
    type: 'paragraph',
    paragraph: {
      rich_text: [{ type: 'text', text: { content: '{{projectDescription}}' } }]
    }
  }
]);

// Apply the template to a page
await notion.applyTemplate(pageId, 'Project Overview', {
  projectName: 'SecondBrain',
  projectDescription: 'A comprehensive AI agent architecture...'
});
```