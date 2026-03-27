"""
NexusAI AGI - Open Source Artificial General Intelligence Framework

A modular AGI system with:
- Multi-model reasoning (chain-of-thought, tree-of-thought, self-reflection)
- Persistent memory (short-term, long-term, episodic, semantic)
- Autonomous planning and goal decomposition
- Tool use and environment interaction
- Safety constraints and alignment guardrails
- Multi-agent communication

Works standalone or integrated with NexusAI ACP for the Virtuals Protocol marketplace.
"""

__version__ = "0.1.0"

from nexusai_agi.core.agent import AGIAgent
from nexusai_agi.core.config import AGIConfig

__all__ = ["AGIAgent", "AGIConfig", "__version__"]
