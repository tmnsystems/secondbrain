# CRAFT Framework for Prompt Engineering

The CRAFT framework provides a structured approach to prompt engineering that ensures consistency, clarity, and efficiency across all agent interactions. This framework should be used when creating any new prompt templates for SecondBrain systems.

## Framework Components

### C - Context
The Context component provides the AI with relevant background information, constraints, and situational awareness needed to properly address the task.

**Key elements:**
- Domain-specific information
- Relevant background knowledge
- Any constraints or limitations
- Available resources or data
- Previous interactions or history when relevant

**Example:**
```
# Context
You are analyzing a YouTube video transcript from the "AI Explained" channel. The video discusses recent developments in AI agent architectures. You have access to the full transcript and metadata.
```

### R - Role
The Role component establishes the AI's identity, expertise level, and professional orientation for the task.

**Key elements:**
- Specific professional identity
- Level of expertise
- Perspective or approach
- Behavioral characteristics

**Example:**
```
# Role
You are a Strategic AI Analyst specializing in extracting actionable insights from technical content. You have expertise in systems thinking, AI architecture, and business strategy implementation.
```

### A - Action
The Action component defines the specific task or sequence of steps the AI should perform.

**Key elements:**
- Clear, numbered steps
- Specific verbs that indicate the type of cognitive processing
- Decision points or branching logic if applicable
- Any required methodology or specific approach

**Example:**
```
# Action
1. Analyze the provided transcript carefully
2. Identify the core AI agent architecture patterns described
3. Extract 3-5 key strategic insights relevant to business implementation
4. Evaluate how these insights align with our Master Plan
5. Generate specific recommendations based on these insights
```

### F - Format
The Format component specifies how the response should be structured and presented.

**Key elements:**
- Output structure (sections, headings, etc.)
- Length requirements or constraints
- Specific formatting elements (bullet points, numbered lists, tables, etc.)
- Required content elements or sections
- Any metadata or frontmatter requirements

**Example:**
```
# Format
Structure your analysis as a Markdown document with these sections:
- **Key Insights**: Bullet list of 3-5 main takeaways
- **Master Plan Alignment**: How this content supports our strategy
- **Implementation Recommendations**: Specific, actionable next steps
- **Action Items**: Concrete tasks as a checklist

Include YAML frontmatter with:
---
title: "Analysis of [Video Title]"
source: "[Source URL]"
date_analyzed: "[Current Date]"
alignment_score: [0-100]
priority: "[high/medium/low]"
---
```

### T - Target Audience
The Target Audience component specifies who will be consuming the output and their needs.

**Key elements:**
- Who will read/use this output
- Their technical expertise level
- Their specific needs or expectations
- How they will use the information
- What decisions they need to make

**Example:**
```
# Target Audience
Your analysis will be reviewed by the Strategy Team who needs practical implementation recommendations rather than theoretical concepts. Focus on actionable insights that can be directly applied to improve our agent architecture.
```

## Implementation Guide

When implementing prompts using the CRAFT framework:

1. Use clear section headers for each component
2. Order components in the C-R-A-F-T sequence
3. Include all five components in every prompt
4. Adjust the level of detail based on the complexity of the task
5. Review prompts to ensure they follow the framework before deployment

## Benefits

- **Consistency**: Creates a standardized approach across all agents
- **Clarity**: Ensures all necessary information is provided
- **Efficiency**: Reduces token usage by focusing on essential elements
- **Modularity**: Allows components to be adjusted independently
- **Transferability**: Makes prompts reusable across different contexts

## Integration with SecondBrain

All prompts used within TubeToTask, Incredagents, and other SecondBrain systems should follow this framework. Prompts should be stored in the `strategy_library/templates/prompts` directory and versioned appropriately.

The CRAFT framework aligns with the SecondBrain Master Plan by providing a structured approach to agent interactions that supports the Planner-Executor-Reviewer pattern and enables clear communication between specialized agents.