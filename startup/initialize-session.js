/**
 * SecondBrain Session Initialization Script
 * This script MUST be run at the beginning of every Claude session to ensure
 * context persistence and adherence to the Reviewer Protocol.
 * 
 * CRITICAL: Real-time context logging to Notion is essential to prevent context loss
 * during automatic compaction or session resets. ALL changes must be logged in real-time.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Load environment (must run before importing logger or relay helper)
const dotenv = require('dotenv');
const rootEnvPath = path.join(__dirname, '..', 'secondbrain_api_keys.env');
dotenv.config({ path: rootEnvPath });

// 🔄 Switched to relay—no direct Notion SDK in sandbox
const { createPageViaRelay } = require('../lib/relayNotion.js');
const CLISessionLogger = require('./cli_session_logger');

// Path to the Infra Blueprints index for session initialization context
const BLUEPRINT_INDEX_PATH = path.join(__dirname, '..', 'infra', 'blueprints', 'INDEX.yaml');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt for confirmation
const prompt = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

// Critical paths
const CLAUDE_MD_PATH = '/Volumes/Envoy/SecondBrain/CLAUDE.md';
const REVIEWER_PROTOCOL_PATH = '/Volumes/Envoy/SecondBrain/REVIEWER_PROTOCOL.md';
const NOTION_INTEGRATION_PATH = '/Volumes/Envoy/SecondBrain/NOTION_INTEGRATION.md';
// Added: Master plan for workflow and model assignments
const MASTER_PLAN_PATH = '/Volumes/Envoy/SecondBrain/MASTER_PLAN.md';

// Create global session logger
let sessionLogger = null;

// Required confirmation messages
const REQUIRED_CONFIRMATIONS = [
  {
    id: 'real_time_logging',
    message: 'I confirm that I will implement REAL-TIME context logging to Notion to prevent catastrophic context loss',
    required: true
  },
  {
    id: 'reviewer_protocol',
    message: 'I confirm that I will consult the Reviewer Agent BEFORE implementing any changes',
    required: true
  },
  {
    id: 'documentation',
    message: 'I confirm that I will document all reviews and implementations in Notion',
    required: true
  },
  {
    id: 'context_preservation',
    message: 'I confirm that I will preserve context between sessions by following the established protocols',
    required: true
  },
  {
    id: 'no_truncation',
    message: 'I confirm that I will NOT truncate or simplify SecondBrain processes',
    required: true
  }
];

/**
 * Initialize the CLI Session Logger for real-time Notion logging
 */
async function initializeSessionLogger() {
  try {
    const sessionId = `SESSION-${Date.now()}`;
    
    // Initialize the session logger
    sessionLogger = new CLISessionLogger({
      sessionId: sessionId
    });
    
    // Wait for initialization to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`✅ CLI Session Logger initialized with ID: ${sessionId}`);
    
    // Export the session logger to global scope for future use
    global.sessionLogger = sessionLogger;
    
    return sessionId;
  } catch (error) {
    console.error("Error initializing CLI Session Logger:", error);
    return `SESSION-${Date.now()}-FALLBACK`;
  }
}

/**
 * Load most recent context from previous sessions
 */
async function loadPreviousContext() {
  if (!sessionLogger) {
    console.warn('⚠️ Warning: Cannot load previous context - Session logger not initialized');
    return null;
  }
  
  try {
    console.log("\n=== Loading Previous Session Context ===\n");
    
    const context = await sessionLogger.loadMostRecentContext();
    
    if (context && context.messages && context.messages.length > 0) {
      console.log(`✅ Successfully loaded context from previous session ${context.sessionId}`);
      console.log(`   Found ${context.messages.length} messages to restore context`);
      
      // Log that we've loaded previous context
      await sessionLogger.logSystemAction("LOAD_PREVIOUS_CONTEXT", {
        previousSessionId: context.sessionId,
        messageCount: context.messages.length
      });
      
      return context;
    } else {
      console.log("🔍 No previous session context found or session was empty");
      return null;
    }
  } catch (error) {
    console.error("Error loading previous context:", error);
    return null;
  }
}

/**
 * Ensure key files exist and display their content
 */
async function loadCriticalFiles() {
  try {
    console.log("\n=== Loading Critical Context Files ===\n");
    
    // Check if files exist
    if (!fs.existsSync(CLAUDE_MD_PATH)) {
      console.error(`Error: ${CLAUDE_MD_PATH} not found`);
      return false;
    }
    
    if (!fs.existsSync(REVIEWER_PROTOCOL_PATH)) {
      console.error(`Error: ${REVIEWER_PROTOCOL_PATH} not found`);
      return false;
    }
    
    // Log the loading of critical files to Notion in real-time
    if (sessionLogger) {
      await sessionLogger.logSystemAction("LOAD_CRITICAL_FILES", {
        files: [CLAUDE_MD_PATH, REVIEWER_PROTOCOL_PATH, NOTION_INTEGRATION_PATH]
      });
    }
    
    // Display Reviewer Protocol first (most critical)
    console.log("\n=== REVIEWER PROTOCOL ===\n");
    console.log(fs.readFileSync(REVIEWER_PROTOCOL_PATH, 'utf8').substring(0, 1000) + "...");
    
    // Confirm understanding
    const confirmReviewer = await prompt("\nDo you confirm that you have read and understood the Reviewer Protocol? (yes/no): ");
    if (confirmReviewer.toLowerCase() !== 'yes') {
      console.error("Error: You must confirm understanding of the Reviewer Protocol");
      return false;
    }
    
    // Log the confirmation to Notion in real-time
    if (sessionLogger) {
      await sessionLogger.logSystemAction("CONFIRM_REVIEWER_PROTOCOL", {
        confirmed: true,
        timestamp: new Date().toISOString()
      });
    }
    
    // Display CLAUDE.md critical sections
    console.log("\n=== CLAUDE.MD CRITICAL SECTIONS ===\n");
    const claudeContent = fs.readFileSync(CLAUDE_MD_PATH, 'utf8');
    const criticalSection = claudeContent.substring(0, 2000);
    console.log(criticalSection + "...");
    
    // Confirm understanding
    const confirmClaude = await prompt("\nDo you confirm that you have read and understood the CLAUDE.md critical directives? (yes/no): ");
    if (confirmClaude.toLowerCase() !== 'yes') {
      console.error("Error: You must confirm understanding of the CLAUDE.md directives");
      return false;
    }
    
    // Log the confirmation to Notion in real-time
    if (sessionLogger) {
      await sessionLogger.logSystemAction("CONFIRM_CLAUDE_MD", {
        confirmed: true,
        timestamp: new Date().toISOString()
      });
    }
    
    // Check for Notion Integration
    if (fs.existsSync(NOTION_INTEGRATION_PATH)) {
      console.log("\n=== NOTION INTEGRATION ===\n");
      console.log(fs.readFileSync(NOTION_INTEGRATION_PATH, 'utf8').substring(0, 1000) + "...");
      // Log the loading of Notion Integration to Notion in real-time
      if (sessionLogger) {
        await sessionLogger.logSystemAction("LOAD_NOTION_INTEGRATION", {
          file: NOTION_INTEGRATION_PATH,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Load Master Plan for detailed workflow directives
    if (fs.existsSync(MASTER_PLAN_PATH)) {
      console.log("\n=== MASTER PLAN ===\n");
      console.log(fs.readFileSync(MASTER_PLAN_PATH, 'utf8').substring(0, 2000) + "...");
      if (sessionLogger) {
        await sessionLogger.logSystemAction("LOAD_MASTER_PLAN", {
          file: MASTER_PLAN_PATH,
          timestamp: new Date().toISOString()
        });
      }
      const confirmMaster = await prompt("\nDo you confirm that you have read and understood the MASTER_PLAN.md directives? (yes/no): ");
      if (confirmMaster.toLowerCase() !== 'yes') {
        console.error("Error: You must confirm understanding of the MASTER_PLAN.md directives");
        return false;
      }
      if (sessionLogger) {
        await sessionLogger.logSystemAction("CONFIRM_MASTER_PLAN", {
          confirmed: true,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      console.error(`Error: ${MASTER_PLAN_PATH} not found`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error loading critical files:", error);
    return false;
  }
}

/**
 * Obtain specific confirmations
 */
async function getRequiredConfirmations() {
  console.log("\n=== Required Confirmations ===\n");
  
  const confirmations = [];
  
  for (const confirmation of REQUIRED_CONFIRMATIONS) {
    const response = await prompt(`Do you confirm: "${confirmation.message}" (yes/no): `);
    const confirmed = response.toLowerCase() === 'yes';
    
    confirmations.push({
      id: confirmation.id,
      message: confirmation.message,
      confirmed
    });
    
    if (!confirmed && confirmation.required) {
      console.error(`Error: This confirmation is required to proceed`);
      return false;
    }
  }
  
  // Log the confirmations to Notion in real-time
  if (sessionLogger) {
    await sessionLogger.logSystemAction("REQUIRED_CONFIRMATIONS", {
      confirmations: confirmations,
      timestamp: new Date().toISOString()
    });
  }
  
  return true;
}

/**
 * Register compaction handlers to ensure context preservation
 */
function registerCompactionHandlers() {
  // These handlers would be provided by the Claude Code CLI in a production environment
  // This is a simplified version for demonstration purposes
  
  if (!sessionLogger) {
    console.warn('⚠️ Warning: Cannot register compaction handlers - Session logger not initialized');
    return;
  }
  
  console.log("\n=== Registering Context Compaction Handlers ===\n");
  
  // Log the registration to Notion in real-time
  sessionLogger.logSystemAction("REGISTER_COMPACTION_HANDLERS", {
    timestamp: new Date().toISOString()
  });
  
  // In a real implementation, these would hook into Claude Code's compaction events
  console.log("✅ Compaction handlers registered");
}

/**
 * Main function
 */
async function main() {
  try {
    // Initialize the session logger FIRST to ensure all actions are logged
    const sessionId = await initializeSessionLogger();
    // Log user's request to add ExplainerAgent
    if (sessionLogger) {
      const explainerModel = process.env.EXPLAINER_MODEL || 'gpt-4o';
      await sessionLogger.logSystemAction('REQUEST_EXPLAINER_AGENT', {
        model: explainerModel,
        description: 'User requested detailed explanation agent integration',
        timestamp: new Date().toISOString()
      });
    }

    return {
      success: true,
      sessionId,
      sessionLogger
    };
  } catch (error) {
    console.error("\n❌ Session initialization failed:", error.message);
    
    // Try to log the failure even if initialization failed
    if (sessionLogger) {
      await sessionLogger.logSystemAction("FATAL_ERROR", {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
    
    return {
      success: false,
      error: error.message
    };
  } finally {
    rl.close();
  }
}

// Run the initialization
// Entry point: if called directly, run full initialization or simplified local-context when explicit file arg given
if (require.main === module) {
  const localContextFile = process.argv[2];
  if (localContextFile) {
    // Simplified flow: load context from the specified local file and exit
    (async () => {
      const sessionId = await initializeSessionLogger();
      const fullPath = path.isAbsolute(localContextFile)
        ? localContextFile
        : path.join(process.cwd(), localContextFile);
      if (!fs.existsSync(fullPath)) {
        console.error(`Error: Context file not found: ${fullPath}`);
        process.exit(1);
      }
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split(/\r?\n/);
      await sessionLogger.logSystemAction('LOAD_LOCAL_CONTEXT', {
        file: fullPath,
        linesCount: lines.length,
        timestamp: new Date().toISOString()
      });
      console.log(`✅ Loaded ${lines.length} lines of prior context from ${fullPath}`);
      process.exit(0);
    })().catch(error => {
      console.error('Error loading local context:', error);
      process.exit(1);
    });
  } else {
    // Default full initialization flow
    main()
      .then(result => {
        if (!result.success) process.exit(1);
        global.sessionLogger = sessionLogger;
        process.exit(0);
      })
      .catch(error => {
        console.error('Unhandled error:', error);
        process.exit(1);
      });
  }
}

module.exports = {
  main,
  getSessionLogger: () => sessionLogger
};