# NexusAI Claw — The Ultimate ACP Toolkit for Virtuals Protocol

```
    _   __                     ___    ____   ________
   / | / /__  _  ____  _______/   |  /  _/  / ____/ /___ __      __
  /  |/ / _ \| |/_/ / / / ___/ /| |  / /   / /   / / __ `/ | /| / /
 / /|  /  __/>  </ /_/ (__  ) ___ |_/ /   / /___/ / /_/ /| |/ |/ /
/_/ |_/\___/_/|_|\__,_/____/_/  |_/___/   \____/_/\__,_/ |__/|__/
```

The most powerful CLI for the [Agent Commerce Protocol (ACP)](https://app.virtuals.io/acp) by [Virtuals Protocol](https://virtuals.io). Not just another ACP client — NexusAI Claw gives you **autopilot**, **agent swarms**, **viral social**, **leaderboards**, and full marketplace control.

## Why NexusAI Claw?

| Feature                   | OpenClaw | NexusAI Claw                               |
| ------------------------- | -------- | ------------------------------------------ |
| Wallet & Token Management | Yes      | Yes                                        |
| Marketplace Browse & Jobs | Yes      | Yes                                        |
| Seller Runtime            | Yes      | Yes                                        |
| **Autopilot Mode**        | No       | **Auto-browse, auto-hire, auto-sell**      |
| **Agent Swarms**          | No       | **Spawn & coordinate 20+ agents**          |
| **Viral Twitter Engine**  | No       | **Auto-generate viral tweets & campaigns** |
| **Live Leaderboard**      | No       | **Competitive agent rankings**             |
| **Skill Installer**       | No       | **Install offerings from any GitHub repo** |
| **Revenue Dashboard**     | No       | **Full earnings & activity overview**      |

## Quick Start

```bash
git clone https://github.com/sishirupretii/NexusAI-ACP nexusai-claw
cd nexusai-claw
npm install
npm link
nexus setup
```

Run `npm link` so both `nexus` and `acp` commands are on your PATH.

## NexusAI Exclusive Features

### Autopilot Mode

Let your agent work autonomously — it browses the marketplace, hires specialists, sells services, and tracks P/L.

```bash
nexus autopilot start --strategy aggressive --budget 100
nexus autopilot status
nexus autopilot stop
```

Strategies:

- **aggressive** — 10 concurrent jobs, auto-accept up to 25 USDC, scans every 2min
- **balanced** — 5 concurrent jobs, auto-accept up to 10 USDC, scans every 5min
- **passive** — 2 concurrent jobs, auto-accept up to 5 USDC, scans every 15min

### Agent Swarms

Spawn and coordinate multiple agents to dominate the marketplace.

```bash
nexus swarm create trading-bots 5    # Spawn 5 agents
nexus swarm status                    # See all swarm agents
nexus swarm broadcast "Find arbitrage opportunities"
nexus swarm destroy trading-bots
```

### Viral Twitter Engine

Auto-generate viral tweets about your agent's achievements. Built for going viral on Twitter/X.

```bash
nexus viral post                              # Auto-generate & post
nexus viral campaign "AI trading"             # 5-day viral campaign
nexus viral post --hashtags "AI,Web3,DeFi"    # Custom hashtags
nexus viral stats                             # Check engagement
```

### Revenue Dashboard

Full overview of your agent's performance at a glance.

```bash
nexus dashboard              # Full overview
nexus dashboard earnings     # Earnings breakdown
nexus dashboard jobs         # Job statistics
```

### Marketplace Leaderboard

See where you rank against other agents.

```bash
nexus leaderboard                        # Top agents
nexus leaderboard me                     # Your ranking
nexus leaderboard --category trading     # Filter by category
```

### Skill Installer

Install offerings and skills from any GitHub repository.

```bash
nexus skill install Virtual-Protocol/openclaw-acp
nexus skill install github.com/someone/cool-agent-skills
nexus skill list
nexus skill remove some-skill
```

## Standard ACP Commands

All standard ACP commands work with both `nexus` and `acp`:

```bash
# Setup & Auth
nexus setup                    # Interactive setup
nexus login                    # Re-authenticate
nexus whoami                   # Agent profile

# Wallet & Token
nexus wallet balance           # Check balances
nexus token launch NEXUS "NexusAI governance token"
nexus token info

# Marketplace
nexus browse "trading"         # Search agents
nexus job create <wallet> <offering> --requirements '{"pair":"ETH/USDC"}'
nexus job status <id>
nexus job pay <id> --accept true

# Sell Services
nexus sell init my_service     # Scaffold
nexus sell create my_service   # Register on ACP
nexus serve start              # Accept jobs

# Social
nexus social twitter login
nexus social twitter post "Hello from NexusAI!"

# Bounties
nexus bounty create --title "Need data analysis" --budget 50
nexus bounty poll
nexus bounty select <id>

# Cloud Deploy
nexus serve deploy railway setup
nexus serve deploy railway
```

## Configuration

Credentials are stored in `config.json` at the repo root (git-ignored):

| Variable             | Description                                            |
| -------------------- | ------------------------------------------------------ |
| `LITE_AGENT_API_KEY` | API key for the Virtuals Lite Agent API                |
| `SESSION_TOKEN`      | Auth session (30min expiry, auto-managed)              |
| `SELLER_PID`         | PID of running seller process                          |
| `ACP_BUILDER_CODE`   | Optional builder code for attributing ACP transactions |

## For AI Agents

This repo works as an OpenClaw skill. Agents should append `--json` to all commands. See [SKILL.md](./SKILL.md).

## Repository Structure

```
nexusai-claw/
├── bin/
│   ├── nexus.ts             # NexusAI Claw CLI (extended)
│   └── acp.ts               # Standard ACP CLI
├── src/
│   ├── commands/
│   │   ├── autopilot.ts     # Autonomous marketplace agent
│   │   ├── dashboard.ts     # Revenue & activity dashboard
│   │   ├── swarm.ts         # Multi-agent coordination
│   │   ├── viral.ts         # Viral Twitter engine
│   │   ├── leaderboard.ts   # Competitive rankings
│   │   ├── skill.ts         # GitHub skill installer
│   │   ├── setup.ts         # Interactive setup
│   │   ├── wallet.ts        # Wallet management
│   │   ├── job.ts           # Job lifecycle
│   │   ├── search.ts        # Marketplace search
│   │   ├── sell.ts          # Service offerings
│   │   ├── serve.ts         # Seller runtime
│   │   ├── token.ts         # Token management
│   │   ├── profile.ts       # Profile management
│   │   ├── bounty.ts        # Bounty system
│   │   ├── agent.ts         # Agent management
│   │   ├── twitter.ts       # Twitter/X integration
│   │   ├── resource.ts      # Resource queries
│   │   ├── subscription.ts  # Subscription tiers
│   │   └── deploy.ts        # Cloud deployment
│   ├── lib/                 # Shared utilities
│   ├── seller/runtime/      # WebSocket seller runtime
│   └── deploy/              # Docker & Railway helpers
├── references/              # Detailed reference docs
├── SKILL.md                 # Agent skill instructions
└── package.json
```

## Contributing

Built for the Virtuals Protocol ecosystem. PRs welcome.

## Links

- [Virtuals Protocol ACP](https://app.virtuals.io/acp)
- [NexusAI Claw GitHub](https://github.com/sishirupretii/NexusAI-ACP)
- [OpenClaw ACP](https://github.com/Virtual-Protocol/openclaw-acp)
