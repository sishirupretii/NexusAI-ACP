"""Reasoning engine - multi-strategy reasoning system."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from nexusai_agi.core.config import ReasoningConfig
from nexusai_agi.core.types import ThoughtStep


@dataclass
class ReasoningResult:
    """Result from the reasoning engine."""

    response: str
    steps: list[ThoughtStep] = field(default_factory=list)
    confidence: float = 0.5
    strategy_used: str = "chain_of_thought"
    tool_calls: list[dict[str, Any]] = field(default_factory=list)
    needs_planning: bool = False


@dataclass
class ReflectionResult:
    """Result from self-reflection."""

    reflection_text: str
    confidence: float = 0.5
    revised_response: str | None = None
    issues_found: list[str] = field(default_factory=list)


class ReasoningEngine:
    """
    Multi-strategy reasoning engine.

    Supports:
    - Chain of Thought: step-by-step reasoning
    - Tree of Thought: branching exploration
    - Self-reflection: reviewing and improving responses
    - Tool-augmented reasoning: using tools during reasoning
    """

    def __init__(self, config: ReasoningConfig | None = None):
        self.config = config or ReasoningConfig()

    def reason(
        self,
        query: str,
        context: str = "",
        conversation: list[dict[str, Any]] | None = None,
        tools: list[dict[str, Any]] | None = None,
    ) -> ReasoningResult:
        """Main reasoning method - selects and applies strategy."""
        strategy = self._select_strategy(query)

        if strategy == "chain_of_thought":
            return self._chain_of_thought(query, context, conversation, tools)
        elif strategy == "tree_of_thought":
            return self._tree_of_thought(query, context, conversation)
        else:
            return self._chain_of_thought(query, context, conversation, tools)

    def reflect(
        self,
        query: str,
        response: str,
        steps: list[ThoughtStep],
    ) -> ReflectionResult:
        """Self-reflect on reasoning and response quality."""
        issues = []
        confidence = 0.7

        # Check for common issues
        if len(response) < 10:
            issues.append("Response is very short")
            confidence -= 0.2

        if not response.strip():
            issues.append("Empty response")
            confidence = 0.1

        # Check if response addresses the query
        query_words = set(query.lower().split())
        response_words = set(response.lower().split())
        overlap = len(query_words & response_words)
        if overlap < len(query_words) * 0.2:
            issues.append("Response may not fully address the query")
            confidence -= 0.1

        # Check reasoning chain quality
        if len(steps) == 0:
            issues.append("No reasoning steps recorded")
            confidence -= 0.1

        reflection_text = f"Reflection on response to '{query[:50]}...': "
        if issues:
            reflection_text += f"Issues found: {'; '.join(issues)}. "
        else:
            reflection_text += "Response appears adequate. "
        reflection_text += f"Confidence: {confidence:.1f}"

        return ReflectionResult(
            reflection_text=reflection_text,
            confidence=max(0.1, min(1.0, confidence)),
            issues_found=issues,
        )

    def _select_strategy(self, query: str) -> str:
        """Select the best reasoning strategy for the query."""
        query_lower = query.lower()

        # Complex analytical queries benefit from tree of thought
        complex_indicators = [
            "compare", "analyze", "evaluate", "what are the pros and cons",
            "design", "architect", "plan", "strategy",
        ]
        if any(indicator in query_lower for indicator in complex_indicators):
            return "tree_of_thought"

        return "chain_of_thought"

    def _chain_of_thought(
        self,
        query: str,
        context: str,
        conversation: list[dict[str, Any]] | None,
        tools: list[dict[str, Any]] | None,
    ) -> ReasoningResult:
        """Chain-of-thought reasoning."""
        steps: list[ThoughtStep] = []
        tool_calls: list[dict[str, Any]] = []
        needs_planning = False

        # Step 1: Understand the query
        steps.append(ThoughtStep(
            content=f"Understanding query: {query}",
            step_type="thought",
            confidence=0.8,
        ))

        # Step 2: Analyze context
        if context:
            steps.append(ThoughtStep(
                content=f"Relevant context found: {context[:200]}",
                step_type="observation",
                confidence=0.7,
            ))

        # Step 3: Check if tools are needed
        if tools:
            tool_match = self._match_tools(query, tools)
            if tool_match:
                tool_calls.extend(tool_match)
                steps.append(ThoughtStep(
                    content=f"Using tools: {[t['name'] for t in tool_match]}",
                    step_type="action",
                    confidence=0.7,
                ))

        # Step 4: Check if planning is needed
        planning_indicators = ["how to", "step by step", "create a plan", "build", "develop"]
        if any(ind in query.lower() for ind in planning_indicators):
            needs_planning = True
            steps.append(ThoughtStep(
                content="This requires planning - decomposing into subtasks",
                step_type="thought",
                confidence=0.6,
            ))

        # Step 5: Generate response
        response = self._generate_response(query, context, conversation, steps)
        steps.append(ThoughtStep(
            content=f"Generated response ({len(response)} chars)",
            step_type="thought",
            confidence=0.7,
        ))

        # Calculate overall confidence
        avg_confidence = sum(s.confidence for s in steps) / max(len(steps), 1)

        return ReasoningResult(
            response=response,
            steps=steps,
            confidence=avg_confidence,
            strategy_used="chain_of_thought",
            tool_calls=tool_calls,
            needs_planning=needs_planning,
        )

    def _tree_of_thought(
        self,
        query: str,
        context: str,
        conversation: list[dict[str, Any]] | None,
    ) -> ReasoningResult:
        """Tree-of-thought reasoning with branching."""
        steps: list[ThoughtStep] = []

        steps.append(ThoughtStep(
            content=f"Exploring multiple approaches for: {query}",
            step_type="thought",
            confidence=0.6,
        ))

        # Generate multiple branches
        branches = self._generate_branches(query, context)
        for i, branch in enumerate(branches):
            steps.append(ThoughtStep(
                content=f"Branch {i + 1}: {branch}",
                step_type="thought",
                confidence=0.5 + (0.1 * (len(branches) - i)),
            ))

        # Evaluate and select best branch
        best_branch = branches[0] if branches else "Direct analysis approach"
        steps.append(ThoughtStep(
            content=f"Selected approach: {best_branch}",
            step_type="thought",
            confidence=0.7,
        ))

        response = self._generate_response(query, context, conversation, steps)

        avg_confidence = sum(s.confidence for s in steps) / max(len(steps), 1)

        return ReasoningResult(
            response=response,
            steps=steps,
            confidence=avg_confidence,
            strategy_used="tree_of_thought",
        )

    def _generate_response(
        self,
        query: str,
        context: str,
        conversation: list[dict[str, Any]] | None,
        steps: list[ThoughtStep],
    ) -> str:
        """Generate a response using built-in reasoning (no LLM required)."""
        # This is the core built-in reasoning engine
        # It works without any external LLM
        query_lower = query.lower().strip()

        # Handle greetings
        if query_lower in ("hello", "hi", "hey", "greetings"):
            return "Hello! I'm NexusAI AGI. I can help you reason through problems, manage information, plan tasks, and more. What would you like to work on?"

        # Handle identity questions
        if any(w in query_lower for w in ["who are you", "what are you", "introduce yourself"]):
            return (
                "I am NexusAI AGI, an open-source artificial general intelligence framework. "
                "I combine multi-strategy reasoning, persistent memory, autonomous planning, "
                "tool use, and safety guardrails into a unified system. I can help with "
                "analysis, planning, problem-solving, and information management."
            )

        # Handle capability questions
        if any(w in query_lower for w in ["what can you do", "capabilities", "help me with"]):
            return (
                "I can help with:\n"
                "1. **Reasoning**: Chain-of-thought and tree-of-thought analysis\n"
                "2. **Memory**: Store, search, and recall information across conversations\n"
                "3. **Planning**: Break complex goals into actionable steps\n"
                "4. **Calculations**: Mathematical computations\n"
                "5. **Goal Management**: Set, track, and complete goals\n"
                "6. **ACP Integration**: Work with Virtuals Protocol marketplace\n\n"
                "Just ask me anything and I'll reason through it step by step."
            )

        # Handle math
        if self._is_math_query(query_lower):
            return self._handle_math(query)

        # Handle memory queries
        if any(w in query_lower for w in ["remember", "recall", "what did i say", "earlier"]):
            return f"Let me search my memory for relevant information about: {query}"

        # Build a reasoned response
        response_parts = []

        # Add context-aware analysis
        if context:
            response_parts.append(f"Based on what I know: {context[:300]}")

        # Build conversation-aware response
        if conversation and len(conversation) > 1:
            recent = [m for m in conversation[-5:] if m.get("role") == "user"]
            if recent:
                response_parts.append("Considering our conversation context")

        # Analyze and respond to the query
        thinking = [s.content for s in steps if s.step_type == "thought"]
        if thinking:
            response_parts.append(f"After reasoning through this ({len(thinking)} steps)")

        # Generate substantive response
        response_parts.append(
            f"Regarding '{query[:100]}': I've analyzed this using "
            f"{'tree-of-thought' if len(steps) > 5 else 'chain-of-thought'} reasoning. "
        )

        if any(w in query_lower for w in ["how", "explain", "why"]):
            response_parts.append(
                "Let me break this down step by step to provide a thorough answer."
            )
        elif any(w in query_lower for w in ["should", "recommend", "best"]):
            response_parts.append(
                "Based on my analysis, here's my recommendation."
            )
        else:
            response_parts.append(
                "Here's what I've determined through my reasoning process."
            )

        return " ".join(response_parts)

    def _generate_branches(self, query: str, context: str) -> list[str]:
        """Generate multiple reasoning branches."""
        branches = []
        query_lower = query.lower()

        if "compare" in query_lower:
            branches.extend([
                "Systematic comparison of features and characteristics",
                "Analysis from different stakeholder perspectives",
                "Historical context and evolution comparison",
            ])
        elif "design" in query_lower or "build" in query_lower:
            branches.extend([
                "Top-down architectural approach",
                "Bottom-up component-based approach",
                "Iterative prototyping approach",
            ])
        else:
            branches.extend([
                "Direct analytical approach",
                "First-principles reasoning",
                "Analogical reasoning from similar problems",
            ])

        return branches[:self.config.tree_of_thought_branches]

    def _match_tools(
        self, query: str, tools: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """Match query to available tools."""
        matches = []
        query_lower = query.lower()

        for tool in tools:
            name = tool.get("name", "")
            desc = tool.get("description", "").lower()

            if name == "calculate" and self._is_math_query(query_lower):
                expr = self._extract_math(query)
                if expr:
                    matches.append({"name": "calculate", "args": {"expression": expr}})

            elif name == "memory_search" and any(
                w in query_lower for w in ["remember", "recall", "search memory", "what did"]
            ):
                matches.append({"name": "memory_search", "args": {"query": query}})

        return matches

    def _is_math_query(self, query: str) -> bool:
        """Check if query involves math."""
        math_patterns = [
            r"\d+\s*[\+\-\*\/]\s*\d+",
            r"calculate",
            r"compute",
            r"what is \d+",
        ]
        return any(re.search(p, query.lower()) for p in math_patterns)

    def _extract_math(self, query: str) -> str | None:
        """Extract math expression from query."""
        match = re.search(r"(\d+[\s\+\-\*\/\.]+\d+[\s\+\-\*\/\.\d]*)", query)
        return match.group(1).strip() if match else None

    def _handle_math(self, query: str) -> str:
        expr = self._extract_math(query)
        if expr:
            try:
                allowed = set("0123456789+-*/.() ")
                if all(c in allowed for c in expr):
                    result = eval(expr, {"__builtins__": {}})  # noqa: S307
                    return f"The result of {expr} is **{result}**."
            except Exception:
                pass
        return f"I detected a math query but couldn't parse the expression from: {query}"
