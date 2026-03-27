"""The main AGI Agent - orchestrates all subsystems."""

from __future__ import annotations

import json
import time
from typing import Any

from nexusai_agi.core.config import AGIConfig
from nexusai_agi.core.types import (
    AgentState,
    Goal,
    GoalStatus,
    Message,
    TaskResult,
    ThoughtStep,
)
from nexusai_agi.memory.manager import MemoryManager
from nexusai_agi.planning.planner import Planner
from nexusai_agi.reasoning.engine import ReasoningEngine
from nexusai_agi.safety.guardian import SafetyGuardian
from nexusai_agi.tools.registry import ToolRegistry


class AGIAgent:
    """
    NexusAI AGI Agent - the central orchestrator.

    Combines reasoning, memory, planning, tools, and safety
    into a unified autonomous agent.
    """

    def __init__(self, config: AGIConfig | None = None):
        self.config = config or AGIConfig()
        self.state = AgentState.IDLE
        self.goals: list[Goal] = []
        self.conversation: list[Message] = []
        self.thought_history: list[ThoughtStep] = []
        self.interaction_count = 0

        # Initialize subsystems
        self.memory = MemoryManager(self.config.memory)
        self.reasoning = ReasoningEngine(self.config.reasoning)
        self.planner = Planner(self.config.planning)
        self.safety = SafetyGuardian(self.config.safety)
        self.tools = ToolRegistry()

        # Register built-in tools
        self._register_default_tools()

    def _register_default_tools(self) -> None:
        """Register built-in tools."""
        self.tools.register(
            name="memory_search",
            description="Search agent memory for relevant information",
            handler=self._tool_memory_search,
            parameters={"query": "str"},
        )
        self.tools.register(
            name="memory_store",
            description="Store information in long-term memory",
            handler=self._tool_memory_store,
            parameters={"content": "str", "tags": "list[str]"},
        )
        self.tools.register(
            name="calculate",
            description="Evaluate a mathematical expression",
            handler=self._tool_calculate,
            parameters={"expression": "str"},
        )
        self.tools.register(
            name="set_goal",
            description="Set a new goal for the agent",
            handler=self._tool_set_goal,
            parameters={"goal": "str", "priority": "int"},
        )

    # -- Public API --

    def think(self, input_text: str) -> str:
        """
        Main entry point: process input, reason, and respond.

        This is the core AGI loop:
        1. Safety check input
        2. Store in memory
        3. Retrieve relevant context
        4. Reason about the input
        5. Plan if needed
        6. Execute plan
        7. Reflect on result
        8. Return response
        """
        start_time = time.time()
        self.state = AgentState.THINKING
        self.interaction_count += 1

        # Step 1: Safety check
        safety_result = self.safety.check_input(input_text)
        if not safety_result.safe:
            self.state = AgentState.IDLE
            return f"I cannot process that request: {safety_result.reason}"

        # Step 2: Add to conversation and memory
        user_msg = Message(role="user", content=input_text)
        self.conversation.append(user_msg)
        self.memory.add(input_text, memory_type="short_term", tags=["user_input"])

        # Step 3: Retrieve relevant context
        context = self.memory.recall(input_text, limit=5)
        context_text = "\n".join(
            [f"- {entry.content}" for entry in context]
        ) if context else ""

        # Step 4: Reason
        self.state = AgentState.THINKING
        reasoning_result = self.reasoning.reason(
            query=input_text,
            context=context_text,
            conversation=[m.to_dict() for m in self.conversation[-10:]],
            tools=self.tools.list_tools(),
        )

        # Record thought steps
        self.thought_history.extend(reasoning_result.steps)

        # Step 5: Check if tool use is needed
        if reasoning_result.tool_calls:
            self.state = AgentState.EXECUTING
            for tool_call in reasoning_result.tool_calls:
                tool_result = self.tools.execute(
                    tool_call["name"], tool_call.get("args", {})
                )
                # Feed tool result back into reasoning
                if tool_result.success:
                    reasoning_result = self.reasoning.reason(
                        query=input_text,
                        context=f"{context_text}\n\nTool result ({tool_call['name']}): {tool_result.output}",
                        conversation=[m.to_dict() for m in self.conversation[-10:]],
                        tools=self.tools.list_tools(),
                    )

        # Step 6: Plan for complex tasks
        if reasoning_result.needs_planning:
            self.state = AgentState.PLANNING
            plan = self.planner.create_plan(
                goal=input_text,
                context=context_text,
                available_tools=self.tools.list_tool_names(),
            )
            plan_summary = plan.describe()
            reasoning_result.response += f"\n\nPlan created:\n{plan_summary}"

        # Step 7: Self-reflect
        if self.config.reasoning.self_reflection_enabled:
            self.state = AgentState.REFLECTING
            reflection = self.reasoning.reflect(
                query=input_text,
                response=reasoning_result.response,
                steps=reasoning_result.steps,
            )
            if reflection.revised_response:
                reasoning_result.response = reflection.revised_response
            self.thought_history.append(
                ThoughtStep(
                    content=reflection.reflection_text,
                    step_type="reflection",
                    confidence=reflection.confidence,
                )
            )

        # Step 8: Store response and return
        response = reasoning_result.response
        assistant_msg = Message(role="assistant", content=response)
        self.conversation.append(assistant_msg)
        self.memory.add(
            f"Q: {input_text}\nA: {response}",
            memory_type="episodic",
            tags=["interaction"],
            importance=reasoning_result.confidence,
        )

        # Periodic memory consolidation
        if self.interaction_count % self.config.memory.consolidation_interval == 0:
            self.memory.consolidate()

        # Safety check output
        output_check = self.safety.check_output(response)
        if not output_check.safe:
            response = f"[Response filtered for safety: {output_check.reason}]"

        duration = time.time() - start_time
        if self.config.verbose:
            print(f"[AGI] Thought for {duration:.2f}s, {len(reasoning_result.steps)} steps")

        self.state = AgentState.IDLE
        return response

    def set_goal(self, description: str, priority: int = 5) -> Goal:
        """Set a top-level goal."""
        goal = Goal(description=description, priority=priority)
        self.goals.append(goal)
        self.goals.sort(key=lambda g: g.priority)
        return goal

    def get_goals(self) -> list[Goal]:
        """Get all active goals."""
        return [g for g in self.goals if g.status in (GoalStatus.PENDING, GoalStatus.IN_PROGRESS)]

    def get_status(self) -> dict[str, Any]:
        """Get agent status."""
        return {
            "name": self.config.name,
            "version": self.config.version,
            "state": self.state.value,
            "interactions": self.interaction_count,
            "goals": len(self.get_goals()),
            "memories": self.memory.count(),
            "tools": len(self.tools.list_tool_names()),
            "conversation_length": len(self.conversation),
        }

    def reset(self) -> None:
        """Reset agent state (keeps config and tools)."""
        self.state = AgentState.IDLE
        self.goals.clear()
        self.conversation.clear()
        self.thought_history.clear()
        self.interaction_count = 0
        self.memory.clear()

    def export_state(self) -> dict[str, Any]:
        """Export full agent state for persistence."""
        return {
            "config": self.config.to_dict(),
            "state": self.state.value,
            "interaction_count": self.interaction_count,
            "goals": [g.to_dict() for g in self.goals],
            "conversation": [m.to_dict() for m in self.conversation],
            "thought_history": [t.to_dict() for t in self.thought_history],
        }

    # -- Built-in tool handlers --

    def _tool_memory_search(self, query: str) -> TaskResult:
        results = self.memory.recall(query, limit=5)
        if results:
            output = "\n".join([f"- {r.content}" for r in results])
            return TaskResult(success=True, output=output)
        return TaskResult(success=True, output="No relevant memories found.")

    def _tool_memory_store(
        self, content: str, tags: list[str] | None = None
    ) -> TaskResult:
        self.memory.add(content, memory_type="long_term", tags=tags or [])
        return TaskResult(success=True, output=f"Stored in memory: {content[:50]}...")

    def _tool_calculate(self, expression: str) -> TaskResult:
        try:
            # Safe math evaluation
            allowed = set("0123456789+-*/.() ")
            if not all(c in allowed for c in expression):
                return TaskResult(
                    success=False,
                    output="",
                    error="Invalid characters in expression",
                )
            result = eval(expression, {"__builtins__": {}})  # noqa: S307
            return TaskResult(success=True, output=str(result))
        except Exception as e:
            return TaskResult(success=False, output="", error=str(e))

    def _tool_set_goal(self, goal: str, priority: int = 5) -> TaskResult:
        g = self.set_goal(goal, priority)
        return TaskResult(success=True, output=f"Goal set: {g.description} (id={g.id})")
