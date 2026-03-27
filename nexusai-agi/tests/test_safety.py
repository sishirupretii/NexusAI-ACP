"""Tests for the safety guardian."""

import pytest

from nexusai_agi.core.config import SafetyConfig
from nexusai_agi.safety.guardian import SafetyGuardian


class TestSafetyGuardian:
    def setup_method(self):
        self.guardian = SafetyGuardian()

    def test_safe_input(self):
        result = self.guardian.check_input("Hello, how are you?")
        assert result.safe is True

    def test_blocked_pattern(self):
        result = self.guardian.check_input("rm -rf /")
        assert result.safe is False
        assert result.severity in ("medium", "high")

    def test_safe_output(self):
        result = self.guardian.check_output("Here is the answer to your question.")
        assert result.safe is True

    def test_sensitive_output(self):
        result = self.guardian.check_output("password: mysecret123")
        assert result.safe is False

    def test_action_confirmation(self):
        result = self.guardian.check_action("file_delete")
        assert result.safe is False
        assert "confirmation" in result.reason

    def test_allowed_action(self):
        result = self.guardian.check_action("read_file")
        assert result.safe is True

    def test_disabled_safety(self):
        config = SafetyConfig(enabled=False)
        guardian = SafetyGuardian(config)
        result = guardian.check_input("rm -rf /")
        assert result.safe is True

    def test_violations_recorded(self):
        self.guardian.check_input("rm -rf /")
        violations = self.guardian.get_violations()
        assert len(violations) > 0

    def test_reset_violations(self):
        self.guardian.check_input("rm -rf /")
        self.guardian.reset_violations()
        assert len(self.guardian.get_violations()) == 0

    def test_guidelines(self):
        guidelines = self.guardian.get_guidelines()
        assert len(guidelines) > 0
        assert any("safety" in g.lower() or "harmful" in g.lower() for g in guidelines)

    def test_long_input(self):
        result = self.guardian.check_input("a" * 200000)
        assert result.safe is False
        assert any("too long" in f.lower() for f in result.checks_failed)
