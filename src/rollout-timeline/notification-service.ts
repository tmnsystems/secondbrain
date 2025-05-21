/**
 * Notification service for timeline events
 */

import {
  NotificationServiceInterface,
  NotificationChannel,
  NotificationConfig,
  TimelineItem,
  TimelineInterface
} from './types';

/**
 * Implementation of the notification service
 */
export class NotificationService implements NotificationServiceInterface {
  private handlers: Record<string, Function[]> = {};

  /**
   * Create a new NotificationService
   */
  constructor() {
    // Initialize default handlers
    this.handlers = {
      [NotificationChannel.CONSOLE]: [this.consoleHandler.bind(this)],
      [NotificationChannel.EMAIL]: [],
      [NotificationChannel.SLACK]: [],
      [NotificationChannel.SMS]: [],
      [NotificationChannel.WEBHOOK]: []
    };
  }

  /**
   * Add a notification handler for a specific channel
   */
  addHandler(
    channel: NotificationChannel, 
    handler: (notification: NotificationConfig, item: TimelineItem, timeline: TimelineInterface) => Promise<boolean>
  ): void {
    if (!this.handlers[channel]) {
      this.handlers[channel] = [];
    }
    this.handlers[channel].push(handler);
  }

  /**
   * Remove a notification handler
   */
  removeHandler(channel: NotificationChannel, handler: Function): boolean {
    if (!this.handlers[channel]) {
      return false;
    }
    
    const initialLength = this.handlers[channel].length;
    this.handlers[channel] = this.handlers[channel].filter(h => h !== handler);
    
    return this.handlers[channel].length < initialLength;
  }

  /**
   * Send a notification
   */
  async sendNotification(
    notification: NotificationConfig, 
    timelineItem: TimelineItem, 
    timeline: TimelineInterface
  ): Promise<boolean> {
    try {
      // Check if the notification should be sent
      if (notification.condition && !notification.condition(timelineItem, timeline)) {
        return false;
      }
      
      // Process the template
      const message = this.processTemplate(notification.template, timelineItem, timeline);
      
      // Get handlers for the channel
      const handlers = this.handlers[notification.channel] || [];
      
      if (handlers.length === 0) {
        console.warn(`No handlers registered for channel ${notification.channel}`);
        return false;
      }
      
      // Send to all handlers for the channel
      const results = await Promise.all(
        handlers.map(handler => 
          handler({
            ...notification,
            processedMessage: message
          }, timelineItem, timeline)
        )
      );
      
      // Return true if at least one handler succeeded
      return results.some(Boolean);
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }

  /**
   * Process a template string with variables
   */
  processTemplate(
    template: string, 
    timelineItem: TimelineItem, 
    timeline: TimelineInterface
  ): string {
    // Simple template processing with variable replacements
    let processed = template;
    
    // Replace timeline variables
    processed = processed.replace(/\${timeline\.([^}]+)}/g, (_, key) => {
      const value = getNestedValue(timeline, key);
      return value !== undefined ? String(value) : `\${timeline.${key}}`;
    });
    
    // Replace item variables
    processed = processed.replace(/\${item\.([^}]+)}/g, (_, key) => {
      const value = getNestedValue(timelineItem, key);
      return value !== undefined ? String(value) : `\${item.${key}}`;
    });
    
    // Replace date variables
    processed = processed.replace(/\${date}/g, new Date().toISOString());
    processed = processed.replace(/\${formattedDate}/g, formatDate(new Date()));
    
    return processed;
  }

  /**
   * Default console handler
   */
  private async consoleHandler(
    notification: NotificationConfig & { processedMessage: string },
    timelineItem: TimelineItem,
    timeline: TimelineInterface
  ): Promise<boolean> {
    const prefix = `[${notification.channel.toUpperCase()}] [${notification.trigger}]`;
    console.log(`${prefix} ${notification.processedMessage}`);
    return true;
  }

  /**
   * Register an email notification handler
   */
  registerEmailHandler(
    handler: (to: string[], subject: string, body: string, config: any) => Promise<boolean>
  ): void {
    this.addHandler(NotificationChannel.EMAIL, async (notification, item, timeline) => {
      const recipients = notification.recipients || [];
      const subject = `[${timeline.name}] ${item.name}`;
      const body = notification.processedMessage;
      
      return handler(recipients, subject, body, notification.channelConfig || {});
    });
  }

  /**
   * Register a Slack notification handler
   */
  registerSlackHandler(
    handler: (channel: string, message: string, config: any) => Promise<boolean>
  ): void {
    this.addHandler(NotificationChannel.SLACK, async (notification, item, timeline) => {
      const channel = (notification.channelConfig?.channel) || '#general';
      const message = notification.processedMessage;
      
      return handler(channel, message, notification.channelConfig || {});
    });
  }

  /**
   * Register a webhook notification handler
   */
  registerWebhookHandler(
    handler: (url: string, payload: any) => Promise<boolean>
  ): void {
    this.addHandler(NotificationChannel.WEBHOOK, async (notification, item, timeline) => {
      const url = notification.channelConfig?.url;
      if (!url) {
        console.error('No URL provided for webhook notification');
        return false;
      }
      
      const payload = {
        timeline: {
          id: timeline.id,
          name: timeline.name,
          status: timeline.status
        },
        item: {
          id: item.id,
          name: item.name,
          status: item.status,
          type: 'tasks' in item ? 'stage' : 'milestone'
        },
        notification: {
          trigger: notification.trigger,
          message: notification.processedMessage,
          timestamp: new Date().toISOString()
        }
      };
      
      return handler(url, payload);
    });
  }

  /**
   * Register a SMS notification handler
   */
  registerSmsHandler(
    handler: (to: string[], message: string, config: any) => Promise<boolean>
  ): void {
    this.addHandler(NotificationChannel.SMS, async (notification, item, timeline) => {
      const recipients = notification.recipients || [];
      const message = notification.processedMessage;
      
      return handler(recipients, message, notification.channelConfig || {});
    });
  }
}

/**
 * Helper function to get a nested object value
 */
function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.');
  return keys.reduce((o, key) => (o && o[key] !== undefined) ? o[key] : undefined, obj);
}

/**
 * Format a date nicely
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}