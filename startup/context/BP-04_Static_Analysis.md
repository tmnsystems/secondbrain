# Blueprint 04: Static Analysis & Tech-Debt Radar

## Overview
This blueprint establishes a comprehensive static analysis system that continuously monitors code quality, security vulnerabilities, and technical debt across the SecondBrain codebase.

## Implementation Details

### Analysis Toolchain
The system leverages multiple specialized tools for different aspects of code quality:

| Tool | Purpose | Coverage |
|------|---------|----------|
| Semgrep OSS | Security, correctness, API usage | TypeScript, Python, JavaScript |
| SonarQube Community | Code smells, duplications, complexity | All languages |
| syft | Software Bill of Materials (SBOM) | Dependencies |
| grype | Vulnerability scanning | Dependencies |
| git-duet | Author tracking | Commit metadata |

### CI Pipeline Integration
```yaml
# .gitea/workflows/static-analysis.yml
name: Static Analysis
on: [push, pull_request]
jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Run Semgrep
        run: semgrep scan --json > semgrep.json
      
      - name: Run SonarQube
        uses: sonarsource/sonarqube-scan-action@master
        with:
          projectBaseDir: .
          args: >
            -Dsonar.projectKey=secondbrain
            -Dsonar.sources=.
      
      - name: Generate SBOM
        run: syft dir:. -o json > sbom.json
      
      - name: Scan for vulnerabilities
        run: grype sbom:sbom.json -o sarif > vulnerabilities.sarif
      
      - name: Sync to Notion
        run: ./scripts/sync_to_notion.py --semgrep semgrep.json --sonar sonar.json --vulnerabilities vulnerabilities.sarif
```

### Custom Rules Implementation
```yaml
# .semgrep/secondbrain.yml
rules:
  - id: context-truncation
    pattern: |
      truncate($CONTEXT, ...)
    message: "Potential context truncation detected. SecondBrain requires full context preservation."
    severity: ERROR
    languages: [python, javascript, typescript]
  
  - id: hard-coded-api-key
    pattern: |
      $KEY = "sk-..."
    message: "Hard-coded API key detected. Use environment variables instead."
    severity: ERROR
    languages: [python, javascript, typescript]
  
  - id: deprecated-context-api
    patterns:
      - pattern: getContextSummary(...)
      - pattern-not: getFullContext(...)
    message: "Using deprecated context API. Use getFullContext() instead."
    severity: WARNING
    languages: [python, javascript, typescript]
```

### Notion Integration for Tech-Debt
The static analysis results are automatically synced to a dedicated Notion database using a custom script:

```python
# scripts/sync_to_notion.py
import json
import os
from notion_client import Client

notion = Client(auth=os.environ["NOTION_API_KEY"])
database_id = os.environ["TECH_DEBT_DATABASE_ID"]

def sync_semgrep_issues(semgrep_file):
    with open(semgrep_file) as f:
        results = json.load(f)
    
    for finding in results.get("results", []):
        # Create or update issue in Notion
        notion.pages.create(
            parent={"database_id": database_id},
            properties={
                "Title": {"title": [{"text": {"content": finding["check_id"]}}]},
                "Type": {"select": {"name": "Semgrep"}},
                "Severity": {"select": {"name": finding["extra"]["severity"]}},
                "File": {"rich_text": [{"text": {"content": finding["path"]}}]},
                "Line": {"number": finding["start"]["line"]},
                "Message": {"rich_text": [{"text": {"content": finding["extra"]["message"]}}]},
                "Status": {"status": {"name": "Open"}}
            }
        )
```

### Slack Alerting for Critical Issues
```python
# scripts/alert_critical_issues.py
import json
import os
import requests

def send_slack_alert(finding):
    webhook_url = os.environ["SLACK_WEBHOOK_URL"]
    requests.post(
        webhook_url,
        json={
            "blocks": [
                {
                    "type": "header",
                    "text": {"type": "plain_text", "text": "🚨 Critical Issue Detected"}
                },
                {
                    "type": "section",
                    "text": {"type": "mrkdwn", "text": f"*Issue*: {finding['check_id']}\n*File*: {finding['path']}\n*Line*: {finding['start']['line']}\n*Message*: {finding['extra']['message']}"}
                }
            ]
        }
    )

# Process high-severity findings
with open("semgrep.json") as f:
    results = json.load(f)

for finding in results.get("results", []):
    if finding["extra"]["severity"] == "ERROR":
        send_slack_alert(finding)
```

## Benefits
- **Quality Assurance**: Automated detection of bugs and security issues
- **Technical Debt Tracking**: Centralized visibility in Notion
- **Dependency Security**: Continuous vulnerability scanning
- **Collaboration**: Team awareness of code quality issues
- **Risk Reduction**: Early detection of potential problems

## Next Steps
1. Install and configure static analysis tools
2. Implement custom rule sets for SecondBrain-specific patterns
3. Set up Notion database for tech debt tracking
4. Configure Slack alerts for critical issues
5. Implement regular debt reduction initiatives

<!-- BP-04_STATIC_ANALYSIS v1.0 SHA:mn90pqr1 -->