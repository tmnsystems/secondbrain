# SecondBrain Portable Setup

This is a portable copy of the SecondBrain project. 

## Setup Instructions

1. Copy this entire directory to your desired location
2. Install required dependencies:
   - Python 3.9+ with venv
   - Node.js 18+
   - Required Python packages: `pip install -r requirements.txt`
   - Required Node packages: `npm install`

3. Configuration:
   - Set up environment variables in .env file
   - Update any path references if needed

## IncredAgent + Bolt Integration

The integration plan is in the file: INCREDAGENT_BOLT_INTEGRATION.md

## Running the Project

- Run the backend: `python backend/app.py`
- Run the front-end: `cd frontend && npm run dev`
- Run the bolt setup: `cd bolt-setup && ./setup-bolt.sh`

