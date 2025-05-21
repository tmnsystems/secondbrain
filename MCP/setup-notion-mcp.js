#!/usr/bin/env node
// File: /Volumes/Envoy/MCP/setup-notion-mcp.js
// Setup script for the Notion MCP server

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m"
};

console.log(`${colors.bold}${colors.blue}SecondBrain Notion MCP Server Setup${colors.reset}`);
console.log(`${colors.yellow}This script will set up a Notion MCP server to bypass OpenAI Codex sandbox limitations.${colors.reset}\n`);

// Ensure we're in the correct directory
const mcpDir = '/Volumes/Envoy/MCP';
if (process.cwd() !== mcpDir) {
  try {
    process.chdir(mcpDir);
    console.log(`${colors.green}Working directory set to ${mcpDir}${colors.reset}`);
  } catch (err) {
    console.error(`${colors.red}Error: Could not change to directory ${mcpDir}${colors.reset}`);
    process.exit(1);
  }
}

// Create package.json if it doesn't exist
if (!fs.existsSync(path.join(mcpDir, 'package.json'))) {
  console.log(`Creating package.json...`);
  
  const packageJson = {
    "name": "secondbrain-notion-mcp",
    "version": "1.0.0",
    "description": "MCP server for SecondBrain Notion integration",
    "type": "module",
    "main": "notion-mcp-server.js",
    "scripts": {
      "start": "node notion-mcp-server.js"
    },
    "author": "",
    "license": "ISC"
  };
  
  fs.writeFileSync(path.join(mcpDir, 'package.json'), JSON.stringify(packageJson, null, 2));
  console.log(`${colors.green}Created package.json${colors.reset}`);
}

// Install required packages
const requiredPackages = [
  'mcp-framework',
  '@notionhq/client',
  'dotenv'
];

console.log(`\n${colors.blue}Installing required packages...${colors.reset}`);
try {
  execSync(`npm install ${requiredPackages.join(' ')}`, { stdio: 'inherit' });
  console.log(`${colors.green}Packages installed successfully!${colors.reset}`);
} catch (error) {
  console.error(`${colors.red}Error installing packages: ${error.message}${colors.reset}`);
  console.log(`\nTry running: npm install ${requiredPackages.join(' ')} --save`);
}

// Create executable script to start the server
const startScript = `#!/bin/bash
# Start the Notion MCP server
cd "${mcpDir}"
export MCP_TRANSPORT=sse
export MCP_PORT=3500
export MCP_HOST=localhost
node notion-mcp-server.js
`;

fs.writeFileSync(path.join(mcpDir, 'start-notion-mcp.sh'), startScript);
execSync(`chmod +x ${path.join(mcpDir, 'start-notion-mcp.sh')}`);
console.log(`${colors.green}Created start script at ${path.join(mcpDir, 'start-notion-mcp.sh')}${colors.reset}`);

// Create Claude CLI tool script
const claudeToolScript = `#!/usr/bin/env node
// File: /Volumes/Envoy/MCP/claude-notion-tool.js
// CLI tool for using Notion MCP from scripts

import { execSync } from 'child_process';

async function main() {
  // Get command-line arguments
  const [,, mcpServer, toolName, ...args] = process.argv;
  
  if (!mcpServer || !toolName) {
    console.error('Usage: claude-notion-tool.js <mcp-server-name> <tool-name> [args...]');
    process.exit(1);
  }
  
  try {
    // Format the args for Claude's CLI command
    const formattedArgs = args.map(arg => {
      // If the arg is an object or array, stringify it
      if (typeof arg === 'object') {
        return JSON.stringify(arg);
      }
      // Otherwise, just make sure it's properly quoted
      return \`'\${arg}'\`;
    }).join(' ');
    
    // Build the claude CLI command
    const command = \`claude cli-tool mcp \${mcpServer} \${toolName} \${formattedArgs}\`;
    
    // Execute the command
    const result = execSync(command, { encoding: 'utf8' });
    
    // Parse and output the result
    try {
      const parsedResult = JSON.parse(result);
      console.log(JSON.stringify(parsedResult, null, 2));
    } catch (e) {
      // If it's not valid JSON, just output the raw result
      console.log(result);
    }
  } catch (error) {
    console.error('Error calling MCP tool:', error.message);
    process.exit(1);
  }
}

main();
`;

fs.writeFileSync(path.join(mcpDir, 'claude-notion-tool.js'), claudeToolScript);
execSync(`chmod +x ${path.join(mcpDir, 'claude-notion-tool.js')}`);
console.log(`${colors.green}Created Claude tool script at ${path.join(mcpDir, 'claude-notion-tool.js')}${colors.reset}`);

// Create MCP configuration file for Claude
const configDir = path.join(os.homedir(), '.config', 'claude');
const configPath = path.join(configDir, 'config.json');

// Ensure config directory exists
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
  console.log(`${colors.green}Created Claude config directory at ${configDir}${colors.reset}`);
}

// Load existing config if it exists, or create new one
let config = { mcpServers: {} };
if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log(`${colors.green}Loaded existing Claude config from ${configPath}${colors.reset}`);
  } catch (err) {
    console.warn(`${colors.yellow}Could not parse existing config, creating new one${colors.reset}`);
  }
}

// Add our MCP server to the config
config.mcpServers = config.mcpServers || {};
config.mcpServers['notion-mcp'] = {
  command: 'node',
  args: [path.join(mcpDir, 'notion-mcp-server.js')],
  env: {
    // Server will read from SecondBrain env file
    MCP_TRANSPORT: "sse",
    MCP_PORT: "3500",
    MCP_HOST: "localhost"
  }
};

// Save the updated config
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log(`${colors.green}Updated Claude config at ${configPath}${colors.reset}`);

// Create updated relay script
const updatedRelayScript = `// File: /Volumes/Envoy/SecondBrain/lib/relayNotion.js (updated)
import fetch from "node-fetch";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const RELAY_URL = "http://localhost:4000/relay/notion/page"; // Original relay endpoint
const MCP_URL = "http://localhost:3500"; // MCP server endpoint

/**
 * createPageViaRelay
 * @param {string} dbId
 * @param {string} title
 * @param {object} props
 */
export async function createPageViaRelay(dbId, title, props = {}) {
  try {
    console.log("DEBUG relay DB_ID →", dbId);
    
    // First try the original relay server
    try {
      const res = await fetch(RELAY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId: dbId, title, props }),
      });
      const json = await res.json();
      if (json.ok) return json.id;
    } catch (error) {
      console.log("Original relay failed, trying MCP relay...");
    }
    
    // If original relay fails, try MCP REST API directly
    try {
      const res = await fetch(\`\${MCP_URL}/mcp/rpc\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "createPage",
          params: [dbId, title, props]
        }),
      });
      
      const json = await res.json();
      if (json.result && json.result.id) return json.result.id;
    } catch (error) {
      console.log("MCP API failed, trying command line...");
    }
    
    // Last resort: use command line
    const cmd = \`node /Volumes/Envoy/MCP/claude-notion-tool.js notion-mcp createPage "\${dbId}" "\${title}" '\${JSON.stringify(props)}'\`;
    const { stdout } = await execAsync(cmd);
    
    const result = JSON.parse(stdout);
    if (!result.id) throw new Error("Failed to create page via any method");
    
    return result.id;
  } catch (error) {
    console.error("Relay error:", error.message);
    throw new Error(\`Relay error: \${error.message}\`);
  }
}`;

// Save updated relay script to MCP directory for review
fs.writeFileSync(path.join(mcpDir, 'relayNotion.js.new'), updatedRelayScript);
console.log(`${colors.green}Created updated relay script at ${path.join(mcpDir, 'relayNotion.js.new')}${colors.reset}`);

// Display completion message
console.log(`\n${colors.bold}${colors.green}Setup complete!${colors.reset}`);
console.log(`\nTo start the Notion MCP server, run:
${colors.bold}/Volumes/Envoy/MCP/start-notion-mcp.sh${colors.reset}

To update the relay script in SecondBrain:
${colors.bold}cp /Volumes/Envoy/MCP/relayNotion.js.new /Volumes/Envoy/SecondBrain/lib/relayNotion.js${colors.reset}

To test the Notion MCP server:
${colors.bold}node /Volumes/Envoy/MCP/notion-mcp-server.js${colors.reset}

For rollback instructions, see:
${colors.bold}/Volumes/Envoy/MCP/CHANGELOG.md${colors.reset}`);