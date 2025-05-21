# Setting Up Notion Integration for TubeToTask

This guide will help you set up the Notion integration for TubeToTask, allowing insights and action items to be automatically added to your Notion workspace.

## Prerequisites

1. A Notion account
2. Admin access to your Notion workspace
3. Notion API key (will create in these steps)

## Step 1: Create a Notion Integration

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Name it "TubeToTask"
4. Select the workspace you want to connect
5. Set appropriate capabilities (Read & Write content, Read & Write comments, No user information)
6. Submit and copy the "Internal Integration Token" (this is your Notion API key)

## Step 2: Create a Task Database in Notion

1. In your Notion workspace, create a new page
2. Add a new database (full page)
3. Name it "TubeToTask Strategic Tasks"
4. Add the following properties:
   - Name (default title property)
   - Tags (Multi-select)
   - Priority (Select: P1, P2, P3)
   - Status (Status: Not Started, In Progress, Completed)
   - Source (URL)
   - Parent Task (Relation)
   - Assigned To (Person)
   - Due Date (Date)

5. Share the database with your integration:
   - Click "Share" on the database page
   - Click "Add people, emails, groups, or integrations"
   - Search for "TubeToTask" and select your integration
   - Click "Invite"

6. Copy the database ID from the URL:
   - The URL will look like: `https://www.notion.so/workspace/a8b9c0deXXXX?v=...`
   - The database ID is the part after the workspace name: `a8b9c0deXXXX`

## Step 3: Configure TubeToTask

1. Add your Notion API key and database ID to your environment file:

```bash
echo "NOTION_API_KEY=your_api_key_here" >> /Volumes/Envoy/SecondBrain/secondbrain_api_keys.env
echo "NOTION_TASK_DATABASE_ID=your_database_id_here" >> /Volumes/Envoy/SecondBrain/secondbrain_api_keys.env
```

2. Test the integration:

```bash
cd /Volumes/Envoy/SecondBrain/apps/TubeToTask
node create-notion-tasks.js 2025-05-14_building_ai_agents_with_langgraph
```

## Step 4: Customize Task Creation (Optional)

You can customize how tasks are created in Notion by editing:
- `/Volumes/Envoy/SecondBrain/apps/TubeToTask/src/integrations/notion.js`

Common customizations:
- Changing the properties mapped to Notion fields
- Adding custom fields
- Modifying the page content format
- Adjusting priority mapping

## Using the Integration

Once set up, you can:

1. Automatically create tasks from insights:
```bash
node create-notion-tasks.js INSIGHT_ID
```

2. View tasks in your Notion workspace

3. Track progress by updating task status in Notion

4. Filter and sort tasks by priority, tags, and other properties

## Troubleshooting

If you encounter issues:

1. **Permission errors**: Make sure your integration has access to the database
2. **API key errors**: Verify your API key is correct in the environment file
3. **Database ID errors**: Double-check the database ID
4. **Property errors**: Ensure the database has all required properties

For more detailed logs, run:
```bash
NOTION_DEBUG=true node create-notion-tasks.js INSIGHT_ID
```

## Next Steps

1. Consider creating a workflow automation to automatically create tasks for new insights
2. Set up regular review sessions for tasks in Notion
3. Customize the database views to organize tasks by priority, tag, or status