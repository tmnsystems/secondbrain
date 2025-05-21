import express from 'express';
import { DashboardSystem } from './dashboard';
import { Logger } from './logging/logger';
import { MetricsService } from './metrics/metrics';
import { TracingService } from './tracing/tracer';
import { ObservabilityManager } from './observability/observability';

// Create logger
const logger = new Logger({
  service: 'dashboard-demo',
  level: 'info',
  transports: ['console', 'file'],
  filePath: './logs/dashboard-demo.log'
});

// Create metrics service
const metricsService = new MetricsService({
  serviceName: 'dashboard-demo',
  serviceVersion: '1.0.0',
  collectDefaultMetrics: true
});

// Create tracing service
const tracingService = new TracingService({
  serviceName: 'dashboard-demo',
  serviceVersion: '1.0.0',
  endpoint: 'http://localhost:4317'
});

// Create observability manager
const observability = new ObservabilityManager({
  logger,
  metricsService,
  tracingService
});

// Create express app
const app = express();

// Add observability middleware
app.use(observability.expressMiddleware());

// Add metrics endpoint
app.use('/metrics', metricsService.metricsMiddleware());

// Define a dashboard manager, alert manager, and grafana service
import { DashboardManager } from './dashboard/dashboardManager';
import { AlertManager } from './dashboard/alertManager';
import { GrafanaService } from './dashboard/grafanaService';

const dashboardManager = new DashboardManager(
  'http://localhost:3000',
  process.env.GRAFANA_API_KEY || 'admin',
  'http://localhost:9093',
  'http://localhost:9090',
  logger
);

const alertManager = new AlertManager(
  'http://localhost:9093',
  logger
);

const grafanaService = new GrafanaService(
  'http://localhost:3000',
  process.env.GRAFANA_API_KEY || 'admin',
  logger
);

// Create dashboard system
const dashboardSystem = new DashboardSystem(
  dashboardManager,
  alertManager,
  grafanaService
);

// Add routes
app.get('/', (req, res) => {
  res.send('Dashboard Demo');
});

app.get('/dashboard', async (req, res) => {
  try {
    const dashboardUrl = await dashboardManager.createApplicationDashboard('dashboard-demo', 'api');
    res.redirect(dashboardUrl);
  } catch (error) {
    logger.error('Failed to create dashboard', { error });
    res.status(500).send('Failed to create dashboard');
  }
});

app.get('/alerts', async (req, res) => {
  try {
    await dashboardManager.createStandardAlerts('dashboard-demo');
    res.send('Alerts created');
  } catch (error) {
    logger.error('Failed to create alerts', { error });
    res.status(500).send('Failed to create alerts');
  }
});

app.get('/setup', async (req, res) => {
  try {
    const dashboardUrl = await dashboardSystem.setupFullMonitoring('dashboard-demo', {
      serviceType: 'api',
      emails: ['alerts@example.com'],
      slackChannels: ['#alerts'],
      teams: ['dashboard-team'],
      users: [
        { email: 'admin@example.com', name: 'Admin', isAdmin: true },
        { email: 'user@example.com', name: 'User' }
      ]
    });
    res.redirect(dashboardUrl);
  } catch (error) {
    logger.error('Failed to set up monitoring', { error });
    res.status(500).send('Failed to set up monitoring');
  }
});

// Add some test routes to generate metrics
app.get('/success', (req, res) => {
  res.send('Success');
});

app.get('/error', (req, res) => {
  res.status(500).send('Error');
});

app.get('/slow', async (req, res) => {
  await new Promise(resolve => setTimeout(resolve, 2000));
  res.send('Slow response');
});

// Start the app
const port = 3000;
app.listen(port, () => {
  logger.info(`Dashboard demo listening at http://localhost:${port}`);
});

// Export for testing
export default app;
EOF < /dev/null