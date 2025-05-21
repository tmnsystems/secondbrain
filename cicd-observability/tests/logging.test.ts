import { Logger } from '../src/logging/logger';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('Logger', () => {
  let testLogDir: string;
  let testLogFile: string;

  beforeEach(() => {
    // Create temporary directory for test logs
    testLogDir = path.join(os.tmpdir(), 'secondbrain-tests', 'logs');
    
    if (!fs.existsSync(testLogDir)) {
      fs.mkdirSync(testLogDir, { recursive: true });
    }
    
    testLogFile = path.join(testLogDir, 'test.log');
    
    // Clean up any existing log file
    if (fs.existsSync(testLogFile)) {
      fs.unlinkSync(testLogFile);
    }
  });

  afterEach(() => {
    // Clean up log file
    if (fs.existsSync(testLogFile)) {
      fs.unlinkSync(testLogFile);
    }
  });

  test('should create a logger with default options', () => {
    const logger = new Logger();
    expect(logger).toBeDefined();
  });

  test('should create a logger with custom options', () => {
    const logger = new Logger({
      service: 'test-service',
      level: 'debug',
      transports: ['console']
    });
    expect(logger).toBeDefined();
  });

  test('should log messages to console', () => {
    // Mock console log
    const originalConsoleLog = console.log;
    const mockConsoleLog = jest.fn();
    console.log = mockConsoleLog;

    const logger = new Logger({
      service: 'test-service',
      level: 'info',
      transports: ['console']
    });

    logger.info('Test message');

    expect(mockConsoleLog).toHaveBeenCalled();

    // Restore console log
    console.log = originalConsoleLog;
  });

  test('should log messages to file', () => {
    const logger = new Logger({
      service: 'test-service',
      level: 'info',
      transports: ['file'],
      filePath: testLogFile
    });

    logger.info('Test message');

    // Wait for file to be written
    setTimeout(() => {
      expect(fs.existsSync(testLogFile)).toBe(true);
      const fileContent = fs.readFileSync(testLogFile, 'utf8');
      expect(fileContent).toContain('Test message');
    }, 100);
  });

  test('should respect log levels', () => {
    // Mock console log
    const originalConsoleLog = console.log;
    const mockConsoleLog = jest.fn();
    console.log = mockConsoleLog;

    const logger = new Logger({
      service: 'test-service',
      level: 'warn',
      transports: ['console']
    });

    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warning message');
    logger.error('Error message');

    // Debug and info should not be logged
    expect(mockConsoleLog).toHaveBeenCalledTimes(2);

    // Restore console log
    console.log = originalConsoleLog;
  });

  test('should add context to logs', () => {
    // Mock console log
    const originalConsoleLog = console.log;
    const mockConsoleLog = jest.fn();
    console.log = mockConsoleLog;

    const logger = new Logger({
      service: 'test-service',
      level: 'info',
      transports: ['console']
    });

    const context = { userId: '123', requestId: '456' };
    logger.info('Test message with context', context);

    expect(mockConsoleLog).toHaveBeenCalled();
    
    // Check that the log contains the context
    const logCall = mockConsoleLog.mock.calls[0][0];
    expect(logCall).toContain('Test message with context');
    expect(logCall).toContain('userId');
    expect(logCall).toContain('123');
    expect(logCall).toContain('requestId');
    expect(logCall).toContain('456');

    // Restore console log
    console.log = originalConsoleLog;
  });

  test('should create a child logger', () => {
    const parentLogger = new Logger({
      service: 'parent-service',
      level: 'info',
      transports: ['console']
    });

    const childLogger = parentLogger.child({ component: 'child-component' });
    expect(childLogger).toBeDefined();

    // Mock console log
    const originalConsoleLog = console.log;
    const mockConsoleLog = jest.fn();
    console.log = mockConsoleLog;

    childLogger.info('Test message from child');

    expect(mockConsoleLog).toHaveBeenCalled();
    
    // Check that the log contains the context from the child logger
    const logCall = mockConsoleLog.mock.calls[0][0];
    expect(logCall).toContain('Test message from child');
    expect(logCall).toContain('component');
    expect(logCall).toContain('child-component');

    // Restore console log
    console.log = originalConsoleLog;
  });
});