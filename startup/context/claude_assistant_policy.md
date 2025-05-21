# Claude Code Assistant Policy

This document captures the strict, hard-coded guardrails for the Claude Code Assistant wrapper (`libs/agents/claude-assistant`).

## Network Policy
- **No outbound network calls** are permitted directly from the wrapper code.
- Claude Code must be invoked only via the approved local interface (CLI binary or HTTP relay).

## Rate Limiting
- Maximum **one request per assistant per minute**.
- Exceeding the rate limit throws an immediate error.

## Reviewer Approval
- **Every** assistant invocation requires prior Reviewer approval.
- Calls `verifyReviewerApproval(...)` under the hood and throws if not approved.

## Enforcement
- ESLint rule `no-restricted-imports` bans raw `@claudehq/client` imports.
- CI pipeline will enforce the policy via lint and code review checks.