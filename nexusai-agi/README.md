# NexusAI AGI

**Open Source Artificial General Intelligence Framework**

A modular AGI system with multi-strategy reasoning, persistent memory, autonomous planning, extensible tools, safety guardrails, and multi-agent communication. Works standalone or integrated with NexusAI ACP for the Virtuals Protocol marketplace.

## Features

- **Multi-Strategy Reasoning** — Chain-of-thought, tree-of-thought, self-reflection. Auto-selects the best strategy per query.
- **Persistent Memory** — Short-term, long-term, episodic, semantic. Keyword search, tag filtering, consolidation, JSON persistence.
- **Autonomous Planning** — Goal decomposition into actionable steps. Domain-specific planning (build/analyze/learn/fix) with dependency tracking.
- **Extensible Tool System** — Register custom tools. Built-in: memory search, math calculation, goal management.
- **Safety Guardrails** — Input/output filtering, rate limiting, blocked patterns, action confirmation, ethical guidelines.
- **Multi-Agent Communication** — Channel-based messaging, direct messages, request/response patterns, capability discovery.
- **No External Dependencies** — Works without any LLM API. Optional OpenAI/Anthropic integration.
- **CLI + Python API** — Interactive chat, single queries, benchmarks, and full programmatic access.

## Quick Start

### Install

```bash
git clone https://github.com/sishirupretii/NexusAI-ACP
cd NexusAI-ACP/nexusai-agi

# Install (Python 3.10+)
pip install -e .

# With LLM support (optional)
pip install -e ".[llm]"

# With dev tools (testing)
pip install -e ".[dev]"
```

### CLI Usage

```bash
# Interactive chat
nexusagi chat

# Single query
nexusagi think "What is machine learning?"

# Run benchmarks (10/10 tests)
nexusagi benchmark

# Show status
nexusagi status

# Create config file
nexusagi config create --output my_config.json
```

### Python API

```python
from nexusai_agi import AGIAgent, AGIConfig

# Create agent
agent = AGIAgent()

# Think (the core AGI loop)
response = agent.think("How does photosynthesis work?")
print(response)

# Math
response = agent.think("What is 42 * 7?")
# Output: The result of 42 * 7 is **294**.

# Set goals
goal = agent.set_goal("Learn about AI safety", priority=2)

# Check status
print(agent.get_status())
# {'name': 'NexusAI', 'state': 'idle', 'interactions': 2, ...}

# Export state
state = agent.export_state()
```

### Custom Tools

```python
from nexusai_agi import AGIAgent
from nexusai_agi.core.types import TaskResult

agent = AGIAgent()

def my_tool(query: str) -> TaskResult:
    return TaskResult(success=True, output=f"Processed: {query}")

agent.tools.register(
    name="my_tool",
    description="My custom tool",
    handler=my_tool,
    parameters={"query": "str"},
)
```

### Multi-Agent

```python
from nexusai_agi import AGIAgent, AGIConfig
from nexusai_agi.communication.hub import CommunicationHub

hub = CommunicationHub()

agent1 = AGIAgent(AGIConfig(name="Researcher"))
agent2 = AGIAgent(AGIConfig(name="Planner"))

hub.register_agent("researcher", "Researcher", ["reasoning"])
hub.register_agent("planner", "Planner", ["planning"])

hub.join_channel("researcher", "project")
hub.join_channel("planner", "project")

hub.broadcast("researcher", "project", "Found key insights")
```

## Architecture

```
nexusai_agi/
├── core/
│   ├── agent.py          # Main AGI Agent orchestrator
│   ├── config.py          # Configuration system
│   └── types.py           # Core type definitions
├── memory/
│   ├── manager.py         # Memory coordinator
│   └── store.py           # Storage backend
├── reasoning/
│   └── engine.py          # Multi-strategy reasoning
├── planning/
│   └── planner.py         # Goal decomposition
├── tools/
│   └── registry.py        # Tool management
├── safety/
│   └── guardian.py         # Safety constraints
├── communication/
│   └── hub.py             # Multi-agent messaging
└── cli.py                 # CLI entry point
```

### AGI Loop (`agent.think()`)

1. **Safety Check** — Validate input against safety rules
2. **Memory Store** — Save input to short-term memory
3. **Context Retrieval** — Search memory for relevant context
4. **Reasoning** — Apply chain-of-thought or tree-of-thought
5. **Tool Execution** — Run matched tools if needed
6. **Planning** — Decompose complex tasks into steps
7. **Self-Reflection** — Review and improve response quality
8. **Output** — Safety-check and return response

## Testing

```bash
# Run all tests (86 tests)
pytest tests/ -v

# Run benchmarks
nexusagi benchmark
```

## Configuration

```python
from nexusai_agi import AGIConfig

config = AGIConfig(
    name="MyAgent",
    verbose=True,
    memory=MemoryConfig(short_term_capacity=200),
    reasoning=ReasoningConfig(self_reflection_enabled=True),
    safety=SafetyConfig(max_actions_per_minute=60),
)

# From file
config = AGIConfig.from_file("config.json")

# From environment
config = AGIConfig.from_env()
```

Environment variables:

- `NEXUSAGI_LLM_PROVIDER` — `openai`, `anthropic`, or `none`
- `NEXUSAGI_LLM_MODEL` — Model name
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` — API keys
- `NEXUSAGI_VERBOSE` — Enable verbose output

## ACP Integration

NexusAI AGI works with NexusAI ACP to deploy AGI agents on the Virtuals Protocol marketplace:

```bash
# Install both
cd NexusAI-ACP
npm install && npm link     # ACP CLI
cd nexusai-agi && pip install -e .  # AGI framework

# Deploy your AGI agent
nexus quickdeploy my-agi-agent
nexusagi chat  # Start the AGI
```

## License

MIT
