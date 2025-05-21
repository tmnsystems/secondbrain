import axios from 'axios';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { Logger } from '../logging/logger';

/**
 * Interface for alert notification receiver
 */
export interface AlertReceiver {
  name: string;
  email_configs?: {
    to: string;
    send_resolved?: boolean;
  }[];
  slack_configs?: {
    channel: string;
    api_url?: string;
    send_resolved?: boolean;
  }[];
  webhook_configs?: {
    url: string;
    send_resolved?: boolean;
  }[];
  [key: string]: any;
}

/**
 * Interface for alert route
 */
export interface AlertRoute {
  receiver: string;
  group_by?: string[];
  matchers?: string[];
  continue?: boolean;
  routes?: AlertRoute[];
  [key: string]: any;
}

/**
 * Interface for Alertmanager configuration
 */
export interface AlertmanagerConfig {
  global?: {
    smtp_smarthost?: string;
    smtp_from?: string;
    smtp_auth_username?: string;
    smtp_auth_password?: string;
    smtp_require_tls?: boolean;
    slack_api_url?: string;
    [key: string]: any;
  };
  route: AlertRoute;
  receivers: AlertReceiver[];
  templates?: string[];
  [key: string]: any;
}

/**
 * Alert manager for configuring Alertmanager and handling alert notifications
 */
export class AlertManager {
  private alertmanagerUrl: string;
  private logger: Logger;
  private configPath: string;

  /**
   * Creates a new alert manager instance
   * 
   * @param {string} alertmanagerUrl - Alertmanager API URL (default: http://localhost:9093)
   * @param {Logger} logger - Logger instance
   * @param {string} configPath - Path to Alertmanager configuration file
   */
  constructor(
    alertmanagerUrl: string = 'http://localhost:9093',
    logger: Logger,
    configPath: string = path.join(process.cwd(), 'config', 'monitoring', 'alertmanager.yml')
  ) {
    this.alertmanagerUrl = alertmanagerUrl;
    this.logger = logger;
    this.configPath = configPath;
  }

  /**
   * Gets current alerts from Alertmanager
   * 
   * @param {boolean} silenced - Whether to include silenced alerts
   * @param {boolean} inhibited - Whether to include inhibited alerts
   * @returns {Promise<any>} Alerts
   */
  async getAlerts(silenced: boolean = false, inhibited: boolean = false): Promise<any> {
    try {
      this.logger.info('Getting alerts from Alertmanager');
      
      const response = await axios.get(
        `${this.alertmanagerUrl}/api/v2/alerts`,
        {
          params: {
            silenced: silenced.toString(),
            inhibited: inhibited.toString()
          }
        }
      );
      
      this.logger.info(`Retrieved ${response.data.length} alerts from Alertmanager`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get alerts from Alertmanager', { error });
      throw new Error(`Failed to get alerts: ${error.message}`);
    }
  }

  /**
   * Gets silences from Alertmanager
   * 
   * @returns {Promise<any>} Silences
   */
  async getSilences(): Promise<any> {
    try {
      this.logger.info('Getting silences from Alertmanager');
      
      const response = await axios.get(
        `${this.alertmanagerUrl}/api/v2/silences`
      );
      
      this.logger.info(`Retrieved ${response.data.length} silences from Alertmanager`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get silences from Alertmanager', { error });
      throw new Error(`Failed to get silences: ${error.message}`);
    }
  }

  /**
   * Creates a silence in Alertmanager
   * 
   * @param {Record<string, string>} matchers - Alert matchers
   * @param {string} comment - Silence comment
   * @param {number} durationMinutes - Silence duration in minutes
   * @returns {Promise<string>} Silence ID
   */
  async createSilence(
    matchers: Record<string, string>,
    comment: string,
    durationMinutes: number = 60
  ): Promise<string> {
    try {
      this.logger.info(`Creating silence for matchers: ${JSON.stringify(matchers)}`);
      
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
      
      const matcherItems = Object.entries(matchers).map(([name, value]) => ({
        name,
        value,
        isRegex: false
      }));
      
      const response = await axios.post(
        `${this.alertmanagerUrl}/api/v2/silences`,
        {
          matchers: matcherItems,
          startsAt: startTime.toISOString(),
          endsAt: endTime.toISOString(),
          comment,
          createdBy: 'AlertManager'
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      this.logger.info(`Silence created: ${response.data.silenceID}`);
      return response.data.silenceID;
    } catch (error) {
      this.logger.error(`Failed to create silence`, { error, matchers });
      throw new Error(`Failed to create silence: ${error.message}`);
    }
  }

  /**
   * Deletes a silence from Alertmanager
   * 
   * @param {string} silenceId - Silence ID
   * @returns {Promise<void>}
   */
  async deleteSilence(silenceId: string): Promise<void> {
    try {
      this.logger.info(`Deleting silence: ${silenceId}`);
      
      await axios.delete(
        `${this.alertmanagerUrl}/api/v2/silence/${silenceId}`
      );
      
      this.logger.info(`Silence deleted: ${silenceId}`);
    } catch (error) {
      this.logger.error(`Failed to delete silence: ${silenceId}`, { error });
      throw new Error(`Failed to delete silence: ${error.message}`);
    }
  }

  /**
   * Gets the current Alertmanager configuration
   * 
   * @returns {Promise<AlertmanagerConfig>} Alertmanager configuration
   */
  async getConfig(): Promise<AlertmanagerConfig> {
    try {
      this.logger.info('Getting Alertmanager configuration');
      
      const response = await axios.get(
        `${this.alertmanagerUrl}/api/v2/status`
      );
      
      this.logger.info('Retrieved Alertmanager configuration');
      return response.data.config;
    } catch (error) {
      this.logger.error('Failed to get Alertmanager configuration', { error });
      throw new Error(`Failed to get Alertmanager configuration: ${error.message}`);
    }
  }

  /**
   * Updates the Alertmanager configuration
   * 
   * @param {AlertmanagerConfig} config - Alertmanager configuration
   * @returns {Promise<void>}
   */
  async updateConfig(config: AlertmanagerConfig): Promise<void> {
    try {
      this.logger.info('Updating Alertmanager configuration');
      
      const configYaml = yaml.dump(config);
      
      // Write to the configuration file
      fs.writeFileSync(this.configPath, configYaml, 'utf8');
      
      // Reload Alertmanager (this is usually done by Prometheus Operator)
      // Typically, you would update a ConfigMap in Kubernetes instead
      this.logger.info('Alertmanager configuration updated, manual reload may be required');
    } catch (error) {
      this.logger.error('Failed to update Alertmanager configuration', { error });
      throw new Error(`Failed to update Alertmanager configuration: ${error.message}`);
    }
  }

  /**
   * Adds a notification receiver to Alertmanager
   * 
   * @param {AlertReceiver} receiver - Notification receiver
   * @returns {Promise<void>}
   */
  async addReceiver(receiver: AlertReceiver): Promise<void> {
    try {
      this.logger.info(`Adding notification receiver: ${receiver.name}`);
      
      const config = await this.getConfig();
      
      // Check if receiver already exists
      const existingReceiverIndex = config.receivers.findIndex(r => r.name === receiver.name);
      
      if (existingReceiverIndex >= 0) {
        // Update existing receiver
        config.receivers[existingReceiverIndex] = receiver;
      } else {
        // Add new receiver
        config.receivers.push(receiver);
      }
      
      await this.updateConfig(config);
      
      this.logger.info(`Notification receiver added: ${receiver.name}`);
    } catch (error) {
      this.logger.error(`Failed to add notification receiver: ${receiver.name}`, { error });
      throw new Error(`Failed to add notification receiver: ${error.message}`);
    }
  }

  /**
   * Adds a route to Alertmanager
   * 
   * @param {AlertRoute} route - Alert route
   * @param {string} parentRouteName - Parent route receiver name (null for root route)
   * @returns {Promise<void>}
   */
  async addRoute(route: AlertRoute, parentRouteName: string | null = null): Promise<void> {
    try {
      this.logger.info(`Adding alert route to receiver: ${route.receiver}`);
      
      const config = await this.getConfig();
      
      if (!parentRouteName) {
        // Add to root routes
        if (!config.route.routes) {
          config.route.routes = [];
        }
        
        // Check if route already exists
        const existingRouteIndex = config.route.routes.findIndex(r => r.receiver === route.receiver);
        
        if (existingRouteIndex >= 0) {
          // Update existing route
          config.route.routes[existingRouteIndex] = route;
        } else {
          // Add new route
          config.route.routes.push(route);
        }
      } else {
        // Find parent route
        const findAndUpdateRoute = (currentRoute: AlertRoute): boolean => {
          if (currentRoute.receiver === parentRouteName) {
            if (!currentRoute.routes) {
              currentRoute.routes = [];
            }
            
            // Check if route already exists
            const existingRouteIndex = currentRoute.routes.findIndex(r => r.receiver === route.receiver);
            
            if (existingRouteIndex >= 0) {
              // Update existing route
              currentRoute.routes[existingRouteIndex] = route;
            } else {
              // Add new route
              currentRoute.routes.push(route);
            }
            
            return true;
          }
          
          if (currentRoute.routes) {
            for (const childRoute of currentRoute.routes) {
              if (findAndUpdateRoute(childRoute)) {
                return true;
              }
            }
          }
          
          return false;
        };
        
        // Start from root route
        if (!findAndUpdateRoute(config.route)) {
          throw new Error(`Parent route not found: ${parentRouteName}`);
        }
      }
      
      await this.updateConfig(config);
      
      this.logger.info(`Alert route added to receiver: ${route.receiver}`);
    } catch (error) {
      this.logger.error(`Failed to add alert route to receiver: ${route.receiver}`, { error });
      throw new Error(`Failed to add alert route: ${error.message}`);
    }
  }

  /**
   * Creates a standard notification setup with email, Slack, and webhook receivers
   * 
   * @param {string} appName - Application name
   * @param {Object} config - Notification configuration
   * @returns {Promise<void>}
   */
  async setupStandardNotifications(
    appName: string,
    config: {
      emails?: string[];
      slackChannels?: string[];
      webhookUrls?: string[];
      smtpSettings?: {
        host: string;
        port: number;
        username: string;
        password: string;
        from: string;
      };
      slackApiUrl?: string;
    }
  ): Promise<void> {
    try {
      this.logger.info(`Setting up standard notifications for: ${appName}`);
      
      const {
        emails = [],
        slackChannels = [],
        webhookUrls = [],
        smtpSettings,
        slackApiUrl
      } = config;
      
      // Update global config
      const alertmanagerConfig = await this.getConfig();
      
      if (smtpSettings) {
        if (!alertmanagerConfig.global) {
          alertmanagerConfig.global = {};
        }
        
        alertmanagerConfig.global.smtp_smarthost = `${smtpSettings.host}:${smtpSettings.port}`;
        alertmanagerConfig.global.smtp_from = smtpSettings.from;
        alertmanagerConfig.global.smtp_auth_username = smtpSettings.username;
        alertmanagerConfig.global.smtp_auth_password = smtpSettings.password;
        alertmanagerConfig.global.smtp_require_tls = true;
      }
      
      if (slackApiUrl) {
        if (!alertmanagerConfig.global) {
          alertmanagerConfig.global = {};
        }
        
        alertmanagerConfig.global.slack_api_url = slackApiUrl;
      }
      
      await this.updateConfig(alertmanagerConfig);
      
      // Create receivers
      
      // Email receiver
      if (emails.length > 0) {
        const emailReceiver: AlertReceiver = {
          name: `${appName}-email`,
          email_configs: emails.map(email => ({
            to: email,
            send_resolved: true
          }))
        };
        
        await this.addReceiver(emailReceiver);
      }
      
      // Slack receiver
      if (slackChannels.length > 0) {
        const slackReceiver: AlertReceiver = {
          name: `${appName}-slack`,
          slack_configs: slackChannels.map(channel => ({
            channel,
            send_resolved: true
          }))
        };
        
        await this.addReceiver(slackReceiver);
      }
      
      // Webhook receiver
      if (webhookUrls.length > 0) {
        const webhookReceiver: AlertReceiver = {
          name: `${appName}-webhook`,
          webhook_configs: webhookUrls.map(url => ({
            url,
            send_resolved: true
          }))
        };
        
        await this.addReceiver(webhookReceiver);
      }
      
      // Create route
      const route: AlertRoute = {
        receiver: `${appName}-email`, // Default to email
        group_by: ['alertname', 'app'],
        matchers: [`app=${appName}`],
        continue: true, // Continue to next matching routes
        routes: []
      };
      
      // Add subroutes for different severity levels
      route.routes!.push({
        receiver: `${appName}-slack`,
        matchers: ['severity=critical'],
        continue: true
      });
      
      route.routes!.push({
        receiver: `${appName}-webhook`,
        matchers: ['severity=critical'],
        continue: true
      });
      
      await this.addRoute(route);
      
      this.logger.info(`Standard notifications set up for: ${appName}`);
    } catch (error) {
      this.logger.error(`Failed to set up standard notifications for: ${appName}`, { error });
      throw new Error(`Failed to set up standard notifications: ${error.message}`);
    }
  }
}