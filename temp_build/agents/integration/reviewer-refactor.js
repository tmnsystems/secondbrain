"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewerRefactorIntegration = void 0;
/**
 * Integration between Reviewer Agent and Refactor Agent
 * Provides quality verification for refactorings and suggestions for improvements
 */
class ReviewerRefactorIntegration {
    /**
     * Create a new ReviewerRefactorIntegration instance
     * @param reviewer ReviewerAgent instance
     * @param refactor RefactorAgent instance
     */
    constructor(reviewer, refactor) {
        this.reviewer = reviewer;
        this.refactor = refactor;
    }
    /**
     * Review a refactoring to ensure quality
     * @param changes Refactoring result to review
     * @returns Refactoring review results
     */
    async reviewRefactoring(changes) {
        // Extract affected files from changes
        const affectedFiles = [...new Set(changes.changes.map(change => change.path))];
        // Validate each file
        const lintResults = await this.reviewer.lintCode(affectedFiles);
        const typeResults = await this.reviewer.checkTypes(affectedFiles);
        // Run tests if impacted
        let testResults = null;
        if (changes.testImpact.length > 0) {
            testResults = await this.reviewer.runTests();
        }
        // Generate summary
        return {
            approved: lintResults.errorCount === 0 && !typeResults.hasErrors && (!testResults || testResults.passed),
            lintIssues: lintResults.issues,
            typeIssues: typeResults.errors,
            testResults,
            breakingChanges: changes.breakingChanges,
            recommendations: [
                ...(lintResults.errorCount > 0 ? ['Fix linting issues before proceeding'] : []),
                ...(typeResults.hasErrors ? ['Fix type errors before proceeding'] : []),
                ...(testResults && !testResults.passed ? ['Fix failing tests before proceeding'] : [])
            ],
            summary: `Refactoring review: ${lintResults.errorCount + (typeResults.hasErrors ? typeResults.errors.length : 0)} issues found, ${changes.breakingChanges ? 'contains breaking changes' : 'no breaking changes'}`
        };
    }
    /**
     * Suggest refactorings based on code analysis
     * @param analysisResults Code analysis results
     * @returns Refactoring suggestions
     */
    async suggestRefactorings(analysisResults) {
        // This is a placeholder implementation that will be replaced with actual suggestion logic
        const suggestions = [];
        // Suggest function extraction for complex functions
        const complexFunctions = analysisResults.functions
            .filter(fn => fn.complexity > 10)
            .slice(0, 5);
        for (const fn of complexFunctions) {
            suggestions.push({
                type: 'extract',
                targetPath: fn.path,
                targetElement: fn.name,
                reason: `Function has high complexity (${fn.complexity})`,
                priority: fn.complexity > 15 ? 'high' : 'medium',
                description: `Extract smaller functions from ${fn.name} to reduce complexity`
            });
        }
        // Suggest class restructuring for large classes
        const largeClasses = analysisResults.classes
            .filter(cls => cls.methods > 10 || cls.properties > 10)
            .slice(0, 5);
        for (const cls of largeClasses) {
            suggestions.push({
                type: 'restructure',
                targetPath: cls.path,
                targetElement: cls.name,
                reason: `Class has too many methods (${cls.methods}) or properties (${cls.properties})`,
                priority: cls.methods + cls.properties > 20 ? 'high' : 'medium',
                description: `Split ${cls.name} into smaller, more focused classes`
            });
        }
        return {
            suggestions,
            summary: `Generated ${suggestions.length} refactoring suggestions based on code analysis`,
            priorityCount: {
                high: suggestions.filter(s => s.priority === 'high').length,
                medium: suggestions.filter(s => s.priority === 'medium').length,
                low: suggestions.filter(s => s.priority === 'low').length
            }
        };
    }
    /**
     * Validate the impact of a refactoring
     * @param changes Refactoring result to validate
     * @returns Impact validation results
     */
    async validateRefactoringImpact(changes) {
        // This is a placeholder implementation that will be replaced with actual validation logic
        // In a real implementation, this would do deeper analysis of the impact
        const affectedFiles = [...new Set(changes.changes.map(change => change.path))];
        // Analyze test impact
        const testImpact = changes.testImpact.length > 0 ?
            'Tests will be affected by this refactoring' :
            'No tests appear to be affected by this refactoring';
        // Check for breaking changes
        const breakingChangesImpact = changes.breakingChanges ?
            'This refactoring contains breaking changes that may affect dependent code' :
            'This refactoring appears to maintain backward compatibility';
        return {
            impact: changes.breakingChanges ? 'high' : (changes.testImpact.length > 0 ? 'medium' : 'low'),
            affectedFilesCount: affectedFiles.length,
            testImpact,
            breakingChangesImpact,
            recommendations: changes.breakingChanges ?
                ['Document breaking changes', 'Update affected dependencies', 'Consider versioning changes'] :
                [],
            summary: `Impact analysis: ${affectedFiles.length} files affected, ${changes.breakingChanges ? 'contains breaking changes' : 'backward compatible'}, ${changes.testImpact.length} tests potentially affected`
        };
    }
}
exports.ReviewerRefactorIntegration = ReviewerRefactorIntegration;
