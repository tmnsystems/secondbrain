"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewerAgent = void 0;
const path = __importStar(require("path"));
const staticAnalysis_1 = require("./staticAnalysis");
const testManagement_1 = require("./testManagement");
const performanceAnalysis_1 = require("./performanceAnalysis");
const documentationReview_1 = require("./documentationReview");
const codeReview_1 = require("./codeReview");
// Export all types for external use
__exportStar(require("./types"), exports);
/**
 * ReviewerAgent - Responsible for code quality assurance, testing, and analysis
 * This agent serves as the quality control layer for the MCP architecture
 */
class ReviewerAgent {
    /**
     * Create a new ReviewerAgent instance
     * @param config Configuration options for the Reviewer Agent
     */
    constructor(config = {}) {
        // Default configuration
        this.config = {
            projectRoot: process.cwd(),
            testDir: 'tests',
            coverageThreshold: 80,
            lintConfig: '',
            stylePreference: 'airbnb',
            ignorePatterns: ['node_modules', 'dist', 'build', '.git'],
            logLevel: 'info',
            ...config
        };
        // Resolve project root to absolute path if not already
        if (!path.isAbsolute(this.config.projectRoot)) {
            this.config.projectRoot = path.resolve(process.cwd(), this.config.projectRoot);
        }
    }
    // Static Analysis Methods
    /**
     * Lint code for style and potential issues
     * @param files Array of file paths to lint
     * @returns Lint analysis results
     */
    async lintCode(files) {
        return staticAnalysis_1.staticAnalysis.lint(files, this.config);
    }
    /**
     * Check for type errors in TypeScript files
     * @param files Array of file paths to check
     * @returns Type checking results
     */
    async checkTypes(files) {
        return staticAnalysis_1.staticAnalysis.typeCheck(files, this.config);
    }
    /**
     * Analyze code complexity metrics
     * @param files Array of file paths to analyze
     * @returns Complexity analysis results
     */
    async analyzeComplexity(files) {
        return staticAnalysis_1.staticAnalysis.complexity(files, this.config);
    }
    /**
     * Check for security vulnerabilities
     * @param files Array of file paths to check
     * @returns Security vulnerability results
     */
    async checkSecurityVulnerabilities(files) {
        return staticAnalysis_1.staticAnalysis.security(files, this.config);
    }
    /**
     * Validate code against best practices
     * @param files Array of file paths to validate
     * @returns Best practices validation results
     */
    async validateBestPractices(files) {
        return staticAnalysis_1.staticAnalysis.bestPractices(files, this.config);
    }
    // Test Management Methods
    /**
     * Discover test files in the project
     * @param pattern Optional glob pattern to match test files
     * @returns Array of discovered test files
     */
    async discoverTests(pattern) {
        return testManagement_1.testManagement.discover(pattern || `${this.config.testDir}/**/*.{test,spec}.{js,jsx,ts,tsx}`, this.config);
    }
    /**
     * Run tests and return results
     * @param pattern Optional glob pattern to match test files
     * @param options Test execution options
     * @returns Test execution results
     */
    async runTests(pattern, options) {
        return testManagement_1.testManagement.run(pattern, options, this.config);
    }
    /**
     * Analyze test coverage
     * @param options Coverage analysis options
     * @returns Coverage analysis results
     */
    async analyzeCoverage(options) {
        return testManagement_1.testManagement.coverage(options, this.config);
    }
    /**
     * Generate tests for a file
     * @param file Path to the file to generate tests for
     * @param options Test generation options
     * @returns Generated tests
     */
    async generateTests(file, options) {
        return testManagement_1.testManagement.generate(file, options, this.config);
    }
    // Performance Analysis Methods
    /**
     * Analyze bundle size
     * @param options Bundle analysis options
     * @returns Bundle size analysis results
     */
    async analyzeBundleSize(options) {
        return performanceAnalysis_1.performanceAnalysis.bundleSize(options, this.config);
    }
    /**
     * Measure runtime performance
     * @param scenario Performance test scenario
     * @param options Performance measurement options
     * @returns Performance measurement results
     */
    async measurePerformance(scenario, options) {
        return performanceAnalysis_1.performanceAnalysis.measure(scenario, options, this.config);
    }
    /**
     * Detect memory issues
     * @param scenario Memory test scenario
     * @returns Memory issue detection results
     */
    async detectMemoryIssues(scenario) {
        return performanceAnalysis_1.performanceAnalysis.memoryIssues(scenario, this.config);
    }
    // Documentation Review Methods
    /**
     * Analyze documentation quality and coverage
     * @param files Array of file paths to analyze
     * @returns Documentation analysis results
     */
    async analyzeDocumentation(files) {
        return documentationReview_1.documentationReview.analyze(files, this.config);
    }
    /**
     * Validate API documentation
     * @param file Path to the file to validate
     * @returns API documentation validation results
     */
    async validateApiDocs(file) {
        return documentationReview_1.documentationReview.validateApi(file, this.config);
    }
    /**
     * Check README completeness
     * @returns README validation results
     */
    async checkReadmeCompleteness() {
        return documentationReview_1.documentationReview.validateReadme(this.config);
    }
    // Code Review Methods
    /**
     * Analyze a pull request
     * @param prId Pull request ID
     * @returns Pull request analysis results
     */
    async analyzePullRequest(prId) {
        return codeReview_1.codeReview.analyzePR(prId, this.config);
    }
    /**
     * Review code changes
     * @param oldFile Path to the old version of the file
     * @param newFile Path to the new version of the file
     * @returns Change review results
     */
    async reviewChange(oldFile, newFile) {
        return codeReview_1.codeReview.diff(oldFile, newFile, this.config);
    }
    /**
     * Generate review comments for files
     * @param files Array of file paths to review
     * @returns Generated review comments
     */
    async generateReviewComments(files) {
        return codeReview_1.codeReview.generateComments(files, this.config);
    }
    // Integrated Review Methods
    /**
     * Review an entire project
     * @param options Project review options
     * @returns Comprehensive project review results
     */
    async reviewProject(options) {
        // Combine results from various analysis methods
        // This is a high-level method that orchestrates multiple analyses
        const defaultOptions = {
            linting: true,
            typeChecking: true,
            testing: true,
            coverage: true,
            documentation: true,
            security: true,
            performance: true
        };
        const reviewOptions = { ...defaultOptions, ...options };
        // For now, return a mock ProjectReview
        // This will be implemented fully in a future task
        return {
            lintResults: { issues: [], errorCount: 0, warningCount: 0, fixableCount: 0, summary: 'Not implemented yet' },
            typeResults: { errors: [], hasErrors: false, files: 0, summary: 'Not implemented yet' },
            testResults: { passed: false, passedTests: 0, failedTests: 0, skippedTests: 0, duration: 0, failureDetails: [], summary: 'Not implemented yet' },
            coverageResults: {
                overall: { statements: 0, branches: 0, functions: 0, lines: 0 },
                files: [],
                belowThreshold: [],
                summary: 'Not implemented yet'
            },
            documentationResults: { coverage: 0, missingDocs: [], qualityScore: 0, issues: [], summary: 'Not implemented yet' },
            performanceResults: {
                loadTime: 0,
                firstContentfulPaint: 0,
                largestContentfulPaint: 0,
                timeToInteractive: 0,
                firstInputDelay: 0,
                cumulativeLayoutShift: 0,
                metrics: {},
                recommendations: []
            },
            securityResults: { issues: [], criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0, summary: 'Not implemented yet' },
            score: 0,
            grade: 'F',
            recommendations: ['Implement the reviewer agent fully'],
            summary: 'Project review not fully implemented yet'
        };
    }
    /**
     * Review a component
     * @param componentPath Path to the component to review
     * @returns Component review results
     */
    async reviewComponent(componentPath) {
        // Placeholder - will be implemented in a future task
        return {
            name: path.basename(componentPath),
            path: componentPath,
            issues: [],
            complexity: 0,
            coverage: 0,
            documentation: 0,
            score: 0,
            grade: 'F',
            recommendations: []
        };
    }
    /**
     * Review a single file
     * @param filePath Path to the file to review
     * @returns File review results
     */
    async reviewFile(filePath) {
        // Placeholder - will be implemented in a future task
        return {
            path: filePath,
            lintIssues: [],
            typeIssues: [],
            complexityScore: 0,
            documentationScore: 0,
            testCoverage: 0,
            score: 0,
            grade: 'F',
            recommendations: []
        };
    }
    /**
     * Preflight review for agent commands/actions
     * @param event Details of the event to review
     * @returns Approval status and optional reason
     */
    async preflightReview(event) {
        console.log(`🛡️ ReviewerAgent preflight review:`, event);
        // Auto-approve by default; implement detailed checks as needed
        return { approved: true };
    }
}
exports.ReviewerAgent = ReviewerAgent;
