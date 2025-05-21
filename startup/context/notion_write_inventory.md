# Notion Write Inventory

**Date:** 2025-05-20

This document maps each code file that writes to Notion via the relay helper.

| File Path                                    | Line(s) | DB Identifier Variable             | Context/Function                               |
|----------------------------------------------|---------|------------------------------------|------------------------------------------------|
| libs/agents/notion/pageOperations.ts         | L20     | `dbId = params.parent?.database_id` | `createPage` helper                            |
| libs/agents/notion/agent.ts                  | L67     | `params.parent.database_id`         | `NotionAgent.createPage()`                     |
| libs/agents/notion/index.ts                  | L44     | `notionConfig.projectDatabaseId`   | `createProject()`                              |
| libs/agents/notion/index.ts                  | L80     | `notionConfig.taskDatabaseId`      | `createTasks()`                                |
| libs/agents/notion/index.ts                  | L125    | `notionConfig.dependencyDatabaseId`| `createDependencies()`                         |
| startup/cli_session_logger.js                | L104    | `this.tasksDbId`                   | `CLISessionLogger.initialize()` (session page) |
| startup/initialize-session.js                | L20     | _import only_                      | Import `createPageViaRelay` (unused directly)  |

No direct Notion SDK calls remain. All write operations use `createPageViaRelay(dbId, title, properties)`.