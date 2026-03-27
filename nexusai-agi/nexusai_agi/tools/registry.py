"""Tool registry - manages available tools for the AGI agent."""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Callable

from nexusai_agi.core.types import TaskResult


@dataclass
class ToolDefinition:
    """A registered tool."""

    name: str
    description: str
    handler: Callable[..., TaskResult]
    parameters: dict[str, str] = field(default_factory=dict)
    category: str = "general"
    enabled: bool = True
    call_count: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters,
            "category": self.category,
            "enabled": self.enabled,
        }


class ToolRegistry:
    """
    Registry for managing tools available to the AGI agent.

    Tools are callable functions that extend the agent's capabilities.
    Each tool has a name, description, handler function, and parameter schema.
    """

    def __init__(self) -> None:
        self._tools: dict[str, ToolDefinition] = {}

    def register(
        self,
        name: str,
        description: str,
        handler: Callable[..., TaskResult],
        parameters: dict[str, str] | None = None,
        category: str = "general",
    ) -> None:
        """Register a new tool."""
        self._tools[name] = ToolDefinition(
            name=name,
            description=description,
            handler=handler,
            parameters=parameters or {},
            category=category,
        )

    def unregister(self, name: str) -> bool:
        """Remove a tool from the registry."""
        return self._tools.pop(name, None) is not None

    def get(self, name: str) -> ToolDefinition | None:
        """Get a tool by name."""
        return self._tools.get(name)

    def execute(self, name: str, args: dict[str, Any] | None = None) -> TaskResult:
        """Execute a tool by name with given arguments."""
        tool = self._tools.get(name)
        if not tool:
            return TaskResult(
                success=False,
                output="",
                error=f"Tool not found: {name}",
            )

        if not tool.enabled:
            return TaskResult(
                success=False,
                output="",
                error=f"Tool is disabled: {name}",
            )

        start_time = time.time()
        try:
            result = tool.handler(**(args or {}))
            tool.call_count += 1
            result.tool_used = name
            result.duration = time.time() - start_time
            return result
        except TypeError as e:
            return TaskResult(
                success=False,
                output="",
                error=f"Invalid arguments for tool '{name}': {e}",
                tool_used=name,
                duration=time.time() - start_time,
            )
        except Exception as e:
            return TaskResult(
                success=False,
                output="",
                error=f"Tool '{name}' failed: {e}",
                tool_used=name,
                duration=time.time() - start_time,
            )

    def list_tools(self) -> list[dict[str, Any]]:
        """List all tools as dictionaries."""
        return [t.to_dict() for t in self._tools.values() if t.enabled]

    def list_tool_names(self) -> list[str]:
        """List names of all enabled tools."""
        return [name for name, t in self._tools.items() if t.enabled]

    def get_by_category(self, category: str) -> list[ToolDefinition]:
        """Get all tools in a category."""
        return [t for t in self._tools.values() if t.category == category]

    def enable(self, name: str) -> bool:
        """Enable a tool."""
        tool = self._tools.get(name)
        if tool:
            tool.enabled = True
            return True
        return False

    def disable(self, name: str) -> bool:
        """Disable a tool."""
        tool = self._tools.get(name)
        if tool:
            tool.enabled = False
            return True
        return False

    def count(self) -> int:
        """Return total number of registered tools."""
        return len(self._tools)
