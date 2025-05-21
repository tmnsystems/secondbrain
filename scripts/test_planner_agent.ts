/**
 * Test script for the Planner Agent
 * Demonstrates core functionality with a sample project
 */

import { planProject } from '../libs/agents/planner';
import type { Project, PlannerOptions } from '../libs/agents/planner/types';

// Sample project for testing
const sampleProject: Project = {
  name: 'Notion Integration for Planner Agent',
  description: 'Integrate the Planner Agent with Notion to enable reading from and writing to Notion databases and pages. This will allow the agent to create project plans, task lists, and specifications in Notion for better visibility and collaboration.',
  objectives: [
    'Implement Notion API client with proper authentication',
    'Create functions to read from Notion databases and pages',
    'Develop methods to write plans, tasks, and specifications to Notion',
    'Ensure proper formatting and structure of Notion content',
    'Handle synchronization between local plans and Notion'
  ],
  constraints: [
    'Must work within Notion API rate limits',
    'Should handle connection issues gracefully',
    'Must securely store and use Notion API credentials'
  ],
  priorities: [
    'Security of API credentials',
    'Robust error handling',
    'User-friendly Notion page formatting',
    'Performance with large documents'
  ],
  context: {
    currentStatus: 'Planner Agent core functionality has been implemented locally, but without Notion integration.',
    relatedProjects: [
      'Executor Agent (will consume plans from Notion)',
      'Notion Agent (will provide additional Notion capabilities)'
    ],
    availableResources: [
      'Notion API documentation',
      'Existing Planner Agent codebase',
      'TypeScript expertise'
    ]
  }
};

// Test options
const testOptions: PlannerOptions = {
  detailLevel: 'high',
  timelineRequired: true,
  riskAssessment: true
};

/**
 * Main test function
 */
async function runPlannerTest() {
  console.log('⏳ Starting Planner Agent test...');
  console.log(`📋 Project: ${sampleProject.name}`);
  
  try {
    // Generate plan
    console.log('🧠 Generating project plan...');
    const startTime = Date.now();
    
    const plan = await planProject(sampleProject, testOptions);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Plan generated in ${duration}s\n`);
    
    // Display results
    console.log('📊 ANALYSIS SUMMARY:');
    console.log(plan.analysis.summary);
    console.log(`\n📊 COMPONENTS IDENTIFIED: ${plan.analysis.components.length}`);
    plan.analysis.components.forEach((component, i) => {
      console.log(`  ${i+1}. ${component}`);
    });
    
    console.log(`\n📊 DEPENDENCIES IDENTIFIED: ${plan.analysis.dependencies.length}`);
    plan.analysis.dependencies.forEach((dep, i) => {
      console.log(`  ${i+1}. ${dep.from} → ${dep.to}${dep.description ? `: ${dep.description}` : ''}`);
    });
    
    if (plan.analysis.risks) {
      console.log(`\n📊 RISKS IDENTIFIED: ${plan.analysis.risks.length}`);
      plan.analysis.risks.forEach((risk, i) => {
        console.log(`  ${i+1}. ${risk.description} (Impact: ${risk.impact}, Probability: ${risk.probability})`);
        if (risk.mitigation) console.log(`     Mitigation: ${risk.mitigation}`);
      });
    }
    
    console.log(`\n📋 TASKS GENERATED: ${plan.tasks.length}`);
    plan.tasks.forEach((task, i) => {
      console.log(`  ${i+1}. ${task.name} (Priority: ${task.priority}, Effort: ${task.effort})`);
      console.log(`     ${task.description.substring(0, 100)}...`);
      if (task.dependencies.length > 0) {
        console.log(`     Dependencies: ${task.dependencies.join(', ')}`);
      }
    });
    
    if (plan.timeline) {
      console.log(`\n📅 TIMELINE: ${plan.timeline.estimatedDuration}`);
      plan.timeline.milestones.forEach((milestone, i) => {
        console.log(`  ${i+1}. ${milestone.name} - ${milestone.date}`);
        console.log(`     Tasks: ${milestone.tasks.join(', ')}`);
        if (milestone.description) {
          console.log(`     ${milestone.description}`);
        }
      });
    }
    
    if (plan.specifications) {
      console.log(`\n📝 SPECIFICATIONS: ${Object.keys(plan.specifications).length} tasks have detailed specs`);
      for (const [taskId, spec] of Object.entries(plan.specifications)) {
        const task = plan.tasks.find(t => t.id === taskId);
        if (task) {
          console.log(`\n📝 Specification for: ${task.name}`);
          console.log(`   Length: ${spec.length} chars`);
          console.log(`   Preview: ${spec.substring(0, 150)}...`);
        }
      }
    }
    
    if (plan.validation) {
      console.log('\n✅ VALIDATION RESULTS:');
      console.log(`  Valid: ${plan.validation.valid}`);
      
      if (plan.validation.issues) {
        console.log(`  Issues: ${plan.validation.issues.length}`);
        plan.validation.issues.forEach(issue => console.log(`   - ${issue}`));
      }
      
      if (plan.validation.warnings) {
        console.log(`  Warnings: ${plan.validation.warnings.length}`);
        plan.validation.warnings.forEach(warning => console.log(`   - ${warning}`));
      }
      
      if (plan.validation.suggestions) {
        console.log(`  Suggestions: ${plan.validation.suggestions.length}`);
        plan.validation.suggestions.forEach(suggestion => console.log(`   - ${suggestion}`));
      }
    }
    
    console.log('\n✅ Planner Agent test completed successfully');
  } catch (error) {
    console.error('❌ Error in Planner Agent test:', error);
  }
}

// Run the test
runPlannerTest().catch(console.error);