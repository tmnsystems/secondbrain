/**
 * Notification Service
 * @module rollout-timeline/notification-service
 * @description Manages notifications for timeline events
 */

import { 
  NotificationService as NotificationServiceInterface,
  NotificationConfig,
  TimelineItem,
  Timeline,
  NotificationHandler,
  NotificationChannel,
  TimelineEvent
} from './types';

/**
 * Template engine for notification messages
 */
interface TemplateEngine {
  /**
   * Render a template with data
   * @param template The template string
   * @param data Data to use for rendering
   * @returns Rendered string
   */
  render(template: string, data: any): string;
}

/**
 * Simple template engine implementation
 */
class SimpleTemplateEngine implements TemplateEngine {
  /**
   * Render a template with data
   * @param template The template string with {{variable}} placeholders
   * @param data Data object with variables
   * @returns Rendered string
   */
  render(template: string, data: any): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const keys = key.trim().split('.');
      let value = data;
      
      for (const k of keys) {
        if (value === undefined || value === null) {
          return '';
        }
        value = value[k];
      }
      
      return value !== undefined && value !== null ? String(value) : '';
    });
  }
}

/**
 * Implementation of the notification service
 */
export class NotificationService implements NotificationServiceInterface {
  private channelHandlers: Map<string, NotificationHandler> = new Map();
  private templateEngine: TemplateEngine;
  
  /**
   * Create a new notification service
   * @param options Configuration options
   */
  constructor(options: { templateEngine?: TemplateEngine } = {}) {
    this.templateEngine = options.templateEngine || new SimpleTemplateEngine();
    
    // Register default handlers
    this.registerDefaultHandlers();
  }
  
  /**
   * Send a notification
   * @param notification Notification configuration
   * @param timelineItem Timeline item related to the notification
   * @param timeline The timeline
   * @returns Promise resolving to a success boolean
   */
  async sendNotification(
    notification: NotificationConfig, 
    timelineItem: TimelineItem, 
    timeline: Timeline
  ): Promise<boolean> {
    if (notification.sent) {
      console.warn(`Notification ${notification.id} already sent`);
      return false;
    }
    
    // Render message if template is provided
    let message = '';
    if (notification.messageTemplate) {
      const data = {
        timeline,
        item: timelineItem,
        event: notification.event,
        now: new Date(),
        ...notification.data
      };
      
      message = this.templateEngine.render(notification.messageTemplate, data);
    } else {
      // Default message if no template is provided
      message = this.generateDefaultMessage(notification, timelineItem, timeline);
    }
    
    // Track successes
    const results: boolean[] = [];
    
    // Send to each channel
    for (const channel of notification.channels) {
      const handler = this.getHandlerForChannel(channel);
      if (!handler) {
        console.warn(`No handler registered for channel: ${channel}`);
        results.push(false);
        continue;
      }
      
      try {
        const notificationWithMessage = {
          ...notification,
          message
        };
        
        const success = await handler(notificationWithMessage, timelineItem, timeline);
        results.push(success);
      } catch (error) {
        console.error(`Error sending notification to ${channel}: ${error}`);
        results.push(false);
      }
    }
    
    // Mark as sent if at least one channel succeeded
    const anySuccess = results.some(r => r);
    if (anySuccess) {
      notification.sent = true;
      notification.sentAt = new Date();
    }
    
    // Return true only if all channels succeeded
    return results.every(r => r);
  }
  
  /**
   * Register a custom notification handler
   * @param name Channel name
   * @param handler Handler function
   */
  registerChannel(name: string, handler: NotificationHandler): void {
    this.channelHandlers.set(name, handler);
  }
  
  /**
   * Check if notifications for a timeline item are due
   * @param timelineItem The timeline item
   * @param event The event that occurred
   * @param timeline The timeline
   * @returns Array of notifications that need to be sent
   */
  async processEvent(
    timelineItem: TimelineItem, 
    event: TimelineEvent, 
    timeline: Timeline
  ): Promise<NotificationConfig[]> {
    const sentNotifications: NotificationConfig[] = [];
    const notifications = this.getNotificationsForEvent(timelineItem, event, timeline);
    
    for (const notification of notifications) {
      const success = await this.sendNotification(notification, timelineItem, timeline);
      if (success) {
        sentNotifications.push(notification);
      }
    }
    
    return sentNotifications;
  }
  
  /**
   * Register default channel handlers
   * @private
   */
  private registerDefaultHandlers(): void {
    // Console handler
    this.registerChannel(NotificationChannel.CONSOLE, async (notification, item, timeline) => {
      console.log(`[${notification.event}] ${notification.message || 'No message'}`);
      return true;
    });
    
    // Email handler stub
    this.registerChannel(NotificationChannel.EMAIL, async (notification, item, timeline) => {
      console.log(`[EMAIL] Would send email for ${notification.event}: ${notification.message || 'No message'}`);
      return true;
    });
    
    // Slack handler stub
    this.registerChannel(NotificationChannel.SLACK, async (notification, item, timeline) => {
      console.log(`[SLACK] Would send Slack message for ${notification.event}: ${notification.message || 'No message'}`);
      return true;
    });
    
    // Webhook handler stub
    this.registerChannel(NotificationChannel.WEBHOOK, async (notification, item, timeline) => {
      console.log(`[WEBHOOK] Would send webhook for ${notification.event}: ${notification.message || 'No message'}`);
      return true;
    });
    
    // SMS handler stub
    this.registerChannel(NotificationChannel.SMS, async (notification, item, timeline) => {
      console.log(`[SMS] Would send SMS for ${notification.event}: ${notification.message || 'No message'}`);
      return true;
    });
  }
  
  /**
   * Get handler for a notification channel
   * @param channel Channel type
   * @returns Handler function or undefined if not found
   * @private
   */
  private getHandlerForChannel(channel: string): NotificationHandler | undefined {
    return this.channelHandlers.get(channel);
  }
  
  /**
   * Get notifications that should be triggered by an event
   * @param timelineItem Timeline item
   * @param event Event type
   * @param timeline Timeline
   * @returns Array of notifications to send
   * @private
   */
  private getNotificationsForEvent(
    timelineItem: TimelineItem, 
    event: TimelineEvent, 
    timeline: Timeline
  ): NotificationConfig[] {
    const notifications: NotificationConfig[] = [];
    
    // Check item-specific notifications
    if (timelineItem.notifications) {
      for (const notification of timelineItem.notifications) {
        if (notification.event === event && !notification.sent) {
          notifications.push(notification);
        }
      }
    }
    
    // Check timeline-wide notifications
    if (timeline.notifications) {
      for (const notification of timeline.notifications) {
        if (notification.event === event && !notification.sent) {
          notifications.push(notification);
        }
      }
    }
    
    return notifications;
  }
  
  /**
   * Generate a default message for a notification
   * @param notification Notification config
   * @param timelineItem Timeline item
   * @param timeline Timeline
   * @returns Default message
   * @private
   */
  private generateDefaultMessage(
    notification: NotificationConfig, 
    timelineItem: TimelineItem, 
    timeline: Timeline
  ): string {
    const eventMessages = {
      [TimelineEvent.STAGE_STARTED]: `Stage "${timelineItem.name}" has started in timeline "${timeline.name}".`,
      [TimelineEvent.STAGE_COMPLETED]: `Stage "${timelineItem.name}" has been completed in timeline "${timeline.name}".`,
      [TimelineEvent.STAGE_FAILED]: `Stage "${timelineItem.name}" has failed in timeline "${timeline.name}".`,
      [TimelineEvent.STAGE_DELAYED]: `Stage "${timelineItem.name}" has been delayed in timeline "${timeline.name}".`,
      [TimelineEvent.MILESTONE_REACHED]: `Milestone "${timelineItem.name}" has been reached in timeline "${timeline.name}".`,
      [TimelineEvent.MILESTONE_MISSED]: `Milestone "${timelineItem.name}" has been missed in timeline "${timeline.name}".`,
      [TimelineEvent.DEPENDENCY_SATISFIED]: `Dependency has been satisfied for "${timelineItem.name}" in timeline "${timeline.name}".`,
      [TimelineEvent.DEPENDENCY_FAILED]: `Dependency has failed for "${timelineItem.name}" in timeline "${timeline.name}".`,
      [TimelineEvent.TIMELINE_STARTED]: `Timeline "${timeline.name}" (${timeline.version}) has started.`,
      [TimelineEvent.TIMELINE_COMPLETED]: `Timeline "${timeline.name}" (${timeline.version}) has been completed.`,
      [TimelineEvent.TIMELINE_FAILED]: `Timeline "${timeline.name}" (${timeline.version}) has failed.`,
      [TimelineEvent.CUSTOM]: `Custom event for "${timelineItem.name}" in timeline "${timeline.name}".`
    };
    
    return eventMessages[notification.event] || `Event ${notification.event} occurred for "${timelineItem.name}" in timeline "${timeline.name}".`;
  }
}

/**
 * Create a notification configuration
 * @param event Event that triggers the notification
 * @param channels Channels to send the notification to
 * @param options Additional options
 * @returns Notification configuration
 */
export function createNotification(
  event: TimelineEvent,
  channels: NotificationChannel[] = [NotificationChannel.CONSOLE],
  options: {
    id?: string;
    messageTemplate?: string;
    data?: Record<string, any>;
  } = {}
): NotificationConfig {
  return {
    id: options.id || `notification-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    event,
    channels,
    messageTemplate: options.messageTemplate,
    data: options.data,
    sent: false
  };
}