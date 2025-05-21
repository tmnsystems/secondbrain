import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { ErrorEvent, ErrorLevel } from './errorTracker';
import { Logger } from '../logging/logger';

/**
 * Interface for error reporter options
 */
export interface ErrorReporterOptions {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  sentryDsn?: string;
  slackWebhook?: string;
  emailConfig?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
    from: string;
    to: string[];
  };
  githubConfig?: {
    owner: string;
    repo: string;
    token: string;
    assignees?: string[];
    labels?: string[];
  };
  reportingRules?: {
    minSeverity: ErrorLevel;
    rateLimitPerHour: number;
    ignoredMessages?: string[];
    ignoredTypes?: string[];
  };
  logger?: Logger;
}

/**
 * Error reporter for sending errors to different platforms
 */
export class ErrorReporter {
  private options: ErrorReporterOptions;
  private logger: Logger;
  private errorCount: Map<string, { count: number; lastReported: number }> = new Map();

  /**
   * Creates a new error reporter instance
   * 
   * @param {ErrorReporterOptions} options - Error reporter options
   */
  constructor(options: ErrorReporterOptions) {
    this.options = {
      serviceName: 'unknown',
      serviceVersion: '1.0.0',
      environment: 'development',
      reportingRules: {
        minSeverity: ErrorLevel.ERROR,
        rateLimitPerHour: 10
      },
      ...options
    };

    this.logger = options.logger || new Logger({ service: this.options.serviceName });

    this.logger.info('Error reporter initialized', {
      serviceName: this.options.serviceName,
      serviceVersion: this.options.serviceVersion,
      environment: this.options.environment,
      platforms: [
        this.options.sentryDsn ? 'sentry' : '',
        this.options.slackWebhook ? 'slack' : '',
        this.options.emailConfig ? 'email' : '',
        this.options.githubConfig ? 'github' : ''
      ].filter(Boolean)
    });
  }

  /**
   * Reports an error event to configured platforms
   * 
   * @param {ErrorEvent} errorEvent - Error event
   * @returns {Promise<void>}
   */
  async reportError(errorEvent: ErrorEvent): Promise<void> {
    // Check if the error should be reported based on rules
    if (!this.shouldReportError(errorEvent)) {
      this.logger.debug('Error not reported due to rules', {
        message: errorEvent.message,
        level: errorEvent.level
      });
      return;
    }

    // Update error count for rate limiting
    const fingerprintKey = this.getErrorFingerprint(errorEvent);
    const errorStats = this.errorCount.get(fingerprintKey) || { count: 0, lastReported: 0 };
    const now = Date.now();
    const hourAgo = now - 3600000;

    // Reset count if last reported was more than an hour ago
    if (errorStats.lastReported < hourAgo) {
      errorStats.count = 0;
    }

    // Increment count and update last reported time
    errorStats.count += 1;
    errorStats.lastReported = now;
    this.errorCount.set(fingerprintKey, errorStats);

    // Check rate limit
    if (errorStats.count > (this.options.reportingRules?.rateLimitPerHour || 10)) {
      this.logger.debug('Error not reported due to rate limit', {
        message: errorEvent.message,
        level: errorEvent.level,
        count: errorStats.count
      });
      return;
    }

    // Send to all configured platforms
    const promises: Promise<void>[] = [];

    if (this.options.sentryDsn) {
      promises.push(this.sendToSentry(errorEvent));
    }

    if (this.options.slackWebhook) {
      promises.push(this.sendToSlack(errorEvent));
    }

    if (this.options.emailConfig) {
      promises.push(this.sendEmail(errorEvent));
    }

    if (this.options.githubConfig) {
      promises.push(this.createGithubIssue(errorEvent));
    }

    // Always write to local file
    promises.push(this.writeToFile(errorEvent));

    try {
      await Promise.all(promises);
      this.logger.debug('Error reported to all platforms', {
        message: errorEvent.message,
        level: errorEvent.level
      });
    } catch (error) {
      this.logger.error('Failed to report error', { error });
    }
  }

  /**
   * Checks if an error should be reported based on rules
   * 
   * @param {ErrorEvent} errorEvent - Error event
   * @returns {boolean} Whether the error should be reported
   * @private
   */
  private shouldReportError(errorEvent: ErrorEvent): boolean {
    const rules = this.options.reportingRules;
    if (!rules) {
      return true;
    }

    // Check severity level
    const severityLevels = [
      ErrorLevel.DEBUG,
      ErrorLevel.INFO,
      ErrorLevel.WARNING,
      ErrorLevel.ERROR,
      ErrorLevel.FATAL
    ];
    const eventSeverityIndex = severityLevels.indexOf(errorEvent.level);
    const minSeverityIndex = severityLevels.indexOf(rules.minSeverity);

    if (eventSeverityIndex < minSeverityIndex) {
      return false;
    }

    // Check ignored messages
    if (rules.ignoredMessages && rules.ignoredMessages.length > 0) {
      for (const ignoredPattern of rules.ignoredMessages) {
        if (errorEvent.message.includes(ignoredPattern)) {
          return false;
        }
      }
    }

    // Check ignored types
    if (rules.ignoredTypes && rules.ignoredTypes.length > 0 && errorEvent.exception?.type) {
      if (rules.ignoredTypes.includes(errorEvent.exception.type)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Gets a unique fingerprint for an error event
   * 
   * @param {ErrorEvent} errorEvent - Error event
   * @returns {string} Error fingerprint
   * @private
   */
  private getErrorFingerprint(errorEvent: ErrorEvent): string {
    if (errorEvent.fingerprint && errorEvent.fingerprint.length > 0) {
      return errorEvent.fingerprint.join('|');
    }

    return `${errorEvent.exception?.type || 'message'}|${errorEvent.message}`;
  }

  /**
   * Sends an error event to Sentry
   * 
   * @param {ErrorEvent} errorEvent - Error event
   * @returns {Promise<void>}
   * @private
   */
  private async sendToSentry(errorEvent: ErrorEvent): Promise<void> {
    if (!this.options.sentryDsn) {
      return;
    }

    try {
      // Extract project ID and endpoint from DSN
      const dsn = new URL(this.options.sentryDsn);
      const projectId = dsn.pathname.split('/').pop();
      const endpoint = `${dsn.protocol}//${dsn.host}/api/${projectId}/store/`;

      // Convert ErrorEvent to Sentry event format
      const sentryEvent = {
        event_id: this.generateUuid(),
        timestamp: errorEvent.timestamp,
        platform: 'node',
        level: errorEvent.level,
        server_name: errorEvent.tags?.hostname,
        release: this.options.serviceVersion,
        environment: this.options.environment,
        tags: errorEvent.tags,
        extra: errorEvent.context,
        breadcrumbs: errorEvent.breadcrumbs?.map(breadcrumb => ({
          timestamp: new Date(breadcrumb.timestamp).getTime() / 1000,
          type: breadcrumb.type,
          category: breadcrumb.category,
          message: breadcrumb.message,
          data: breadcrumb.data
        })),
        user: errorEvent.user,
        request: errorEvent.request ? {
          url: errorEvent.request.url,
          method: errorEvent.request.method,
          headers: errorEvent.request.headers,
          data: {
            ...errorEvent.request.params,
            ...errorEvent.request.query
          }
        } : undefined,
        exception: errorEvent.exception ? {
          values: [
            {
              type: errorEvent.exception.type,
              value: errorEvent.exception.value,
              stacktrace: errorEvent.exception.stacktrace ? {
                frames: this.parseStacktrace(errorEvent.exception.stacktrace)
              } : undefined
            }
          ]
        } : undefined,
        message: errorEvent.message,
        fingerprint: errorEvent.fingerprint
      };

      // Send to Sentry
      const authHeader = `Sentry sentry_version=7, sentry_key=${dsn.username}, sentry_client=secondbrain-error-reporter/1.0.0`;
      
      await axios.post(endpoint, sentryEvent, {
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Auth': authHeader
        }
      });

      this.logger.debug('Error sent to Sentry', {
        message: errorEvent.message,
        level: errorEvent.level
      });
    } catch (error) {
      this.logger.error('Failed to send error to Sentry', { error });
    }
  }

  /**
   * Parses a stacktrace string into Sentry frame format
   * 
   * @param {string} stacktrace - Stacktrace string
   * @returns {Array} Sentry frames
   * @private
   */
  private parseStacktrace(stacktrace: string): any[] {
    if (!stacktrace) {
      return [];
    }

    const frames: any[] = [];
    const lines = stacktrace.split('\n').slice(1); // Skip first line (error message)

    for (const line of lines) {
      const match = line.match(/at (?:(.+?)\s+\()?(?:(.+?):(\d+)(?::(\d+))?|([^)]+))\)?/);
      if (!match) continue;

      const [, functionName, filename, lineNumber, columnNumber] = match;
      
      frames.push({
        function: functionName || '?',
        filename: filename || '?',
        lineno: lineNumber ? parseInt(lineNumber, 10) : undefined,
        colno: columnNumber ? parseInt(columnNumber, 10) : undefined,
        in_app: filename ? !filename.includes('node_modules') : true
      });
    }

    // Reverse frames to match Sentry format (most recent call first)
    return frames.reverse();
  }

  /**
   * Sends an error event to Slack
   * 
   * @param {ErrorEvent} errorEvent - Error event
   * @returns {Promise<void>}
   * @private
   */
  private async sendToSlack(errorEvent: ErrorEvent): Promise<void> {
    if (!this.options.slackWebhook) {
      return;
    }

    try {
      // Create a color based on the error level
      let color = '#2eb886'; // info (green)
      switch (errorEvent.level) {
        case ErrorLevel.WARNING:
          color = '#daa038'; // warning (yellow)
          break;
        case ErrorLevel.ERROR:
          color = '#a30200'; // error (red)
          break;
        case ErrorLevel.FATAL:
          color = '#7928a1'; // fatal (purple)
          break;
      }

      // Create a Slack message
      const slackMessage = {
        attachments: [
          {
            color,
            pretext: `*${this.options.serviceName}* - ${this.options.environment}`,
            author_name: errorEvent.tags?.service || this.options.serviceName,
            title: `[${errorEvent.level.toUpperCase()}] ${errorEvent.message}`,
            text: errorEvent.exception?.stacktrace ? '```' + errorEvent.exception.stacktrace.slice(0, 1000) + (errorEvent.exception.stacktrace.length > 1000 ? '...' : '') + '```' : undefined,
            fields: [
              {
                title: 'Environment',
                value: this.options.environment,
                short: true
              },
              {
                title: 'Version',
                value: this.options.serviceVersion,
                short: true
              },
              {
                title: 'Error Type',
                value: errorEvent.exception?.type || 'Message',
                short: true
              },
              {
                title: 'User',
                value: errorEvent.user?.id || errorEvent.user?.email || 'Anonymous',
                short: true
              }
            ],
            footer: `Error Reporter`,
            ts: Math.floor(new Date(errorEvent.timestamp).getTime() / 1000)
          }
        ]
      };

      // Send to Slack
      await axios.post(this.options.slackWebhook, slackMessage, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.logger.debug('Error sent to Slack', {
        message: errorEvent.message,
        level: errorEvent.level
      });
    } catch (error) {
      this.logger.error('Failed to send error to Slack', { error });
    }
  }

  /**
   * Sends an error event via email
   * 
   * @param {ErrorEvent} errorEvent - Error event
   * @returns {Promise<void>}
   * @private
   */
  private async sendEmail(errorEvent: ErrorEvent): Promise<void> {
    if (!this.options.emailConfig) {
      return;
    }

    try {
      // We'd normally use nodemailer here, but for simplicity we'll just log
      this.logger.info('Email would be sent', {
        to: this.options.emailConfig.to,
        subject: `[${this.options.environment.toUpperCase()}] [${errorEvent.level.toUpperCase()}] ${this.options.serviceName} - ${errorEvent.message}`,
        body: `
          <h1>${errorEvent.message}</h1>
          <p><strong>Service:</strong> ${this.options.serviceName}</p>
          <p><strong>Version:</strong> ${this.options.serviceVersion}</p>
          <p><strong>Environment:</strong> ${this.options.environment}</p>
          <p><strong>Level:</strong> ${errorEvent.level}</p>
          <p><strong>Timestamp:</strong> ${errorEvent.timestamp}</p>
          ${errorEvent.exception ? `
            <h2>Exception</h2>
            <p><strong>Type:</strong> ${errorEvent.exception.type}</p>
            <p><strong>Value:</strong> ${errorEvent.exception.value}</p>
            <pre>${errorEvent.exception.stacktrace}</pre>
          ` : ''}
          ${errorEvent.context ? `
            <h2>Context</h2>
            <pre>${JSON.stringify(errorEvent.context, null, 2)}</pre>
          ` : ''}
          ${errorEvent.request ? `
            <h2>Request</h2>
            <p><strong>URL:</strong> ${errorEvent.request.url}</p>
            <p><strong>Method:</strong> ${errorEvent.request.method}</p>
            <h3>Headers</h3>
            <pre>${JSON.stringify(errorEvent.request.headers, null, 2)}</pre>
            <h3>Params</h3>
            <pre>${JSON.stringify(errorEvent.request.params, null, 2)}</pre>
            <h3>Query</h3>
            <pre>${JSON.stringify(errorEvent.request.query, null, 2)}</pre>
          ` : ''}
        `
      });

      this.logger.debug('Error sent via email', {
        message: errorEvent.message,
        level: errorEvent.level
      });
    } catch (error) {
      this.logger.error('Failed to send error via email', { error });
    }
  }

  /**
   * Creates a GitHub issue for an error event
   * 
   * @param {ErrorEvent} errorEvent - Error event
   * @returns {Promise<void>}
   * @private
   */
  private async createGithubIssue(errorEvent: ErrorEvent): Promise<void> {
    if (!this.options.githubConfig) {
      return;
    }

    try {
      const { owner, repo, token, assignees, labels } = this.options.githubConfig;

      // Check if a similar issue already exists
      const searchUrl = `https://api.github.com/search/issues?q=repo:${owner}/${repo}+is:issue+${encodeURIComponent(errorEvent.message)}`;
      const searchResponse = await axios.get(searchUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (searchResponse.data.total_count > 0) {
        // Issue already exists, comment on it
        const issueNumber = searchResponse.data.items[0].number;
        const commentUrl = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`;
        
        await axios.post(commentUrl, {
          body: `## Another occurrence

**Level:** ${errorEvent.level}
**Timestamp:** ${errorEvent.timestamp}
**Service:** ${this.options.serviceName}
**Version:** ${this.options.serviceVersion}
**Environment:** ${this.options.environment}

${errorEvent.exception?.stacktrace ? `\`\`\`\n${errorEvent.exception.stacktrace}\n\`\`\`` : ''}`
        }, {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });

        this.logger.debug('Comment added to existing GitHub issue', {
          message: errorEvent.message,
          level: errorEvent.level,
          issueNumber
        });
      } else {
        // Create a new issue
        const issueUrl = `https://api.github.com/repos/${owner}/${repo}/issues`;
        
        const body = `## Error details

**Level:** ${errorEvent.level}
**Timestamp:** ${errorEvent.timestamp}
**Service:** ${this.options.serviceName}
**Version:** ${this.options.serviceVersion}
**Environment:** ${this.options.environment}

${errorEvent.exception ? `## Exception

**Type:** ${errorEvent.exception.type}
**Value:** ${errorEvent.exception.value}

\`\`\`
${errorEvent.exception.stacktrace}
\`\`\`
` : ''}

${errorEvent.context ? `## Context

\`\`\`json
${JSON.stringify(errorEvent.context, null, 2)}
\`\`\`
` : ''}

${errorEvent.request ? `## Request

**URL:** ${errorEvent.request.url}
**Method:** ${errorEvent.request.method}

### Headers
\`\`\`json
${JSON.stringify(errorEvent.request.headers, null, 2)}
\`\`\`

### Params
\`\`\`json
${JSON.stringify(errorEvent.request.params, null, 2)}
\`\`\`

### Query
\`\`\`json
${JSON.stringify(errorEvent.request.query, null, 2)}
\`\`\`
` : ''}`;

        await axios.post(issueUrl, {
          title: `[${this.options.environment}] [${errorEvent.level}] ${errorEvent.message}`,
          body,
          assignees: assignees || [],
          labels: [...(labels || []), 'error', `severity:${errorEvent.level}`]
        }, {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });

        this.logger.debug('GitHub issue created', {
          message: errorEvent.message,
          level: errorEvent.level
        });
      }
    } catch (error) {
      this.logger.error('Failed to create GitHub issue', { error });
    }
  }

  /**
   * Writes an error event to a local file
   * 
   * @param {ErrorEvent} errorEvent - Error event
   * @returns {Promise<void>}
   * @private
   */
  private async writeToFile(errorEvent: ErrorEvent): Promise<void> {
    try {
      const logsDir = path.join(process.cwd(), 'logs', 'reports');
      
      // Ensure the logs directory exists
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      // Create a filename based on the date
      const date = new Date();
      const filename = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}.log`;
      const filePath = path.join(logsDir, filename);

      // Append to the file
      fs.appendFileSync(
        filePath,
        `${JSON.stringify({
          timestamp: new Date().toISOString(),
          service: this.options.serviceName,
          version: this.options.serviceVersion,
          environment: this.options.environment,
          ...errorEvent
        })}\n`,
        'utf8'
      );

      this.logger.debug('Error written to file', {
        message: errorEvent.message,
        level: errorEvent.level,
        filePath
      });
    } catch (error) {
      this.logger.error('Failed to write error to file', { error });
    }
  }

  /**
   * Generates a UUID v4
   * 
   * @returns {string} UUID
   * @private
   */
  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}