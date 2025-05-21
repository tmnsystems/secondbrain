# SecondBrain - Jules Benchmarking

This repository contains a version of the SecondBrain codebase specifically prepared for benchmarking Google's Jules AI coding agent against other AI agents like Codex and Claude.

## Repository Structure

This follows the SecondBrain monorepo architecture with some modifications:

```
secondbrain/
├── agent-benchmarking/ # Framework for benchmarking AI coding agents
├── agents/             # Agent implementations
├── docs/               # Documentation
├── context_system/     # Context management
├── infra/              # Infrastructure as code
├── scripts/            # Utility scripts
└── datasets/           # Training and test data
```

Note: The large `/apps` directory has been excluded from this repository.

## Benchmarking Goals

This repository serves as a test environment to compare Jules, Codex, and Claude on metrics such as:

1. Code quality and correctness
2. Processing speed
3. Test pass rate
4. Error handling capabilities
5. File safety and security
6. Multi-file refactoring capabilities

## Test Tasks

The primary test tasks include:

1. Legacy refactoring: Converting `requests` to `httpx` async clients
2. Multi-file updates: Refactoring imports across multiple files
3. Security enhancements: Fixing security vulnerabilities in API endpoints

## Important Notes

- All API keys and secrets have been removed
- This is specifically set up for benchmark testing and is not intended for production use