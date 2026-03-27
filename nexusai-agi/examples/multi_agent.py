"""Multi-agent communication example."""

from nexusai_agi import AGIAgent, AGIConfig
from nexusai_agi.communication.hub import CommunicationHub


def main():
    print("=== NexusAI AGI Multi-Agent Example ===\n")

    # Create communication hub
    hub = CommunicationHub()

    # Create two agents
    agent1 = AGIAgent(AGIConfig(name="Researcher"))
    agent2 = AGIAgent(AGIConfig(name="Planner"))

    # Register with hub
    hub.register_agent("researcher", "Researcher", ["reasoning", "memory"])
    hub.register_agent("planner", "Planner", ["planning", "tools"])

    # Join a channel
    hub.join_channel("researcher", "project")
    hub.join_channel("planner", "project")

    # Set up message handlers
    messages_received = []

    def on_planner_msg(msg):
        messages_received.append(msg)
        print(f"  Planner received: {msg.content}")

    hub.on_message("planner", on_planner_msg)

    # Agent 1 broadcasts research findings
    print("1. Researcher broadcasts findings:")
    hub.broadcast("researcher", "project", "Found 3 key approaches for the task")

    # Direct message
    print("\n2. Researcher sends direct request to Planner:")
    hub.send_direct("researcher", "planner", "Can you create a plan for approach #1?")

    # Show hub status
    print(f"\n3. Hub Status:")
    print(f"   Agents: {len(hub.list_agents())}")
    print(f"   Channels: {hub.list_channels()}")
    print(f"   Messages received by planner: {len(messages_received)}")

    # Find agents by capability
    print("\n4. Finding agents with 'reasoning' capability:")
    found = hub.find_agents_by_capability("reasoning")
    for a in found:
        print(f"   - {a.name} ({a.agent_id})")


if __name__ == "__main__":
    main()
