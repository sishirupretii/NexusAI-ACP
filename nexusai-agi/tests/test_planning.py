"""Tests for the planning engine."""

import pytest

from nexusai_agi.core.config import PlanningConfig
from nexusai_agi.planning.planner import Plan, PlanStep, Planner


class TestPlanner:
    def setup_method(self):
        self.planner = Planner()

    def test_create_plan(self):
        plan = self.planner.create_plan("Build a website")
        assert isinstance(plan, Plan)
        assert plan.goal == "Build a website"
        assert len(plan.steps) > 0

    def test_plan_build_domain(self):
        plan = self.planner.create_plan("Create a mobile app")
        descriptions = [s.description.lower() for s in plan.steps]
        assert any("requirements" in d or "design" in d for d in descriptions)

    def test_plan_analyze_domain(self):
        plan = self.planner.create_plan("Analyze market trends")
        descriptions = [s.description.lower() for s in plan.steps]
        assert any("data" in d or "gather" in d for d in descriptions)

    def test_plan_fix_domain(self):
        plan = self.planner.create_plan("Fix the login bug")
        descriptions = [s.description.lower() for s in plan.steps]
        assert any("root cause" in d or "identify" in d for d in descriptions)

    def test_plan_with_tools(self):
        plan = self.planner.create_plan(
            "Research AI",
            available_tools=["memory_search", "memory_store"],
        )
        tools_used = [s.tool for s in plan.steps if s.tool]
        assert "memory_search" in tools_used

    def test_plan_dependencies(self):
        plan = self.planner.create_plan("Build something")
        for step in plan.steps:
            if step.step_id > 0:
                assert len(step.dependencies) > 0

    def test_plan_describe(self):
        plan = self.planner.create_plan("Test goal")
        description = plan.describe()
        assert "Test goal" in description
        assert "Steps" in description

    def test_plan_next_step(self):
        plan = self.planner.create_plan("Test")
        next_step = plan.next_step()
        assert next_step is not None
        assert next_step.step_id == 0

    def test_plan_is_complete(self):
        plan = self.planner.create_plan("Test")
        assert plan.is_complete() is False
        for step in plan.steps:
            step.status = "completed"
        assert plan.is_complete() is True

    def test_plan_to_dict(self):
        plan = self.planner.create_plan("Test")
        d = plan.to_dict()
        assert d["goal"] == "Test"
        assert "steps" in d


class TestPlanStep:
    def test_to_dict(self):
        step = PlanStep(description="Do something", step_id=1, tool="memory_search")
        d = step.to_dict()
        assert d["description"] == "Do something"
        assert d["tool"] == "memory_search"
        assert d["status"] == "pending"
