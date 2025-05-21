/**
 * Type definitions for the Refactor Agent
 */

/**
 * RefactorAgent configuration options
 */
export interface RefactorAgentConfig {
  /** Root directory of the project being refactored */
  projectRoot: string;
  
  /** Target language version (e.g., 'typescript@4.5') */
  languageTarget?: string;
  
  /** Target framework version (e.g., 'react@18') */
  frameworkTarget?: string;
  
  /** Preferred code style guide */
  styleGuide?: string;
  
  /** Level of aggressiveness for refactoring */
  refactoringLevel?: 'safe' | 'balanced' | 'aggressive';
  
  /** Patterns to ignore during refactoring */
  ignorePatterns?: string[];
  
  /** Directory where tests are located */
  testDir?: string;
  
  /** Whether to preserve comments during refactoring */
  preserveComments?: boolean;
  
  /** Whether to generate source maps for refactored code */
  generateSourceMaps?: boolean;
  
  /** Log level for the agent */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Code range in a file
 */
export interface CodeRange {
  start: {
    line: number;
    column: number;
  };
  end: {
    line: number;
    column: number;
  };
}

/**
 * Change representation
 */
export interface Change {
  path: string;
  original: string;
  modified: string;
  lineStart: number;
  lineEnd: number;
  description?: string;
}

/**
 * Code Analysis Types
 */

export interface CodeAnalysisResult {
  files: number;
  functions: Array<{
    name: string;
    path: string;
    complexity: number;
    lines: number;
    parameters: number;
    references: number;
  }>;
  classes: Array<{
    name: string;
    path: string;
    methods: number;
    properties: number;
    inheritanceDepth: number;
    references: number;
  }>;
  imports: Array<{
    path: string;
    source: string;
    symbols: string[];
  }>;
  complexity: {
    average: number;
    highest: number;
    distribution: Record<string, number>;
  };
  summary: string;
}

export interface DependencyGraph {
  modules: Record<string, {
    dependencies: string[];
    dependents: string[];
    isExternal: boolean;
  }>;
  circular: Array<string[]>;
  orphaned: string[];
  visualization: string; // DOT format for GraphViz
}

export interface DeadCodeResult {
  unusedFunctions: Array<{
    name: string;
    path: string;
    line: number;
  }>;
  unusedVariables: Array<{
    name: string;
    path: string;
    line: number;
  }>;
  unreachableCode: Array<{
    path: string;
    startLine: number;
    endLine: number;
  }>;
  unusedImports: Array<{
    path: string;
    imports: string[];
    line: number;
  }>;
  recommendations: string[];
  summary: string;
}

export interface DuplicationResult {
  instances: Array<{
    similarity: number;
    size: number;
    files: string[];
    startLines: number[];
    codeFragment: string;
  }>;
  totalDuplication: number; // percentage
  hotspots: string[];
  recommendations: string[];
  summary: string;
}

export interface TechnicalDebtResult {
  score: number; // 0-100, lower is better
  issues: Array<{
    category: 'architecture' | 'code' | 'documentation' | 'test' | 'build';
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    files: string[];
    effort: number; // estimated hours to fix
  }>;
  debtRatio: number; // ratio of time to fix vs. time to implement
  recommendations: string[];
  summary: string;
}

/**
 * Transformation Types
 */

export interface RefactoringPattern {
  name: string;
  description: string;
  type: 'extract' | 'rename' | 'move' | 'inline' | 'replace' | 'reorder' | 'restructure' | 'custom';
  settings?: Record<string, any>;
}

export interface RefactoringResult {
  changes: Change[];
  affectedFiles: number;
  testImpact: string[];
  breakingChanges: boolean;
  warnings: string[];
  summary: string;
}

export interface ExtractionOptions {
  name: string;
  visibility?: 'public' | 'protected' | 'private';
  parameters?: string[];
  returnType?: string;
  extractToFile?: string;
}

export interface ExtractionResult {
  functionName: string;
  changes: Change[];
  affectedLocations: number;
  extractedCode: string;
  summary: string;
}

export interface RenameResult {
  originalName: string;
  newName: string;
  files: string[];
  occurrences: number;
  changes: Change[];
  summary: string;
}

export interface RestructureOptions {
  extractMethods?: string[];
  extractProperties?: string[];
  moveToBaseClass?: boolean;
  moveToSubclass?: boolean;
  transformToFunctional?: boolean;
  applyDesignPattern?: string;
}

export interface RestructureResult {
  changes: Change[];
  oldStructure: string;
  newStructure: string;
  summary: string;
}

export interface NormalizationResult {
  files: string[];
  changes: number;
  formatting: number;
  naming: number;
  patterns: number;
  summary: string;
}

/**
 * Performance Optimization Types
 */

export interface AlgorithmOptimizationResult {
  optimizations: Array<{
    path: string;
    function: string;
    lineStart: number;
    lineEnd: number;
    optimization: string;
    complexityBefore: number;
    complexityAfter: number;
    changes: Change[];
  }>;
  totalOptimizations: number;
  complexityReduction: number;
  summary: string;
}

export interface MemoryOptimizationResult {
  optimizations: Array<{
    path: string;
    function: string;
    lineStart: number;
    lineEnd: number;
    optimization: string;
    changes: Change[];
  }>;
  totalOptimizations: number;
  memoryReduction: string;
  summary: string;
}

export interface AsyncOptimizationResult {
  optimizedFunctions: Array<{
    path: string;
    function: string;
    lineStart: number;
    lineEnd: number;
    optimization: string;
    changes: Change[];
  }>;
  totalOptimizations: number;
  summary: string;
}

export interface LoopOptimizationResult {
  optimizations: Array<{
    path: string;
    lineStart: number;
    lineEnd: number;
    optimization: string;
    changes: Change[];
  }>;
  totalOptimizations: number;
  summary: string;
}

export interface CachingImplementationResult {
  function: string;
  path: string;
  implementation: string;
  changes: Change[];
  summary: string;
}

/**
 * Modernization Types
 */

export interface ModernizationResult {
  upgrades: Array<{
    path: string;
    feature: string;
    before: string;
    after: string;
    lineStart: number;
    lineEnd: number;
  }>;
  syntaxUpgrades: number;
  apiUpgrades: number;
  featureAdoptions: number;
  warnings: string[];
  summary: string;
}

export interface MigrationResult {
  sourceFramework: string;
  targetFramework: string;
  files: string[];
  components: number;
  apis: number;
  syntaxChanges: number;
  changes: Change[];
  warnings: string[];
  summary: string;
}

export interface UpgradeResult {
  targetVersion: string;
  files: string[];
  features: Array<{
    name: string;
    count: number;
    files: string[];
  }>;
  changes: Change[];
  summary: string;
}

export interface APIReplacementResult {
  replacements: Array<{
    path: string;
    lineStart: number;
    oldAPI: string;
    newAPI: string;
    changes: Change[];
  }>;
  totalReplacements: number;
  summary: string;
}

export interface BuildSystemResult {
  configFile: string;
  changes: Change[];
  improvements: string[];
  summary: string;
}

/**
 * Impact Analysis Types
 */

export interface TestImpactResult {
  affectedTests: string[];
  criticalTests: string[];
  testCoverage: {
    before: number;
    after: number;
    change: number;
  };
  recommendations: string[];
  summary: string;
}

export interface BreakingChangeResult {
  breakingChanges: Array<{
    path: string;
    type: 'api' | 'behavior' | 'performance';
    description: string;
    impact: 'critical' | 'high' | 'medium' | 'low';
    affectedDependents: string[];
  }>;
  publicApiChanges: number;
  behavioralChanges: number;
  recommendations: string[];
  summary: string;
}

export interface CompatibilityResult {
  compatible: boolean;
  apiChanges: Array<{
    path: string;
    element: string;
    change: 'added' | 'removed' | 'modified';
    breakingChange: boolean;
    impact: 'critical' | 'high' | 'medium' | 'low';
  }>;
  backwardCompatible: boolean;
  recommendations: string[];
  summary: string;
}

export interface PerformanceImpactResult {
  metrics: {
    before: Record<string, number>;
    after: Record<string, number>;
    change: Record<string, number>;
  };
  improvements: string[];
  regressions: string[];
  recommendations: string[];
  summary: string;
}

export interface DependencyImpactResult {
  affectedDependencies: string[];
  affectedDependents: string[];
  impactedDependencyChain: Array<string[]>;
  breakingChanges: number;
  recommendations: string[];
  summary: string;
}

/**
 * Integrated Refactoring Types
 */

export interface ComponentRefactoringOptions {
  extractMethods?: boolean;
  improvePerformance?: boolean;
  modernize?: boolean;
  restructure?: boolean;
  style?: boolean;
}

export interface ComponentRefactoringResult {
  component: string;
  changes: Change[];
  improvements: string[];
  performance: {
    before: Record<string, number>;
    after: Record<string, number>;
  };
  warnings: string[];
  summary: string;
}

export interface ModuleRefactoringOptions {
  deadCodeRemoval?: boolean;
  duplicationRemoval?: boolean;
  restructure?: boolean;
  optimize?: boolean;
  modernize?: boolean;
}

export interface ModuleRefactoringResult {
  module: string;
  changes: Change[];
  improvements: string[];
  complexity: {
    before: number;
    after: number;
  };
  warnings: string[];
  summary: string;
}

export interface ProjectRefactoringOptions {
  codeStyle?: boolean;
  deadCodeRemoval?: boolean;
  duplicateElimination?: boolean;
  performanceOptimization?: boolean;
  modernization?: {
    languageLevel?: string;
    frameworkUpgrades?: boolean;
    apiUpdates?: boolean;
  };
  verifyTests?: boolean;
  breakingChangesAllowed?: boolean;
}

export interface ProjectRefactoringResult {
  analysisResults: CodeAnalysisResult;
  debtResults: TechnicalDebtResult;
  changes: RefactoringResult[];
  breakingChanges: BreakingChangeResult;
  testImpact: TestImpactResult;
  performanceImpact: PerformanceImpactResult;
  score: number;
  recommendations: string[];
  summary: string;
}