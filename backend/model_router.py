"""
Module for analysing task intents and selecting the appropriate OpenAI model.
"""
import os
from typing import List, Dict, Any

def analyse_intent(intent: str) -> Dict[str, Any]:
    """
    Analyze the user intent to categorize the task.
    """
    text = intent.lower()
    reasoning_kws = ["agent", "workflow", "diagnose", "plan", "research", "audit", "debug"]
    critical_kws = ["legal", "medical", "mission critical", "production"]
    accuracy_kws = ["verify", "ensure", "guarantee", "accurate", "validate", "audit"]
    latency_kws = ["quick", "fast", "immediately", "urgent"]
    is_reasoning = any(kw in text for kw in reasoning_kws)
    context_tokens = max(1, len(intent) // 4)
    is_mission_critical = any(kw in text for kw in critical_kws)
    requires_high_accuracy = any(kw in text for kw in accuracy_kws)
    is_latency_sensitive = any(kw in text for kw in latency_kws)
    # Force reasoning tasks to 'large' scope; otherwise small thresholds
    if is_reasoning:
        scope = "large"
    else:
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
    Choose an OpenAI model based on intent analysis.
    """
    override = os.getenv("OPENAI_MODEL")
    if override:
        return override
    props = analyse_intent(intent)
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