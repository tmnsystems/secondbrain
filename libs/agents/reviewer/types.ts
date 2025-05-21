/**
 * Type definitions for the Reviewer Agent
 */

/**
 * ReviewerAgent configuration options
 */
export interface ReviewerAgentConfig {
  /** Root directory of the project being reviewed */
  projectRoot: string;
  
  /** Directory where tests are located */
  testDir?: string;
  
  /** Minimum code coverage threshold (percentage) */
  coverageThreshold?: number;
  
  /** Path to linting configuration file */
  lintConfig?: string;
  
  /** Preferred code style */
  stylePreference?: 'airbnb' | 'google' | 'standard' | 'custom';
  
  /** Patterns to ignore during analysis */
  ignorePatterns?: string[];
  
  /** Log level for the agent */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Static Analysis Types
 */

export interface LintIssue {
  filePath: string;
  line: number;
  column: number;
  message: string;
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  source?: string;
  fix?: {
    range: [number, number];
    text: string;
  };
}

export interface LintResult {
  issues: LintIssue[];
  errorCount: number;
  warningCount: number;
  fixableCount: number;
  summary: string;
}

export interface TypeError {
  file: string;
  line: number;
  column: number;
  message: string;
  code: string;
}

export interface TypeCheckResult {
  errors: TypeError[];
  hasErrors: boolean;
  files: number;
  summary: string;
}

export interface ComplexityResult {
  files: Array<{
    path: string;
    complexity: number;
    functions: Array<{
      name: string;
      complexity: number;
      loc: number;
    }>;
  }>;
  averageComplexity: number;
  highComplexityFunctions: number;
}

export interface SecurityIssue {
  id: string;
  filePath: string;
  line?: number;
  column?: number;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  cwe?: string;
  description?: string;
  recommendation?: string;
}

export interface SecurityResult {
  issues: SecurityIssue[];
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  summary: string;
}

export interface BestPracticeIssue {
  filePath: string;
  line: number;
  column: number;
  message: string;
  category: string;
  severity: 'error' | 'warning' | 'info';
  fix?: string;
}

export interface BestPracticesResult {
  issues: BestPracticeIssue[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  categories: Record<string, number>;
  summary: string;
}

/**
 * Test Management Types
 */

export interface TestFile {
  path: string;
  testCount: number;
  suites: string[];
  framework: 'jest' | 'mocha' | 'jasmine' | 'vitest' | 'other';
  type: 'unit' | 'integration' | 'e2e' | 'unknown';
}

export interface TestFailure {
  testName: string;
  suiteName: string;
  filePath: string;
  message: string;
  stack?: string;
  diff?: {
    actual: string;
    expected: string;
  };
}

export interface TestOptions {
  watch?: boolean;
  verbose?: boolean;
  updateSnapshots?: boolean;
  collectCoverage?: boolean;
  bail?: boolean;
  ci?: boolean;
  runInBand?: boolean;
}

export interface TestResult {
  passed: boolean;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
  failureDetails: TestFailure[];
  summary: string;
}

export interface CoverageOptions {
  threshold?: number;
  includePath?: string;
  excludePath?: string;
  reportFormat?: 'json' | 'lcov' | 'text' | 'html';
}

export interface CoverageResult {
  overall: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  files: Array<{
    path: string;
    statements: number;
    branches: number;
    functions: number;
    lines: number;
    uncoveredLines: number[];
  }>;
  belowThreshold: string[];
  summary: string;
}

export interface TestGenerationOptions {
  framework?: 'jest' | 'mocha' | 'jasmine' | 'vitest';
  testStyle?: 'unit' | 'integration' | 'e2e';
  mockStrategy?: 'auto' | 'manual' | 'none';
  coverage?: 'full' | 'critical' | 'minimal';
}

export interface GeneratedTest {
  name: string;
  content: string;
  targetPath: string;
  coverage: {
    functions: string[];
    conditionals: number;
  };
}

/**
 * Performance Analysis Types
 */

export interface BundleAnalysisOptions {
  entry?: string;
  environment?: 'development' | 'production';
  visualize?: boolean;
  compareWithBaseline?: boolean;
}

export interface BundleModule {
  name: string;
  size: number;
  gzipSize: number;
  dependents: string[];
  isExternal: boolean;
}

export interface BundleResult {
  totalSize: number;
  totalGzipSize: number;
  modules: BundleModule[];
  largestModules: BundleModule[];
  duplicates: Array<{
    name: string;
    instances: number;
    totalSize: number;
  }>;
  recommendations: string[];
  summary: string;
}

export interface PerformanceOptions {
  device?: 'mobile' | 'desktop' | 'tablet';
  connection?: 'slow-3g' | 'fast-3g' | '4g' | 'cable';
  iterations?: number;
  url?: string;
}

export interface PerformanceResult {
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  timeToInteractive: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  metrics: Record<string, number>;
  recommendations: string[];
}

export interface MemoryIssue {
  name: string;
  type: 'leak' | 'high-usage' | 'frequent-gc' | 'detached-dom';
  location?: string;
  size?: number;
  impact: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
}

export interface MemoryIssueResult {
  issues: MemoryIssue[];
  totalHeapSize: number;
  usedHeapSize: number;
  gcPauses: number;
  recommendations: string[];
}

/**
 * Documentation Review Types
 */

export interface DocumentationIssue {
  path: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  line?: number;
  suggestion?: string;
}

export interface DocumentationResult {
  coverage: number;
  missingDocs: string[];
  qualityScore: number;
  issues: DocumentationIssue[];
  summary: string;
}

export interface ApiComponent {
  name: string;
  type: 'class' | 'function' | 'interface' | 'type' | 'variable';
  hasDescription: boolean;
  params: Array<{
    name: string;
    hasDescription: boolean;
  }>;
  returns: {
    hasDescription: boolean;
    hasType: boolean;
  };
  examples: number;
}

export interface ApiDocResult {
  components: ApiComponent[];
  coverage: number;
  issues: DocumentationIssue[];
  summary: string;
}

export interface ReadmeSection {
  name: string;
  exists: boolean;
  quality: 'good' | 'partial' | 'poor' | 'missing';
  issues: string[];
}

export interface ReadmeResult {
  sections: Record<string, ReadmeSection>;
  score: number;
  missingRequiredSections: string[];
  issues: DocumentationIssue[];
  summary: string;
}

/**
 * Code Review Types
 */

export interface ReviewComment {
  file: string;
  line: number;
  message: string;
  severity: 'error' | 'warning' | 'suggestion' | 'praise';
  category: string;
  author?: string;
}

export interface PullRequestFile {
  path: string;
  additions: number;
  deletions: number;
  changes: number;
  status: 'added' | 'modified' | 'removed' | 'renamed';
}

export interface PullRequestAnalysis {
  files: number;
  additions: number;
  deletions: number;
  changedFiles: string[];
  criticalFiles: string[];
  testImpact: string[];
  riskAssessment: 'low' | 'medium' | 'high';
  comments: ReviewComment[];
  summary: string;
}

export interface ChangeReview {
  file: string;
  insights: Array<{
    line: number;
    message: string;
    type: 'improvement' | 'regression' | 'neutral' | 'unclear';
    confidence: number;
  }>;
  complexity: {
    before: number;
    after: number;
    change: number;
  };
  recommendations: string[];
}

/**
 * Integrated Review Types
 */

export interface ProjectReviewOptions {
  linting?: boolean;
  typeChecking?: boolean;
  testing?: boolean;
  coverage?: boolean;
  documentation?: boolean;
  security?: boolean;
  performance?: boolean;
}

export interface ProjectReview {
  lintResults: LintResult;
  typeResults: TypeCheckResult;
  testResults: TestResult;
  coverageResults: CoverageResult;
  documentationResults: DocumentationResult;
  performanceResults: PerformanceResult;
  securityResults: SecurityResult;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendations: string[];
  summary: string;
}

export interface ComponentReview {
  name: string;
  path: string;
  issues: Array<{
    message: string;
    severity: 'error' | 'warning' | 'info';
    type: string;
  }>;
  complexity: number;
  coverage: number;
  documentation: number;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendations: string[];
}

export interface FileReview {
  path: string;
  lintIssues: LintIssue[];
  typeIssues: TypeError[];
  complexityScore: number;
  documentationScore: number;
  testCoverage: number;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendations: string[];
}