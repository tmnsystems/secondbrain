"""
Smoke tests for model routing logic.
"""
import pytest

from backend.model_router import analyse_intent, choose_model

@pytest.mark.parametrize("intent,expected", [
    # Trivial implementation task -> default gpt-4o
    ("Write a regex to match email addresses.", "gpt-4o"),
    # Reasoning task -> default gpt-4o-mini
    ("Plan an agent workflow to fetch data, process it, and store results.", "gpt-4o-mini"),
    # Mission-critical reasoning -> escalate to gpt-4o
    ("Plan an agent workflow. This is mission critical.", "gpt-4o"),
    # Latency-sensitive tiny implementation -> gpt-4o-mini
    ("Quickly summarize the PDF.", "gpt-4o-mini"),
    # High-accuracy implementation -> gpt-4-32k
    ("Validate the accuracy of financial calculations.", "gpt-4-32k"),
])
def test_model_selection(intent, expected):
    # contexts empty for simplicity
    model = choose_model(intent, contexts=[])
    assert model == expected, f"Intent '{intent}' selected {model}, expected {expected}"

def test_analyse_intent():
    props = analyse_intent("Run a diagnostic audit on the system.")
    assert props["is_reasoning"]
    assert not props["is_latency_sensitive"]
    assert props["scope"] == "large"