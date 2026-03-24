require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const http = require('http');
const { initDB } = require('./models/database');
const { ACPServer } = require('../core/acp/server');
const { OrchestratorEngine } = require('../core/orchestrator/engine');
const { AgentManager } = require('./services/agentManager');
const { TaskQueue } = require('./services/taskQueue');
const authRoutes = require('./routes/auth');
const agentRoutes = require('./routes/agents');
const taskRoutes = require('./routes/tasks');
const walletRoutes = require('./routes/wallet');
const logRoutes = require('./routes/logs');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const db = initDB();

const taskQueue = new TaskQueue(db);
const agentManager = new AgentManager(db);
const acpServer = new ACPServer(server, db, agentManager);
const orchestrator = new OrchestratorEngine(db, agentManager, taskQueue, acpServer);

app.use((req, _res, next) => {
  req.db = db;
  req.agentManager = agentManager;
  req.taskQueue = taskQueue;
  req.orchestrator = orchestrator;
  req.acpServer = acpServer;
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/logs', logRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 4000;

orchestrator.start();

server.listen(PORT, () => {
  console.log(`NexusAI ACP Backend running on port ${PORT}`);
  console.log(`WebSocket ACP server ready`);
});
