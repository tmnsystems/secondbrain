#!/usr/bin/env node

/**
 * Topics API route fix script
 * This script will check if the topics API routes are correctly configured in the main API Bridge,
 * and if not, restart the API Bridge with the correct configuration.
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

// Path to the main index.js file for the API Bridge
const indexFile = path.join(__dirname, 'index.js');
const serverPidFile = path.join(__dirname, 'server.pid');

// Check if we should restart the existing server
let shouldRestart = false;
let existingPid = null;

try {
  // Check if server is running
  if (fs.existsSync(serverPidFile)) {
    existingPid = parseInt(fs.readFileSync(serverPidFile, 'utf8').trim(), 10);
    
    // Check if the process is still running
    try {
      process.kill(existingPid, 0); // Throws an error if pid is not alive
      shouldRestart = true;
      console.log(`Found existing API Bridge server running with PID ${existingPid}`);
    } catch (e) {
      console.log('No existing API Bridge server is running');
    }
  }
} catch (error) {
  console.error('Error checking server status:', error);
}

// First, test if the topics routes are working
const testApiEndpoint = () => {
  return new Promise((resolve, reject) => {
    const http = require('http');
    const options = {
      hostname: 'localhost',
      port: 3030,
      path: '/api/topics',
      method: 'GET'
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('Topics API route is working correctly');
          resolve(true);
        } else {
          console.log(`Topics API route returned status ${res.statusCode}`);
          console.log(`Response: ${data}`);
          resolve(false);
        }
      });
    });
    
    req.on('error', error => {
      console.error('Error testing API endpoint:', error.message);
      resolve(false);
    });
    
    req.end();
  });
};

// Function to restart the server
const restartServer = () => {
  if (existingPid) {
    console.log(`Stopping existing server with PID ${existingPid}...`);
    try {
      process.kill(existingPid, 'SIGTERM');
      console.log('Existing server stopped');
    } catch (error) {
      console.error('Error stopping server:', error);
    }
  }
  
  console.log('Starting API Bridge server...');
  const server = spawn('node', [indexFile], {
    detached: true,
    stdio: ['ignore', 
      fs.openSync(path.join(__dirname, 'server.log'), 'a'),
      fs.openSync(path.join(__dirname, 'server.log'), 'a')
    ]
  });
  
  server.unref();
  
  // Save the PID for future reference
  fs.writeFileSync(serverPidFile, `${server.pid}`);
  console.log(`API Bridge server started with PID ${server.pid}`);
  
  return server.pid;
};

// Main function to check and fix routes
const main = async () => {
  // Test if the topics API routes are working
  const isWorking = await testApiEndpoint();
  
  if (isWorking) {
    console.log('Topics API routes are already working correctly');
    return;
  }
  
  // If not working, restart the server
  console.log('Topics API routes are not working correctly. Restarting server...');
  
  // Restart the server
  const newPid = restartServer();
  
  // Wait a moment for the server to start
  console.log('Waiting for server to start...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test if the routes are working now
  const isWorkingNow = await testApiEndpoint();
  
  if (isWorkingNow) {
    console.log('Topics API routes are now working correctly');
  } else {
    console.log('Topics API routes are still not working correctly');
    console.log('Please check the server.log file for errors');
    console.log('You may need to manually check the API endpoint configuration in index.js');
  }
};

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});