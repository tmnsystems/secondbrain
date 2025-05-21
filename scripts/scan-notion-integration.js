#!/usr/bin/env node
/**
 * Scan all apps and the deer-flow component for Notion integration scripts,
 * execute them to verify they run successfully, and log outcomes.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars for Notion API access
dotenv.config({ path: path.resolve(__dirname, '../secondbrain_api_keys.env') });

/**
 * Execute a Node.js script synchronously and report status.
 */
function runScript(scriptPath) {
  const result = spawnSync('node', [scriptPath], { stdio: 'inherit' });
  if (result.error) {
    console.error(`❌ Error executing ${scriptPath}:`, result.error);
  } else if (result.status !== 0) {
    console.error(`❌ Script exited with code ${result.status}: ${scriptPath}`);
  } else {
    console.log(`✅ Script succeeded: ${scriptPath}`);
  }
}

/**
 * Find notion-related scripts in a directory (recursive).
 */
function findNotionScripts(dir) {
  const scripts = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scripts.push(...findNotionScripts(fullPath));
    } else if (/notion.*\.js$/i.test(entry.name)) {
      scripts.push(fullPath);
    }
  }
  return scripts;
}

/**
 * Main scanning routine.
 */
function main() {
  console.log('🔍 Starting scan of Notion integration scripts...');

  // Verify core database connectivity first
  const verifyDbScript = path.resolve(__dirname, 'verify-notion-dbs.js');
  if (fs.existsSync(verifyDbScript)) {
    console.log(`
=== Verifying Notion database connectivity ===`);
    runScript(verifyDbScript);
  }

  // Scan apps directories
  const appsRoot = path.resolve(__dirname, '../apps');
  const targets = fs.existsSync(appsRoot)
    ? fs.readdirSync(appsRoot).map(name => path.join(appsRoot, name)).filter(p => fs.statSync(p).isDirectory())
    : [];

  // Include deer-flow alongside apps
  const deerFlowDir = path.resolve(__dirname, '../deer-flow');
  if (fs.existsSync(deerFlowDir) && fs.statSync(deerFlowDir).isDirectory()) {
    targets.push(deerFlowDir);
  }

  for (const dir of targets) {
    console.log(`
=== Checking Notion scripts in ${path.relative(process.cwd(), dir)} ===`);
    const scripts = findNotionScripts(dir);
    if (scripts.length === 0) {
      console.log('⚠️ No notion*.js scripts found.');
      continue;
    }
    for (const script of scripts) {
      console.log(`
--- Executing ${script} ---`);
      runScript(script);
    }
  }

  console.log('\n🎉 Notion integration scan complete.');
}

main();