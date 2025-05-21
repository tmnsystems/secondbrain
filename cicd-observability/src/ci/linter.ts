/**
 * Linting Utilities
 * 
 * This module provides utilities for running code linting and formatting
 * within CI/CD pipelines.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Severity level for linting issues
 */
export enum LintSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  HINT = 'hint',
}

/**
 * Interface for a linting issue
 */
export interface LintIssue {
  severity: LintSeverity;
  ruleId: string;
  message: string;
  line: number;
  column: number;
  filePath: string;
  source?: string;
  fix?: {
    range: [number, number];
    text: string;
  };
}

/**
 * Interface for linting results
 */
export interface LintResults {
  totalFiles: number;
  filesWithIssues: number;
  totalIssues: number;
  errors: number;
  warnings: number;
  infos: number;
  hints: number;
  issues: LintIssue[];
  fixableIssues: number;
}

/**
 * Options for running linting
 */
export interface LintOptions {
  eslintPath?: string;
  configFile?: string;
  ignorePath?: string;
  filePatterns: string[];
  maxWarnings?: number;
  fix?: boolean;
  cache?: boolean;
  cacheLocation?: string;
  outputFormat?: 'json' | 'stylish' | 'compact' | 'html';
  outputFile?: string;
  quiet?: boolean;
}

/**
 * Class for running code linting and processing results
 */
export class Linter {
  private options: LintOptions;
  
  /**
   * Create a new Linter
   * @param options - Linting options
   */
  constructor(options: LintOptions) {
    this.options = {
      eslintPath: 'eslint',
      configFile: undefined,
      ignorePath: undefined,
      maxWarnings: 0,
      fix: false,
      cache: true,
      cacheLocation: '.eslintcache',
      outputFormat: 'json',
      outputFile: undefined,
      quiet: false,
      ...options,
    };
  }
  
  /**
   * Run linting
   * @returns Linting results
   */
  public async lint(): Promise<LintResults> {
    try {
      // Construct the command
      const command = this.buildLintCommand();
      console.info(`Running lint command: ${command}`);
      
      // Run eslint
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr) {
        console.warn(`Lint warnings: ${stderr}`);
      }
      
      // Parse the results
      return this.parseLintResults(stdout);
    } catch (error) {
      console.error(`Linting failed: ${error}`);
      
      // Try to parse results from output file if available
      if (this.options.outputFile) {
        try {
          const outputContent = await fs.readFile(this.options.outputFile, 'utf-8');
          return this.parseLintResults(outputContent);
        } catch (readError) {
          console.error(`Failed to read lint output file: ${readError}`);
        }
      }
      
      // Return minimal results with error
      return {
        totalFiles: 0,
        filesWithIssues: 0,
        totalIssues: 1,
        errors: 1,
        warnings: 0,
        infos: 0,
        hints: 0,
        issues: [
          {
            severity: LintSeverity.ERROR,
            ruleId: 'linter-execution-error',
            message: `Linting failed to execute: ${error}`,
            line: 0,
            column: 0,
            filePath: '',
          },
        ],
        fixableIssues: 0,
      };
    }
  }
  
  /**
   * Build the linting command
   * @returns Linting command string
   */
  private buildLintCommand(): string {
    const parts: string[] = [this.options.eslintPath || 'eslint'];
    
    // Add config file if specified
    if (this.options.configFile) {
      parts.push(`--config ${this.options.configFile}`);
    }
    
    // Add ignore file if specified
    if (this.options.ignorePath) {
      parts.push(`--ignore-path ${this.options.ignorePath}`);
    }
    
    // Add format option
    parts.push(`--format ${this.options.outputFormat}`);
    
    // Add output file if specified
    if (this.options.outputFile) {
      parts.push(`--output-file ${this.options.outputFile}`);
    }
    
    // Add max warnings if specified
    if (this.options.maxWarnings !== undefined) {
      parts.push(`--max-warnings ${this.options.maxWarnings}`);
    }
    
    // Add fix option if specified
    if (this.options.fix) {
      parts.push('--fix');
    }
    
    // Add cache options
    if (this.options.cache) {
      parts.push('--cache');
      
      if (this.options.cacheLocation) {
        parts.push(`--cache-location ${this.options.cacheLocation}`);
      }
    }
    
    // Add quiet option if specified
    if (this.options.quiet) {
      parts.push('--quiet');
    }
    
    // Add file patterns
    parts.push(...this.options.filePatterns);
    
    return parts.join(' ');
  }
  
  /**
   * Parse linting results from JSON output
   * @param output - ESLint JSON output
   * @returns Parsed linting results
   */
  private parseLintResults(output: string): LintResults {
    try {
      const eslintResults = JSON.parse(output);
      
      // Initialize counters
      let totalIssues = 0;
      let errors = 0;
      let warnings = 0;
      let infos = 0;
      let hints = 0;
      let fixableIssues = 0;
      
      // Initialize issues array
      const issues: LintIssue[] = [];
      
      // Process each file's results
      eslintResults.forEach((fileResult: any) => {
        // Process each message (issue)
        fileResult.messages.forEach((message: any) => {
          // Map eslint severity (1=warning, 2=error) to our LintSeverity enum
          let severity: LintSeverity;
          
          if (typeof message.severity === 'number') {
            severity = message.severity === 2
              ? LintSeverity.ERROR
              : message.severity === 1
                ? LintSeverity.WARNING
                : LintSeverity.INFO;
          } else if (typeof message.severity === 'string') {
            severity = message.severity as LintSeverity;
          } else {
            severity = LintSeverity.INFO;
          }
          
          // Create the lint issue
          const issue: LintIssue = {
            severity,
            ruleId: message.ruleId || 'unknown',
            message: message.message,
            line: message.line || 0,
            column: message.column || 0,
            filePath: fileResult.filePath,
            source: message.source,
          };
          
          // Add fix information if available
          if (message.fix) {
            issue.fix = {
              range: message.fix.range,
              text: message.fix.text,
            };
            
            fixableIssues++;
          }
          
          // Add to issues array
          issues.push(issue);
          
          // Update counters
          totalIssues++;
          
          switch (severity) {
            case LintSeverity.ERROR:
              errors++;
              break;
            case LintSeverity.WARNING:
              warnings++;
              break;
            case LintSeverity.INFO:
              infos++;
              break;
            case LintSeverity.HINT:
              hints++;
              break;
          }
        });
      });
      
      // Count files with issues
      const filesWithIssues = new Set(issues.map(issue => issue.filePath)).size;
      
      return {
        totalFiles: eslintResults.length,
        filesWithIssues,
        totalIssues,
        errors,
        warnings,
        infos,
        hints,
        issues,
        fixableIssues,
      };
    } catch (error) {
      console.error(`Failed to parse lint results: ${error}`);
      
      return {
        totalFiles: 0,
        filesWithIssues: 0,
        totalIssues: 1,
        errors: 1,
        warnings: 0,
        infos: 0,
        hints: 0,
        issues: [
          {
            severity: LintSeverity.ERROR,
            ruleId: 'lint-results-parse-error',
            message: `Failed to parse lint results: ${error}`,
            line: 0,
            column: 0,
            filePath: '',
          },
        ],
        fixableIssues: 0,
      };
    }
  }
  
  /**
   * Generate a lint report
   * @param results - Lint results
   * @param outputPath - Path to write the report
   * @returns true if successful, false otherwise
   */
  public async generateReport(results: LintResults, outputPath: string): Promise<boolean> {
    try {
      // Create the HTML report
      const html = this.generateHtmlReport(results);
      
      // Write the report to file
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, html, 'utf-8');
      
      return true;
    } catch (error) {
      console.error(`Failed to generate lint report: ${error}`);
      return false;
    }
  }
  
  /**
   * Generate an HTML lint report
   * @param results - Lint results
   * @returns HTML string
   */
  private generateHtmlReport(results: LintResults): string {
    // Group issues by file
    const issuesByFile: Record<string, LintIssue[]> = {};
    
    results.issues.forEach(issue => {
      if (!issuesByFile[issue.filePath]) {
        issuesByFile[issue.filePath] = [];
      }
      
      issuesByFile[issue.filePath].push(issue);
    });
    
    // Generate file sections
    const fileSections = Object.entries(issuesByFile).map(([filePath, issues]) => {
      // Sort issues by line and column
      issues.sort((a, b) => {
        if (a.line !== b.line) {
          return a.line - b.line;
        }
        
        return a.column - b.column;
      });
      
      // Count issues by severity
      const errorCount = issues.filter(i => i.severity === LintSeverity.ERROR).length;
      const warningCount = issues.filter(i => i.severity === LintSeverity.WARNING).length;
      const infoCount = issues.filter(i => i.severity === LintSeverity.INFO).length;
      const hintCount = issues.filter(i => i.severity === LintSeverity.HINT).length;
      
      // Generate issue rows
      const issueRows = issues.map(issue => {
        const severityClass = issue.severity === LintSeverity.ERROR
          ? 'severity-error'
          : issue.severity === LintSeverity.WARNING
            ? 'severity-warning'
            : issue.severity === LintSeverity.INFO
              ? 'severity-info'
              : 'severity-hint';
        
        return `
          <tr class="issue-row ${severityClass}">
            <td class="issue-severity">${issue.severity}</td>
            <td class="issue-line">${issue.line}</td>
            <td class="issue-column">${issue.column}</td>
            <td class="issue-rule">${issue.ruleId}</td>
            <td class="issue-message">${issue.message}</td>
            <td class="issue-fixable">${issue.fix ? 'Yes' : 'No'}</td>
          </tr>
          ${issue.source ? `
            <tr class="source-row">
              <td colspan="6"><pre class="source-code">${issue.source}</pre></td>
            </tr>
          ` : ''}
        `;
      }).join('');
      
      return `
        <div class="file-section">
          <h3 class="file-path">${filePath}</h3>
          <div class="file-summary">
            <span class="file-issue-count">
              ${issues.length} issue${issues.length !== 1 ? 's' : ''}
            </span>
            <span class="file-error-count">${errorCount} error${errorCount !== 1 ? 's' : ''}</span>
            <span class="file-warning-count">${warningCount} warning${warningCount !== 1 ? 's' : ''}</span>
            <span class="file-info-count">${infoCount} info${infoCount !== 1 ? 's' : ''}</span>
            <span class="file-hint-count">${hintCount} hint${hintCount !== 1 ? 's' : ''}</span>
          </div>
          <table class="issue-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Line</th>
                <th>Column</th>
                <th>Rule</th>
                <th>Message</th>
                <th>Fixable</th>
              </tr>
            </thead>
            <tbody>
              ${issueRows}
            </tbody>
          </table>
        </div>
      `;
    }).join('');
    
    // Generate the full HTML document
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Lint Report</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
          }
          
          .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }
          
          .report-header {
            text-align: center;
            margin-bottom: 30px;
          }
          
          .summary-section {
            background-color: #f8f9fa;
            border-radius: 4px;
            padding: 20px;
            margin-bottom: 30px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          
          .summary-metrics {
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
          }
          
          .summary-metric {
            flex: 1;
            min-width: 150px;
            padding: 15px;
            border-radius: 4px;
            margin: 10px;
            background-color: white;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          }
          
          .metric-label {
            font-weight: 600;
            color: #555;
            display: block;
          }
          
          .metric-value {
            font-size: 24px;
            font-weight: 700;
            color: #333;
            display: block;
            margin-top: 5px;
          }
          
          .file-section {
            background-color: white;
            border-radius: 4px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          
          .file-path {
            margin-top: 0;
            margin-bottom: 15px;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
            word-break: break-all;
          }
          
          .file-summary {
            display: flex;
            flex-wrap: wrap;
            margin-bottom: 15px;
          }
          
          .file-summary > span {
            margin-right: 20px;
            margin-bottom: 5px;
          }
          
          .file-error-count {
            color: #dc3545;
          }
          
          .file-warning-count {
            color: #ffc107;
          }
          
          .file-info-count {
            color: #17a2b8;
          }
          
          .file-hint-count {
            color: #6c757d;
          }
          
          .issue-table {
            width: 100%;
            border-collapse: collapse;
          }
          
          .issue-table th,
          .issue-table td {
            padding: 10px 15px;
            text-align: left;
            border-bottom: 1px solid #eee;
          }
          
          .issue-table th {
            background-color: #f8f9fa;
            font-weight: 600;
          }
          
          .issue-severity {
            font-weight: 600;
          }
          
          .severity-error .issue-severity {
            color: #dc3545;
          }
          
          .severity-warning .issue-severity {
            color: #ffc107;
          }
          
          .severity-info .issue-severity {
            color: #17a2b8;
          }
          
          .severity-hint .issue-severity {
            color: #6c757d;
          }
          
          .source-row {
            background-color: #f8f9fa;
          }
          
          .source-code {
            margin: 0;
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
            font-size: 12px;
            overflow-x: auto;
            white-space: pre-wrap;
            padding: 5px;
          }
          
          @media (max-width: 768px) {
            .summary-metrics {
              flex-direction: column;
            }
            
            .summary-metric {
              margin: 5px 0;
            }
            
            .file-summary {
              flex-direction: column;
              align-items: flex-start;
            }
            
            .file-summary > span {
              margin-right: 0;
            }
            
            .issue-table th,
            .issue-table td {
              padding: 8px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="report-header">
            <h1>Lint Report</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="summary-section">
            <h2>Summary</h2>
            <div class="summary-metrics">
              <div class="summary-metric">
                <span class="metric-label">Total Files</span>
                <span class="metric-value">${results.totalFiles}</span>
              </div>
              <div class="summary-metric">
                <span class="metric-label">Files with Issues</span>
                <span class="metric-value">${results.filesWithIssues}</span>
              </div>
              <div class="summary-metric">
                <span class="metric-label">Total Issues</span>
                <span class="metric-value">${results.totalIssues}</span>
              </div>
              <div class="summary-metric">
                <span class="metric-label">Errors</span>
                <span class="metric-value">${results.errors}</span>
              </div>
              <div class="summary-metric">
                <span class="metric-label">Warnings</span>
                <span class="metric-value">${results.warnings}</span>
              </div>
              <div class="summary-metric">
                <span class="metric-label">Fixable Issues</span>
                <span class="metric-value">${results.fixableIssues}</span>
              </div>
            </div>
          </div>
          
          <h2>Issues by File</h2>
          ${fileSections}
        </div>
      </body>
      </html>
    `;
  }
}