#!/bin/bash
# setup-bolt.sh - Setup script for Bolt.diy in SecondBrain project
set -e

BOLT_DIR="$(pwd)/bolt-setup"
BOLT_DIY_DIR="$BOLT_DIR/bolt.diy"
API_BRIDGE_DIR="$BOLT_DIR/api-bridge"

echo "Setting up Bolt.diy in SecondBrain project..."

# Create necessary directories
mkdir -p "$BOLT_DIR"
mkdir -p "$API_BRIDGE_DIR"

# Clone Bolt.diy repository if not exists
if [ ! -d "$BOLT_DIY_DIR" ]; then
  echo "Cloning Bolt.diy repository..."
  git clone https://github.com/stackblitz-labs/bolt.diy.git "$BOLT_DIY_DIR"
else
  echo "Bolt.diy repository already exists, updating..."
  cd "$BOLT_DIY_DIR"
  git pull origin main
  cd -
fi

# Create .env.local for Bolt.diy
cat > "$BOLT_DIY_DIR/.env.local" << EOL
# Bolt.diy API Keys
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
# Add other API keys as needed
EOL

# Create API Bridge files
cat > "$API_BRIDGE_DIR/package.json" << EOL
{
  "name": "bolt-api-bridge",
  "version": "1.0.0",
  "description": "API Bridge for Bolt.diy integration with SecondBrain",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "express": "^4.18.2"
  }
}
EOL

cat > "$API_BRIDGE_DIR/.env" << EOL
# API Bridge Configuration
PORT=3030
BOLT_URL=http://localhost:5173
EOL

cat > "$API_BRIDGE_DIR/index.js" << EOL
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3030;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API Bridge is running' });
});

// Code generation endpoint
app.post('/api/generate-code', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    // In a real implementation, this would call Bolt.diy's API
    // For now, we're just simulating a response
    const code = \`// Generated code for: \${prompt}
function exampleCode() {
  console.log("This would be real generated code from Bolt.diy");
  return "Example implementation";
}
\`;
    
    res.json({ success: true, code });
  } catch (error) {
    console.error('Error generating code:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// LangGraph agent endpoint - for integration with LangGraph
app.post('/api/agent', async (req, res) => {
  try {
    const { agentId, input } = req.body;
    
    // This would connect to LangGraph agents
    res.json({ success: true, agentId, response: \`Response for \${agentId}\` });
  } catch (error) {
    console.error('Error with agent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(\`API Bridge running on port \${port}\`);
});
EOL

# Create testing HTML interface
mkdir -p "$API_BRIDGE_DIR/public"
cat > "$API_BRIDGE_DIR/public/index.html" << EOL
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bolt.diy API Bridge Test</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    pre { background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }
    button { padding: 8px 16px; background: #4a5568; color: white; border: none; border-radius: 4px; cursor: pointer; }
    input, textarea { width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 4px; }
    .result { margin-top: 20px; }
  </style>
</head>
<body>
  <h1>Bolt.diy API Bridge Test</h1>
  
  <div>
    <h2>API Health Check</h2>
    <button id="checkHealth">Check Health</button>
    <div class="result" id="healthResult"></div>
  </div>
  
  <div>
    <h2>Generate Code</h2>
    <textarea id="codePrompt" rows="4" placeholder="Enter your code generation prompt here..."></textarea>
    <button id="generateCode">Generate Code</button>
    <div class="result">
      <h3>Result:</h3>
      <pre id="codeResult">// Code will appear here</pre>
    </div>
  </div>
  
  <div>
    <h2>Test Agent Integration</h2>
    <input id="agentId" type="text" placeholder="Agent ID (e.g., 'code-agent', 'content-processor')">
    <textarea id="agentInput" rows="4" placeholder="Input for the agent..."></textarea>
    <button id="testAgent">Test Agent</button>
    <div class="result" id="agentResult"></div>
  </div>

  <script>
    document.getElementById('checkHealth').addEventListener('click', async () => {
      const result = document.getElementById('healthResult');
      result.textContent = 'Checking...';
      
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        result.textContent = JSON.stringify(data, null, 2);
      } catch (error) {
        result.textContent = 'Error: ' + error.message;
      }
    });
    
    document.getElementById('generateCode').addEventListener('click', async () => {
      const prompt = document.getElementById('codePrompt').value;
      const result = document.getElementById('codeResult');
      result.textContent = 'Generating...';
      
      try {
        const response = await fetch('/api/generate-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt })
        });
        const data = await response.json();
        result.textContent = data.code || 'No code generated';
      } catch (error) {
        result.textContent = 'Error: ' + error.message;
      }
    });
    
    document.getElementById('testAgent').addEventListener('click', async () => {
      const agentId = document.getElementById('agentId').value;
      const input = document.getElementById('agentInput').value;
      const result = document.getElementById('agentResult');
      result.textContent = 'Processing...';
      
      try {
        const response = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId, input })
        });
        const data = await response.json();
        result.textContent = JSON.stringify(data, null, 2);
      } catch (error) {
        result.textContent = 'Error: ' + error.message;
      }
    });
  </script>
</body>
</html>
EOL

# Create start scripts
cat > "$BOLT_DIR/start-bolt.sh" << EOL
#!/bin/bash
# Start Bolt.diy server
set -e

BOLT_DIY_DIR="$(pwd)/bolt-setup/bolt.diy"

echo "Starting Bolt.diy server..."
cd "\$BOLT_DIY_DIR"

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "pnpm not found, installing..."
    npm install -g pnpm
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    pnpm install
fi

# Start the development server
pnpm run dev
EOL

cat > "$BOLT_DIR/start-api-bridge.sh" << EOL
#!/bin/bash
# Start API Bridge server
set -e

API_BRIDGE_DIR="$(pwd)/bolt-setup/api-bridge"

echo "Starting API Bridge server..."
cd "\$API_BRIDGE_DIR"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the server
npm start
EOL

# Make scripts executable
chmod +x "$BOLT_DIR/setup-bolt.sh"
chmod +x "$BOLT_DIR/start-bolt.sh"
chmod +x "$BOLT_DIR/start-api-bridge.sh"

echo "Setup complete! You can now run:"
echo "bash $BOLT_DIR/start-bolt.sh"
echo "bash $BOLT_DIR/start-api-bridge.sh"