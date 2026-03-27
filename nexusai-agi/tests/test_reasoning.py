"""Tests for the reasoning engine."""

import pytest

from nexusai_agi.core.config import ReasoningConfig
from nexusai_agi.core.types import ThoughtStep
from nexusai_agi.reasoning.engine import ReasoningEngine, ReasoningResult


class TestReasoningEngine:
    def setup_method(self):
        self.engine = ReasoningEngine()

    def test_reason_returns_result(self):
        result = self.engine.reason("What is AI?")
        assert isinstance(result, ReasoningResult)
        assert result.response
        assert len(result.steps) > 0

    def test_chain_of_thought(self):
        result = self.engine.reason("Explain machine learning")
        assert result.strategy_used == "chain_of_thought"
        assert len(result.steps) >= 2

    def test_tree_of_thought(self):
        result = self.engine.reason("Compare Python and JavaScript")
        assert result.strategy_used == "tree_of_thought"
        assert len(result.steps) >= 3

    def test_math_detection(self):
        result = self.engine.reason("What is 5 + 3?")
        assert "8" in result.response

    def test_tool_matching(self):
        tools = [
            {"name": "calculate", "description": "Math calculations"},
            {"name": "memory_search", "description": "Search memory"},
        ]
        result = self.engine.reason("Calculate 10 + 20", tools=tools)
        assert len(result.tool_calls) > 0
        assert result.tool_calls[0]["name"] == "calculate"

    def test_planning_detection(self):
        result = self.engine.reason("How to build a REST API?")
        assert result.needs_planning is True

    def test_reflect(self):
        steps = [ThoughtStep(content="test step")]
        reflection = self.engine.reflect(
            query="test question",
            response="This is a detailed and helpful response about the topic.",
            steps=steps,
        )
        assert reflection.confidence > 0
        assert reflection.reflection_text

    def test_reflect_short_response(self):
        reflection = self.engine.reflect(
            query="test", response="ok", steps=[]
        )
        assert len(reflection.issues_found) > 0
        assert reflection.confidence < 0.7

    def test_context_affects_response(self):
        result = self.engine.reason(
            "Tell me more", context="We were discussing quantum physics"
        )
        assert result.response
        assert len(result.response) > 10

    def test_conversation_awareness(self):
        conversation = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there!"},
        ]
        result = self.engine.reason(
            "What did I say?", conversation=conversation
        )
        assert result.response
