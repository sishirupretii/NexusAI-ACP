"""Core type definitions for the AGI system."""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class AgentState(Enum):
    """Agent lifecycle states."""

    IDLE = "idle"
    THINKING = "thinking"
    PLANNING = "planning"
    EXECUTING = "executing"
    REFLECTING = "reflecting"
    WAITING = "waiting"
    ERROR = "error"
    STOPPED = "stopped"


class GoalStatus(Enum):
    """Goal completion status."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class ThoughtStep:
    """A single step in the reasoning chain."""

    content: str
    step_type: str = "thought"  # thought, observation, action, reflection
    confidence: float = 0.5
    timestamp: float = field(default_factory=time.time)
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "content": self.content,
            "step_type": self.step_type,
            "confidence": self.confidence,
            "timestamp": self.timestamp,
            "metadata": self.metadata,
        }


@dataclass
class Goal:
    """A goal the agent is working toward."""

    description: str
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    status: GoalStatus = GoalStatus.PENDING
    priority: int = 5  # 1 (highest) to 10 (lowest)
    subgoals: list[Goal] = field(default_factory=list)
    result: Any = None
    created_at: float = field(default_factory=time.time)
    completed_at: float | None = None

    def complete(self, result: Any = None) -> None:
        self.status = GoalStatus.COMPLETED
        self.result = result
        self.completed_at = time.time()

    def fail(self, reason: str = "") -> None:
        self.status = GoalStatus.FAILED
        self.result = reason
        self.completed_at = time.time()

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "description": self.description,
            "status": self.status.value,
            "priority": self.priority,
            "subgoals": [sg.to_dict() for sg in self.subgoals],
            "result": str(self.result) if self.result else None,
        }


@dataclass
class Message:
    """A message in conversation."""

    role: str  # "user", "assistant", "system", "tool"
    content: str
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    timestamp: float = field(default_factory=time.time)
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "role": self.role,
            "content": self.content,
            "timestamp": self.timestamp,
            "metadata": self.metadata,
        }


@dataclass
class TaskResult:
    """Result of executing a task or plan step."""

    success: bool
    output: str
    error: str | None = None
    tool_used: str | None = None
    duration: float = 0.0
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "success": self.success,
            "output": self.output,
            "error": self.error,
            "tool_used": self.tool_used,
            "duration": self.duration,
        }


@dataclass
class MemoryEntry:
    """An entry in the memory system."""

    content: str
    memory_type: str = "short_term"  # short_term, long_term, episodic, semantic
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    importance: float = 0.5
    embedding: list[float] | None = None
    tags: list[str] = field(default_factory=list)
    timestamp: float = field(default_factory=time.time)
    access_count: int = 0
    last_accessed: float = field(default_factory=time.time)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "content": self.content,
            "memory_type": self.memory_type,
            "importance": self.importance,
            "tags": self.tags,
            "timestamp": self.timestamp,
            "access_count": self.access_count,
        }
