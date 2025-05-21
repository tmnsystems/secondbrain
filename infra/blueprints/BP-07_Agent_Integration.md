# Blueprint 07: Agent Integration System

## Overview
This blueprint establishes an intelligent context loading system that efficiently provides LLM agents with precisely the code and context they need, optimizing token usage while ensuring comprehensive understanding.

## Implementation Details

### ContextLoader Implementation
```typescript
// context_loader.ts - Core context loading system for agents
import { SourcegraphClient } from './sourcegraph';
import { PostgresClient } from './postgres';
import { PineconeClient } from './pinecone';

export class ContextLoader {
  private sourcegraph: SourcegraphClient;
  private postgres: PostgresClient;
  private pinecone: PineconeClient;
  
  constructor() {
    this.sourcegraph = new SourcegraphClient(process.env.SOURCEGRAPH_URL);
    this.postgres = new PostgresClient(process.env.POSTGRES_URL);
    this.pinecone = new PineconeClient(
      process.env.PINECONE_API_KEY,
      process.env.PINECONE_ENVIRONMENT
    );
  }
  
  /**
   * Provides relevant context to an agent based on task requirements
   */
  async loadContextForTask(taskId: string, query: string, maxTokens: number = 4000): Promise<ContextPackage> {
    // Get task metadata from Postgres
    const task = await this.postgres.getTask(taskId);
    
    // Search for code using Sourcegraph structural search
    const searchResults = await this.sourcegraph.search({
      patternType: 'structural',
      query: `repo:^secondbrain$ ${query}`,
      limit: 20
    });
    
    // Get file summaries from Postgres for context enhancement
    const fileInfos = await Promise.all(
      searchResults.results.map(r => this.postgres.getFileInfo(r.path))
    );
    
    // Get relevant vector embeddings from Pinecone
    const semanticMatches = await this.pinecone.search(query, {
      topK: 5,
      filter: { type: "code_context" }
    });
    
    // Sort results by strategic relevance and semantic similarity
    const prioritizedResults = await this.prioritizeResults(
      searchResults.results,
      fileInfos,
      semanticMatches,
      task
    );
    
    // Calculate token estimates and limit total context size
    const tokenEstimate = (text: string) => Math.ceil(text.length / 4);
    let totalTokens = 0;
    const selectedContext: CodeContext[] = [];
    
    for (const result of prioritizedResults) {
      // Fetch file content if needed
      if (!result.content) {
        result.content = await this.sourcegraph.getFileContent(result.path);
      }
      
      const tokens = tokenEstimate(result.content);
      if (totalTokens + tokens <= maxTokens) {
        selectedContext.push({
          path: result.path,
          content: result.content,
          relevance: result.relevance,
          description: result.description || "No description available"
        });
        totalTokens += tokens;
      }
    }
    
    return {
      task: task,
      contexts: selectedContext,
      totalTokens: totalTokens,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Prioritizes results based on strategic importance and relevance
   */
  private async prioritizeResults(
    searchResults: SourcegraphResult[],
    fileInfos: FileInfo[],
    semanticMatches: PineconeMatch[],
    task: TaskInfo
  ): Promise<PrioritizedResult[]> {
    // Map of paths to semantic scores
    const semanticScores = new Map(
      semanticMatches.map(m => [m.metadata.path, m.score])
    );
    
    // Map file info to results
    const merged = searchResults.map((result, i) => {
      const fileInfo = fileInfos[i];
      const semanticScore = semanticScores.get(result.path) || 0;
      
      // Calculate strategic relevance
      const strategicRelevance = fileInfo.isStrategicComponent ? 1.2 : 1.0;
      
      // Calculate overall relevance score
      const relevance = (
        (semanticScore * 0.4) + 
        (result.matches.length / 10 * 0.3) + 
        (fileInfo.accessCount / 100 * 0.1) + 
        (strategicRelevance * 0.2)
      );
      
      return {
        path: result.path,
        matches: result.matches,
        relevance: relevance,
        description: fileInfo.description,
        strategicComponent: fileInfo.isStrategicComponent,
        content: null // Lazy-loaded later
      };
    });
    
    // Sort by overall relevance score
    return merged.sort((a, b) => b.relevance - a.relevance);
  }
}
```

### Strategic Priority Engine
```typescript
// priority_engine.ts - Determines strategic importance of code elements
import { PostgresClient } from './postgres';

export class StrategicPriorityEngine {
  private postgres: PostgresClient;
  
  constructor(postgresUrl: string) {
    this.postgres = new PostgresClient(postgresUrl);
  }
  
  /**
   * Analyzes the strategic importance of code components
   */
  async analyzeStrategicImportance(): Promise<void> {
    // Get file dependencies from Sourcegraph
    const dependencies = await this.getCodeDependencies();
    
    // Build dependency graph
    const graph = this.buildDependencyGraph(dependencies);
    
    // Calculate centrality metrics
    const centralityScores = this.calculateCentrality(graph);
    
    // Update strategic importance in database
    for (const [file, score] of Object.entries(centralityScores)) {
      await this.postgres.updateStrategicImportance(file, score);
    }
  }
  
  /**
   * Builds a dependency graph from code relationships
   */
  private buildDependencyGraph(dependencies: Dependency[]): DependencyGraph {
    const graph: DependencyGraph = {};
    
    // Initialize all nodes
    for (const dep of dependencies) {
      if (!graph[dep.source]) graph[dep.source] = { imports: [], importedBy: [] };
      if (!graph[dep.target]) graph[dep.target] = { imports: [], importedBy: [] };
    }
    
    // Add relationships
    for (const dep of dependencies) {
      graph[dep.source].imports.push(dep.target);
      graph[dep.target].importedBy.push(dep.source);
    }
    
    return graph;
  }
  
  /**
   * Calculates centrality metrics for graph nodes
   */
  private calculateCentrality(graph: DependencyGraph): Record<string, number> {
    const scores: Record<string, number> = {};
    
    for (const [file, connections] of Object.entries(graph)) {
      // PageRank-inspired scoring (simplified)
      const importScore = connections.imports.length;
      const importedByScore = connections.importedBy.length * 1.5; // Being imported is more significant
      
      // Calculate overall importance
      scores[file] = importScore + importedByScore;
    }
    
    // Normalize scores
    const maxScore = Math.max(...Object.values(scores));
    for (const file of Object.keys(scores)) {
      scores[file] = scores[file] / maxScore;
    }
    
    return scores;
  }
  
  /**
   * Gets code dependencies from Sourcegraph
   */
  private async getCodeDependencies(): Promise<Dependency[]> {
    // Implementation details omitted
    // Uses Sourcegraph API to extract import/export relationships
    return [];
  }
}

interface Dependency {
  source: string;
  target: string;
  type: 'import' | 'inheritance' | 'function_call';
}

interface DependencyGraph {
  [file: string]: {
    imports: string[];
    importedBy: string[];
  };
}
```

### Agent Context API
```typescript
// agent_context_api.ts - API for agents to request context
import { ContextLoader } from './context_loader';
import express from 'express';

const app = express();
app.use(express.json());

const contextLoader = new ContextLoader();

// API endpoint for context retrieval
app.post('/api/context', async (req, res) => {
  try {
    const { taskId, query, maxTokens } = req.body;
    
    if (!taskId || !query) {
      return res.status(400).json({
        error: 'Missing required parameters: taskId and query are required'
      });
    }
    
    const context = await contextLoader.loadContextForTask(
      taskId,
      query,
      maxTokens || 4000
    );
    
    return res.json(context);
  } catch (error) {
    console.error('Error retrieving context:', error);
    return res.status(500).json({
      error: 'Failed to retrieve context',
      details: error.message
    });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Agent Context API running on port ${PORT}`);
});
```

### LLM Prompt Template for Context Usage
```typescript
// prompt_templates.ts - Templates for using context in LLM prompts
export const codeAnalysisPrompt = `
You are analyzing code from the SecondBrain project.
Below is the relevant context for your task:

{{#each contexts}}
=== FILE: {{path}} ===
{{description}}

\`\`\`
{{content}}
\`\`\`

{{/each}}

Based on the code above, please perform the following task:
{{task.description}}
`;

export const codeCompletionPrompt = `
You are completing code for the SecondBrain project.
Below is the relevant context for your task:

{{#each contexts}}
=== FILE: {{path}} ===
{{description}}

\`\`\`
{{content}}
\`\`\`

{{/each}}

Please complete the following code according to the task:
{{task.description}}

The implementation should be:
\`\`\`
`;
```

## Benefits
- **Token Optimization**: Provides exactly the code agents need
- **Strategic Prioritization**: Focuses on the most important components
- **Semantic Relevance**: Uses Pinecone embeddings for context selection
- **Expert Context**: File descriptions and strategic importance guide understanding
- **Full System Integration**: Works with Sourcegraph, Postgres, and Pinecone

## Next Steps
1. Implement ContextLoader with Sourcegraph integration
2. Develop Strategic Priority Engine for code importance analysis
3. Create Agent Context API for standardized access
4. Define prompt templates for consistent context usage
5. Integrate with existing agent systems

<!-- BP-07_AGENT_INTEGRATION v1.0 SHA:fg89hij0 -->