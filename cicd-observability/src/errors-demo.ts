import express from 'express';
import { ErrorManagementSystem, ErrorLevel } from './errors';
import { Logger } from './logging/logger';

// Create logger
const logger = new Logger({
  service: 'error-demo',
  level: 'info',
  transports: ['console', 'file'],
  filePath: './logs/error-demo.log'
});

// Create error management system
const errorManagement = new ErrorManagementSystem({
  trackerOptions: {
    serviceName: 'error-demo',
    serviceVersion: '1.0.0',
    environment: 'development',
    captureUnhandledRejections: true,
    captureUncaughtExceptions: true,
    logger
  },
  reporterOptions: {
    serviceName: 'error-demo',
    serviceVersion: '1.0.0',
    environment: 'development',
    // Enable the following options if you have the services configured
    // sentryDsn: process.env.SENTRY_DSN,
    // slackWebhook: process.env.SLACK_WEBHOOK,
    // githubConfig: {
    //   owner: 'your-org',
    //   repo: 'your-repo',
    //   token: process.env.GITHUB_TOKEN
    // },
    reportingRules: {
      minSeverity: ErrorLevel.INFO,
      rateLimitPerHour: 10,
      ignoredMessages: ['Ignored error']
    },
    logger
  }
});

// Create express app
const app = express();

// Add error management middleware
app.use(errorManagement.expressMiddleware());

// Add routes
app.get('/', (req, res) => {
  res.send('Error Demo');
});

// Test routes for different error types
app.get('/error', (req, res, next) => {
  try {
    throw new Error('Test error');
  } catch (error) {
    next(error);
  }
});

app.get('/captured-error', (req, res) => {
  try {
    throw new Error('Manually captured error');
  } catch (error) {
    errorManagement.captureException(error as Error, {
      level: ErrorLevel.ERROR,
      context: {
        additionalInfo: 'This is a manually captured error'
      },
      tags: {
        location: 'captured-error-route'
      },
      user: {
        id: '123',
        email: 'user@example.com'
      }
    });
    res.status(500).send('Error captured');
  }
});

app.get('/message', (req, res) => {
  errorManagement.captureMessage('Test message', {
    level: ErrorLevel.INFO,
    context: {
      additionalInfo: 'This is a test message'
    },
    tags: {
      location: 'message-route'
    }
  });
  res.send('Message captured');
});

app.get('/breadcrumb', (req, res) => {
  // Add breadcrumbs
  errorManagement.addBreadcrumb({
    type: 'navigation',
    category: 'click',
    message: 'User clicked on button'
  });
  
  errorManagement.addBreadcrumb({
    type: 'user',
    category: 'action',
    message: 'User performed an action',
    data: {
      actionType: 'submit',
      formId: 'test-form'
    }
  });
  
  // Throw an error with breadcrumbs
  try {
    throw new Error('Error with breadcrumbs');
  } catch (error) {
    errorManagement.captureException(error as Error);
    res.status(500).send('Error with breadcrumbs captured');
  }
});

app.get('/ignored', (req, res) => {
  try {
    throw new Error('Ignored error');
  } catch (error) {
    errorManagement.captureException(error as Error);
    res.send('Ignored error was not reported due to rules');
  }
});

app.get('/unhandled', (req, res) => {
  // This will trigger the unhandled rejection handler
  new Promise((_, reject) => {
    reject(new Error('Unhandled rejection'));
  });
  
  res.send('Unhandled rejection triggered');
});

// Express error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  errorManagement.captureException(err, {
    request: {
      url: req.url,
      method: req.method,
      headers: req.headers,
      params: req.params,
      query: req.query
    }
  });
  
  res.status(500).send('An error occurred');
});

// Start the app
const port = 3001;
app.listen(port, () => {
  logger.info(`Error demo listening at http://localhost:${port}`);
  
  // Log some startup information
  logger.info('Available routes:');
  logger.info('- GET / - Home page');
  logger.info('- GET /error - Trigger an error');
  logger.info('- GET /captured-error - Manually capture an error');
  logger.info('- GET /message - Capture a message');
  logger.info('- GET /breadcrumb - Add breadcrumbs and capture an error');
  logger.info('- GET /ignored - Trigger an ignored error');
  logger.info('- GET /unhandled - Trigger an unhandled rejection');
});

// Export for testing
export default app;