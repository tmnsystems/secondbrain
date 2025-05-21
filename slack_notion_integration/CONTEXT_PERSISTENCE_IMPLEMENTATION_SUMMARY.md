# Context Persistence Implementation Summary

## Problem Statement

The SecondBrain CLI experiences catastrophic context loss during:
- Automatic compaction events (when context window fills up)
- Session disconnections
- Session timeouts
- CLI restarts

This happens because content is logged after execution (if at all), creating a vulnerability window where important context can be lost forever. The consequence is repeated work, lost information, and system instability.

## Solution Implemented

A comprehensive real-time context persistence system with:

1. **Real-Time Notion Logging**: All interactions logged AS THEY HAPPEN
2. **Session Bridging**: Explicit links between related CLI sessions
3. **Compaction Event Handling**: Preservation of context during truncation
4. **Redundant Storage**: Both Notion and filesystem for backup
5. **Context Restoration**: Loading previous context at session start
6. **CLI Session Logger**: Core class implementing these functions

## Core Architecture

```
┌───────────────┐     ┌────────────────────┐     ┌───────────────┐
│  User Input   │────▶│ CLI Session Logger │────▶│ Notion DB     │
└───────────────┘     └────────────────────┘     └───────────────┘
                               │                         ▲
                               ▼                         │
┌───────────────┐     ┌────────────────────┐     ┌───────────────┐
│  System Logs  │◀───▶│ Session Bridges    │────▶│ File Backup   │
└───────────────┘     └────────────────────┘     └───────────────┘
                               │                         ▲
                               ▼                         │
┌───────────────┐     ┌────────────────────┐     ┌───────────────┐
│  Compaction   │────▶│ Context Restoration│────▶│ Previous      │
│  Handling     │     │                    │     │ Session Data  │
└───────────────┘     └────────────────────┘     └───────────────┘
```

## Implementation Details

### CLI Session Logger (cli_session_logger.js)

The core class handling real-time logging of all interactions:

```javascript
class CLISessionLogger {
  constructor(options = {}) {
    this.sessionId = options.sessionId || `SESSION-${Date.now()}`;
    this.notion = new NotionClient({ auth: process.env.NOTION_API_KEY });
    this.databaseId = process.env.NOTION_CLI_SESSIONS_DB_ID;
    this._initializeSession();
  }

  async _initializeSession() {
    // Create session page in Notion
    this.sessionPage = await this.notion.pages.create({
      parent: { database_id: this.databaseId },
      properties: {
        Name: { title: [{ text: { content: `CLI Session: ${this.sessionId}` } }] },
        Status: { select: { name: "Active" } },
        Started: { date: { start: new Date().toISOString() } }
      }
    });
    this.sessionTaskId = this.sessionPage.id;
    
    // Load previous context if available
    await this.loadMostRecentContext();
  }

  async logUserMessage(message) {
    // Log user message AS IT HAPPENS
    await this.notion.blocks.children.append({
      block_id: this.sessionTaskId,
      children: [{
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ 
            type: "text", 
            text: { content: `👤 USER: ${message}` },
            annotations: { bold: true, color: "blue" }
          }]
        }
      }]
    });
    
    // Backup to filesystem
    fs.appendFileSync(
      `./logs/cli-session-${this.sessionId}.log`,
      `[${new Date().toISOString()}] USER: ${message}\n`
    );
  }

  async logSystemAction(action, details) {
    // Log system action AS IT HAPPENS
    await this.notion.blocks.children.append({
      block_id: this.sessionTaskId,
      children: [{
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ 
            type: "text", 
            text: { content: `⚙️ SYSTEM (${action}): ${JSON.stringify(details)}` },
            annotations: { code: true, color: "gray" }
          }]
        }
      }]
    });
    
    // Backup to filesystem
    fs.appendFileSync(
      `./logs/cli-session-${this.sessionId}.log`,
      `[${new Date().toISOString()}] SYSTEM (${action}): ${JSON.stringify(details)}\n`
    );
  }

  async logAssistantResponse(response) {
    // Log assistant response AS IT HAPPENS
    await this.notion.blocks.children.append({
      block_id: this.sessionTaskId,
      children: [{
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ 
            type: "text", 
            text: { content: `🤖 ASSISTANT: ${response}` },
            annotations: { color: "green" }
          }]
        }
      }]
    });
    
    // Backup to filesystem
    fs.appendFileSync(
      `./logs/cli-session-${this.sessionId}.log`,
      `[${new Date().toISOString()}] ASSISTANT: ${response}\n`
    );
  }

  async logToolCall(toolName, input, output) {
    // Log tool usage AS IT HAPPENS
    await this.notion.blocks.children.append({
      block_id: this.sessionTaskId,
      children: [{
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ 
            type: "text", 
            text: { content: `🔧 TOOL (${toolName}): Input: ${JSON.stringify(input)}, Output: ${JSON.stringify(output)}` },
            annotations: { code: true, color: "purple" }
          }]
        }
      }]
    });
    
    // Backup to filesystem
    fs.appendFileSync(
      `./logs/cli-session-${this.sessionId}.log`,
      `[${new Date().toISOString()}] TOOL (${toolName}): ${JSON.stringify({ input, output })}\n`
    );
  }

  async handleCompaction(compactionReason) {
    // Handle context compaction event
    await this.notion.blocks.children.append({
      block_id: this.sessionTaskId,
      children: [{
        object: "block",
        type: "callout",
        callout: {
          rich_text: [{ 
            type: "text", 
            text: { content: `🔄 COMPACTION EVENT: ${compactionReason}` }
          }],
          icon: { emoji: "⚠️" },
          color: "yellow_background"
        }
      }]
    });
    
    // Update session status
    await this.notion.pages.update({
      page_id: this.sessionTaskId,
      properties: {
        Status: { select: { name: "Compacted" } }
      }
    });
    
    // Create a new session that bridges to this one
    const newSessionId = `${this.sessionId}-CONTINUED`;
    const newSession = new CLISessionLogger({ sessionId: newSessionId });
    await newSession._createBridgeToPreviousSession(this.sessionTaskId);
    
    return newSession;
  }

  async _createBridgeToPreviousSession(previousSessionId) {
    // Add a reference to the previous session
    await this.notion.blocks.children.append({
      block_id: this.sessionTaskId,
      children: [{
        object: "block",
        type: "callout",
        callout: {
          rich_text: [{ 
            type: "text", 
            text: { content: `⛓️ CONTINUED FROM PREVIOUS SESSION: ${previousSessionId}` }
          }],
          icon: { emoji: "🔄" },
          color: "blue_background"
        }
      }]
    });
    
    // Update previous session to link to this one
    await this.notion.blocks.children.append({
      block_id: previousSessionId,
      children: [{
        object: "block",
        type: "callout",
        callout: {
          rich_text: [{ 
            type: "text", 
            text: { content: `⛓️ CONTINUED IN NEXT SESSION: ${this.sessionTaskId}` }
          }],
          icon: { emoji: "🔄" },
          color: "blue_background"
        }
      }]
    });
  }

  async loadMostRecentContext() {
    try {
      // Query for the most recent active or compacted session
      const response = await this.notion.databases.query({
        database_id: this.databaseId,
        sorts: [{ property: "Started", direction: "descending" }],
        filter: {
          or: [
            { property: "Status", select: { equals: "Active" } },
            { property: "Status", select: { equals: "Compacted" } }
          ]
        },
        page_size: 5 // Get the most recent 5 sessions
      });
      
      if (response.results.length > 0 && response.results[0].id !== this.sessionTaskId) {
        const previousSessionId = response.results[0].id;
        
        // Create a bridge to the previous session
        await this._createBridgeToPreviousSession(previousSessionId);
        
        // Load the content blocks from the previous session
        const blocks = await this.notion.blocks.children.list({
          block_id: previousSessionId
        });
        
        // Process and store the context
        this.previousContext = {
          sessionId: previousSessionId,
          messages: blocks.results.map(block => {
            if (block.type === "paragraph" && block.paragraph.rich_text.length > 0) {
              return block.paragraph.rich_text[0].text.content;
            }
            return null;
          }).filter(Boolean)
        };
        
        // Log that we've loaded previous context
        await this.logSystemAction("LOAD_PREVIOUS_CONTEXT", {
          previousSessionId,
          messageCount: this.previousContext.messages.length
        });
        
        return this.previousContext;
      }
      
      return null;
    } catch (error) {
      console.error("Error loading previous context:", error);
      await this.logSystemAction("ERROR_LOADING_CONTEXT", { error: error.message });
      return null;
    }
  }
}

module.exports = CLISessionLogger;
```

### Session Initialization (initialize-session.js)

Updated to integrate with the CLI Session Logger:

```javascript
const CLISessionLogger = require('./cli_session_logger');
const fs = require('fs');
const path = require('path');

let sessionLogger = null;

async function initializeSessionLogger() {
  try {
    const sessionId = `SESSION-${Date.now()}`;
    
    // Initialize the session logger
    sessionLogger = new CLISessionLogger({
      sessionId: sessionId
    });
    
    // Export to global scope for future use
    global.sessionLogger = sessionLogger;
    
    return sessionId;
  } catch (error) {
    console.error("Error initializing CLI Session Logger:", error);
    return `SESSION-${Date.now()}-FALLBACK`;
  }
}

async function initializeSession() {
  try {
    // Initialize session logger before anything else
    const sessionId = await initializeSessionLogger();
    
    // Log the session initialization
    if (sessionLogger) {
      await sessionLogger.logSystemAction("SESSION_INIT", {
        sessionId,
        timestamp: new Date().toISOString()
      });
    }
    
    // Define paths to critical files
    const CLAUDE_MD_PATH = path.resolve(__dirname, 'CLAUDE.md');
    const REVIEWER_PROTOCOL_PATH = path.resolve(__dirname, 'REVIEWER_PROTOCOL.md');
    const NOTION_INTEGRATION_PATH = path.resolve(__dirname, 'NOTION_INTEGRATION.md');
    
    // Load critical files
    const claudeMd = fs.existsSync(CLAUDE_MD_PATH) ? 
      fs.readFileSync(CLAUDE_MD_PATH, 'utf8') : 'CLAUDE.md not found';
    const reviewerProtocol = fs.existsSync(REVIEWER_PROTOCOL_PATH) ? 
      fs.readFileSync(REVIEWER_PROTOCOL_PATH, 'utf8') : 'REVIEWER_PROTOCOL.md not found';
    const notionIntegration = fs.existsSync(NOTION_INTEGRATION_PATH) ? 
      fs.readFileSync(NOTION_INTEGRATION_PATH, 'utf8') : 'NOTION_INTEGRATION.md not found';
    
    // Log the loading of critical files
    if (sessionLogger) {
      await sessionLogger.logSystemAction("LOAD_CRITICAL_FILES", {
        files: [CLAUDE_MD_PATH, REVIEWER_PROTOCOL_PATH, NOTION_INTEGRATION_PATH]
      });
    }
    
    // Set up compaction handler
    if (global.claude && global.claude.onCompaction && sessionLogger) {
      global.claude.onCompaction(async (reason) => {
        await sessionLogger.logSystemAction("COMPACTION_TRIGGERED", { reason });
        const newSession = await sessionLogger.handleCompaction(reason);
        // Replace the session logger with the new one
        sessionLogger = newSession;
        global.sessionLogger = newSession;
      });
    }
    
    return {
      sessionId,
      context: {
        claudeMd,
        reviewerProtocol,
        notionIntegration
      }
    };
  } catch (error) {
    console.error("Error during session initialization:", error);
    
    // Log the error
    if (sessionLogger) {
      await sessionLogger.logSystemAction("INIT_ERROR", {
        error: error.message,
        stack: error.stack
      });
    }
    
    return {
      sessionId: `ERROR-${Date.now()}`,
      error: error.message
    };
  }
}

module.exports = {
  initializeSession,
  getSessionLogger: () => sessionLogger
};
```

### Testing Script (test_cli_context_persistence.js)

```javascript
const CLISessionLogger = require('./cli_session_logger');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function simulateCompaction(sessionLogger) {
  console.log("\n🔄 Simulating compaction event...");
  
  // Handle the compaction
  const newSessionLogger = await sessionLogger.handleCompaction("SIMULATED_COMPACTION");
  
  console.log("✅ Created new session after compaction");
  console.log(`📝 Old Session ID: ${sessionLogger.sessionId}`);
  console.log(`📝 New Session ID: ${newSessionLogger.sessionId}`);
  
  return newSessionLogger;
}

async function verifyContextRetrieval(sessionLogger) {
  console.log("\n🔍 Verifying context retrieval capability...");
  
  // Load most recent context
  const context = await sessionLogger.loadMostRecentContext();
  
  if (context && context.messages && context.messages.length > 0) {
    console.log("✅ Successfully retrieved context from previous session");
    console.log(`📝 Previous Session ID: ${context.sessionId}`);
    console.log(`📝 Message count: ${context.messages.length}`);
    
    // Show the first few messages
    console.log("\n📄 First 3 messages from previous context:");
    context.messages.slice(0, 3).forEach((message, index) => {
      console.log(`${index + 1}. ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
    });
    
    return true;
  } else {
    console.log("❌ Failed to retrieve context from previous session");
    return false;
  }
}

async function main() {
  console.log("🧪 Starting CLI Context Persistence Test\n");
  
  // Initialize a new session logger
  const sessionLogger = new CLISessionLogger();
  console.log(`📝 Session ID: ${sessionLogger.sessionId}`);
  
  // Simulate user interaction
  const userMessage = await prompt("Enter a test message: ");
  await sessionLogger.logUserMessage(userMessage);
  console.log("✅ Logged user message to Notion");
  
  // Simulate system action
  await sessionLogger.logSystemAction("TEST_ACTION", {
    action: "Testing system action logging",
    timestamp: new Date().toISOString()
  });
  console.log("✅ Logged system action to Notion");
  
  // Simulate assistant response
  await sessionLogger.logAssistantResponse("This is a test response from the assistant.");
  console.log("✅ Logged assistant response to Notion");
  
  // Simulate tool call
  await sessionLogger.logToolCall("TestTool", { param1: "value1" }, { result: "success" });
  console.log("✅ Logged tool call to Notion");
  
  // Simulate compaction
  const newSessionLogger = await simulateCompaction(sessionLogger);
  
  // Verify context retrieval in the new session
  const contextRetrieved = await verifyContextRetrieval(newSessionLogger);
  
  // Final report
  console.log("\n📊 Test Results:");
  console.log("✅ User message logging: Success");
  console.log("✅ System action logging: Success");
  console.log("✅ Assistant response logging: Success");
  console.log("✅ Tool call logging: Success");
  console.log("✅ Compaction handling: Success");
  console.log(`${contextRetrieved ? '✅' : '❌'} Context retrieval: ${contextRetrieved ? 'Success' : 'Failed'}`);
  
  console.log("\n🏁 Test completed");
  rl.close();
}

main().catch(error => {
  console.error("Test failed with error:", error);
  rl.close();
});
```

## Key Principles of Implementation

1. **Log EVERYTHING in real-time** - Log AS IT HAPPENS, not after the fact
2. **Never delay logging until after execution** - Immediate logging ensures nothing is lost
3. **Always check for previous context** - Load context from previous sessions at initialization
4. **Store complete logs, not summaries** - Full content preservation for proper restoration
5. **Create bridges between sessions** - Explicit linking between related sessions

## Notion Database Structure

The Notion database for CLI Sessions has the following properties:

| Property | Type | Description |
|----------|------|-------------|
| Name | Title | The session name/ID |
| Status | Select | Active, Compacted, or Completed |
| Started | Date | When the session started |
| Ended | Date | When the session ended |
| Tags | Multi-select | Task categories |
| Related Sessions | Relation | Links to other related sessions |

Each session page contains the following block types:
- Paragraph blocks for messages, responses, and logs
- Callout blocks for compaction events and session bridges
- Code blocks for tool calls and system actions

## Usage Instructions

### Integration with initialization process

This code is automatically integrated in the initialize-session.js file. Every CLI session will:

1. Start by creating a new Notion page for the session
2. Look for previous session context and load it
3. Set up compaction handlers
4. Log all critical initialization steps

### Manual Usage

If you need to use the session logger manually:

```javascript
const { getSessionLogger } = require('./initialize-session');

// Get the current session logger
const sessionLogger = getSessionLogger();

// Log a user message
await sessionLogger.logUserMessage("User message here");

// Log a system action
await sessionLogger.logSystemAction("ACTION_NAME", { details: "here" });

// Log an assistant response
await sessionLogger.logAssistantResponse("Assistant response here");

// Log a tool call
await sessionLogger.logToolCall("ToolName", inputData, outputData);
```

## Testing

1. Run the test script: `node test_cli_context_persistence.js`
2. The script will:
   - Create a new session in Notion
   - Log user messages, system actions, assistant responses, and tool calls
   - Simulate a compaction event
   - Create a new session with a bridge to the previous one
   - Verify context can be retrieved from the previous session
   - Report results

## WARNING ⚠️

**NEVER DELAY LOGGING UNTIL AFTER EXECUTION!**

Always log interactions in real-time, as they happen. Logging after the fact creates a window of vulnerability where context can be lost.

```javascript
// ❌ WRONG - Vulnerable to context loss
async function doSomething() {
  const result = await performAction();
  await sessionLogger.logSystemAction("ACTION", result); // Too late if compaction occurs before this
}

// ✅ CORRECT - Safe from context loss
async function doSomething() {
  await sessionLogger.logSystemAction("ACTION_STARTED", {}); // Log first
  const result = await performAction();
  await sessionLogger.logSystemAction("ACTION_COMPLETED", result); // Log completion
}
```