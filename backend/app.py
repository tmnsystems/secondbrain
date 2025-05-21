import os
from typing import List, Dict, Any
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from loguru import logger
from dotenv import load_dotenv

load_dotenv()
import openai
import pinecone
import re
from uuid import uuid4

# Configure OpenAI API key (from environment or shell rc, e.g., ~/.zshrc)
api_key = os.getenv("OPENAI_API_KEY") or os.getenv("OPENAI_KEY")
if not api_key:
    logger.warning(
        "OpenAI API key not found in environment. "
        "Please export OPENAI_API_KEY (e.g., in your .zshrc) or set it in .env."
    )
openai.api_key = api_key

# Initialize Pinecone if configured
pinecone_api_key = os.getenv("PINECONE_API_KEY")
pinecone_env = os.getenv("PINECONE_ENVIRONMENT")
pinecone_index_name = os.getenv("PINECONE_INDEX")
if pinecone_api_key and pinecone_env and pinecone_index_name:
    pinecone.init(api_key=pinecone_api_key, environment=pinecone_env)
    pinecone_index = pinecone.Index(pinecone_index_name)
else:
    pinecone_index = None

def select_model(task_type: str, complexity: int) -> str:
    """
    Simple model select for auxiliary tasks.
    Honor OPENAI_MODEL environment override; otherwise default to gpt-4o for implementation tasks.
    """
    override = os.getenv("OPENAI_MODEL")
    if override:
        return override
    return "gpt-4o"

def get_context(query: str, k: int = 5) -> List[str]:
    """
    Retrieve relevant context snippets from Pinecone for the given query.
    """
    if not pinecone_index:
        return []
    try:
        embed_resp = openai.Embedding.create(model="text-embedding-ada-002", input=[query])
        vector = embed_resp['data'][0]['embedding']
        res = pinecone_index.query(vector=vector, top_k=k, include_metadata=True)
        contexts = []
        for match in res['matches']:
            meta = match.get('metadata', {})
            # Prefer stored response metadata, fallback to query
            snippet = meta.get('response') or meta.get('query')
            if snippet:
                contexts.append(snippet)
        return contexts
    except Exception as e:
        logger.error(f"Error fetching context from Pinecone: {e}")
        return []

def update_context(query: str, response: str):
    """
    Upsert the new interaction into Pinecone index.
    """
    if not pinecone_index:
        return
    try:
        text_to_embed = query + "\n" + response
        embed_resp = openai.Embedding.create(model="text-embedding-ada-002", input=[text_to_embed])
        vector = embed_resp['data'][0]['embedding']
        pinecone_index.upsert([
            (str(uuid4()), vector, {"query": query, "response": response})
        ])
    except Exception as e:
        logger.error(f"Error updating context in Pinecone: {e}")

def analyse_intent(intent: str) -> Dict[str, Any]:
    """
    Analyze the user intent string to categorize the task and its characteristics.
    Returns a dict with:
      is_reasoning: bool
      context_tokens: int  # approx based on text length
      is_mission_critical: bool
      requires_high_accuracy: bool
      is_latency_sensitive: bool
      scope: str ('tiny' or 'large')
    """
    text = intent.lower()
    # Keywords
    reasoning_kws = ["agent", "workflow", "diagnose", "plan", "research", "audit", "debug"]
    critical_kws = ["legal", "medical", "mission critical", "production"]
    accuracy_kws = ["verify", "ensure", "guarantee", "accurate", "validate", "audit"]
    latency_kws = ["quick", "fast", "immediately", "urgent"]
    # Compute properties
    is_reasoning = any(kw in text for kw in reasoning_kws)
    # Approximate token count: 4 chars per token
    context_tokens = max(1, len(intent) // 4)
    is_mission_critical = any(kw in text for kw in critical_kws)
    requires_high_accuracy = any(kw in text for kw in accuracy_kws)
    is_latency_sensitive = any(kw in text for kw in latency_kws)
    scope = "tiny" if len(intent) < 50 else "large"
    return {
        "is_reasoning": is_reasoning,
        "context_tokens": context_tokens,
        "is_mission_critical": is_mission_critical,
        "requires_high_accuracy": requires_high_accuracy,
        "is_latency_sensitive": is_latency_sensitive,
        "scope": scope,
    }

def choose_model(intent: str, contexts: List[str]) -> str:
    """
    Choose an OpenAI model based on intent analysis and context.
    Honor OPENAI_MODEL override env var.
    Routing:
      - Reasoning tasks: use gpt-4o-mini by default, escalate to gpt-4o if mission-critical or large context
      - Implementation tasks: use gpt-4o by default, escalate to gpt-4-32k if high accuracy or large context,
        or use gpt-4o-mini if latency-sensitive and tiny scope.
    """
    # Override
    override = os.getenv("OPENAI_MODEL")
    if override:
        return override
    props = analyse_intent(intent)
    # Determine model
    if props["is_reasoning"]:
        model = "gpt-4o-mini"
        if props["is_mission_critical"] or props["context_tokens"] > 32000:
            model = "gpt-4o"
    else:
        model = "gpt-4o"
        if props["requires_high_accuracy"] or props["context_tokens"] > 32000:
            model = "gpt-4-32k"
        elif props["is_latency_sensitive"] and props["scope"] == "tiny":
            model = "gpt-4o-mini"
    return model

def route_openai_call(user_intent: str) -> str:
    """
    Routes the user intent to the best OpenAI model using analyze/choose routing,
    retrieves RAG context, calls the model, and updates context store.
    """
    logger.info(f"Received /ask request: {user_intent}")
    # Retrieve context snippets
    contexts = get_context(user_intent)
    # Build system prompt
    if contexts:
        prefix = "You are Tina's Second Brain Business Strategist. Use the following context:\n"
        system_prompt = prefix + "\n---\n".join(contexts)
    else:
        system_prompt = "You are Tina's Second Brain Business Strategist."
    # Select model
    model = choose_model(user_intent, contexts)
    logger.info(f"Selected model for intent: {model}")
    # Build messages and call OpenAI
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_intent},
    ]
    resp = openai.ChatCompletion.create(
        model=model,
        messages=messages,
        max_tokens=1000,
        temperature=0.7
    )
    ai_output = resp.choices[0].message.content
    # Update context store
    update_context(user_intent, ai_output)
    return ai_output

def generate_suggestions(response: str) -> List[str]:
    """
    Generate actionable next-step suggestions based on the AI response.
    """
    messages = [
        {"role": "system", "content": "You are Tina's Second Brain Business Strategist. "
                                      "Given the AI response below, provide 3 concise, actionable next-step suggestions."},
        {"role": "user", "content": response}
    ]
    try:
        suggestion_resp = openai.ChatCompletion.create(
            model=select_model(task_type="suggestion", complexity=1),
            messages=messages,
            max_tokens=200,
            temperature=0.7
        )
        text = suggestion_resp.choices[0].message.content
        # Split into lines and clean bullets/numbers
        raw_lines = text.splitlines()
        suggestions = []
        for line in raw_lines:
            line = line.strip()
            if not line:
                continue
            clean = re.sub(r'^[\-\*\d\.\)\s]+', '', line)
            suggestions.append(clean)
        return suggestions[:5]
    except Exception as e:
        logger.error(f"Error generating suggestions: {e}")
        return []
"""
Above are the core helper functions and integrations. Duplicated imports and helper definitions below have been removed.
"""
app = FastAPI(title="Tina's Second Brain Business Strategist API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AskRequest(BaseModel):
    intent: str

class AskResponse(BaseModel):
    output: str
    suggestions: List[str]

class ContextRequest(BaseModel):
    action: str
    data: Dict[str, Any] = {}

class ContextResponse(BaseModel):
    success: bool
    context: Dict[str, Any]

@app.post("/ask", response_model=AskResponse)
async def ask(request: AskRequest):
    logger.info(f"Received /ask request: {request.intent}")
    # Dynamic model routing via OpenAI
    try:
        output = route_openai_call(request.intent)
    except Exception as e:
        logger.error(f"OpenAI API error: {e}")
        output = f"Error processing request: {e}"
    # Generate actionable next-step suggestions based on AI output
    suggestions = generate_suggestions(output)
    if not suggestions:
        suggestions = ["Next step suggestion 1", "Next step suggestion 2"]
    return AskResponse(output=output, suggestions=suggestions)

@app.post("/context", response_model=ContextResponse)
async def context(request: ContextRequest):
    logger.info(f"Received /context request: action={request.action}, data={request.data}")
    # TODO: implement context retrieval, pruning, or updating logic
    return ContextResponse(success=True, context={})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True,
    )