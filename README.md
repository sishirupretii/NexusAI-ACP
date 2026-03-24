# NexusAI ACP - Autonomous Coordination Protocol

A full-stack autonomous AI agent platform powered by local LLMs (Ollama). Launch, manage, and coordinate multiple AI agents with unique identities, wallets, and social capabilities.

## Features

- **Multi-Agent System**: Create Twitter, Research, Growth, and Trading agents
- **ACP Protocol**: WebSocket-based agent-to-agent communication
- **Ollama Integration**: All reasoning powered by local LLMs
- **Agent Identity**: Unique IDs, personalities, memory storage
- **Wallet System**: Internal token ledger with pay-per-task
- **Social Integration**: Twitter/X API structure (env-based keys)
- **Modern Dashboard**: React UI for agent management

## Prerequisites

- **Node.js** 18+ - [Download](https://nodejs.org/)
- **Ollama** - [Download](https://ollama.com/download)

## Ollama Setup

```bash
# Install Ollama (visit https://ollama.com/download)

# Start the Ollama server
ollama serve

# Pull a model (in a separate terminal)
ollama pull llama3

# Verify it works
curl http://localhost:11434/api/tags
```

## Quick Start

### Option 1: Setup Script

**PowerShell (Windows):**
```powershell
cd scripts
.\setup.ps1
```

**Bash (Linux/Mac):**
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### Option 2: Manual Setup

```bash
# Clone the repo
git clone <your-repo-url>
cd nexusai-acp

# Copy environment file
cp .env.example .env

# Install backend
cd backend
npm install

# Install frontend
cd ../frontend
npm install
```

## Running

```bash
# Terminal 1 - Backend (from project root)
cd backend
node server.js

# Terminal 2 - Frontend (from project root)
cd frontend
npm start
```

- **Backend API**: http://localhost:4000
- **Frontend UI**: http://localhost:3000
- **WebSocket ACP**: ws://localhost:4000/acp

## Usage

1. Open http://localhost:3000
2. Register a new account
3. Create an agent (Twitter, Research, Growth, or Trading)
4. Assign tasks to your agents
5. Watch agents process tasks via Ollama
6. View activity logs and wallet transactions

## Project Structure

```
nexusai-acp/
├── backend/           # Express.js API server
│   ├── routes/        # REST API endpoints
│   ├── services/      # Agent manager, task queue
│   ├── models/        # SQLite database schema
│   ├── middleware/     # JWT auth middleware
│   └── server.js      # Entry point
├── frontend/          # React dashboard
│   └── src/
│       ├── pages/     # Dashboard, Create Agent, Tasks, Logs
│       ├── components/# Navbar, shared components
│       ├── services/  # API client, WebSocket
│       └── styles/    # Global CSS
├── core/              # Core platform modules
│   ├── acp/           # WebSocket ACP server & protocol
│   ├── orchestrator/  # Task orchestration engine
│   └── identity/      # Agent identity manager
├── agents/            # Agent implementations
│   ├── ollamaClient.js
│   ├── twitterAgent.js
│   ├── researchAgent.js
│   ├── growthAgent.js
│   └── tradingAgent.js
├── config/            # Configuration
├── scripts/           # Setup scripts
└── .env.example       # Environment template
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Sign in |
| GET | /api/auth/me | Get current user |
| GET | /api/agents | List agents |
| POST | /api/agents | Create agent |
| GET | /api/agents/:id | Get agent detail |
| PATCH | /api/agents/:id/status | Update status |
| DELETE | /api/agents/:id | Delete agent |
| GET | /api/tasks | List tasks |
| POST | /api/tasks | Create task |
| GET | /api/wallet/:agentId | Get wallet info |
| GET | /api/logs | Get activity logs |

## Environment Variables

See `.env.example` for all configuration options.

## License

MIT
