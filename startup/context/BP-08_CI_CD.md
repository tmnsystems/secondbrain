# Blueprint 08: CI/CD & Observability

## Overview
This blueprint establishes a comprehensive Continuous Integration, Delivery, and Observability stack for SecondBrain, ensuring reliable deployment, thorough monitoring, and timely alerts.

## Implementation Details

### CI/CD Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Source Control | Gitea | Code hosting and collaboration |
| Build System | Gitea Actions | CI/CD pipeline definition and execution |
| Deployment | Ansible | Infrastructure as code, repeatable deployments |
| Container Registry | Docker Registry | Store and distribute container images |
| Infrastructure | Linode VMs / K8s | Host SecondBrain services |
| Secrets | HashiCorp Vault | Secure secrets management |

### CI Pipeline Configuration
```yaml
# .gitea/workflows/ci.yml
name: CI Pipeline
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    container: node:18
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup environment
        run: |
          npm ci
          pip install -r requirements.txt
      
      - name: Lint
        run: npm run lint
        
      - name: Type check
        run: npm run typecheck
        
      - name: Unit tests
        run: npm test -- --coverage
        
      - name: Integration tests
        run: npm run test:integration
        
      - name: Upload coverage
        uses: actions/upload-artifact@v3
        with:
          name: coverage
          path: coverage/
  
  build:
    needs: test
    runs-on: ubuntu-latest
    container:
      image: docker:20
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
        
      - name: Login to container registry
        uses: docker/login-action@v2
        with:
          registry: ${{ secrets.REGISTRY_URL }}
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}
          
      - name: Build and push SecondBrain images
        uses: docker/build-push-action@v4
        with:
          context: .
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ secrets.REGISTRY_URL }}/secondbrain:${{ github.sha }}
          cache-from: type=registry,ref=${{ secrets.REGISTRY_URL }}/secondbrain:buildcache
          cache-to: type=registry,ref=${{ secrets.REGISTRY_URL }}/secondbrain:buildcache,mode=max
```

### CD Pipeline Configuration
```yaml
# .gitea/workflows/cd.yml
name: CD Pipeline
on:
  workflow_run:
    workflows: ["CI Pipeline"]
    branches: [main]
    types: [completed]

jobs:
  deploy:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Ansible
        run: pip install ansible
        
      - name: Set up SSH key
        uses: webfactory/ssh-agent@v0.7.0
        with:
          ssh-private-key: ${{ secrets.DEPLOY_SSH_KEY }}
          
      - name: Deploy to staging
        run: |
          cd infra/ansible
          ansible-playbook -i inventories/staging deploy.yml \
            --extra-vars "image_tag=${{ github.sha }}"
            
      - name: Run smoke tests
        run: |
          cd infra/ansible
          ansible-playbook -i inventories/staging smoke-tests.yml
          
      - name: Deploy to production
        if: success()
        run: |
          cd infra/ansible
          ansible-playbook -i inventories/production deploy.yml \
            --extra-vars "image_tag=${{ github.sha }}"
```

### Ansible Deployment Playbook
```yaml
# infra/ansible/deploy.yml
---
- name: Deploy SecondBrain
  hosts: secondbrain_servers
  become: yes
  vars:
    image_tag: latest  # Default, can be overridden
    
  tasks:
    - name: Create required directories
      file:
        path: "{{ item }}"
        state: directory
        mode: '0755'
      loop:
        - /opt/secondbrain/config
        - /opt/secondbrain/data
        - /var/log/secondbrain
        
    - name: Copy configuration files
      template:
        src: templates/{{ item }}.j2
        dest: /opt/secondbrain/config/{{ item }}
      loop:
        - .env
        - docker-compose.yml
        - nginx.conf
        
    - name: Pull latest container images
      docker_compose:
        project_src: /opt/secondbrain/config
        pull: yes
        
    - name: Deploy containers
      docker_compose:
        project_src: /opt/secondbrain/config
        build: no
        state: present
        recreate: smart
        scale:
          web: 2
          worker: 3
          
    - name: Verify deployment
      uri:
        url: http://localhost:9000/health
        return_content: yes
      register: health_result
      retries: 5
      delay: 10
      until: health_result.status == 200
```

### Observability Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Logging | Loki | Log aggregation and search |
| Metrics | Prometheus | Time-series metrics collection |
| Tracing | OpenTelemetry | Distributed tracing |
| Visualization | Grafana | Dashboards and alerts |
| Alerts | Grafana Alertmanager | Alert routing and management |

### Prometheus Configuration
```yaml
# infra/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - 'alert_rules.yml'

scrape_configs:
  - job_name: 'secondbrain'
    static_configs:
      - targets: ['secondbrain-web:8080', 'secondbrain-worker:8080']
    
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
    
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
    
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
```

### Grafana Dashboard Configuration
```json
{
  "annotations": {
    "list": [
      {
        "builtIn": 1,
        "datasource": "-- Grafana --",
        "enable": true,
        "hide": true,
        "iconColor": "rgba(0, 211, 255, 1)",
        "name": "Annotations & Alerts",
        "type": "dashboard"
      },
      {
        "datasource": "Loki",
        "enable": true,
        "expr": "{app=\"secondbrain\"} |= \"ERROR\"",
        "iconColor": "rgba(255, 96, 96, 1)",
        "name": "Errors",
        "showIn": 0,
        "tags": ["error"],
        "titleFormat": "Error"
      }
    ]
  },
  "editable": true,
  "panels": [
    {
      "title": "SecondBrain API Requests",
      "type": "timeseries",
      "datasource": "Prometheus",
      "targets": [
        {
          "expr": "sum(rate(secondbrain_http_requests_total[5m])) by (status_code)",
          "refId": "A",
          "legendFormat": "{{status_code}}"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "palette-classic"
          },
          "custom": {
            "axisCenteredZero": false,
            "axisColorMode": "text",
            "axisLabel": "Requests/sec",
            "axisPlacement": "auto",
            "barAlignment": 0,
            "drawStyle": "line",
            "fillOpacity": 20,
            "gradientMode": "none",
            "hideFrom": {
              "legend": false,
              "tooltip": false,
              "viz": false
            },
            "lineInterpolation": "smooth",
            "lineWidth": 2,
            "pointSize": 5,
            "scaleDistribution": {
              "type": "linear"
            },
            "showPoints": "never",
            "spanNulls": false,
            "stacking": {
              "group": "A",
              "mode": "none"
            },
            "thresholdsStyle": {
              "mode": "off"
            }
          }
        }
      }
    },
    {
      "title": "Context Storage Latency",
      "type": "timeseries",
      "datasource": "Prometheus",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum(rate(secondbrain_context_storage_duration_seconds_bucket[5m])) by (le, layer))",
          "refId": "A",
          "legendFormat": "p95 - {{layer}}"
        },
        {
          "expr": "histogram_quantile(0.50, sum(rate(secondbrain_context_storage_duration_seconds_bucket[5m])) by (le, layer))",
          "refId": "B",
          "legendFormat": "p50 - {{layer}}"
        }
      ]
    }
  ]
}
```

### Alert Configuration
```yaml
# infra/prometheus/alert_rules.yml
groups:
  - name: secondbrain-alerts
    rules:
      - alert: HighErrorRate
        expr: sum(rate(secondbrain_http_requests_total{status_code=~"5.."}[5m])) / sum(rate(secondbrain_http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} for the past 5 minutes"
          
      - alert: SlowContextStorage
        expr: histogram_quantile(0.95, sum(rate(secondbrain_context_storage_duration_seconds_bucket[5m])) by (le, layer)) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow context storage in {{ $labels.layer }}"
          description: "95th percentile context storage latency is {{ $value }}s"
          
      - alert: ContextLoss
        expr: increase(secondbrain_context_loss_total[15m]) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Context loss detected"
          description: "{{ $value }} context loss events in the last 15 minutes"
```

### Slack Alert Configuration
```yaml
# infra/grafana/alertmanager.yml
receivers:
  - name: 'slack-alerts'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXX'
        channel: '#sb_alerts'
        send_resolved: true
        title: '{{ template "slack.title" . }}'
        text: '{{ template "slack.message" . }}'
        footer: 'SecondBrain Monitoring'
        actions:
          - type: 'button'
            text: 'View Dashboard'
            url: '{{ template "slack.dashboard.url" . }}'
          - type: 'button'
            text: 'Runbook'
            url: '{{ template "slack.runbook.url" . }}'

route:
  group_by: ['alertname', 'layer']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'slack-alerts'
  routes:
    - match:
        severity: critical
      receiver: 'slack-alerts'
      continue: true

templates:
  - '/etc/alertmanager/templates/*.tmpl'
```

## Benefits
- **Reliable Deployment**: Automated testing and deployment pipeline
- **Repeatable Infrastructure**: Infrastructure as code with Ansible
- **Comprehensive Monitoring**: Full logging, metrics, and tracing
- **Early Problem Detection**: Alerting for issues before they impact users
- **Performance Visibility**: Dashboards for system performance

## Next Steps
1. Configure Gitea Actions for CI/CD pipelines
2. Set up Ansible playbooks for deployment
3. Deploy Prometheus, Loki, and Grafana stack
4. Create custom dashboards for SecondBrain metrics
5. Configure alerts for critical system components

<!-- BP-08_CI_CD v1.0 SHA:kl12mno3 -->