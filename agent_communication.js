/**
 * Agent Communication Logger for SecondBrain
 * 
 * This utility captures and logs inter-agent communication for the SecondBrain multi-agent system
 * It provides a way to visualize the flow of messages between agents.
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configuration
const LOG_DIR = path.join(__dirname, 'agent_logs');
const LOG_FILE = path.join(LOG_DIR, `communication_log_${new Date().toISOString().replace(/:/g, '-')}.json`);
const CONSOLE_OUTPUT = true;

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Initialize log file
if (!fs.existsSync(LOG_FILE)) {
  fs.writeFileSync(LOG_FILE, JSON.stringify({
    sessionId: uuidv4(),
    startTime: new Date().toISOString(),
    messages: []
  }, null, 2));
}

/**
 * Log a message from one agent to another
 */
function logMessage(from, to, messageType, content, metadata = {}) {
  const message = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    from,
    to,
    messageType,
    content,
    metadata
  };

  // Read current log
  const log = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
  
  // Add message
  log.messages.push(message);
  
  // Write updated log
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
  
  // Console output if enabled
  if (CONSOLE_OUTPUT) {
    console.log(`\n${'-'.repeat(80)}`);
    console.log(`🔄 MESSAGE: ${from} → ${to}`);
    console.log(`🕒 TIME: ${new Date().toLocaleTimeString()}`);
    console.log(`📋 TYPE: ${messageType}`);
    console.log(`\n${typeof content === 'string' ? content : JSON.stringify(content, null, 2)}`);
    console.log(`${'-'.repeat(80)}\n`);
  }
  
  return message.id;
}

/**
 * Log a response to a previous message
 */
function logResponse(messageId, from, to, status, content, metadata = {}) {
  const message = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    responseToId: messageId,
    from,
    to,
    status, // success, failure, etc.
    content,
    metadata
  };

  // Read current log
  const log = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
  
  // Add message
  log.messages.push(message);
  
  // Write updated log
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
  
  // Console output if enabled
  if (CONSOLE_OUTPUT) {
    console.log(`\n${'-'.repeat(80)}`);
    console.log(`🔄 RESPONSE: ${from} → ${to} (to message ${messageId})`);
    console.log(`🕒 TIME: ${new Date().toLocaleTimeString()}`);
    console.log(`📋 STATUS: ${status}`);
    console.log(`\n${typeof content === 'string' ? content : JSON.stringify(content, null, 2)}`);
    console.log(`${'-'.repeat(80)}\n`);
  }
  
  return message.id;
}

/**
 * Generate a human-readable report of the communication flow
 */
function generateReport() {
  // Read log
  const log = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
  
  // Prepare report
  let report = `# Agent Communication Report\n\n`;
  report += `**Session ID:** ${log.sessionId}\n`;
  report += `**Start Time:** ${new Date(log.startTime).toLocaleString()}\n`;
  report += `**End Time:** ${new Date().toLocaleString()}\n`;
  report += `**Total Messages:** ${log.messages.length}\n\n`;
  
  // Message flow
  report += `## Message Flow\n\n`;
  
  const agentCounts = {};
  
  for (const message of log.messages) {
    // Track agent message counts
    if (!message.responseToId) {
      agentCounts[message.from] = (agentCounts[message.from] || 0) + 1;
    }
    
    const timestamp = new Date(message.timestamp).toLocaleTimeString();
    
    if (message.responseToId) {
      report += `### ${timestamp} - Response: ${message.from} to ${message.to}\n`;
      report += `**Status:** ${message.status}\n`;
      report += `**In response to:** ${message.responseToId}\n\n`;
    } else {
      report += `### ${timestamp} - Message: ${message.from} to ${message.to}\n`;
      report += `**Type:** ${message.messageType}\n\n`;
    }
    
    report += "```\n";
    report += typeof message.content === 'string' 
      ? message.content 
      : JSON.stringify(message.content, null, 2);
    report += "\n```\n\n";
    
    if (message.metadata && Object.keys(message.metadata).length > 0) {
      report += "**Metadata:**\n";
      report += "```\n";
      report += JSON.stringify(message.metadata, null, 2);
      report += "\n```\n\n";
    }
    
    report += "---\n\n";
  }
  
  // Agent statistics
  report += `## Agent Activity\n\n`;
  report += `| Agent | Messages Sent |\n`;
  report += `|-------|---------------|\n`;
  
  for (const [agent, count] of Object.entries(agentCounts)) {
    report += `| ${agent} | ${count} |\n`;
  }
  
  // Write report
  const reportPath = path.join(LOG_DIR, `communication_report_${new Date().toISOString().replace(/:/g, '-')}.md`);
  fs.writeFileSync(reportPath, report);
  
  return reportPath;
}

/**
 * Agent Communication Middleware Factory
 * Creates middleware for agent communication logging
 */
function createAgentMiddleware(agentName) {
  return {
    beforeSend: (to, messageType, content, metadata) => {
      const messageId = logMessage(agentName, to, messageType, content, metadata);
      return { messageId };
    },
    
    afterReceive: (messageId, from, status, content, metadata) => {
      logResponse(messageId, from, agentName, status, content, metadata);
    }
  };
}

module.exports = {
  logMessage,
  logResponse,
  generateReport,
  createAgentMiddleware
};