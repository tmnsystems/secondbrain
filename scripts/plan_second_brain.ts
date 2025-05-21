/**
 * Script to plan the SecondBrain project using the PlannerAgent
 * This will generate a comprehensive plan and save it to Notion
 */

import { planProject } from '../libs/agents/planner';
import type { Project, PlannerOptions } from '../libs/agents/planner/types';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Check if we have Notion credentials
if (!process.env.NOTION_API_KEY || !process.env.NOTION_ROOT_PAGE_ID) {
  console.log('❌ Notion API key or root page ID not found in .env file');
  console.log('⚙️  Please run the setup_notion.ts script first:');
  console.log('npx tsx scripts/setup_notion.ts');
  process.exit(1);
}

// Define the SecondBrain project
const secondBrainProject: Project = {
  name: 'SecondBrain AI Business Strategist',
  description: 'A comprehensive AI ecosystem for business strategy and execution, including multiple specialized agents and tools designed to liberate serious entrepreneurs from complexity, staff dependency, and marketing hype.',
  objectives: [
    'Build a cohesive platform of AI-powered tools that work together',
    'Implement a multi-agent architecture with specialized roles (Planner, Executor, Notion, Build, Review, Refactor, Orchestrator)',
    'Develop and deploy high-quality SaaS applications for business coaching, content processing, multi-model AI, and CRM',
    'Create scalable and maintainable codebases with excellent documentation',
    'Ensure secure, reliable, and performant user experiences'
  ],
  constraints: [
    'Minimize dependency on third-party tools when alternatives exist',
    'Ensure all tools are simple enough for non-technical users',
    'Prefer modular, flexible, self-owned solutions over lock-in services',
    'Maintain high security standards for user data and API credentials',
    'Budget and resource constraints require efficient development'
  ],
  priorities: [
    'Agent architecture that enables efficient development of all products',
    'Fast time-to-market for MVP versions of each product',
    'Excellent user experience with minimal friction',
    'Reliable infrastructure that scales with user adoption',
    'Focus on core business value first, polish features later'
  ],
  context: {
    currentStatus: 'Core architecture for the Planner Agent is complete, and several products (CoachTinaMarieAI, TubeToTask, NymirAI) are in various stages of development.',
    relatedProjects: [
      'CoachTinaMarieAI: AI-powered strategic coach',
      'TubeToTask: YouTube content analysis tool',
      'NymirAI: Multi-model AI wrapper',
      'ClientManager: Lightweight CRM platform',
      'IncredAgents: AI-powered micro-agents'
    ],
    availableResources: [
      'Next.js and TypeScript expertise',
      'OpenAI and Claude API access',
      'Notion API integration',
      'Vercel and Railway for hosting',
      'Limited development resources'
    ]
  }
};

// Planner options
const plannerOptions: PlannerOptions = {
  detailLevel: 'high',
  timelineRequired: true,
  riskAssessment: true,
  saveToNotion: true // Save the plan to Notion
};

// Main function
async function planSecondBrain() {
  console.log('🧠 Planning SecondBrain project...');
  console.log(`📋 Project: ${secondBrainProject.name}`);
  
  try {
    // Generate plan
    console.log('📊 Generating comprehensive plan...');
    const startTime = Date.now();
    
    const plan = await planProject(secondBrainProject, plannerOptions);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Plan generated in ${duration}s\n`);
    
    // Save plan to JSON file for reference
    const planPath = path.join(process.cwd(), 'second_brain_plan.json');
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
    console.log(`📄 Plan saved to ${planPath}`);
    
    // Display summary of results
    console.log(`\n📊 COMPONENTS: ${plan.analysis.components.length}`);
    console.log(`📊 TASKS: ${plan.tasks.length}`);
    if (plan.timeline) {
      console.log(`📊 TIMELINE: ${plan.timeline.estimatedDuration}`);
      console.log(`📊 MILESTONES: ${plan.timeline.milestones.length}`);
    }
    
    // Display Notion URL if saved
    if (plan.notion?.projectUrl) {
      console.log(`\n🔗 Notion Project URL: ${plan.notion.projectUrl}`);
    }
    
    // Display priority tasks
    const highPriorityTasks = plan.tasks.filter(t => t.priority === 'high');
    console.log(`\n🔥 TOP PRIORITY TASKS (${highPriorityTasks.length}):`);
    highPriorityTasks.forEach((task, i) => {
      console.log(`  ${i+1}. ${task.name}`);
    });
    
    console.log('\n✅ SecondBrain planning complete!');
  } catch (error) {
    console.error('❌ Error planning SecondBrain:', error);
  }
}

// Run the planner
planSecondBrain().catch(console.error);