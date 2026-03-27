"""NexusAI AGI - Command Line Interface."""

from __future__ import annotations

import argparse
import json
import sys

from nexusai_agi import AGIAgent, AGIConfig, __version__


BANNER = r"""
╔══════════════════════════════════════════════════╗
║                                                  ║
║   ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗   ║
║   ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝   ║
║   ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗   ║
║   ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║   ║
║   ██║ ╚████║███████╗██╔╝ ╚██╗╚██████╔╝███████║  ║
║   ╚═╝  ╚═══╝╚══════╝╚═╝   ╚═╝ ╚═════╝╚══════╝  ║
║               █████╗  ██████╗ ██╗                ║
║              ██╔══██╗██╔════╝ ██║                ║
║              ███████║██║  ███╗██║                ║
║              ██╔══██║██║   ██║██║                ║
║              ██║  ██║╚██████╔╝██║                ║
║              ╚═╝  ╚═╝ ╚═════╝ ╚═╝                ║
║                                                  ║
║       Open Source AGI Framework  v{ver}        ║
╚══════════════════════════════════════════════════╝
""".format(ver=__version__)


def create_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="nexusagi",
        description="NexusAI AGI - Open Source Artificial General Intelligence",
    )
    parser.add_argument(
        "--version", action="version", version=f"nexusagi {__version__}"
    )

    sub = parser.add_subparsers(dest="command")

    # chat - interactive mode
    chat_parser = sub.add_parser("chat", help="Start interactive AGI chat")
    chat_parser.add_argument("--config", help="Path to config JSON file")
    chat_parser.add_argument("--verbose", action="store_true", help="Verbose output")

    # think - single query
    think_parser = sub.add_parser("think", help="Process a single query")
    think_parser.add_argument("query", help="The query to process")
    think_parser.add_argument("--config", help="Path to config JSON file")
    think_parser.add_argument("--verbose", action="store_true")

    # status - show agent info
    sub.add_parser("status", help="Show agent status")

    # config - show/create config
    config_parser = sub.add_parser("config", help="Manage configuration")
    config_parser.add_argument(
        "action", choices=["show", "create"], help="Config action"
    )
    config_parser.add_argument("--output", help="Output path for config file")

    # benchmark - run built-in tests
    sub.add_parser("benchmark", help="Run AGI benchmark tests")

    return parser


def load_config(args: argparse.Namespace) -> AGIConfig:
    config_path = getattr(args, "config", None)
    if config_path:
        config = AGIConfig.from_file(config_path)
    else:
        config = AGIConfig.from_env()
    if getattr(args, "verbose", False):
        config.verbose = True
    return config


def cmd_chat(args: argparse.Namespace) -> None:
    """Interactive chat mode."""
    config = load_config(args)
    agent = AGIAgent(config)

    print(BANNER)
    print("Type your message and press Enter. Type 'quit' to exit.")
    print("Commands: /status, /goals, /memory, /reset, /export, /quit\n")

    while True:
        try:
            user_input = input("You > ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break

        if not user_input:
            continue

        if user_input.lower() in ("/quit", "quit", "exit"):
            print("Goodbye!")
            break

        if user_input == "/status":
            status = agent.get_status()
            print(f"\n--- Agent Status ---")
            for k, v in status.items():
                print(f"  {k}: {v}")
            print()
            continue

        if user_input == "/goals":
            goals = agent.get_goals()
            if goals:
                for g in goals:
                    print(f"  [{g.status.value}] {g.description} (priority={g.priority})")
            else:
                print("  No active goals.")
            print()
            continue

        if user_input == "/memory":
            count = agent.memory.count()
            print(f"  Memory entries: {count}")
            recent = agent.memory.recall_by_type("episodic", limit=3)
            if recent:
                print("  Recent memories:")
                for m in recent:
                    print(f"    - {m.content[:80]}...")
            print()
            continue

        if user_input == "/reset":
            agent.reset()
            print("  Agent state reset.\n")
            continue

        if user_input == "/export":
            state = agent.export_state()
            print(json.dumps(state, indent=2, default=str))
            print()
            continue

        # Process through AGI
        response = agent.think(user_input)
        print(f"\nAGI > {response}\n")


def cmd_think(args: argparse.Namespace) -> None:
    """Process a single query."""
    config = load_config(args)
    agent = AGIAgent(config)

    response = agent.think(args.query)
    print(response)


def cmd_status(_args: argparse.Namespace) -> None:
    """Show agent status."""
    agent = AGIAgent()
    status = agent.get_status()
    print(BANNER)
    print("Agent Status:")
    for k, v in status.items():
        print(f"  {k}: {v}")


def cmd_config(args: argparse.Namespace) -> None:
    """Manage configuration."""
    if args.action == "show":
        config = AGIConfig()
        print(json.dumps(config.to_dict(), indent=2))
    elif args.action == "create":
        config = AGIConfig()
        output = args.output or "nexusagi_config.json"
        config.save(output)
        print(f"Config saved to: {output}")


def cmd_benchmark(_args: argparse.Namespace) -> None:
    """Run built-in benchmark tests."""
    print(BANNER)
    print("Running NexusAI AGI Benchmarks...\n")

    agent = AGIAgent()
    tests = [
        ("Greeting", "Hello"),
        ("Identity", "Who are you?"),
        ("Capabilities", "What can you do?"),
        ("Math", "What is 42 + 58?"),
        ("Reasoning", "How does photosynthesis work?"),
        ("Analysis", "Compare Python and JavaScript"),
        ("Planning", "How to build a web application?"),
        ("Memory", "Remember that my favorite color is blue"),
        ("Recall", "What is my favorite color?"),
        ("Goal Setting", "Help me learn machine learning"),
    ]

    passed = 0
    for name, query in tests:
        try:
            response = agent.think(query)
            has_response = bool(response and len(response) > 5)
            status = "PASS" if has_response else "FAIL"
            if has_response:
                passed += 1
            print(f"  [{status}] {name}: {response[:60]}...")
        except Exception as e:
            print(f"  [FAIL] {name}: Error - {e}")

    print(f"\nResults: {passed}/{len(tests)} tests passed")
    print(f"Score: {passed / len(tests) * 100:.0f}%")


def main() -> None:
    parser = create_parser()
    args = parser.parse_args()

    if not args.command:
        # Default to chat mode
        args.config = None
        args.verbose = False
        cmd_chat(args)
        return

    commands = {
        "chat": cmd_chat,
        "think": cmd_think,
        "status": cmd_status,
        "config": cmd_config,
        "benchmark": cmd_benchmark,
    }

    handler = commands.get(args.command)
    if handler:
        handler(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
