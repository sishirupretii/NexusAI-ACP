"""Tests for the tool registry."""

import pytest

from nexusai_agi.core.types import TaskResult
from nexusai_agi.tools.registry import ToolRegistry


def dummy_tool(x: str = "hello") -> TaskResult:
    return TaskResult(success=True, output=f"got: {x}")


def failing_tool() -> TaskResult:
    raise ValueError("boom")


class TestToolRegistry:
    def setup_method(self):
        self.registry = ToolRegistry()

    def test_register(self):
        self.registry.register("test", "A test tool", dummy_tool)
        assert self.registry.count() == 1

    def test_unregister(self):
        self.registry.register("test", "A test tool", dummy_tool)
        assert self.registry.unregister("test") is True
        assert self.registry.count() == 0

    def test_get(self):
        self.registry.register("test", "A test tool", dummy_tool)
        tool = self.registry.get("test")
        assert tool is not None
        assert tool.name == "test"

    def test_execute(self):
        self.registry.register("test", "A test tool", dummy_tool)
        result = self.registry.execute("test", {"x": "world"})
        assert result.success
        assert result.output == "got: world"
        assert result.tool_used == "test"

    def test_execute_missing_tool(self):
        result = self.registry.execute("nonexistent")
        assert not result.success
        assert "not found" in result.error

    def test_execute_failing_tool(self):
        self.registry.register("bad", "Fails", failing_tool)
        result = self.registry.execute("bad")
        assert not result.success
        assert "boom" in result.error

    def test_list_tools(self):
        self.registry.register("a", "Tool A", dummy_tool)
        self.registry.register("b", "Tool B", dummy_tool)
        tools = self.registry.list_tools()
        assert len(tools) == 2
        names = [t["name"] for t in tools]
        assert "a" in names
        assert "b" in names

    def test_list_tool_names(self):
        self.registry.register("a", "Tool A", dummy_tool)
        names = self.registry.list_tool_names()
        assert names == ["a"]

    def test_enable_disable(self):
        self.registry.register("test", "Test", dummy_tool)
        self.registry.disable("test")
        result = self.registry.execute("test")
        assert not result.success
        assert "disabled" in result.error

        self.registry.enable("test")
        result = self.registry.execute("test")
        assert result.success

    def test_get_by_category(self):
        self.registry.register("a", "A", dummy_tool, category="math")
        self.registry.register("b", "B", dummy_tool, category="memory")
        math_tools = self.registry.get_by_category("math")
        assert len(math_tools) == 1
        assert math_tools[0].name == "a"

    def test_call_count(self):
        self.registry.register("test", "Test", dummy_tool)
        self.registry.execute("test")
        self.registry.execute("test")
        tool = self.registry.get("test")
        assert tool.call_count == 2
