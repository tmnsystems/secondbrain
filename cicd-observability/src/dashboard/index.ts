import { DashboardManager, DashboardConfig, Panel, AlertRule } from './dashboardManager';
import { AlertManager, AlertReceiver, AlertRoute, AlertmanagerConfig } from './alertManager';
import { GrafanaService, GrafanaDatasource, GrafanaFolder, GrafanaUser, GrafanaTeam } from './grafanaService';

/**
 * Dashboard system for monitoring and alerting
 */
export class DashboardSystem {
  private dashboardManager: DashboardManager;
  private alertManager: AlertManager;
  private grafanaService: GrafanaService;

  /**
   * Creates a new dashboard system instance
   * 
   * @param {DashboardManager} dashboardManager - Dashboard manager instance
   * @param {AlertManager} alertManager - Alert manager instance
   * @param {GrafanaService} grafanaService - Grafana service instance
   */
  constructor(
    dashboardManager: DashboardManager,
    alertManager: AlertManager,
    grafanaService: GrafanaService
  ) {
    this.dashboardManager = dashboardManager;
    this.alertManager = alertManager;
    this.grafanaService = grafanaService;
  }

  /**
   * Sets up the full dashboard and monitoring system for an application
   * 
   * @param {string} appName - Application name
   * @param {Object} config - Configuration
   * @returns {Promise<string>} Dashboard URL
   */
  async setupFullMonitoring(
    appName: string,
    config: {
      serviceType?: string;
      emails?: string[];
      slackChannels?: string[];
      webhookUrls?: string[];
      teams?: string[];
      users?: { email: string; name?: string; isAdmin?: boolean }[];
      thresholds?: {
        errorRate?: number;
        responseTimeP95?: number;
        cpuUsage?: number;
        memoryUsage?: number;
      };
      smtpSettings?: {
        host: string;
        port: number;
        username: string;
        password: string;
        from: string;
      };
      slackApiUrl?: string;
      prometheusUrl?: string;
      lokiUrl?: string;
      jaegerUrl?: string;
    } = {}
  ): Promise<string> {
    try {
      const {
        serviceType = 'api',
        emails = [],
        slackChannels = [],
        webhookUrls = [],
        teams = [],
        users = [],
        thresholds = {},
        smtpSettings,
        slackApiUrl,
        prometheusUrl = 'http://prometheus:9090',
        lokiUrl = 'http://loki:3100',
        jaegerUrl = 'http://jaeger:16686'
      } = config;

      // 1. Set up Grafana resources
      await this.grafanaService.setupStandardResources(appName, {
        prometheusUrl,
        lokiUrl,
        jaegerUrl,
        teams,
        users
      });

      // 2. Set up alerting
      await this.alertManager.setupStandardNotifications(appName, {
        emails,
        slackChannels,
        webhookUrls,
        smtpSettings,
        slackApiUrl
      });

      // 3. Create standard alert rules
      await this.dashboardManager.createStandardAlerts(appName, thresholds);

      // 4. Create application dashboard
      const dashboardUrl = await this.dashboardManager.createApplicationDashboard(appName, serviceType);

      return dashboardUrl;
    } catch (error) {
      throw new Error(`Failed to set up full monitoring: ${error.message}`);
    }
  }
}

export {
  DashboardManager,
  DashboardConfig,
  Panel,
  AlertRule,
  AlertManager,
  AlertReceiver,
  AlertRoute,
  AlertmanagerConfig,
  GrafanaService,
  GrafanaDatasource,
  GrafanaFolder,
  GrafanaUser,
  GrafanaTeam
};