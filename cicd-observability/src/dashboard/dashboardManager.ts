import axios from 'axios';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { Logger } from '../logging/logger';

/**
 * Interface for dashboard configuration
 */
export interface DashboardConfig {
  uid: string;
  title: string;
  description?: string;
  tags: string[];
  schemaVersion: number;
  version: number;
  refresh?: string;
  panels: Panel[];
}

/**
 * Interface for dashboard panel
 */
export interface Panel {
  id: number;
  title: string;
  type: string;
  datasource: {
    type: string;
    uid: string;
  };
  gridPos: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  options?: any;
  targets?: any[];
  [key: string]: any;
}

/**
 * Interface for alert rule
 */
export interface AlertRule {
  uid: string;
  name: string;
  namespace_uid: string;
  rule_group: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  expr: string;
  for: string;
  condition: string;
  data?: any[];
  [key: string]: any;
}

/**
 * Dashboard manager for creating, updating, and managing Grafana dashboards
 * and Prometheus alert rules.
 */
export class DashboardManager {
  private grafanaUrl: string;
  private grafanaApiKey: string;
  private alertmanagerUrl: string;
  private prometheusUrl: string;
  private logger: Logger;
  private dashboardsDir: string;

  /**
   * Creates a new dashboard manager instance
   * 
   * @param {string} grafanaUrl - Grafana API URL (default: http://localhost:3000)
   * @param {string} grafanaApiKey - Grafana API key
   * @param {string} alertmanagerUrl - Alertmanager API URL (default: http://localhost:9093)
   * @param {string} prometheusUrl - Prometheus API URL (default: http://localhost:9090)
   * @param {Logger} logger - Logger instance
   * @param {string} dashboardsDir - Directory containing dashboard templates
   */
  constructor(
    grafanaUrl: string = 'http://localhost:3000',
    grafanaApiKey: string = process.env.GRAFANA_API_KEY || '',
    alertmanagerUrl: string = 'http://localhost:9093',
    prometheusUrl: string = 'http://localhost:9090',
    logger: Logger,
    dashboardsDir: string = path.join(process.cwd(), 'config', 'dashboards')
  ) {
    this.grafanaUrl = grafanaUrl;
    this.grafanaApiKey = grafanaApiKey;
    this.alertmanagerUrl = alertmanagerUrl;
    this.prometheusUrl = prometheusUrl;
    this.logger = logger;
    this.dashboardsDir = dashboardsDir;
    
    // Ensure the dashboards directory exists
    if (!fs.existsSync(this.dashboardsDir)) {
      fs.mkdirSync(this.dashboardsDir, { recursive: true });
    }
  }

  /**
   * Creates or updates a dashboard in Grafana
   * 
   * @param {DashboardConfig} dashboard - Dashboard configuration
   * @param {boolean} overwrite - Whether to overwrite existing dashboard
   * @returns {Promise<string>} Dashboard URL
   */
  async createOrUpdateDashboard(dashboard: DashboardConfig, overwrite: boolean = true): Promise<string> {
    try {
      this.logger.info(`Creating/updating dashboard: ${dashboard.title}`);
      
      const response = await axios.post(
        `${this.grafanaUrl}/api/dashboards/db`,
        {
          dashboard,
          overwrite,
          message: `Dashboard ${dashboard.title} updated by DashboardManager`
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.grafanaApiKey}`
          }
        }
      );
      
      this.logger.info(`Dashboard created/updated: ${dashboard.title}`);
      return `${this.grafanaUrl}${response.data.url}`;
    } catch (error) {
      this.logger.error(`Failed to create/update dashboard: ${dashboard.title}`, { error });
      throw new Error(`Failed to create/update dashboard: ${error.message}`);
    }
  }

  /**
   * Deletes a dashboard from Grafana
   * 
   * @param {string} uid - Dashboard UID
   * @returns {Promise<void>}
   */
  async deleteDashboard(uid: string): Promise<void> {
    try {
      this.logger.info(`Deleting dashboard: ${uid}`);
      
      await axios.delete(
        `${this.grafanaUrl}/api/dashboards/uid/${uid}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.grafanaApiKey}`
          }
        }
      );
      
      this.logger.info(`Dashboard deleted: ${uid}`);
    } catch (error) {
      this.logger.error(`Failed to delete dashboard: ${uid}`, { error });
      throw new Error(`Failed to delete dashboard: ${error.message}`);
    }
  }

  /**
   * Gets a dashboard from Grafana
   * 
   * @param {string} uid - Dashboard UID
   * @returns {Promise<DashboardConfig>} Dashboard configuration
   */
  async getDashboard(uid: string): Promise<DashboardConfig> {
    try {
      this.logger.info(`Getting dashboard: ${uid}`);
      
      const response = await axios.get(
        `${this.grafanaUrl}/api/dashboards/uid/${uid}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.grafanaApiKey}`
          }
        }
      );
      
      this.logger.info(`Dashboard retrieved: ${uid}`);
      return response.data.dashboard;
    } catch (error) {
      this.logger.error(`Failed to get dashboard: ${uid}`, { error });
      throw new Error(`Failed to get dashboard: ${error.message}`);
    }
  }

  /**
   * Creates a Prometheus alert rule
   * 
   * @param {AlertRule} rule - Alert rule configuration
   * @returns {Promise<void>}
   */
  async createAlertRule(rule: AlertRule): Promise<void> {
    try {
      this.logger.info(`Creating alert rule: ${rule.name}`);
      
      // Using Grafana Alerting API for Prometheus rules
      await axios.post(
        `${this.grafanaUrl}/api/ruler/grafana/api/v1/rules`,
        {
          name: rule.rule_group,
          rules: [rule]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.grafanaApiKey}`
          }
        }
      );
      
      this.logger.info(`Alert rule created: ${rule.name}`);
    } catch (error) {
      this.logger.error(`Failed to create alert rule: ${rule.name}`, { error });
      throw new Error(`Failed to create alert rule: ${error.message}`);
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
          createdBy: 'DashboardManager'
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
   * Loads a dashboard template from file
   * 
   * @param {string} templateName - Template file name without extension
   * @returns {Promise<DashboardConfig>} Dashboard configuration
   */
  async loadDashboardTemplate(templateName: string): Promise<DashboardConfig> {
    try {
      const templatePath = path.join(this.dashboardsDir, `${templateName}.json`);
      
      if (!fs.existsSync(templatePath)) {
        this.logger.error(`Dashboard template not found: ${templatePath}`);
        throw new Error(`Dashboard template not found: ${templatePath}`);
      }
      
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      return JSON.parse(templateContent);
    } catch (error) {
      this.logger.error(`Failed to load dashboard template: ${templateName}`, { error });
      throw new Error(`Failed to load dashboard template: ${error.message}`);
    }
  }

  /**
   * Creates dashboards from all template files in the dashboards directory
   * 
   * @returns {Promise<string[]>} Dashboard URLs
   */
  async createAllDashboards(): Promise<string[]> {
    try {
      const dashboardFiles = fs.readdirSync(this.dashboardsDir)
        .filter(file => file.endsWith('.json'));
      
      this.logger.info(`Creating ${dashboardFiles.length} dashboards from templates`);
      
      const dashboardUrls: string[] = [];
      
      for (const file of dashboardFiles) {
        const templateName = path.basename(file, '.json');
        const dashboard = await this.loadDashboardTemplate(templateName);
        const url = await this.createOrUpdateDashboard(dashboard);
        dashboardUrls.push(url);
      }
      
      return dashboardUrls;
    } catch (error) {
      this.logger.error(`Failed to create dashboards from templates`, { error });
      throw new Error(`Failed to create dashboards from templates: ${error.message}`);
    }
  }

  /**
   * Creates an application dashboard with standard panels
   * 
   * @param {string} appName - Application name
   * @param {string} serviceType - Service type (e.g., "api", "worker", "database")
   * @returns {Promise<string>} Dashboard URL
   */
  async createApplicationDashboard(appName: string, serviceType: string = 'api'): Promise<string> {
    try {
      this.logger.info(`Creating application dashboard for: ${appName}`);
      
      // Create a dashboard UID that's predictable but unique
      const uid = `app-${appName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      
      // Create standard panels based on service type
      const panels: Panel[] = [];
      let yPos = 0;
      
      // Request Rate panel
      panels.push({
        id: 1,
        title: 'Request Rate',
        type: 'timeseries',
        datasource: {
          type: 'prometheus',
          uid: 'prometheus'
        },
        gridPos: { x: 0, y: yPos, w: 12, h: 8 },
        targets: [{
          expr: `sum(rate(http_requests_total{app="${appName}"}[5m])) by (status_code)`,
          legendFormat: '{{status_code}}',
          refId: 'A'
        }]
      });
      
      // Error Rate panel
      panels.push({
        id: 2,
        title: 'Error Rate',
        type: 'timeseries',
        datasource: {
          type: 'prometheus',
          uid: 'prometheus'
        },
        gridPos: { x: 12, y: yPos, w: 12, h: 8 },
        targets: [{
          expr: `sum(rate(http_requests_total{app="${appName}", status_code=~"5.."}[5m])) / sum(rate(http_requests_total{app="${appName}"}[5m]))`,
          legendFormat: 'Error Rate',
          refId: 'A'
        }]
      });
      
      yPos += 8;
      
      // Response Time panel
      panels.push({
        id: 3,
        title: 'Response Time (p95)',
        type: 'timeseries',
        datasource: {
          type: 'prometheus',
          uid: 'prometheus'
        },
        gridPos: { x: 0, y: yPos, w: 12, h: 8 },
        targets: [{
          expr: `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{app="${appName}"}[5m])) by (le))`,
          legendFormat: 'p95',
          refId: 'A'
        }]
      });
      
      // Memory Usage panel
      panels.push({
        id: 4,
        title: 'Memory Usage',
        type: 'timeseries',
        datasource: {
          type: 'prometheus',
          uid: 'prometheus'
        },
        gridPos: { x: 12, y: yPos, w: 12, h: 8 },
        targets: [{
          expr: `process_resident_memory_bytes{app="${appName}"}`,
          legendFormat: 'Memory',
          refId: 'A'
        }]
      });
      
      yPos += 8;
      
      // CPU Usage panel
      panels.push({
        id: 5,
        title: 'CPU Usage',
        type: 'timeseries',
        datasource: {
          type: 'prometheus',
          uid: 'prometheus'
        },
        gridPos: { x: 0, y: yPos, w: 12, h: 8 },
        targets: [{
          expr: `rate(process_cpu_user_seconds_total{app="${appName}"}[5m]) * 100`,
          legendFormat: 'CPU User %',
          refId: 'A'
        }]
      });
      
      // Service specific panels
      if (serviceType === 'api') {
        panels.push({
          id: 6,
          title: 'Endpoint Response Times (p95)',
          type: 'timeseries',
          datasource: {
            type: 'prometheus',
            uid: 'prometheus'
          },
          gridPos: { x: 12, y: yPos, w: 12, h: 8 },
          targets: [{
            expr: `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{app="${appName}"}[5m])) by (le, route))`,
            legendFormat: '{{route}}',
            refId: 'A'
          }]
        });
      } else if (serviceType === 'worker') {
        panels.push({
          id: 6,
          title: 'Job Processing Rate',
          type: 'timeseries',
          datasource: {
            type: 'prometheus',
            uid: 'prometheus'
          },
          gridPos: { x: 12, y: yPos, w: 12, h: 8 },
          targets: [{
            expr: `sum(rate(job_processed_total{app="${appName}"}[5m])) by (job_type)`,
            legendFormat: '{{job_type}}',
            refId: 'A'
          }]
        });
      }
      
      // Create dashboard config
      const dashboard: DashboardConfig = {
        uid,
        title: `${appName} Dashboard`,
        description: `Performance metrics for ${appName}`,
        tags: ['generated', appName, serviceType],
        schemaVersion: 30,
        version: 1,
        refresh: '10s',
        panels
      };
      
      return await this.createOrUpdateDashboard(dashboard);
    } catch (error) {
      this.logger.error(`Failed to create application dashboard for: ${appName}`, { error });
      throw new Error(`Failed to create application dashboard: ${error.message}`);
    }
  }

  /**
   * Creates standard alert rules for an application
   * 
   * @param {string} appName - Application name
   * @param {Record<string, number>} thresholds - Alert thresholds
   * @returns {Promise<void>}
   */
  async createStandardAlerts(
    appName: string,
    thresholds: {
      errorRate?: number;
      responseTimeP95?: number;
      cpuUsage?: number;
      memoryUsage?: number;
    } = {}
  ): Promise<void> {
    try {
      this.logger.info(`Creating standard alerts for: ${appName}`);
      
      const {
        errorRate = 0.05,         // 5% error rate
        responseTimeP95 = 1.0,    // 1 second p95 response time
        cpuUsage = 80,            // 80% CPU usage
        memoryUsage = 1024 * 1024 * 1024 // 1GB memory usage
      } = thresholds;
      
      const alertRules: AlertRule[] = [];
      
      // High Error Rate alert
      alertRules.push({
        uid: `alert-${appName}-high-error-rate`,
        name: `${appName} - High Error Rate`,
        namespace_uid: 'secondbrain',
        rule_group: `${appName}-alerts`,
        for: '5m',
        condition: 'B',
        labels: {
          severity: 'warning',
          app: appName
        },
        annotations: {
          summary: `${appName} has a high error rate`,
          description: `${appName} has an error rate above ${errorRate * 100}% for more than 5 minutes.`
        },
        expr: `sum(rate(http_requests_total{app="${appName}", status_code=~"5.."}[5m])) / sum(rate(http_requests_total{app="${appName}"}[5m])) > ${errorRate}`
      });
      
      // Slow Response Time alert
      alertRules.push({
        uid: `alert-${appName}-slow-response`,
        name: `${appName} - Slow Response Time`,
        namespace_uid: 'secondbrain',
        rule_group: `${appName}-alerts`,
        for: '5m',
        condition: 'B',
        labels: {
          severity: 'warning',
          app: appName
        },
        annotations: {
          summary: `${appName} has slow response times`,
          description: `${appName} has p95 response times above ${responseTimeP95}s for more than 5 minutes.`
        },
        expr: `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{app="${appName}"}[5m])) by (le)) > ${responseTimeP95}`
      });
      
      // High CPU Usage alert
      alertRules.push({
        uid: `alert-${appName}-high-cpu`,
        name: `${appName} - High CPU Usage`,
        namespace_uid: 'secondbrain',
        rule_group: `${appName}-alerts`,
        for: '5m',
        condition: 'B',
        labels: {
          severity: 'warning',
          app: appName
        },
        annotations: {
          summary: `${appName} has high CPU usage`,
          description: `${appName} has CPU usage above ${cpuUsage}% for more than 5 minutes.`
        },
        expr: `rate(process_cpu_user_seconds_total{app="${appName}"}[5m]) * 100 > ${cpuUsage}`
      });
      
      // High Memory Usage alert
      alertRules.push({
        uid: `alert-${appName}-high-memory`,
        name: `${appName} - High Memory Usage`,
        namespace_uid: 'secondbrain',
        rule_group: `${appName}-alerts`,
        for: '5m',
        condition: 'B',
        labels: {
          severity: 'warning',
          app: appName
        },
        annotations: {
          summary: `${appName} has high memory usage`,
          description: `${appName} has memory usage above ${Math.round(memoryUsage / (1024 * 1024))}MB for more than 5 minutes.`
        },
        expr: `process_resident_memory_bytes{app="${appName}"} > ${memoryUsage}`
      });
      
      // Create each alert rule
      for (const rule of alertRules) {
        await this.createAlertRule(rule);
      }
      
      this.logger.info(`Created ${alertRules.length} standard alerts for: ${appName}`);
    } catch (error) {
      this.logger.error(`Failed to create standard alerts for: ${appName}`, { error });
      throw new Error(`Failed to create standard alerts: ${error.message}`);
    }
  }
}