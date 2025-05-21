#!/usr/bin/env node

/**
 * Gemini CLI - Command-line interface for Google's Gemini models
 * Allows direct interactions with Gemini models from your terminal
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configuration
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
const HISTORY_FILE = path.join(__dirname, '.gemini-history.json');

// Check for API key
if (!API_KEY) {
  console.error('\x1b[31mError: GEMINI_API_KEY environment variable is not set.\x1b[0m');
  console.error('Please set your Gemini API key in .env file or pass it as GEMINI_API_KEY environment variable.');
  process.exit(1);
}

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '\x1b[32mGemini>\x1b[0m ',
  historySize: 100,
});

// Conversation history
let conversationHistory = [];

// Check for existing history
if (fs.existsSync(HISTORY_FILE)) {
  try {
    conversationHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  } catch (err) {
    console.warn('Could not load conversation history, starting fresh.');
  }
}

// Save conversation history
const saveHistory = () => {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(conversationHistory, null, 2));
};

// Start chat session
const chat = model.startChat({
  history: conversationHistory.map(item => ({
    role: item.role,
    parts: [{ text: item.text }],
  })),
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 8192,
  },
});

// Welcome message
console.log('\x1b[1m\x1b[34m=== Gemini CLI - Terminal Interface ===\x1b[0m');
console.log(`Model: ${MODEL_NAME}`);
console.log('Type your query or command (type "exit" or press Ctrl+C to quit, "help" for more options)\n');

// Process user input
async function processInput(input) {
  // Handle special commands
  if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
    saveHistory();
    rl.close();
    return;
  }
  
  if (input.toLowerCase() === 'help') {
    console.log('\n\x1b[1m\x1b[34mCommands:\x1b[0m');
    console.log('- \x1b[33mexit\x1b[0m or \x1b[33mquit\x1b[0m: Exit the program');
    console.log('- \x1b[33mhelp\x1b[0m: Show this help message');
    console.log('- \x1b[33mclear\x1b[0m: Clear the conversation history');
    console.log('- \x1b[33msave <filename>\x1b[0m: Save the conversation to a file');
    console.log('- \x1b[33mload <filename>\x1b[0m: Load a conversation from a file');
    console.log('- \x1b[33mfile:path/to/file.txt\x1b[0m: Include file content in your query\n');
    rl.prompt();
    return;
  }
  
  if (input.toLowerCase() === 'clear') {
    conversationHistory = [];
    console.log('\x1b[33mConversation history cleared.\x1b[0m');
    rl.prompt();
    return;
  }
  
  if (input.startsWith('save ')) {
    const filename = input.substring(5);
    try {
      fs.writeFileSync(filename, JSON.stringify(conversationHistory, null, 2));
      console.log(`\x1b[33mConversation saved to ${filename}\x1b[0m`);
    } catch (error) {
      console.error(`\x1b[31mError saving file: ${error.message}\x1b[0m`);
    }
    rl.prompt();
    return;
  }
  
  if (input.startsWith('load ')) {
    const filename = input.substring(5);
    try {
      const data = fs.readFileSync(filename, 'utf8');
      conversationHistory = JSON.parse(data);
      console.log(`\x1b[33mConversation loaded from ${filename}\x1b[0m`);
    } catch (error) {
      console.error(`\x1b[31mError loading file: ${error.message}\x1b[0m`);
    }
    rl.prompt();
    return;
  }
  
  // Handle file inclusion
  if (input.startsWith('file:')) {
    const filePath = input.substring(5);
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      input = `Processing the following file content (${filePath}):\n\n${fileContent}`;
      console.log(`\x1b[33mFile loaded: ${filePath}\x1b[0m`);
    } catch (error) {
      console.error(`\x1b[31mError reading file: ${error.message}\x1b[0m`);
      rl.prompt();
      return;
    }
  }
  
  // Add user message to history
  conversationHistory.push({
    role: 'user',
    text: input
  });
  
  // Print "thinking" message
  process.stdout.write('\x1b[33mThinking...\x1b[0m');
  
  try {
    // Send message to Gemini
    const result = await chat.sendMessage(input);
    const response = result.response;
    const responseText = response.text();
    
    // Clear "thinking" message
    process.stdout.write('\r\x1b[K');
    
    // Add assistant response to history
    conversationHistory.push({
      role: 'model',
      text: responseText
    });
    
    // Display the response
    console.log('\x1b[34m' + responseText + '\x1b[0m\n');
    
    // Save history after each interaction
    saveHistory();
  } catch (error) {
    // Clear "thinking" message
    process.stdout.write('\r\x1b[K');
    console.error(`\x1b[31mError: ${error.message}\x1b[0m`);
  }
  
  rl.prompt();
}

// Setup readline interface
rl.prompt();
rl.on('line', async (line) => {
  if (line.trim()) {
    await processInput(line.trim());
  } else {
    rl.prompt();
  }
}).on('close', () => {
  console.log('\nGoodbye!');
  process.exit(0);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  saveHistory();
  rl.close();
});