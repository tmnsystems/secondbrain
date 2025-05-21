 # Backend - Tina’s Second Brain Business Strategist API

 FastAPI RESTful API for wrapping AI orchestrator logic into `/ask` and `/context` endpoints.

 ## Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# If you have OPENAI_API_KEY exported in your shell (e.g., in ~/.zshrc), no need to use .env
cp .env.example .env  # optional: only if you prefer .env over shell export
# Edit .env to add API keys (OPENAI_API_KEY, PINECONE_API_KEY, etc.) if not already exported
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```  

 API endpoints:
 - **POST** `/ask`: accepts JSON `{ "intent": "..." }`, returns `{ "output": "...", "suggestions": [...] }`
 - **POST** `/context`: accepts JSON `{ "action": "...", "data": {...} }`, returns `{ "success": true, "context": {...} }`

 Configure additional AI and vector database integrations as needed.