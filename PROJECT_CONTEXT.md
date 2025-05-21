# SecondBrain Project Context

## Overview
SecondBrain is a multi-agent AI system designed to analyze, understand, and replicate Tina's unique business coaching style. The system processes transcripts and other content to extract voice patterns, reasoning methods, and teaching approaches.

## Architecture
- LangGraph for structured agent workflows and reasoning
- Claude as primary model for voice replication
- Self-sovereign infrastructure with ChromaDB, Ollama, FastEmbed
- Bolt.diy for development environment with model flexibility
- Human-in-the-loop feedback system for quality control
- Mobile-first web interface

## Key Components
1. Content Processing Pipeline - Extracts style from transcripts
2. Multi-Agent System - Specialized agents working together
3. Human Feedback Loop - Quality assessment and improvement
4. Web Interface - Mobile-accessible Progressive Web App

## Technical Stack
- Python (LangGraph, FastAPI)
- Next.js (Frontend)
- ChromaDB (Vector storage)
- Bolt.diy (Development)
- n8n.io (Workflow automation)
- Vaultwarden (Credential management)

## Specialized Directories
- Main (/SecondBrain) - Core architecture and integration
- Frontend (/SecondBrain-Frontend) - Web UI implementation
- Content (/SecondBrain-Content) - Transcript processing
- API (/SecondBrain-API) - External service connections

## Current Status
- Initial setup complete
- Bolt.diy integration established
- LangGraph agents implemented
- Content processing pipeline developed
- Human feedback system created
- Mobile-first web interface designed
