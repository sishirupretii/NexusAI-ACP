"""Basic usage example for NexusAI AGI."""

from nexusai_agi import AGIAgent, AGIConfig


def main():
    # Create agent with default config
    agent = AGIAgent()

    print("=== NexusAI AGI Basic Usage ===\n")

    # Simple greeting
    print("1. Greeting:")
    response = agent.think("Hello!")
    print(f"   {response}\n")

    # Identity
    print("2. Identity:")
    response = agent.think("Who are you?")
    print(f"   {response}\n")

    # Math
    print("3. Math:")
    response = agent.think("What is 42 * 7?")
    print(f"   {response}\n")

    # Reasoning
    print("4. Reasoning:")
    response = agent.think("How does machine learning work?")
    print(f"   {response}\n")

    # Planning
    print("5. Planning:")
    response = agent.think("How to build a web application?")
    print(f"   {response}\n")

    # Goal setting
    print("6. Goal Setting:")
    goal = agent.set_goal("Learn about AI safety", priority=2)
    print(f"   Goal set: {goal.description} (id={goal.id})\n")

    # Status
    print("7. Agent Status:")
    status = agent.get_status()
    for k, v in status.items():
        print(f"   {k}: {v}")


if __name__ == "__main__":
    main()
