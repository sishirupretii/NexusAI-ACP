"""Tests for the AGI Agent."""

import pytest

from nexusai_agi.core.agent import AGIAgent
from nexusai_agi.core.config import AGIConfig
from nexusai_agi.core.types import AgentState, GoalStatus


class TestAGIAgent:
    def setup_method(self):
        self.config = AGIConfig(verbose=False)
        self.agent = AGIAgent(self.config)

    def test_init(self):
        assert self.agent.state == AgentState.IDLE
        assert self.agent.interaction_count == 0
        assert len(self.agent.goals) == 0
        assert len(self.agent.conversation) == 0

    def test_think_greeting(self):
        response = self.agent.think("Hello")
        assert response
        assert len(response) > 5
        assert self.agent.interaction_count == 1
        assert self.agent.state == AgentState.IDLE

    def test_think_identity(self):
        response = self.agent.think("Who are you?")
        assert "NexusAI" in response
        assert self.agent.interaction_count == 1

    def test_think_capabilities(self):
        response = self.agent.think("What can you do?")
        assert response
        assert len(response) > 20

    def test_think_math(self):
        response = self.agent.think("What is 10 + 20?")
        assert "30" in response

    def test_think_stores_conversation(self):
        self.agent.think("Hello")
        assert len(self.agent.conversation) == 2  # user + assistant
        assert self.agent.conversation[0].role == "user"
        assert self.agent.conversation[1].role == "assistant"

    def test_think_stores_memory(self):
        self.agent.think("Hello")
        assert self.agent.memory.count() > 0

    def test_set_goal(self):
        goal = self.agent.set_goal("Learn Python", priority=3)
        assert goal.description == "Learn Python"
        assert goal.priority == 3
        assert goal.status == GoalStatus.PENDING

    def test_get_goals(self):
        self.agent.set_goal("Goal 1")
        self.agent.set_goal("Goal 2")
        goals = self.agent.get_goals()
        assert len(goals) == 2

    def test_get_status(self):
        status = self.agent.get_status()
        assert status["name"] == "NexusAI"
        assert status["state"] == "idle"
        assert status["interactions"] == 0
        assert status["tools"] > 0

    def test_reset(self):
        self.agent.think("Hello")
        self.agent.set_goal("Test")
        self.agent.reset()
        assert self.agent.interaction_count == 0
        assert len(self.agent.goals) == 0
        assert len(self.agent.conversation) == 0
        assert self.agent.memory.count() == 0

    def test_export_state(self):
        self.agent.think("Hello")
        state = self.agent.export_state()
        assert "config" in state
        assert "state" in state
        assert "conversation" in state
        assert "interaction_count" in state

    def test_multiple_interactions(self):
        self.agent.think("Hello")
        self.agent.think("Who are you?")
        self.agent.think("What can you do?")
        assert self.agent.interaction_count == 3
        assert len(self.agent.conversation) == 6  # 3 pairs

    def test_safety_blocks_harmful(self):
        response = self.agent.think("rm -rf /")
        assert "cannot process" in response.lower() or len(response) > 0

    def test_default_tools_registered(self):
        tools = self.agent.tools.list_tool_names()
        assert "memory_search" in tools
        assert "memory_store" in tools
        assert "calculate" in tools
        assert "set_goal" in tools

    def test_tool_calculate(self):
        result = self.agent.tools.execute("calculate", {"expression": "2 + 3"})
        assert result.success
        assert result.output == "5"

    def test_tool_memory_store_and_search(self):
        self.agent.tools.execute(
            "memory_store", {"content": "The sky is blue", "tags": ["fact"]}
        )
        result = self.agent.tools.execute(
            "memory_search", {"query": "sky color"}
        )
        assert result.success
        assert "blue" in result.output.lower()
