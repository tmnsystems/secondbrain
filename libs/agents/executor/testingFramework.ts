/**
 * Testing Framework Module
 * 
 * Handles running tests for projects with support for various test frameworks
 * (Jest, Vitest, Cypress, etc.) and reporting results.
 */

import { executeCommand, CommandExecutionResult } from './commandExecutor';

export interface TestingOptions {
  cwd?: string;
  timeout?: number;
  framework?: TestFramework;
  pattern?: string;
  watch?: boolean;
  coverage?: boolean;
  testArgs?: string;
}

// Supported test frameworks
type TestFramework = 'jest' | 'vitest' | 'cypress' | 'playwright' | 'mocha' | 'custom';

/**
 * Run tests for a specific project or component
 * 
 * @param target The project or component to test
 * @param options Testing options
 * @returns Promise with the test results
 */
export async function testingFramework(
  target: string,
  options: TestingOptions = {}
): Promise<CommandExecutionResult> {
  const {
    cwd = process.cwd(),
    timeout = 120000, // Tests can take time
    framework = 'jest',
    pattern,
    watch = false,
    coverage = false,
    testArgs = ''
  } = options;
  
  // Build the test command based on the framework
  let command: string;
  const testPattern = pattern ? ` ${pattern}` : '';
  const watchFlag = watch ? ' --watch' : '';
  const coverageFlag = coverage ? ' --coverage' : '';
  
  switch (framework) {
    case 'jest':
      command = `npx jest ${target}${testPattern}${watchFlag}${coverageFlag} ${testArgs}`;
      break;
      
    case 'vitest':
      command = `npx vitest run ${target}${testPattern}${watchFlag}${coverageFlag} ${testArgs}`;
      break;
      
    case 'cypress':
      command = `npx cypress run --spec "${target}${testPattern}" ${testArgs}`;
      break;
      
    case 'playwright':
      command = `npx playwright test ${target}${testPattern} ${testArgs}`;
      break;
      
    case 'mocha':
      command = `npx mocha ${target}${testPattern} ${testArgs}`;
      break;
      
    case 'custom':
      // For custom test commands, use the target as the command
      command = target;
      break;
      
    default:
      // Default to npm test
      command = `npm test -- ${target}${testPattern} ${testArgs}`;
  }
  
  // Execute the test command
  return executeCommand(command, { cwd, timeout });
}
