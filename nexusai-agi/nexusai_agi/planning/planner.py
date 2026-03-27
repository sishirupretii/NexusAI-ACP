"""Planning engine - goal decomposition and task planning."""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any

from nexusai_agi.core.config import PlanningConfig


@dataclass
class PlanStep:
    """A single step in a plan."""

    description: str
    step_id: int = 0
    tool: str | None = None
    args: dict[str, Any] = field(default_factory=dict)
    dependencies: list[int] = field(default_factory=list)
    status: str = "pending"  # pending, running, completed, failed
    result: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "step_id": self.step_id,
            "description": self.description,
            "tool": self.tool,
            "status": self.status,
            "dependencies": self.dependencies,
            "result": self.result,
        }


@dataclass
class Plan:
    """A complete plan with ordered steps."""

    goal: str
    steps: list[PlanStep] = field(default_factory=list)
    status: str = "pending"
    created_at: float = field(default_factory=time.time)

    def describe(self) -> str:
        lines = [f"Goal: {self.goal}", f"Steps ({len(self.steps)}):"]
        for step in self.steps:
            dep_str = f" (after step {step.dependencies})" if step.dependencies else ""
            tool_str = f" [tool: {step.tool}]" if step.tool else ""
            lines.append(
                f"  {step.step_id}. [{step.status}] {step.description}{tool_str}{dep_str}"
            )
        return "\n".join(lines)

    def next_step(self) -> PlanStep | None:
        for step in self.steps:
            if step.status == "pending":
                # Check dependencies completed
                deps_done = all(
                    self.steps[d].status == "completed"
                    for d in step.dependencies
                    if d < len(self.steps)
                )
                if deps_done:
                    return step
        return None

    def is_complete(self) -> bool:
        return all(s.status in ("completed", "failed") for s in self.steps)

    def to_dict(self) -> dict[str, Any]:
        return {
            "goal": self.goal,
            "status": self.status,
            "steps": [s.to_dict() for s in self.steps],
        }


class Planner:
    """Creates and manages execution plans."""

    def __init__(self, config: PlanningConfig | None = None):
        self.config = config or PlanningConfig()
        self.plans: list[Plan] = []

    def create_plan(
        self,
        goal: str,
        context: str = "",
        available_tools: list[str] | None = None,
    ) -> Plan:
        """Decompose a goal into actionable steps."""
        tools = available_tools or []
        steps = self._decompose_goal(goal, context, tools)

        plan = Plan(goal=goal, steps=steps)
        self.plans.append(plan)
        return plan

    def _decompose_goal(
        self,
        goal: str,
        context: str,
        tools: list[str],
    ) -> list[PlanStep]:
        """Break down goal into steps using built-in logic."""
        goal_lower = goal.lower()
        steps: list[PlanStep] = []

        # Always start with understanding/research
        steps.append(PlanStep(
            description=f"Analyze and understand: {goal}",
            step_id=0,
            tool="memory_search" if "memory_search" in tools else None,
            args={"query": goal} if "memory_search" in tools else {},
        ))

        # Domain-specific decomposition
        if any(w in goal_lower for w in ["build", "create", "develop", "make"]):
            steps.extend([
                PlanStep(description="Define requirements and constraints", step_id=1, dependencies=[0]),
                PlanStep(description="Design the solution architecture", step_id=2, dependencies=[1]),
                PlanStep(description="Implement the core components", step_id=3, dependencies=[2]),
                PlanStep(description="Test and validate the solution", step_id=4, dependencies=[3]),
                PlanStep(description="Refine and optimize", step_id=5, dependencies=[4]),
            ])
        elif any(w in goal_lower for w in ["analyze", "evaluate", "compare", "assess"]):
            steps.extend([
                PlanStep(description="Gather relevant data and information", step_id=1, dependencies=[0]),
                PlanStep(description="Identify key factors and criteria", step_id=2, dependencies=[1]),
                PlanStep(description="Perform systematic analysis", step_id=3, dependencies=[2]),
                PlanStep(description="Draw conclusions and recommendations", step_id=4, dependencies=[3]),
            ])
        elif any(w in goal_lower for w in ["learn", "understand", "explain"]):
            steps.extend([
                PlanStep(description="Identify core concepts", step_id=1, dependencies=[0]),
                PlanStep(description="Research and gather information", step_id=2, dependencies=[1]),
                PlanStep(description="Synthesize understanding", step_id=3, dependencies=[2]),
                PlanStep(description="Create summary explanation", step_id=4, dependencies=[3]),
            ])
        elif any(w in goal_lower for w in ["fix", "debug", "solve", "resolve"]):
            steps.extend([
                PlanStep(description="Identify the root cause", step_id=1, dependencies=[0]),
                PlanStep(description="Generate potential solutions", step_id=2, dependencies=[1]),
                PlanStep(description="Evaluate and select best solution", step_id=3, dependencies=[2]),
                PlanStep(description="Implement the fix", step_id=4, dependencies=[3]),
                PlanStep(description="Verify the fix works", step_id=5, dependencies=[4]),
            ])
        else:
            # Generic decomposition
            steps.extend([
                PlanStep(description="Break down into sub-tasks", step_id=1, dependencies=[0]),
                PlanStep(description="Execute sub-tasks in order", step_id=2, dependencies=[1]),
                PlanStep(description="Synthesize results", step_id=3, dependencies=[2]),
            ])

        # Store the plan result
        steps.append(PlanStep(
            description="Store results in memory",
            step_id=len(steps),
            tool="memory_store" if "memory_store" in tools else None,
            args={"content": f"Completed plan: {goal}", "tags": ["plan_result"]},
            dependencies=[len(steps) - 1],
        ))

        return steps
