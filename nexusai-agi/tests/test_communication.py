"""Tests for the communication hub."""

import pytest

from nexusai_agi.communication.hub import CommunicationHub


class TestCommunicationHub:
    def setup_method(self):
        self.hub = CommunicationHub()

    def test_register_agent(self):
        info = self.hub.register_agent("agent1", "Agent One", ["reasoning"])
        assert info.agent_id == "agent1"
        assert info.name == "Agent One"

    def test_unregister_agent(self):
        self.hub.register_agent("agent1", "Agent One")
        assert self.hub.unregister_agent("agent1") is True
        assert self.hub.unregister_agent("agent1") is False

    def test_list_agents(self):
        self.hub.register_agent("a1", "One")
        self.hub.register_agent("a2", "Two")
        agents = self.hub.list_agents()
        assert len(agents) == 2

    def test_join_channel(self):
        self.hub.register_agent("a1", "One")
        assert self.hub.join_channel("a1", "general") is True
        assert "general" in self.hub.list_channels()

    def test_join_channel_unregistered(self):
        assert self.hub.join_channel("unknown", "general") is False

    def test_broadcast(self):
        self.hub.register_agent("a1", "One")
        self.hub.register_agent("a2", "Two")
        self.hub.join_channel("a1", "general")
        self.hub.join_channel("a2", "general")

        received = []
        self.hub.on_message("a2", lambda msg: received.append(msg))

        self.hub.broadcast("a1", "general", "Hello everyone")
        assert len(received) == 1
        assert received[0].content == "Hello everyone"

    def test_direct_message(self):
        self.hub.register_agent("a1", "One")
        self.hub.register_agent("a2", "Two")

        received = []
        self.hub.on_message("a2", lambda msg: received.append(msg))

        self.hub.send_direct("a1", "a2", "Private message")
        assert len(received) == 1
        assert received[0].msg_type == "direct"

    def test_request(self):
        self.hub.register_agent("a1", "One")
        self.hub.register_agent("a2", "Two")

        received = []
        self.hub.on_message("a2", lambda msg: received.append(msg))

        self.hub.request("a1", "a2", "Do something")
        assert len(received) == 1
        assert received[0].msg_type == "request"

    def test_get_history(self):
        self.hub.register_agent("a1", "One")
        self.hub.register_agent("a2", "Two")
        self.hub.join_channel("a1", "general")

        self.hub.broadcast("a1", "general", "msg 1")
        self.hub.broadcast("a1", "general", "msg 2")

        history = self.hub.get_history("general")
        assert len(history) == 2

    def test_find_agents_by_capability(self):
        self.hub.register_agent("a1", "One", ["reasoning", "planning"])
        self.hub.register_agent("a2", "Two", ["memory"])

        found = self.hub.find_agents_by_capability("reasoning")
        assert len(found) == 1
        assert found[0].agent_id == "a1"

    def test_leave_channel(self):
        self.hub.register_agent("a1", "One")
        self.hub.join_channel("a1", "general")
        assert self.hub.leave_channel("a1", "general") is True
