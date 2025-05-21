// File: /Volumes/Envoy/SecondBrain/lib/relayNotion.js (updated)
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
      const res = await fetch(`${MCP_URL}/mcp/rpc`, {
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
    const cmd = `node /Volumes/Envoy/MCP/claude-notion-tool.js notion-mcp createPage "${dbId}" "${title}" '${JSON.stringify(props)}'`;
    const { stdout } = await execAsync(cmd);
    
    const result = JSON.parse(stdout);
    if (!result.id) throw new Error("Failed to create page via any method");
    
    return result.id;
  } catch (error) {
    console.error("Relay error:", error.message);
    throw new Error(`Relay error: ${error.message}`);
  }
}