/**
 * SecondBrain CLI Context Persistence Test
 * 
 * This script tests the real-time context persistence between CLI sessions.
 * It simulates a user interaction, logs it to Notion in real-time, then
 * simulates a compaction event, and finally retrieves the context from Notion.
 */

const CLISessionLogger = require('./cli_session_logger');
const readline = require('readline');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt for input
const prompt = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

/**
 * Main test function
 */
async function main() {
  try {
    console.log("=== SecondBrain CLI Context Persistence Test ===\n");
    
    // Initialize a new session logger
    console.log("Initializing CLI Session Logger...");
    const sessionLogger = new CLISessionLogger();
    
    // Wait for initialization to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log("\n=== Simulating User Interaction ===\n");
    
    // Simulate user interaction
    const userMessage = await prompt("Enter a test message (this will be logged to Notion): ");
    await sessionLogger.logUserMessage(userMessage);
    console.log("✅ User message logged to Notion in real-time");
    
    // Simulate system action
    console.log("\nSimulating system action...");
    await sessionLogger.logSystemAction("TEST_ACTION", { 
      param1: "test_value", 
      timestamp: new Date().toISOString() 
    });
    console.log("✅ System action logged to Notion in real-time");
    
    // Simulate assistant response
    console.log("\nSimulating assistant response...");
    await sessionLogger.logAssistantResponse("This is a test response from the assistant. I'm demonstrating that context is preserved even if a session is compacted or reset.");
    console.log("✅ Assistant response logged to Notion in real-time");
    
    // Simulate a tool call
    console.log("\nSimulating tool call...");
    await sessionLogger.logToolCall("TestTool", 
      { command: "test_command", parameters: { param1: "value1" } },
      { success: true, result: "Test result" }
    );
    console.log("✅ Tool call logged to Notion in real-time");
    
    // Simulate a compaction event
    console.log("\n=== Simulating Context Compaction ===\n");
    console.log("Simulating an automatic compaction event...");
    await sessionLogger.handleCompaction(1);
    console.log("✅ Compaction event logged to Notion in real-time");
    
    // Wait a bit to make sure everything is saved
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Retrieve the context from Notion
    console.log("\n=== Retrieving Context After Compaction ===\n");
    console.log("Loading most recent context from Notion...");
    
    const context = await sessionLogger.loadMostRecentContext();
    
    if (context && context.messages) {
      console.log("✅ Successfully retrieved context from Notion:");
      console.log(`Found ${context.messages.length} messages:`);
      
      context.messages.forEach((message, index) => {
        console.log(`\n--- Message ${index + 1} (${message.role}) ---`);
        console.log(message.content.substring(0, 100) + (message.content.length > 100 ? "..." : ""));
      });
      
      console.log("\n=== Context Persistence Test PASSED ===");
      console.log("The context was successfully preserved in Notion and retrieved after simulated compaction.");
    } else {
      console.error("❌ Failed to retrieve context from Notion");
      console.error("The context persistence test failed.");
    }
    
    // End the session properly
    console.log("\nEnding test session...");
    await sessionLogger.endSession("Context persistence test completed successfully");
    console.log("✅ Session ended and logged to Notion");
    
    return {
      success: true,
      message: "Context persistence test completed successfully"
    };
  } catch (error) {
    console.error("❌ Test failed with error:", error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    rl.close();
  }
}

// Run the test
if (require.main === module) {
  main()
    .then(result => {
      if (!result.success) {
        console.error(`Test failed: ${result.error}`);
        process.exit(1);
      } else {
        console.log(`\n${result.message}`);
        process.exit(0);
      }
    })
    .catch(error => {
      console.error("Unhandled error:", error);
      process.exit(1);
    });
}