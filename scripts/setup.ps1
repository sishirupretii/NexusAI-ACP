# NexusAI ACP - Full Setup Script (PowerShell)
# This script sets up and runs the entire NexusAI ACP platform

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  NexusAI ACP - Setup & Launch Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check for Node.js
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js $nodeVersion found" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js not found. Install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check for Ollama
Write-Host ""
Write-Host "Checking Ollama..." -ForegroundColor Yellow
try {
    $ollamaResponse = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 5
    Write-Host "[OK] Ollama is running" -ForegroundColor Green
    $models = $ollamaResponse.models | ForEach-Object { $_.name }
    Write-Host "  Available models: $($models -join ', ')" -ForegroundColor Gray
} catch {
    Write-Host "[WARN] Ollama not detected at localhost:11434" -ForegroundColor Yellow
    Write-Host "  To set up Ollama:" -ForegroundColor Yellow
    Write-Host "    1. Install: https://ollama.com/download" -ForegroundColor Gray
    Write-Host "    2. Run: ollama serve" -ForegroundColor Gray
    Write-Host "    3. Pull a model: ollama pull llama3" -ForegroundColor Gray
    Write-Host "  The system will still work but agent reasoning will use fallback responses." -ForegroundColor Yellow
}

# Create .env from example if not exists
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path "$projectRoot\.env")) {
    Copy-Item "$projectRoot\.env.example" "$projectRoot\.env"
    Write-Host ""
    Write-Host "[OK] Created .env file from .env.example" -ForegroundColor Green
}

# Install backend dependencies
Write-Host ""
Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
Set-Location "$projectRoot\backend"
npm install
Write-Host "[OK] Backend dependencies installed" -ForegroundColor Green

# Install frontend dependencies
Write-Host ""
Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location "$projectRoot\frontend"
npm install
Write-Host "[OK] Frontend dependencies installed" -ForegroundColor Green

Set-Location $projectRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To run the system:" -ForegroundColor Yellow
Write-Host "  Terminal 1: cd backend && node server.js" -ForegroundColor Gray
Write-Host "  Terminal 2: cd frontend && npm start" -ForegroundColor Gray
Write-Host ""
Write-Host "Backend: http://localhost:4000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""

# Start backend in background, frontend in foreground
Write-Host "Starting backend server..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:projectRoot\backend
    node server.js
}
Start-Sleep -Seconds 2

Write-Host "Starting frontend..." -ForegroundColor Yellow
Set-Location "$projectRoot\frontend"
$env:BROWSER = "none"
npm start
