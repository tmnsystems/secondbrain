import { OrchestratorAgent } from './libs/agents/orchestrator';
import { PlannerAgent } from './libs/agents/planner';
import { ExecutorAgent } from './libs/agents/executor';
import { NotionAgent } from './libs/agents/notion';
import { BuildAgent } from './libs/agents/build';
import { ReviewerAgent } from './libs/agents/reviewer';
import { RefactorAgent } from './libs/agents/refactor';

// Import integrations
import { PlannerOrchestratorIntegration } from './libs/agents/integration/planner-orchestrator';
import { ExecutorOrchestratorIntegration } from './libs/agents/integration/executor-orchestrator';
import { NotionOrchestratorIntegration } from './libs/agents/integration/notion-orchestrator';
import { BuildOrchestratorIntegration } from './libs/agents/integration/build-orchestrator';
import { ReviewerOrchestratorIntegration } from './libs/agents/integration/reviewer-orchestrator';
import { RefactorOrchestratorIntegration } from './libs/agents/integration/refactor-orchestrator';

async function runDemo() {
  console.log('🧠 SecondBrain MCP Demo 🧠');
  console.log('-------------------------');
  
  // Initialize all agents
  console.log('Initializing agents...');
  const orchestrator = new OrchestratorAgent({
    workflowDir: './workflows',
    concurrencyLimit: 5
  });
  
  const planner = new PlannerAgent({
    projectRoot: './demo-project'
  });
  
  const executor = new ExecutorAgent({
    workingDir: './demo-project'
  });
  
  const notion = new NotionAgent({
    apiKey: process.env.NOTION_API_KEY || 'demo-key' 
  });
  
  const build = new BuildAgent({
    templatesDir: './templates',
    outputDir: './demo-project'
  });
  
  const reviewer = new ReviewerAgent({
    projectRoot: './demo-project'
  });
  
  const refactor = new RefactorAgent({
    projectRoot: './demo-project'
  });
  
  // Create integrations
  console.log('Setting up integrations...');
  const plannerOrchestrator = new PlannerOrchestratorIntegration(orchestrator, planner);
  const executorOrchestrator = new ExecutorOrchestratorIntegration(orchestrator, executor);
  const notionOrchestrator = new NotionOrchestratorIntegration(orchestrator, notion);
  const buildOrchestrator = new BuildOrchestratorIntegration(orchestrator, build);
  const reviewerOrchestrator = new ReviewerOrchestratorIntegration(orchestrator, reviewer);
  const refactorOrchestrator = new RefactorOrchestratorIntegration(orchestrator, refactor);
  
  // Create a simple demo workflow
  console.log('Creating demo workflow...');
  
  // 1. Create a plan with the planner
  const requirements = {
    name: 'DemoApp',
    description: 'A simple React application with a button and counter',
    objectives: ['Create React component', 'Add state management', 'Style with CSS'],
    constraints: ['Must use React hooks', 'Mobile-friendly design'],
    priorities: ['Code quality', 'Performance']
  };
  
  console.log('Generating plan from requirements...');
  const plan = await planner.analyzeProject(requirements);
  
  // 2. Convert plan to workflow
  console.log('Converting plan to workflow...');
  const workflow = await plannerOrchestrator.createWorkflowFromPlan(plan);
  console.log(`Created workflow: ${workflow.name} with ${workflow.steps.length} steps`);
  
  // 3. Generate components based on the workflow
  console.log('Generating components...');
  const componentSpec = {
    name: 'DemoComponents',
    components: [
      { 
        name: 'Button',
        type: 'component',
        language: 'typescript',
        framework: 'react'
      },
      {
        name: 'Counter',
        type: 'component',
        language: 'typescript',
        framework: 'react'
      }
    ],
    targetPath: './demo-project/src/components'
  };
  
  const generatedComponents = await buildOrchestrator.generateWorkflowComponents(componentSpec);
  console.log(`Generated ${generatedComponents.components.length} components`);
  
  // 4. Review the workflow for quality
  console.log('Validating workflow quality...');
  const validationResult = await reviewerOrchestrator.validateWorkflowQuality(workflow);
  
  if (validationResult.valid) {
    console.log('Workflow validation passed');
  } else {
    console.log('Workflow validation has suggestions:');
    validationResult.recommendations.forEach((rec, i) => {
      console.log(`  ${i+1}. ${rec}`);
    });
  }
  
  // 5. Optimize the workflow structure
  console.log('Optimizing workflow structure...');
  const optimizedWorkflow = await refactorOrchestrator.optimizeWorkflowStructure(workflow);
  console.log('Workflow structure optimized');
  
  // 6. Check workflow security
  console.log('Checking workflow security...');
  const securityResult = await reviewerOrchestrator.checkWorkflowSecurity(optimizedWorkflow);
  console.log(`Security score: ${securityResult.securityScore}/100 (${securityResult.securityRating})`);
  
  if (securityResult.issues.total > 0) {
    console.log(`Found ${securityResult.issues.total} security issues`);
    console.log('Top recommendations:');
    securityResult.recommendations.slice(0, 3).forEach((rec, i) => {
      console.log(`  ${i+1}. ${rec}`);
    });
  } else {
    console.log('No security issues found');
  }
  
  // 7. Document the workflow
  console.log('Documenting workflow...');
  // (This would normally save to Notion, here we'll just log)
  console.log(`Documentation would be created for workflow: ${optimizedWorkflow.name}`);
  
  console.log('\nDemo completed successfully! 🎉');
}

// Run the demo
runDemo().catch(error => {
  console.error('Demo failed with error:', error);
});