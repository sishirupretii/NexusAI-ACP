"""AGI Configuration."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class MemoryConfig:
    """Memory system configuration."""

    short_term_capacity: int = 100
    long_term_capacity: int = 10000
    episodic_capacity: int = 5000
    similarity_threshold: float = 0.7
    consolidation_interval: int = 50  # consolidate every N interactions
    persistence_path: str | None = None


@dataclass
class ReasoningConfig:
    """Reasoning engine configuration."""

    default_strategy: str = "chain_of_thought"
    max_reasoning_steps: int = 20
    self_reflection_enabled: bool = True
    confidence_threshold: float = 0.6
    tree_of_thought_branches: int = 3
    tree_of_thought_depth: int = 3


@dataclass
class PlanningConfig:
    """Planning engine configuration."""

    max_plan_depth: int = 10
    max_retries: int = 3
    replan_on_failure: bool = True
    parallel_execution: bool = False


@dataclass
class SafetyConfig:
    """Safety and alignment configuration."""

    enabled: bool = True
    max_actions_per_minute: int = 30
    blocked_patterns: list[str] = field(default_factory=list)
    require_confirmation_for: list[str] = field(
        default_factory=lambda: ["file_delete", "system_command", "network_request"]
    )
    ethical_guidelines: list[str] = field(
        default_factory=lambda: [
            "Do not generate harmful, illegal, or deceptive content",
            "Respect user privacy and data boundaries",
            "Be transparent about limitations and uncertainties",
            "Prioritize user safety over task completion",
        ]
    )


@dataclass
class LLMConfig:
    """LLM provider configuration."""

    provider: str = "none"  # "openai", "anthropic", "none" (uses built-in reasoning)
    model: str = ""
    api_key: str = ""
    temperature: float = 0.7
    max_tokens: int = 4096


@dataclass
class AGIConfig:
    """Main AGI configuration."""

    name: str = "NexusAI"
    version: str = "0.1.0"
    memory: MemoryConfig = field(default_factory=MemoryConfig)
    reasoning: ReasoningConfig = field(default_factory=ReasoningConfig)
    planning: PlanningConfig = field(default_factory=PlanningConfig)
    safety: SafetyConfig = field(default_factory=SafetyConfig)
    llm: LLMConfig = field(default_factory=LLMConfig)
    tools_enabled: bool = True
    verbose: bool = False
    log_file: str | None = None

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> AGIConfig:
        """Create config from dictionary."""
        config = cls()
        for key, value in data.items():
            if key == "memory" and isinstance(value, dict):
                config.memory = MemoryConfig(**value)
            elif key == "reasoning" and isinstance(value, dict):
                config.reasoning = ReasoningConfig(**value)
            elif key == "planning" and isinstance(value, dict):
                config.planning = PlanningConfig(**value)
            elif key == "safety" and isinstance(value, dict):
                config.safety = SafetyConfig(**value)
            elif key == "llm" and isinstance(value, dict):
                config.llm = LLMConfig(**value)
            elif hasattr(config, key):
                setattr(config, key, value)
        return config

    @classmethod
    def from_file(cls, path: str | Path) -> AGIConfig:
        """Load config from JSON file."""
        with open(path) as f:
            return cls.from_dict(json.load(f))

    @classmethod
    def from_env(cls) -> AGIConfig:
        """Create config from environment variables."""
        config = cls()
        if os.environ.get("NEXUSAGI_LLM_PROVIDER"):
            config.llm.provider = os.environ["NEXUSAGI_LLM_PROVIDER"]
        if os.environ.get("NEXUSAGI_LLM_MODEL"):
            config.llm.model = os.environ["NEXUSAGI_LLM_MODEL"]
        if os.environ.get("OPENAI_API_KEY"):
            config.llm.api_key = os.environ["OPENAI_API_KEY"]
            if not config.llm.provider:
                config.llm.provider = "openai"
        if os.environ.get("ANTHROPIC_API_KEY"):
            config.llm.api_key = os.environ["ANTHROPIC_API_KEY"]
            if not config.llm.provider:
                config.llm.provider = "anthropic"
        if os.environ.get("NEXUSAGI_VERBOSE"):
            config.verbose = os.environ["NEXUSAGI_VERBOSE"].lower() in ("1", "true")
        return config

    def to_dict(self) -> dict[str, Any]:
        """Serialize to dictionary."""
        from dataclasses import asdict

        return asdict(self)

    def save(self, path: str | Path) -> None:
        """Save config to JSON file."""
        with open(path, "w") as f:
            json.dump(self.to_dict(), f, indent=2)
