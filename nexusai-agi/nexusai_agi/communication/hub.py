"""Communication hub for multi-agent coordination."""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Callable

from nexusai_agi.core.types import Message


@dataclass
class AgentInfo:
    """Information about a registered agent."""

    agent_id: str
    name: str
    capabilities: list[str] = field(default_factory=list)
    status: str = "idle"
    registered_at: float = field(default_factory=time.time)

    def to_dict(self) -> dict[str, Any]:
        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "capabilities": self.capabilities,
            "status": self.status,
        }


@dataclass
class ChannelMessage:
    """A message sent through a communication channel."""

    sender: str
    channel: str
    content: str
    msg_type: str = "broadcast"  # broadcast, direct, request, response
    target: str | None = None
    timestamp: float = field(default_factory=time.time)
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "sender": self.sender,
            "channel": self.channel,
            "content": self.content,
            "msg_type": self.msg_type,
            "target": self.target,
            "timestamp": self.timestamp,
        }


class CommunicationHub:
    """
    Central hub for multi-agent communication.

    Features:
    - Agent registration and discovery
    - Channel-based messaging (broadcast and direct)
    - Request/response patterns
    - Message history
    """

    def __init__(self) -> None:
        self._agents: dict[str, AgentInfo] = {}
        self._channels: dict[str, list[str]] = {}  # channel -> agent_ids
        self._message_history: list[ChannelMessage] = []
        self._handlers: dict[str, Callable[[ChannelMessage], None]] = {}

    def register_agent(
        self,
        agent_id: str,
        name: str,
        capabilities: list[str] | None = None,
    ) -> AgentInfo:
        """Register an agent with the hub."""
        info = AgentInfo(
            agent_id=agent_id,
            name=name,
            capabilities=capabilities or [],
        )
        self._agents[agent_id] = info
        return info

    def unregister_agent(self, agent_id: str) -> bool:
        """Remove an agent from the hub."""
        if agent_id in self._agents:
            del self._agents[agent_id]
            # Remove from all channels
            for members in self._channels.values():
                if agent_id in members:
                    members.remove(agent_id)
            return True
        return False

    def join_channel(self, agent_id: str, channel: str) -> bool:
        """Join a communication channel."""
        if agent_id not in self._agents:
            return False
        if channel not in self._channels:
            self._channels[channel] = []
        if agent_id not in self._channels[channel]:
            self._channels[channel].append(agent_id)
        return True

    def leave_channel(self, agent_id: str, channel: str) -> bool:
        """Leave a communication channel."""
        if channel in self._channels and agent_id in self._channels[channel]:
            self._channels[channel].remove(agent_id)
            return True
        return False

    def broadcast(
        self, sender: str, channel: str, content: str, metadata: dict[str, Any] | None = None
    ) -> ChannelMessage:
        """Broadcast a message to all agents in a channel."""
        msg = ChannelMessage(
            sender=sender,
            channel=channel,
            content=content,
            msg_type="broadcast",
            metadata=metadata or {},
        )
        self._message_history.append(msg)
        self._deliver(msg)
        return msg

    def send_direct(
        self, sender: str, target: str, content: str, metadata: dict[str, Any] | None = None
    ) -> ChannelMessage:
        """Send a direct message to a specific agent."""
        msg = ChannelMessage(
            sender=sender,
            channel="direct",
            content=content,
            msg_type="direct",
            target=target,
            metadata=metadata or {},
        )
        self._message_history.append(msg)
        self._deliver(msg)
        return msg

    def request(
        self, sender: str, target: str, content: str, metadata: dict[str, Any] | None = None
    ) -> ChannelMessage:
        """Send a request to an agent expecting a response."""
        msg = ChannelMessage(
            sender=sender,
            channel="requests",
            content=content,
            msg_type="request",
            target=target,
            metadata=metadata or {},
        )
        self._message_history.append(msg)
        self._deliver(msg)
        return msg

    def on_message(self, agent_id: str, handler: Callable[[ChannelMessage], None]) -> None:
        """Register a message handler for an agent."""
        self._handlers[agent_id] = handler

    def list_agents(self) -> list[dict[str, Any]]:
        """List all registered agents."""
        return [info.to_dict() for info in self._agents.values()]

    def list_channels(self) -> list[str]:
        """List all active channels."""
        return list(self._channels.keys())

    def get_history(
        self, channel: str | None = None, limit: int = 50
    ) -> list[dict[str, Any]]:
        """Get message history, optionally filtered by channel."""
        msgs = self._message_history
        if channel:
            msgs = [m for m in msgs if m.channel == channel]
        return [m.to_dict() for m in msgs[-limit:]]

    def find_agents_by_capability(self, capability: str) -> list[AgentInfo]:
        """Find agents that have a specific capability."""
        return [
            info
            for info in self._agents.values()
            if capability in info.capabilities
        ]

    def _deliver(self, msg: ChannelMessage) -> None:
        """Deliver a message to appropriate handlers."""
        if msg.msg_type == "direct" and msg.target:
            handler = self._handlers.get(msg.target)
            if handler:
                handler(msg)
        elif msg.msg_type == "broadcast" and msg.channel in self._channels:
            for agent_id in self._channels[msg.channel]:
                if agent_id != msg.sender:
                    handler = self._handlers.get(agent_id)
                    if handler:
                        handler(msg)
        elif msg.msg_type == "request" and msg.target:
            handler = self._handlers.get(msg.target)
            if handler:
                handler(msg)
