# SecondBrain CI/CD & Observability System

## Overview

The SecondBrain CI/CD & Observability System is a comprehensive solution for automating the testing, building, deployment, and monitoring of the SecondBrain application. This system ensures high quality, reliability, and visibility into the application's performance and behavior.

## Key Features

- **Continuous Integration**: Automated testing, linting, building, and security scanning
- **Continuous Deployment**: Automated deployment with multiple strategies including blue-green and canary
- **Observability Stack**: Comprehensive monitoring with logging, metrics, and tracing
- **Dashboard System**: Customizable dashboards and alerting for system health and performance
- **Error Tracking**: Detailed error tracking and reporting to multiple platforms

## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- GitHub account with access to the repository
- Kubernetes cluster (optional, for Kubernetes deployments)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/secondbrain.git
cd secondbrain/cicd-observability
```

2. Install dependencies:
```bash
npm install
```

3. Set up the monitoring stack:
```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

4. Configure environment variables:
```bash
cp .env.example .env
# Edit .env file with your configuration
```

### Usage

#### Running the CI Pipeline Locally

```bash
npm run ci
```

#### Deploying to Development

```bash
npm run deploy:dev
```

#### Starting the Observability Demo

```bash
npm run observability-demo
```

#### Starting the Dashboard Demo

```bash
npm run dashboard-demo
```

#### Starting the Error Tracking Demo

```bash
npm run error-demo
```

## System Architecture

The CI/CD & Observability System consists of the following components:

### Continuous Integration (CI)

- **GitHub Actions Workflows**: Automate testing, linting, building, and security scanning
- **CI Pipeline Manager**: Tracks the status of the CI pipeline
- **Test Runner**: Runs tests in parallel for faster CI

### Continuous Deployment (CD)

- **Deployment Manager**: Handles deployment to different environments
- **Deployment Strategies**: Supports blue-green, canary, and direct deployments
- **Rollback Manager**: Handles rollbacks in case of deployment failures

### Observability Stack

- **Logging System**: Centralized logging with multiple transports
- **Metrics System**: Prometheus-based metrics collection
- **Tracing System**: Distributed tracing with OpenTelemetry
- **Unified Manager**: Combines logging, metrics, and tracing

### Dashboard System

- **Dashboard Manager**: Creates and updates dashboards in Grafana
- **Alert Manager**: Manages alerts and notifications
- **Grafana Service**: Manages Grafana resources

### Error Tracking System

- **Error Tracker**: Captures and tracks errors
- **Error Reporter**: Reports errors to multiple platforms
- **Error Management**: Combines tracking and reporting

## Configuration

### CI/CD Configuration

CI/CD is configured through GitHub Actions workflow files in the `.github/workflows/` directory.

### Monitoring Configuration

Monitoring is configured through files in the `config/monitoring/` directory:

- `prometheus.yml`: Prometheus configuration
- `alertmanager.yml`: Alertmanager configuration
- `loki.yml`: Loki configuration
- `promtail.yml`: Promtail configuration
- `grafana.ini`: Grafana configuration

### Dashboard Configuration

Dashboard templates are stored in the `config/dashboards/` directory.

## Documentation

For detailed documentation, see [DOCUMENTATION.md](./DOCUMENTATION.md).

## Examples

### Using the Logging System

```typescript
import { Logger } from './src/logging/logger';

const logger = new Logger({
  service: 'my-service',
  level: 'info',
  transports: ['console', 'file']
});

logger.info('Hello, world\!', { foo: 'bar' });
```

### Using the Metrics System

```typescript
import { MetricsService } from './src/metrics/metrics';

const metricsService = new MetricsService({
  serviceName: 'my-service',
  serviceVersion: '1.0.0'
});

const counter = metricsService.createCounter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'status']
});

counter.inc({ method: 'GET', status: '200' });
```

### Using the Tracing System

```typescript
import { TracingService } from './src/tracing/tracer';

const tracingService = new TracingService({
  serviceName: 'my-service',
  serviceVersion: '1.0.0'
});

const tracer = tracingService.getTracer();

const span = tracer.startSpan('my-operation');
// Do some work
span.end();
```

### Using the Unified Observability Manager

```typescript
import { ObservabilityManager } from './src/observability/observability';

const observability = new ObservabilityManager({
  logger,
  metricsService,
  tracingService
});

// Use in Express
app.use(observability.expressMiddleware());
```

### Using the Dashboard System

```typescript
import { DashboardSystem } from './src/dashboard';

const dashboardSystem = new DashboardSystem(
  dashboardManager,
  alertManager,
  grafanaService
);

const dashboardUrl = await dashboardSystem.setupFullMonitoring('my-service', {
  serviceType: 'api',
  emails: ['alerts@example.com'],
  slackChannels: ['#alerts']
});
```

### Using the Error Tracking System

```typescript
import { ErrorManagementSystem, ErrorLevel } from './src/errors';

const errorManagement = new ErrorManagementSystem({
  trackerOptions: {
    serviceName: 'my-service',
    serviceVersion: '1.0.0',
    environment: 'development'
  },
  reporterOptions: {
    serviceName: 'my-service',
    serviceVersion: '1.0.0',
    environment: 'development',
    sentryDsn: process.env.SENTRY_DSN,
    slackWebhook: process.env.SLACK_WEBHOOK
  }
});

// Use in Express
app.use(errorManagement.expressMiddleware());

// Capture an exception
errorManagement.captureException(new Error('Something went wrong'), {
  level: ErrorLevel.ERROR,
  context: {
    additionalInfo: 'Additional information about the error'
  }
});
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
EOF < /dev/null