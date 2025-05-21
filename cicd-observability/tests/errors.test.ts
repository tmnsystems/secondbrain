import { ErrorTracker, ErrorLevel } from '../src/errors/errorTracker';
import { ErrorReporter } from '../src/errors/errorReporter';
import { ErrorManagementSystem } from '../src/errors';
import { Logger } from '../src/logging/logger';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Error Tracking System', () => {
  let errorTracker: ErrorTracker;
  let errorReporter: ErrorReporter;
  let errorManagementSystem: ErrorManagementSystem;
  let logger: Logger;
  let testLogsDir: string;

  beforeEach(() => {
    // Reset axios mocks
    mockedAxios.post.mockReset();
    mockedAxios.get.mockReset();

    // Create temporary directory for test logs
    testLogsDir = path.join(os.tmpdir(), 'secondbrain-tests', 'errors');
    
    if (!fs.existsSync(testLogsDir)) {
      fs.mkdirSync(testLogsDir, { recursive: true });
    }

    // Create logger
    logger = new Logger({
      service: 'test-service',
      level: 'info',
      transports: ['console']
    });

    // Create error tracker
    errorTracker = new ErrorTracker({
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
      environment: 'test',
      captureUnhandledRejections: false,
      captureUncaughtExceptions: false,
      logger
    });

    // Create error reporter
    errorReporter = new ErrorReporter({
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
      environment: 'test',
      logger
    });

    // Create error management system
    errorManagementSystem = new ErrorManagementSystem({
      trackerOptions: {
        serviceName: 'test-service',
        serviceVersion: '1.0.0',
        environment: 'test',
        captureUnhandledRejections: false,
        captureUncaughtExceptions: false,
        logger
      },
      reporterOptions: {
        serviceName: 'test-service',
        serviceVersion: '1.0.0',
        environment: 'test',
        logger
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();

    // Clean up test logs directory
    fs.rmSync(testLogsDir, { recursive: true, force: true });
  });

  describe('ErrorTracker', () => {
    test('should create an error tracker', () => {
      expect(errorTracker).toBeDefined();
    });

    test('should add a breadcrumb', () => {
      errorTracker.addBreadcrumb({
        type: 'navigation',
        category: 'click',
        message: 'User clicked on button'
      });

      // No assertion needed, just checking that it doesn't throw
    });

    test('should capture an exception', async () => {
      // Mock logger error method
      const loggerErrorSpy = jest.spyOn(logger, 'error');

      // Create an error
      const error = new Error('Test error');

      // Capture exception
      await errorTracker.captureException(error, {
        level: ErrorLevel.ERROR,
        context: {
          key: 'value'
        }
      });

      // Check that logger error was called
      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    test('should capture a message', async () => {
      // Mock logger info method
      const loggerInfoSpy = jest.spyOn(logger, 'log');

      // Capture message
      await errorTracker.captureMessage('Test message', {
        level: ErrorLevel.INFO,
        context: {
          key: 'value'
        }
      });

      // Check that logger info was called
      expect(loggerInfoSpy).toHaveBeenCalled();
    });

    test('should get the last error', async () => {
      // Create an error
      const error = new Error('Test error');

      // Capture exception
      await errorTracker.captureException(error);

      // Get last error
      const lastError = errorTracker.getLastError();
      expect(lastError).toBe(error);
    });

    test('should clear breadcrumbs', () => {
      // Add breadcrumbs
      errorTracker.addBreadcrumb({
        type: 'navigation',
        category: 'click',
        message: 'User clicked on button'
      });

      // Clear breadcrumbs
      errorTracker.clearBreadcrumbs();

      // No assertion needed, just checking that it doesn't throw
    });

    test('should provide Express middleware', () => {
      // Create middleware
      const middleware = errorTracker.expressMiddleware();
      expect(middleware).toBeDefined();

      // Mock Express request and response
      const req = {
        method: 'GET',
        path: '/test',
        headers: {}
      };

      const res = {
        statusCode: 200,
        getHeaders: jest.fn().mockReturnValue({}),
        end: jest.fn().mockImplementation(function(this: any, ...args: any[]) {
          // Call the end listener
          const listeners = this.listeners && this.listeners.end;
          if (listeners && listeners.length > 0) {
            listeners[0]();
          }
          return this;
        }),
        on: jest.fn().mockImplementation(function(this: any, event: string, listener: () => void) {
          // Store the listener
          if (!this.listeners) {
            this.listeners = {};
          }
          if (!this.listeners[event]) {
            this.listeners[event] = [];
          }
          this.listeners[event].push(listener);
          return this;
        })
      };

      const next = jest.fn();

      // Call middleware
      middleware(req as any, res as any, next);

      // Check that next was called
      expect(next).toHaveBeenCalled();
    });
  });

  describe('ErrorReporter', () => {
    test('should create an error reporter', () => {
      expect(errorReporter).toBeDefined();
    });

    test('should report an error', async () => {
      // Mock fs.appendFileSync
      const appendFileSyncSpy = jest.spyOn(fs, 'appendFileSync');
      appendFileSyncSpy.mockImplementation(() => {});

      // Create an error event
      const errorEvent = {
        message: 'Test error',
        level: ErrorLevel.ERROR,
        timestamp: new Date().toISOString(),
        exception: {
          type: 'Error',
          value: 'Test error',
          stacktrace: 'Error: Test error\n    at ...'
        }
      };

      // Report error
      await errorReporter.reportError(errorEvent);

      // Check that appendFileSync was called
      expect(appendFileSyncSpy).toHaveBeenCalled();
    });
  });

  describe('ErrorManagementSystem', () => {
    test('should create an error management system', () => {
      expect(errorManagementSystem).toBeDefined();
    });

    test('should capture an exception', async () => {
      // Mock error tracker captureException method
      const captureExceptionSpy = jest.spyOn(errorTracker, 'captureException');
      captureExceptionSpy.mockResolvedValueOnce();

      // Mock error reporter reportError method
      const reportErrorSpy = jest.spyOn(errorReporter, 'reportError');
      reportErrorSpy.mockResolvedValueOnce();

      // Replace the error tracker and reporter in the management system
      const getErrorTrackerSpy = jest.spyOn(errorManagementSystem, 'getErrorTracker');
      getErrorTrackerSpy.mockReturnValue(errorTracker);

      const getErrorReporterSpy = jest.spyOn(errorManagementSystem, 'getErrorReporter');
      getErrorReporterSpy.mockReturnValue(errorReporter);

      // Create an error
      const error = new Error('Test error');

      // Capture exception
      await errorManagementSystem.captureException(error, {
        level: ErrorLevel.ERROR,
        context: {
          key: 'value'
        }
      });

      // Check that captureException was called
      expect(captureExceptionSpy).toHaveBeenCalled();
    });

    test('should capture a message', async () => {
      // Mock error tracker captureMessage method
      const captureMessageSpy = jest.spyOn(errorTracker, 'captureMessage');
      captureMessageSpy.mockResolvedValueOnce();

      // Mock error reporter reportError method
      const reportErrorSpy = jest.spyOn(errorReporter, 'reportError');
      reportErrorSpy.mockResolvedValueOnce();

      // Replace the error tracker and reporter in the management system
      const getErrorTrackerSpy = jest.spyOn(errorManagementSystem, 'getErrorTracker');
      getErrorTrackerSpy.mockReturnValue(errorTracker);

      const getErrorReporterSpy = jest.spyOn(errorManagementSystem, 'getErrorReporter');
      getErrorReporterSpy.mockReturnValue(errorReporter);

      // Capture message
      await errorManagementSystem.captureMessage('Test message', {
        level: ErrorLevel.INFO,
        context: {
          key: 'value'
        }
      });

      // Check that captureMessage was called
      expect(captureMessageSpy).toHaveBeenCalled();
    });

    test('should add a breadcrumb', () => {
      // Mock error tracker addBreadcrumb method
      const addBreadcrumbSpy = jest.spyOn(errorTracker, 'addBreadcrumb');
      addBreadcrumbSpy.mockImplementation(() => {});

      // Replace the error tracker in the management system
      const getErrorTrackerSpy = jest.spyOn(errorManagementSystem, 'getErrorTracker');
      getErrorTrackerSpy.mockReturnValue(errorTracker);

      // Add breadcrumb
      errorManagementSystem.addBreadcrumb({
        type: 'navigation',
        category: 'click',
        message: 'User clicked on button'
      });

      // Check that addBreadcrumb was called
      expect(addBreadcrumbSpy).toHaveBeenCalled();
    });

    test('should provide Express middleware', () => {
      // Create middleware
      const middleware = errorManagementSystem.expressMiddleware();
      expect(middleware).toBeDefined();
    });
  });
});