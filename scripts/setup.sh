#!/bin/bash
# NexusAI ACP - Setup Script (Linux/Mac)

set -e

echo "========================================"
echo "  NexusAI ACP - Setup & Launch Script"
echo "========================================"
echo ""

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js not found. Install from https://nodejs.org/"
    exit 1
fi
echo "[OK] Node.js $(node --version) found"

# Check Ollama
echo ""
echo "Checking Ollama..."
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "[OK] Ollama is running"
else
    echo "[WARN] Ollama not detected at localhost:11434"
    echo "  Install: https://ollama.com/download"
    echo "  Run: ollama serve"
    echo "  Pull model: ollama pull llama3"
fi

# Create .env
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
    echo "[OK] Created .env from .env.example"
fi

# Install deps
echo ""
echo "Installing backend dependencies..."
cd "$PROJECT_ROOT/backend" && npm install

echo ""
echo "Installing frontend dependencies..."
cd "$PROJECT_ROOT/frontend" && npm install

cd "$PROJECT_ROOT"

echo ""
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "To run:"
echo "  Terminal 1: cd backend && node server.js"
echo "  Terminal 2: cd frontend && npm start"
echo ""
echo "Backend: http://localhost:4000"
echo "Frontend: http://localhost:3000"
