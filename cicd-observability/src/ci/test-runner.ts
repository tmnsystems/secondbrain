/**
 * Test Runner Utilities
 * 
 * This module provides utilities for executing tests and processing test results
 * within CI/CD pipelines.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PipelineStageStatus } from './pipeline';

const execAsync = promisify(exec);

/**
 * Test result status
 */
export enum TestStatus {
  PASSED = 'passed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  ERROR = 'error',
}

/**
 * Interface for a test result
 */
export interface TestResult {
  name: string;
  status: TestStatus;
  duration: number;
  message?: string;
  failureMessages?: string[];
  location?: string;
}

/**
 * Interface for a test suite result
 */
export interface TestSuiteResult {
  name: string;
  status: TestStatus;
  duration: number;
  tests: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  errorTests: number;
  startTime: Date;
  endTime: Date;
}

/**
 * Interface for overall test results
 */
export interface TestResults {
  suites: TestSuiteResult[];
  totalSuites: number;
  passedSuites: number;
  failedSuites: number;
  duration: number;
  startTime: Date;
  endTime: Date;
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
}

/**
 * Options for running tests
 */
export interface TestRunOptions {
  testCommand: string;
  testDir: string;
  reportDir: string;
  coverageDir?: string;
  testMatch?: string;
  testTimeout?: number;
  maxWorkers?: number;
  ci?: boolean;
  updateSnapshots?: boolean;
  verbose?: boolean;
}

/**
 * Class for running tests and processing test results
 */
export class TestRunner {
  private options: TestRunOptions;
  
  /**
   * Create a new TestRunner
   * @param options - Test run options
   */
  constructor(options: TestRunOptions) {
    this.options = options;
  }
  
  /**
   * Run tests
   * @returns Test results
   */
  public async runTests(): Promise<TestResults> {
    const startTime = new Date();
    let endTime: Date;
    let duration = 0;
    let testStatus: PipelineStageStatus = PipelineStageStatus.SUCCESS;
    
    try {
      console.info(`Running tests with command: ${this.options.testCommand}`);
      
      const { stdout, stderr } = await execAsync(this.options.testCommand);
      
      if (stderr) {
        console.warn(`Test warnings: ${stderr}`);
      }
      
      console.info(`Test output: ${stdout}`);
      
      endTime = new Date();
      duration = endTime.getTime() - startTime.getTime();
      
      // Process test results from report files
      const testResults = await this.processTestResults();
      
      return testResults;
    } catch (error) {
      testStatus = PipelineStageStatus.FAILURE;
      console.error(`Error running tests: ${error}`);
      
      endTime = new Date();
      duration = endTime.getTime() - startTime.getTime();
      
      // Create minimal test results
      return {
        suites: [],
        totalSuites: 0,
        passedSuites: 0,
        failedSuites: 0,
        duration,
        startTime,
        endTime,
      };
    }
  }
  
  /**
   * Process test results from report files
   * @returns Processed test results
   */
  private async processTestResults(): Promise<TestResults> {
    try {
      // Read Jest test results
      const jestResultsPath = path.join(this.options.reportDir, 'test-results.json');
      const jestResults = JSON.parse(await fs.readFile(jestResultsPath, 'utf-8'));
      
      const startTime = new Date(jestResults.startTime);
      const endTime = new Date(jestResults.endTime);
      const duration = endTime.getTime() - startTime.getTime();
      
      // Process test suites
      const suites: TestSuiteResult[] = jestResults.testResults.map((suite: any) => {
        const suiteStartTime = new Date(suite.startTime);
        const suiteEndTime = new Date(suite.endTime);
        const suiteDuration = suiteEndTime.getTime() - suiteStartTime.getTime();
        
        // Process individual tests
        const tests: TestResult[] = suite.assertionResults.map((test: any) => {
          let status: TestStatus;
          
          switch (test.status) {
            case 'passed':
              status = TestStatus.PASSED;
              break;
            case 'failed':
              status = TestStatus.FAILED;
              break;
            case 'skipped':
            case 'pending':
              status = TestStatus.SKIPPED;
              break;
            default:
              status = TestStatus.ERROR;
          }
          
          return {
            name: test.title,
            status,
            duration: test.duration || 0,
            message: test.failureMessages?.join('\n'),
            failureMessages: test.failureMessages,
            location: test.location,
          };
        });
        
        // Calculate test counts
        const passedTests = tests.filter(t => t.status === TestStatus.PASSED).length;
        const failedTests = tests.filter(t => t.status === TestStatus.FAILED).length;
        const skippedTests = tests.filter(t => t.status === TestStatus.SKIPPED).length;
        const errorTests = tests.filter(t => t.status === TestStatus.ERROR).length;
        
        // Determine suite status
        let suiteStatus: TestStatus;
        
        if (failedTests > 0 || errorTests > 0) {
          suiteStatus = TestStatus.FAILED;
        } else if (passedTests > 0) {
          suiteStatus = TestStatus.PASSED;
        } else if (skippedTests > 0) {
          suiteStatus = TestStatus.SKIPPED;
        } else {
          suiteStatus = TestStatus.ERROR;
        }
        
        return {
          name: suite.name,
          status: suiteStatus,
          duration: suiteDuration,
          tests,
          totalTests: tests.length,
          passedTests,
          failedTests,
          skippedTests,
          errorTests,
          startTime: suiteStartTime,
          endTime: suiteEndTime,
        };
      });
      
      // Calculate suite counts
      const passedSuites = suites.filter(s => s.status === TestStatus.PASSED).length;
      const failedSuites = suites.filter(s => s.status === TestStatus.FAILED).length;
      
      // Read coverage data if available
      let coverage;
      
      if (this.options.coverageDir) {
        try {
          const coverageSummaryPath = path.join(this.options.coverageDir, 'coverage-summary.json');
          const coverageSummary = JSON.parse(await fs.readFile(coverageSummaryPath, 'utf-8'));
          
          coverage = {
            statements: coverageSummary.total.statements.pct,
            branches: coverageSummary.total.branches.pct,
            functions: coverageSummary.total.functions.pct,
            lines: coverageSummary.total.lines.pct,
          };
        } catch (error) {
          console.warn(`Failed to read coverage data: ${error}`);
        }
      }
      
      return {
        suites,
        totalSuites: suites.length,
        passedSuites,
        failedSuites,
        duration,
        startTime,
        endTime,
        coverage,
      };
    } catch (error) {
      console.error(`Failed to process test results: ${error}`);
      
      // Return minimal test results
      return {
        suites: [],
        totalSuites: 0,
        passedSuites: 0,
        failedSuites: 0,
        duration: 0,
        startTime: new Date(),
        endTime: new Date(),
      };
    }
  }
  
  /**
   * Generate a test report
   * @param results - Test results
   * @param outputPath - Path to write the report
   * @returns true if successful, false otherwise
   */
  public async generateReport(results: TestResults, outputPath: string): Promise<boolean> {
    try {
      // Create the HTML report
      const html = this.generateHtmlReport(results);
      
      // Write the report to file
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, html, 'utf-8');
      
      return true;
    } catch (error) {
      console.error(`Failed to generate test report: ${error}`);
      return false;
    }
  }
  
  /**
   * Generate an HTML test report
   * @param results - Test results
   * @returns HTML string
   */
  private generateHtmlReport(results: TestResults): string {
    const passRate = results.totalSuites > 0
      ? (results.passedSuites / results.totalSuites) * 100
      : 0;
    
    const coverageData = results.coverage
      ? `
        <div class="coverage-section">
          <h2>Test Coverage</h2>
          <div class="coverage-metrics">
            <div class="coverage-metric">
              <span class="metric-label">Statements:</span>
              <span class="metric-value">${results.coverage.statements.toFixed(2)}%</span>
            </div>
            <div class="coverage-metric">
              <span class="metric-label">Branches:</span>
              <span class="metric-value">${results.coverage.branches.toFixed(2)}%</span>
            </div>
            <div class="coverage-metric">
              <span class="metric-label">Functions:</span>
              <span class="metric-value">${results.coverage.functions.toFixed(2)}%</span>
            </div>
            <div class="coverage-metric">
              <span class="metric-label">Lines:</span>
              <span class="metric-value">${results.coverage.lines.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      `
      : '';
    
    // Generate suite sections
    const suiteSections = results.suites.map(suite => {
      const suitePassRate = suite.totalTests > 0
        ? (suite.passedTests / suite.totalTests) * 100
        : 0;
      
      // Generate test rows
      const testRows = suite.tests.map(test => {
        const statusClass = test.status === TestStatus.PASSED
          ? 'status-passed'
          : test.status === TestStatus.FAILED
            ? 'status-failed'
            : test.status === TestStatus.SKIPPED
              ? 'status-skipped'
              : 'status-error';
        
        const failureDetails = test.failureMessages && test.failureMessages.length > 0
          ? `
            <div class="failure-details">
              <pre>${test.failureMessages.join('\n')}</pre>
            </div>
          `
          : '';
        
        return `
          <tr class="test-row ${statusClass}">
            <td class="test-name">${test.name}</td>
            <td class="test-status">${test.status}</td>
            <td class="test-duration">${test.duration}ms</td>
            <td class="test-location">${test.location || ''}</td>
          </tr>
          ${test.status === TestStatus.FAILED ? `
            <tr class="failure-row">
              <td colspan="4">${failureDetails}</td>
            </tr>
          ` : ''}
        `;
      }).join('');
      
      return `
        <div class="suite-section">
          <h3 class="suite-name">${suite.name}</h3>
          <div class="suite-summary">
            <span class="suite-status ${suite.status === TestStatus.PASSED ? 'status-passed' : 'status-failed'}">
              ${suite.status}
            </span>
            <span class="suite-duration">${suite.duration}ms</span>
            <span class="suite-pass-rate">${suitePassRate.toFixed(2)}% passing</span>
          </div>
          <table class="test-table">
            <thead>
              <tr>
                <th>Test</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              ${testRows}
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
        <title>Test Report</title>
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
            min-width: 200px;
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
          
          .coverage-section {
            background-color: #f8f9fa;
            border-radius: 4px;
            padding: 20px;
            margin-bottom: 30px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          
          .coverage-metrics {
            display: flex;
            flex-wrap: wrap;
          }
          
          .coverage-metric {
            flex: 1;
            min-width: 150px;
            padding: 15px;
            border-radius: 4px;
            margin: 10px;
            background-color: white;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          }
          
          .suite-section {
            background-color: white;
            border-radius: 4px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          
          .suite-name {
            margin-top: 0;
            margin-bottom: 15px;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
          }
          
          .suite-summary {
            display: flex;
            margin-bottom: 15px;
          }
          
          .suite-summary > span {
            margin-right: 20px;
          }
          
          .suite-status {
            font-weight: 600;
          }
          
          .status-passed {
            color: #28a745;
          }
          
          .status-failed {
            color: #dc3545;
          }
          
          .status-skipped {
            color: #6c757d;
          }
          
          .status-error {
            color: #dc3545;
          }
          
          .test-table {
            width: 100%;
            border-collapse: collapse;
          }
          
          .test-table th,
          .test-table td {
            padding: 10px 15px;
            text-align: left;
            border-bottom: 1px solid #eee;
          }
          
          .test-table th {
            background-color: #f8f9fa;
            font-weight: 600;
          }
          
          .test-row.status-passed .test-status {
            color: #28a745;
          }
          
          .test-row.status-failed .test-status {
            color: #dc3545;
          }
          
          .test-row.status-skipped .test-status {
            color: #6c757d;
          }
          
          .test-row.status-error .test-status {
            color: #dc3545;
          }
          
          .failure-row {
            background-color: #fff8f8;
          }
          
          .failure-details {
            padding: 10px;
            overflow-x: auto;
          }
          
          .failure-details pre {
            margin: 0;
            font-size: 12px;
            white-space: pre-wrap;
          }
          
          @media (max-width: 768px) {
            .summary-metrics,
            .coverage-metrics {
              flex-direction: column;
            }
            
            .summary-metric,
            .coverage-metric {
              margin: 5px 0;
            }
            
            .test-table th,
            .test-table td {
              padding: 8px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="report-header">
            <h1>Test Report</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="summary-section">
            <h2>Summary</h2>
            <div class="summary-metrics">
              <div class="summary-metric">
                <span class="metric-label">Total Suites</span>
                <span class="metric-value">${results.totalSuites}</span>
              </div>
              <div class="summary-metric">
                <span class="metric-label">Passed Suites</span>
                <span class="metric-value">${results.passedSuites}</span>
              </div>
              <div class="summary-metric">
                <span class="metric-label">Failed Suites</span>
                <span class="metric-value">${results.failedSuites}</span>
              </div>
              <div class="summary-metric">
                <span class="metric-label">Pass Rate</span>
                <span class="metric-value">${passRate.toFixed(2)}%</span>
              </div>
              <div class="summary-metric">
                <span class="metric-label">Duration</span>
                <span class="metric-value">${(results.duration / 1000).toFixed(2)}s</span>
              </div>
            </div>
          </div>
          
          ${coverageData}
          
          <h2>Test Suites</h2>
          ${suiteSections}
        </div>
      </body>
      </html>
    `;
  }
}