import { DashboardManager } from '../src/dashboard/dashboardManager';
import { AlertManager } from '../src/dashboard/alertManager';
import { GrafanaService } from '../src/dashboard/grafanaService';
import { DashboardSystem } from '../src/dashboard';
import { Logger } from '../src/logging/logger';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Dashboard System', () => {
  let dashboardSystem: DashboardSystem;
  let dashboardManager: DashboardManager;
  let alertManager: AlertManager;
  let grafanaService: GrafanaService;
  let logger: Logger;

  beforeEach(() => {
    // Reset axios mocks
    mockedAxios.post.mockReset();
    mockedAxios.get.mockReset();
    mockedAxios.put.mockReset();
    mockedAxios.delete.mockReset();

    // Create logger
    logger = new Logger({
      service: 'test-service',
      level: 'info',
      transports: ['console']
    });

    // Create dashboard manager
    dashboardManager = new DashboardManager(
      'http://localhost:3000',
      'test-api-key',
      'http://localhost:9093',
      'http://localhost:9090',
      logger
    );

    // Create alert manager
    alertManager = new AlertManager(
      'http://localhost:9093',
      logger
    );

    // Create Grafana service
    grafanaService = new GrafanaService(
      'http://localhost:3000',
      'test-api-key',
      logger
    );

    // Create dashboard system
    dashboardSystem = new DashboardSystem(
      dashboardManager,
      alertManager,
      grafanaService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('DashboardManager', () => {
    test('should create a dashboard manager', () => {
      expect(dashboardManager).toBeDefined();
    });

    test('should create or update a dashboard', async () => {
      // Mock axios post to return a successful response
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          url: '/d/test-dashboard'
        }
      });

      // Create dashboard
      const dashboard = {
        uid: 'test-dashboard',
        title: 'Test Dashboard',
        tags: ['test'],
        schemaVersion: 30,
        version: 1,
        panels: [
          {
            id: 1,
            title: 'Test Panel',
            type: 'graph',
            datasource: {
              type: 'prometheus',
              uid: 'prometheus'
            },
            gridPos: {
              x: 0,
              y: 0,
              w: 12,
              h: 8
            }
          }
        ]
      };

      const url = await dashboardManager.createOrUpdateDashboard(dashboard);
      expect(url).toBe('http://localhost:3000/d/test-dashboard');

      // Check that axios post was called with the correct arguments
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:3000/api/dashboards/db',
        {
          dashboard,
          overwrite: true,
          message: 'Dashboard Test Dashboard updated by DashboardManager'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key'
          }
        }
      );
    });

    test('should create an application dashboard', async () => {
      // Mock axios post to return a successful response
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          url: '/d/app-test-app'
        }
      });

      // Create application dashboard
      const url = await dashboardManager.createApplicationDashboard('test-app', 'api');
      expect(url).toBe('http://localhost:3000/d/app-test-app');

      // Check that axios post was called
      expect(mockedAxios.post).toHaveBeenCalled();
    });

    test('should create standard alerts', async () => {
      // Mock axios post to return a successful response
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          alertRuleId: 'test-alert-rule-id'
        }
      });

      // Create standard alerts
      await dashboardManager.createStandardAlerts('test-app');

      // Check that axios post was called
      expect(mockedAxios.post).toHaveBeenCalled();
    });
  });

  describe('AlertManager', () => {
    test('should create an alert manager', () => {
      expect(alertManager).toBeDefined();
    });

    test('should get alerts', async () => {
      // Mock axios get to return a successful response
      mockedAxios.get.mockResolvedValueOnce({
        data: [
          {
            alertname: 'TestAlert',
            status: 'firing',
            labels: {
              severity: 'critical'
            }
          }
        ]
      });

      // Get alerts
      const alerts = await alertManager.getAlerts();
      expect(alerts).toBeDefined();

      // Check that axios get was called with the correct arguments
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:9093/api/v2/alerts',
        {
          params: {
            silenced: 'false',
            inhibited: 'false'
          }
        }
      );
    });

    test('should create a silence', async () => {
      // Mock axios post to return a successful response
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          silenceID: 'test-silence-id'
        }
      });

      // Create silence
      const silenceId = await alertManager.createSilence(
        { alertname: 'TestAlert', severity: 'critical' },
        'Test silence',
        60
      );
      expect(silenceId).toBe('test-silence-id');

      // Check that axios post was called
      expect(mockedAxios.post).toHaveBeenCalled();
    });
  });

  describe('GrafanaService', () => {
    test('should create a Grafana service', () => {
      expect(grafanaService).toBeDefined();
    });

    test('should create or update a datasource', async () => {
      // Mock axios post to return a successful response
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          datasource: {
            uid: 'test-datasource-uid'
          }
        }
      });

      // Mock axios get to return no existing datasources
      mockedAxios.get.mockResolvedValueOnce({
        data: []
      });

      // Create datasource
      const datasource = {
        name: 'test-datasource',
        type: 'prometheus',
        access: 'proxy',
        url: 'http://localhost:9090'
      };

      const uid = await grafanaService.createOrUpdateDatasource(datasource);
      expect(uid).toBe('test-datasource-uid');

      // Check that axios post was called
      expect(mockedAxios.post).toHaveBeenCalled();
    });

    test('should create a folder', async () => {
      // Mock axios post to return a successful response
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          uid: 'test-folder-uid'
        }
      });

      // Create folder
      const folder = {
        title: 'Test Folder'
      };

      const uid = await grafanaService.createFolder(folder);
      expect(uid).toBe('test-folder-uid');

      // Check that axios post was called
      expect(mockedAxios.post).toHaveBeenCalled();
    });
  });

  describe('DashboardSystem', () => {
    test('should create a dashboard system', () => {
      expect(dashboardSystem).toBeDefined();
    });

    test('should set up full monitoring', async () => {
      // Mock all required methods
      const setupStandardResourcesSpy = jest.spyOn(grafanaService, 'setupStandardResources');
      setupStandardResourcesSpy.mockResolvedValueOnce();

      const setupStandardNotificationsSpy = jest.spyOn(alertManager, 'setupStandardNotifications');
      setupStandardNotificationsSpy.mockResolvedValueOnce();

      const createStandardAlertsSpy = jest.spyOn(dashboardManager, 'createStandardAlerts');
      createStandardAlertsSpy.mockResolvedValueOnce();

      const createApplicationDashboardSpy = jest.spyOn(dashboardManager, 'createApplicationDashboard');
      createApplicationDashboardSpy.mockResolvedValueOnce('http://localhost:3000/d/app-test-app');

      // Set up full monitoring
      const url = await dashboardSystem.setupFullMonitoring('test-app', {
        serviceType: 'api',
        emails: ['test@example.com'],
        slackChannels: ['#test-channel'],
        teams: ['test-team']
      });

      expect(url).toBe('http://localhost:3000/d/app-test-app');

      // Check that all methods were called
      expect(setupStandardResourcesSpy).toHaveBeenCalled();
      expect(setupStandardNotificationsSpy).toHaveBeenCalled();
      expect(createStandardAlertsSpy).toHaveBeenCalled();
      expect(createApplicationDashboardSpy).toHaveBeenCalled();
    });
  });
});