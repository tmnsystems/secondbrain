"""
CLI Session Context Persistence System.

This package provides real-time logging to Notion for CLI sessions,
ensuring context is never lost during compaction events or session interruptions.

Key components:
- CLISessionLogger: Core logger for real-time logging to Notion
- Session bridges: Connections between related CLI sessions
- Compaction handling: Preservation of context during truncation

All logging follows the NEVER TRUNCATE principle, ensuring that
no context is ever lost.
"""

from .cli_session_logger import CLISessionLogger

__all__ = ["CLISessionLogger"]