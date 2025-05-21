# SecondBrain Planner Agent

The Planner Agent for SecondBrain is now implemented and ready to use! This tool will help you plan and organize projects, breaking them down into actionable tasks with priorities, timelines, and detailed specifications.

## What It Does

The Planner Agent:
1. Takes a project description with objectives, constraints, and priorities
2. Breaks it down into actionable tasks
3. Prioritizes tasks based on dependencies and business value
4. Creates a timeline with milestones
5. Generates detailed specifications for high-priority tasks
6. Saves everything to Notion for easy access and collaboration

## Getting Started

### 1. Install Required Packages

```bash
npm install @notionhq/client uuid dotenv
```

### 2. Set Up Notion Integration

First, you need to create a Notion integration and set up the databases:

```bash
npx tsx scripts/setup_notion.ts
```

This script will:
1. Ask for your Notion API key (or use it from .env if available)
2. Ask for a parent page ID where the databases will be created
3. Create a Projects database and a Tasks database in Notion
4. Save the configuration to a .env file

### 3. Plan the SecondBrain Project

Once Notion is set up, you can run the planning script:

```bash
npx tsx scripts/plan_second_brain.ts
```

This will:
1. Generate a comprehensive plan for the SecondBrain project
2. Create a project in your Notion workspace
3. Add all tasks, specifications, and timeline to Notion
4. Save a copy of the plan as a JSON file

## How to Use for Other Projects

You can use the Planner Agent for any project by creating a script similar to `plan_second_brain.ts`:

```typescript
import { planProject } from '../libs/agents/planner';
import type { Project, PlannerOptions } from '../libs/agents/planner/types';

// Define your project
const myProject: Project = {
  name: 'My Project Name',
  description: 'Project description...',
  objectives: [
    'Objective 1',
    'Objective 2',
    // ...
  ],
  constraints: [
    'Constraint 1',
    'Constraint 2',
    // ...
  ],
  priorities: [
    'Priority 1',
    'Priority 2',
    // ...
  ]
};

// Define planning options
const options: PlannerOptions = {
  detailLevel: 'high',
  timelineRequired: true,
  riskAssessment: true,
  saveToNotion: true
};

// Generate and save the plan
async function planMyProject() {
  const plan = await planProject(myProject, options);
  console.log(`Plan created in Notion: ${plan.notion?.projectUrl}`);
}

planMyProject();
```

## Features

### AI-Powered Analysis

The Planner Agent uses Claude AI to analyze your project and identify:
- Key components
- Dependencies between components
- Potential risks and mitigation strategies

### Comprehensive Task Generation

Tasks are generated with:
- Clear descriptions
- Priority levels (high, medium, low)
- Effort estimates (story points)
- Dependencies between tasks

### Timeline and Milestones

The timeline includes:
- Overall project duration estimate
- Milestones with target dates
- Tasks grouped by milestone
- Logical sequencing based on dependencies

### Detailed Specifications

For high-priority tasks, the system generates detailed specifications including:
- Requirements and acceptance criteria
- Technical approach
- Interface definitions
- Testing considerations
- Assumptions and constraints

### Notion Integration

Everything is saved to Notion with:
- A project page with full description
- A tasks database linked to the project
- Detailed specifications for each task
- A timeline with milestones

## What's Next?

After planning the SecondBrain project, you'll have a clear roadmap to follow. The next steps are:

1. Review the plan in Notion
2. Start working on high-priority tasks
3. Track progress by updating task status in Notion
4. Implement the Executor Agent to help with task execution

Happy planning!