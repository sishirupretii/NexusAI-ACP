"""Safety guardian - enforces safety constraints and alignment."""

from __future__ import annotations

import re
import time
from dataclasses import dataclass, field
from typing import Any

from nexusai_agi.core.config import SafetyConfig


@dataclass
class SafetyCheckResult:
    """Result of a safety check."""

    safe: bool
    reason: str = ""
    severity: str = "none"  # none, low, medium, high, critical
    checks_passed: list[str] = field(default_factory=list)
    checks_failed: list[str] = field(default_factory=list)


class SafetyGuardian:
    """
    Enforces safety constraints on agent inputs and outputs.

    Features:
    - Input validation (blocked patterns, content filtering)
    - Output validation (harmful content detection)
    - Rate limiting
    - Action confirmation requirements
    - Ethical guideline enforcement
    """

    def __init__(self, config: SafetyConfig | None = None):
        self.config = config or SafetyConfig()
        self._action_timestamps: list[float] = []
        self._violations: list[dict[str, Any]] = []

        # Default blocked patterns (harmful content indicators)
        self._default_blocked = [
            r"(?i)rm\s+-rf\s+/",
            r"(?i)\b(drop\s+table|delete\s+from\s+\*)\b",
            r"(?i)format\s+c:",
            r"(?i)\bsudo\s+rm\b",
        ]

    def check_input(self, text: str) -> SafetyCheckResult:
        """Check if input is safe to process."""
        if not self.config.enabled:
            return SafetyCheckResult(safe=True, reason="Safety disabled")

        passed = []
        failed = []

        # Check blocked patterns
        all_patterns = self._default_blocked + self.config.blocked_patterns
        for pattern in all_patterns:
            try:
                if re.search(pattern, text):
                    failed.append(f"Blocked pattern matched: {pattern}")
                    self._record_violation("blocked_pattern", text[:100], pattern)
            except re.error:
                pass
        if not any("Blocked pattern" in f for f in failed):
            passed.append("blocked_patterns")

        # Check rate limiting
        if not self._check_rate_limit():
            failed.append("Rate limit exceeded")
            self._record_violation("rate_limit", text[:100])
        else:
            passed.append("rate_limit")

        # Check content length (prevent abuse)
        if len(text) > 100000:
            failed.append("Input too long (>100k characters)")
        else:
            passed.append("content_length")

        if failed:
            return SafetyCheckResult(
                safe=False,
                reason="; ".join(failed),
                severity="high" if len(failed) > 1 else "medium",
                checks_passed=passed,
                checks_failed=failed,
            )

        self._action_timestamps.append(time.time())
        return SafetyCheckResult(
            safe=True,
            checks_passed=passed,
        )

    def check_output(self, text: str) -> SafetyCheckResult:
        """Check if output is safe to return."""
        if not self.config.enabled:
            return SafetyCheckResult(safe=True, reason="Safety disabled")

        passed = []
        failed = []

        # Check for potentially harmful output patterns
        harmful_patterns = [
            r"(?i)\b(password|secret_key|api_key)\s*[:=]\s*\S+",
            r"(?i)\b(ssh-rsa|BEGIN\s+PRIVATE\s+KEY)\b",
        ]
        for pattern in harmful_patterns:
            try:
                if re.search(pattern, text):
                    failed.append("Output may contain sensitive information")
                    break
            except re.error:
                pass
        if not failed:
            passed.append("sensitive_info")

        # Check output length
        if len(text) > 500000:
            failed.append("Output too long")
        else:
            passed.append("output_length")

        if failed:
            return SafetyCheckResult(
                safe=False,
                reason="; ".join(failed),
                severity="medium",
                checks_passed=passed,
                checks_failed=failed,
            )

        return SafetyCheckResult(safe=True, checks_passed=passed)

    def check_action(self, action: str) -> SafetyCheckResult:
        """Check if an action requires confirmation."""
        if not self.config.enabled:
            return SafetyCheckResult(safe=True)

        if action in self.config.require_confirmation_for:
            return SafetyCheckResult(
                safe=False,
                reason=f"Action '{action}' requires user confirmation",
                severity="low",
                checks_failed=["requires_confirmation"],
            )
        return SafetyCheckResult(safe=True)

    def get_violations(self) -> list[dict[str, Any]]:
        """Get recorded safety violations."""
        return list(self._violations)

    def get_guidelines(self) -> list[str]:
        """Get active ethical guidelines."""
        return list(self.config.ethical_guidelines)

    def reset_violations(self) -> None:
        """Clear violation history."""
        self._violations.clear()

    def _check_rate_limit(self) -> bool:
        """Check if action rate is within limits."""
        now = time.time()
        cutoff = now - 60  # 1-minute window
        self._action_timestamps = [t for t in self._action_timestamps if t > cutoff]
        return len(self._action_timestamps) < self.config.max_actions_per_minute

    def _record_violation(
        self, violation_type: str, context: str, detail: str = ""
    ) -> None:
        """Record a safety violation."""
        self._violations.append({
            "type": violation_type,
            "context": context,
            "detail": detail,
            "timestamp": time.time(),
        })
