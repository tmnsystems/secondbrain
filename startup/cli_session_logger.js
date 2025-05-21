/**
 * SecondBrain CLI Session Logger
 * 
 * This module provides real-time logging of CLI sessions to Notion,
 * ensuring context persistence between sessions and preventing context loss
 * during automatic compaction or session resets.
 * 
 * CRITICAL: This module MUST be used for ALL user interactions to prevent context loss.
 */

// Notion client is only needed if available for context persistence; guard import
// 🔄 Switched to relay—no direct Notion SDK in sandbox
const { createPageViaRelay } = require('../lib/relayNotion.js');
let Client = null;
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '/Volumes/Envoy/SecondBrain/secondbrain_api_keys.env' });

class CLISessionLogger {
  /**
   * Initialize the CLI Session Logger
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    this.notionApiKey = options.notionApiKey || process.env.NOTION_API_KEY;
    this.tasksDbId = options.tasksDbId || process.env.SECONDBRAIN_TASKS_DATABASE_ID;
    this.sessionId = options.sessionId || `SESSION_${Date.now()}_${uuidv4().substring(0, 8)}`;
    this.sessionTaskId = null;
    this.messageCount = 0;
    this.sessionStart = new Date();
    this.lastActivity = new Date();
    
    // Initialize Notion client (no direct SDK; relay used for writes)
    this.notion = null;
    
    // Log file for backup in case Notion is unavailable (store in local logs/ directory)
    const defaultLogDir = path.join(process.cwd(), 'logs');
    this.logFilePath = options.logFilePath || path.join(
      defaultLogDir,
      `cli_session_${this.sessionId}.log`
    );
    // Intents log (records user and assistant messages)
    this.intentsLogPath = path.join(defaultLogDir, 'cli_intents.log');
    
    // Ensure log directory exists
    const logDir = path.dirname(this.logFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    // Ensure intents log directory exists
    const intentsDir = path.dirname(this.intentsLogPath);
    if (!fs.existsSync(intentsDir)) {
      fs.mkdirSync(intentsDir, { recursive: true });
    }
    
    // Initialize the session
    this._initializeSession();
  }
  
  /**
   * Initialize the session in Notion
   * @private
   */
  async _initializeSession() {
    if (!this.notion || !this.tasksDbId) {
      this._logToFile('SESSION_INIT', 'Failed to initialize session in Notion: Missing API key or database ID');
      return;
    }
    
    try {
      // Find any active sessions that might need to be bridged
      const activeSessionsQuery = await this.notion.databases.query({
        database_id: this.tasksDbId,
        filter: {
          and: [
            {
              property: "Name",
              title: {
                contains: "CLI Session"
              }
            },
            {
              property: "Status",
              status: {
                equals: "In Progress"
              }
            }
          ]
        },
        sorts: [
          {
            property: "Last Synced",
            direction: "descending"
          }
        ],
        page_size: 5
      });
      
      // Potential sessions to bridge from
      const potentialBridgeSessions = activeSessionsQuery.results;
      
      // 🔄 Switched to relay—no direct Notion SDK in sandbox
      const sessionPage = { id: await createPageViaRelay(
        this.tasksDbId,
        `CLI Session ${this.sessionId}`,
        {
          Name: { title: [{ text: { content: `CLI Session ${this.sessionId}` } }] },
          Status: { status: { name: "In Progress" } },
          Priority: { select: { name: "P1" } },
          "Task ID": { rich_text: [{ text: { content: this.sessionId } }] },
          "Assigned Agent": { select: { name: "Orchestrator" } },
          "Last Synced": { date: { start: new Date().toISOString() } }
        }
      ) };
      this.sessionTaskId = sessionPage.id;
      this._logToFile('SESSION_INIT', `Session initialized in Notion with ID ${this.sessionTaskId}`);
      
      // Create bridges to previous sessions if any exist
      if (potentialBridgeSessions.length > 0) {
        const previousSessionId = potentialBridgeSessions[0].id;
        await this._createBridgeToPreviousSession(previousSessionId);
      }
      
      console.log(`✅ CLI Session initialized with ID: ${this.sessionId}`);
      console.log(`✅ Session task created in Notion with ID: ${this.sessionTaskId}`);
      
      return sessionPage;
    } catch (error) {
      this._logToFile('ERROR', `Failed to initialize session: ${error.message}`);
      console.error('Failed to initialize session in Notion:', error);
      return null;
    }
  }
  
  /**
   * Create a bridge to a previous session for context continuity
   * @param {string} previousSessionId Notion page ID of previous session
   * @private
   */
  async _createBridgeToPreviousSession(previousSessionId) {
    if (!this.notion || !this.sessionTaskId) return;
    
    try {
      // Add a reference to the previous session
      await this.notion.blocks.children.append({
        block_id: this.sessionTaskId,
        children: [
          {
            object: "block",
            type: "heading_3",
            heading_3: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: "Previous Session Context"
                  }
                }
              ]
            }
          },
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: "This session is connected to a previous session. Context has been preserved."
                  }
                }
              ]
            }
          },
          {
            object: "block",
            type: "bookmark",
            bookmark: {
              url: `https://www.notion.so/${previousSessionId.replace(/-/g, '')}`
            }
          }
        ]
      });
      
      // Update previous session to link to this one
      await this.notion.blocks.children.append({
        block_id: previousSessionId,
        children: [
          {
            object: "block",
            type: "heading_3",
            heading_3: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: "Continued In Next Session"
                  }
                }
              ]
            }
          },
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: `This session continues in session ${this.sessionId}`
                  }
                }
              ]
            }
          },
          {
            object: "block",
            type: "bookmark",
            bookmark: {
              url: `https://www.notion.so/${this.sessionTaskId.replace(/-/g, '')}`
            }
          }
        ]
      });
      
      // Mark previous session as completed
      await this.notion.pages.update({
        page_id: previousSessionId,
        properties: {
          Status: {
            status: {
              name: "Completed"
            }
          },
          "Last Synced": {
            date: {
              start: new Date().toISOString()
            }
          }
        }
      });
      
      this._logToFile('BRIDGE_CREATED', `Created bridge to previous session ${previousSessionId}`);
      console.log(`✅ Created context bridge to previous session`);
      
      return true;
    } catch (error) {
      this._logToFile('ERROR', `Failed to create bridge to previous session: ${error.message}`);
      console.error('Failed to create bridge to previous session:', error);
      return false;
    }
  }
  
  /**
   * Log a user message to Notion in real-time
   * @param {string} message The user's message
   * @returns {Promise<boolean>} Success status
   */
  async logUserMessage(message) {
    this.messageCount++;
    this.lastActivity = new Date();
    
    // Always log to file first for backup
    this._logToFile('USER', message);
    // Also record user intent locally
    try {
      const ts = new Date().toISOString();
      fs.appendFileSync(this.intentsLogPath, `[${ts}] [USER] ${message}\n`);
    } catch (e) {
      console.error('Failed to write to intents log:', e);
    }
    
    if (!this.sessionTaskId) {
      console.warn('⚠️ Cannot log to Notion: Missing database ID or session not initialized');
      return false;
    }
    
    try {
      // Add the message to the session log
      await this.notion.blocks.children.append({
        block_id: this.sessionTaskId,
        children: [
          {
            object: "block",
            type: "heading_3",
            heading_3: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: `User Message #${this.messageCount}`
                  }
                }
              ]
            }
          },
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: message.substring(0, 2000) // Notion has a 2000 char limit per block
                  }
                }
              ]
            }
          }
        ]
      });
      
      // If message is very long, add additional blocks
      if (message.length > 2000) {
        const chunks = [];
        for (let i = 2000; i < message.length; i += 2000) {
          chunks.push(message.substring(i, i + 2000));
        }
        
        const additionalBlocks = chunks.map(chunk => ({
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: chunk
                }
              }
            ]
          }
        }));
        
        if (additionalBlocks.length > 0) {
          await this.notion.blocks.children.append({
            block_id: this.sessionTaskId,
            children: additionalBlocks
          });
        }
      }
      
      // Update the Last Synced property
      await this.notion.pages.update({
        page_id: this.sessionTaskId,
        properties: {
          "Last Synced": {
            date: {
              start: new Date().toISOString()
            }
          }
        }
      });
      
      return true;
    } catch (error) {
      this._logToFile('ERROR', `Failed to log user message: ${error.message}`);
      console.error('Failed to log user message to Notion:', error);
      return false;
    }
  }
  
  /**
   * Log a system action to Notion in real-time
   * @param {string} action Description of the action
   * @param {Object} details Additional details about the action
   * @returns {Promise<boolean>} Success status
   */
  async logSystemAction(action, details = {}) {
    this.lastActivity = new Date();
    
    // Always log to file first for backup
    this._logToFile('SYSTEM', `${action}: ${JSON.stringify(details)}`);
    
    if (!this.sessionTaskId) {
      console.warn('⚠️ Cannot log to Notion: Missing database ID or session not initialized');
      return false;
    }
    
    try {
      // Format details as readable string
      let detailsText = '';
      if (typeof details === 'object' && Object.keys(details).length > 0) {
        detailsText = Object.entries(details)
          .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
          .join('\n');
      } else if (typeof details === 'string') {
        detailsText = details;
      }
      
      // Add the action to the session log
      await this.notion.blocks.children.append({
        block_id: this.sessionTaskId,
        children: [
          {
            object: "block",
            type: "heading_3",
            heading_3: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: `System Action: ${action}`
                  }
                }
              ]
            }
          },
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: detailsText.substring(0, 2000)
                  }
                }
              ]
            }
          }
        ]
      });
      
      // Update the Last Synced property
      await this.notion.pages.update({
        page_id: this.sessionTaskId,
        properties: {
          "Last Synced": {
            date: {
              start: new Date().toISOString()
            }
          }
        }
      });
      
      return true;
    } catch (error) {
      this._logToFile('ERROR', `Failed to log system action: ${error.message}`);
      console.error('Failed to log system action to Notion:', error);
      return false;
    }
  }
  
  /**
   * Log an assistant response to Notion in real-time
   * @param {string} response The assistant's response
   * @returns {Promise<boolean>} Success status
   */
  async logAssistantResponse(response) {
    this.lastActivity = new Date();
    
    // Always log to file first for backup
    this._logToFile('ASSISTANT', response);
    // Also record assistant intent locally
    try {
      const ts = new Date().toISOString();
      fs.appendFileSync(this.intentsLogPath, `[${ts}] [ASSISTANT] ${response}\n`);
    } catch (e) {
      console.error('Failed to write to intents log:', e);
    }
    
    if (!this.sessionTaskId) {
      console.warn('⚠️ Cannot log to Notion: Missing database ID or session not initialized');
      return false;
    }
    
    try {
      // Add the response to the session log
      await this.notion.blocks.children.append({
        block_id: this.sessionTaskId,
        children: [
          {
            object: "block",
            type: "heading_3",
            heading_3: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: `Assistant Response #${this.messageCount}`
                  }
                }
              ]
            }
          },
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: response.substring(0, 2000)
                  }
                }
              ]
            }
          }
        ]
      });
      
      // If response is very long, add additional blocks
      if (response.length > 2000) {
        const chunks = [];
        for (let i = 2000; i < response.length; i += 2000) {
          chunks.push(response.substring(i, i + 2000));
        }
        
        const additionalBlocks = chunks.map(chunk => ({
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: chunk
                }
              }
            ]
          }
        }));
        
        if (additionalBlocks.length > 0) {
          await this.notion.blocks.children.append({
            block_id: this.sessionTaskId,
            children: additionalBlocks
          });
        }
      }
      
      // Update the Last Synced property
      await this.notion.pages.update({
        page_id: this.sessionTaskId,
        properties: {
          "Last Synced": {
            date: {
              start: new Date().toISOString()
            }
          }
        }
      });
      
      return true;
    } catch (error) {
      this._logToFile('ERROR', `Failed to log assistant response: ${error.message}`);
      console.error('Failed to log assistant response to Notion:', error);
      return false;
    }
  }
  
  /**
   * Log a tool call to Notion in real-time
   * @param {string} toolName Name of the tool being used
   * @param {Object} input Input parameters to the tool
   * @param {Object} output Output from the tool
   * @returns {Promise<boolean>} Success status
   */
  async logToolCall(toolName, input, output) {
    this.lastActivity = new Date();
    
    // Always log to file first for backup
    this._logToFile('TOOL_CALL', `${toolName}: ${JSON.stringify({ input, output })}`);
    
    if (!this.sessionTaskId) {
      console.warn('⚠️ Cannot log to Notion: Missing database ID or session not initialized');
      return false;
    }
    
    try {
      // Format input and output for display
      const inputStr = typeof input === 'object' ? JSON.stringify(input, null, 2) : input.toString();
      let outputStr = '';
      
      if (output instanceof Error) {
        outputStr = `Error: ${output.message}`;
      } else if (typeof output === 'object') {
        outputStr = JSON.stringify(output, null, 2);
      } else if (output !== undefined) {
        outputStr = output.toString();
      } else {
        outputStr = 'No output or pending';
      }
      
      // Add the tool call to the session log
      await this.notion.blocks.children.append({
        block_id: this.sessionTaskId,
        children: [
          {
            object: "block",
            type: "heading_3",
            heading_3: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: `Tool Call: ${toolName}`
                  }
                }
              ]
            }
          },
          {
            object: "block",
            type: "heading_3",
            heading_3: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: "Input"
                  },
                  annotations: {
                    bold: true
                  }
                }
              ]
            }
          },
          {
            object: "block",
            type: "code",
            code: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: inputStr.substring(0, 2000)
                  }
                }
              ],
              language: "json"
            }
          },
          {
            object: "block",
            type: "heading_3",
            heading_3: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: "Output"
                  },
                  annotations: {
                    bold: true
                  }
                }
              ]
            }
          },
          {
            object: "block",
            type: "code",
            code: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: outputStr.substring(0, 2000)
                  }
                }
              ],
              language: "json"
            }
          }
        ]
      });
      
      // Update the Last Synced property
      await this.notion.pages.update({
        page_id: this.sessionTaskId,
        properties: {
          "Last Synced": {
            date: {
              start: new Date().toISOString()
            }
          }
        }
      });
      
      return true;
    } catch (error) {
      this._logToFile('ERROR', `Failed to log tool call: ${error.message}`);
      console.error('Failed to log tool call to Notion:', error);
      return false;
    }
  }
  
  /**
   * Mark the session as completed in Notion
   * @param {string} summary Optional summary of the session
   * @returns {Promise<boolean>} Success status
   */
  async endSession(summary = '') {
    if (!this.notion || !this.sessionTaskId) {
      this._logToFile('SESSION_END', 'Failed to end session in Notion: Missing API key, database ID, or session not initialized');
      return false;
    }
    
    try {
      // Add a session summary if provided
      if (summary) {
        await this.notion.blocks.children.append({
          block_id: this.sessionTaskId,
          children: [
            {
              object: "block",
              type: "heading_2",
              heading_2: {
                rich_text: [
                  {
                    type: "text",
                    text: {
                      content: "Session Summary"
                    }
                  }
                ]
              }
            },
            {
              object: "block",
              type: "paragraph",
              paragraph: {
                rich_text: [
                  {
                    type: "text",
                    text: {
                      content: summary.substring(0, 2000)
                    }
                  }
                ]
              }
            }
          ]
        });
      }
      
      // Add session statistics
      const sessionDuration = (new Date() - this.sessionStart) / 1000 / 60; // in minutes
      
      await this.notion.blocks.children.append({
        block_id: this.sessionTaskId,
        children: [
          {
            object: "block",
            type: "heading_2",
            heading_2: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: "Session Statistics"
                  }
                }
              ]
            }
          },
          {
            object: "block",
            type: "bulleted_list_item",
            bulleted_list_item: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: `Session ID: ${this.sessionId}`
                  }
                }
              ]
            }
          },
          {
            object: "block",
            type: "bulleted_list_item",
            bulleted_list_item: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: `Started: ${this.sessionStart.toISOString()}`
                  }
                }
              ]
            }
          },
          {
            object: "block",
            type: "bulleted_list_item",
            bulleted_list_item: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: `Ended: ${new Date().toISOString()}`
                  }
                }
              ]
            }
          },
          {
            object: "block",
            type: "bulleted_list_item",
            bulleted_list_item: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: `Duration: ${sessionDuration.toFixed(2)} minutes`
                  }
                }
              ]
            }
          },
          {
            object: "block",
            type: "bulleted_list_item",
            bulleted_list_item: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: `Message Count: ${this.messageCount}`
                  }
                }
              ]
            }
          }
        ]
      });
      
      // Mark the session as completed
      await this.notion.pages.update({
        page_id: this.sessionTaskId,
        properties: {
          Status: {
            status: {
              name: "Completed"
            }
          },
          "Last Synced": {
            date: {
              start: new Date().toISOString()
            }
          }
        }
      });
      
      this._logToFile('SESSION_END', `Session ended: ${new Date().toISOString()}`);
      console.log(`✅ CLI Session ${this.sessionId} completed and logged to Notion`);
      
      return true;
    } catch (error) {
      this._logToFile('ERROR', `Failed to end session: ${error.message}`);
      console.error('Failed to end session in Notion:', error);
      return false;
    }
  }
  
  /**
   * Write a log entry to the backup log file
   * @param {string} type Type of log entry
   * @param {string} message Log message
   * @private
   */
  _logToFile(type, message) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] [${type}] ${message}\n`;
      
      fs.appendFileSync(this.logFilePath, logEntry);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }
  
  /**
   * Handle automatic context compaction event
   * @param {number} compactionReason Reason code for compaction
   * @returns {Promise<boolean>} Success status
   */
  async handleCompaction(compactionReason) {
    if (!this.notion || !this.sessionTaskId) {
      this._logToFile('COMPACTION', 'Failed to handle compaction in Notion: Missing API key, database ID, or session not initialized');
      return false;
    }
    
    try {
      // Log the compaction event
      await this.notion.blocks.children.append({
        block_id: this.sessionTaskId,
        children: [
          {
            object: "block",
            type: "callout",
            callout: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: "AUTOMATIC COMPACTION OCCURRED"
                  },
                  annotations: {
                    bold: true,
                    color: "red"
                  }
                }
              ],
              icon: {
                emoji: "⚠️"
              },
              color: "red_background"
            }
          },
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: `Compaction triggered at ${new Date().toISOString()} with reason code ${compactionReason}`
                  }
                }
              ]
            }
          },
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: "Context has been preserved in Notion. You may need to restore context from this log."
                  }
                }
              ]
            }
          }
        ]
      });
      
      // Update the Last Synced property
      await this.notion.pages.update({
        page_id: this.sessionTaskId,
        properties: {
          "Last Synced": {
            date: {
              start: new Date().toISOString()
            }
          }
        }
      });
      
      this._logToFile('COMPACTION', `Compaction event handled: Reason ${compactionReason}`);
      console.log(`✅ Compaction event logged to Notion`);
      
      return true;
    } catch (error) {
      this._logToFile('ERROR', `Failed to handle compaction: ${error.message}`);
      console.error('Failed to handle compaction in Notion:', error);
      return false;
    }
  }
  
  /**
   * Load the most recent session context from Notion
   * This is critical for restoring context after compaction
   * @returns {Promise<Object>} Session context
   */
  async loadMostRecentContext() {
    if (!this.notion || !this.tasksDbId) {
      console.warn('⚠️ Cannot load context from Notion: Missing API key or database ID');
      return null;
    }
    
    try {
      // Query for recent session logs
      const sessionsQuery = await this.notion.databases.query({
        database_id: this.tasksDbId,
        filter: {
          property: "Name",
          title: {
            contains: "CLI Session"
          }
        },
        sorts: [
          {
            property: "Last Synced",
            direction: "descending"
          }
        ],
        page_size: 3
      });
      
      if (!sessionsQuery.results.length) {
        console.warn('⚠️ No previous sessions found in Notion');
        return null;
      }
      
      // Get the most recent session
      const mostRecentSession = sessionsQuery.results[0];
      const sessionId = mostRecentSession.id;
      
      // Get blocks (content) from the session
      const blocks = await this.notion.blocks.children.list({
        block_id: sessionId
      });
      
      // Extract relevant context
      const context = {
        sessionId: mostRecentSession.properties["Task ID"]?.rich_text[0]?.text.content || 'unknown',
        messages: []
      };
      
      // Parse blocks to reconstruct the conversation
      let currentMessageType = null;
      let currentMessage = '';
      
      for (const block of blocks.results) {
        // Handle headings (mark message boundaries)
        if (block.type === 'heading_3') {
          const headingText = block.heading_3.rich_text[0]?.text.content || '';
          
          // Save previous message if there was one
          if (currentMessageType && currentMessage) {
            context.messages.push({
              role: currentMessageType,
              content: currentMessage
            });
            currentMessage = '';
          }
          
          // Set new message type based on heading
          if (headingText.startsWith('User Message')) {
            currentMessageType = 'user';
          } else if (headingText.startsWith('Assistant Response')) {
            currentMessageType = 'assistant';
          } else if (headingText.startsWith('System Action') || headingText.startsWith('Tool Call')) {
            currentMessageType = 'system';
          } else {
            currentMessageType = null;
          }
        }
        // Handle paragraph content
        else if (block.type === 'paragraph' && currentMessageType) {
          const paragraphText = block.paragraph.rich_text[0]?.text.content || '';
          currentMessage += paragraphText + '\n';
        }
        // Handle code blocks
        else if (block.type === 'code' && currentMessageType) {
          const codeText = block.code.rich_text[0]?.text.content || '';
          currentMessage += '```\n' + codeText + '\n```\n';
        }
      }
      
      // Add the last message if there was one
      if (currentMessageType && currentMessage) {
        context.messages.push({
          role: currentMessageType,
          content: currentMessage
        });
      }
      
      this._logToFile('CONTEXT_LOAD', `Loaded context from session ${context.sessionId}`);
      console.log(`✅ Successfully loaded context from previous session`);
      
      return context;
    } catch (error) {
      this._logToFile('ERROR', `Failed to load most recent context: ${error.message}`);
      console.error('Failed to load most recent context from Notion:', error);
      return null;
    }
  }
}

module.exports = CLISessionLogger;

// Example usage
if (require.main === module) {
  const logger = new CLISessionLogger();
  
  async function testLogger() {
    await logger.logUserMessage("Hello, this is a test message from the user.");
    await logger.logSystemAction("TEST_ACTION", { param1: "value1", param2: "value2" });
    await logger.logAssistantResponse("This is a test response from the assistant.");
    await logger.logToolCall("TestTool", { input: "test input" }, { output: "test output" });
    await logger.endSession("This was a test session.");
  }
  
  testLogger().catch(console.error);
}