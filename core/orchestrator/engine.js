const { v4: uuidv4 } = require('uuid');
const { OllamaClient } = require('../../agents/ollamaClient');

class OrchestratorEngine {
  constructor(db, agentManager, taskQueue, acpServer) {
    this.db = db;
    this.agentManager = agentManager;
    this.taskQueue = taskQueue;
    this.acpServer = acpServer;
    this.ollama = new OllamaClient();
    this.running = false;
    this.pollInterval = null;
  }

  start() {
    this.running = true;
    this.pollInterval = setInterval(() => this.processQueue(), 3000);
    console.log('Orchestrator engine started');
  }

  stop() {
    this.running = false;
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  enqueueTask(task) {
    this.taskQueue.enqueue(task);
  }

  async processQueue() {
    if (!this.running) return;

    const task = this.taskQueue.dequeue();
    if (!task) return;

    try {
      this.taskQueue.updateTaskStatus(task.id, 'running', '');
      this.acpServer.broadcastTaskUpdate({ ...task, status: 'running' });

      if (task.agent_id) {
        await this.executeAgentTask(task);
      } else {
        await this.autoAssignAndExecute(task);
      }
    } catch (err) {
      this.taskQueue.updateTaskStatus(task.id, 'failed', err.message);
      this.acpServer.broadcastTaskUpdate({ ...task, status: 'failed', result: err.message });
      this.agentManager.logActivity(task.agent_id, task.user_id, 'task_failed', err.message);
    }
  }

  async autoAssignAndExecute(task) {
    const typeMap = {
      tweet: 'twitter',
      post: 'twitter',
      social: 'twitter',
      research: 'research',
      analyze: 'research',
      grow: 'growth',
      engage: 'growth',
      trade: 'trading',
      market: 'trading',
    };

    let agentType = 'research';
    for (const [keyword, type] of Object.entries(typeMap)) {
      if (task.type.toLowerCase().includes(keyword) || task.description.toLowerCase().includes(keyword)) {
        agentType = type;
        break;
      }
    }

    const userAgents = this.db.prepare(
      'SELECT * FROM agents WHERE user_id = ? AND type = ? AND status != ?'
    ).all(task.user_id, agentType, 'paused');

    let agent;
    if (userAgents.length > 0) {
      agent = userAgents[0];
    } else {
      const anyAgents = this.db.prepare(
        'SELECT * FROM agents WHERE user_id = ? AND status != ?'
      ).all(task.user_id, 'paused');

      if (anyAgents.length === 0) {
        this.taskQueue.updateTaskStatus(task.id, 'failed', 'No agents available. Create an agent first.');
        return;
      }
      agent = anyAgents[0];
    }

    this.db.prepare('UPDATE tasks SET agent_id = ? WHERE id = ?').run(agent.id, task.id);
    task.agent_id = agent.id;
    await this.executeAgentTask(task);
  }

  async executeAgentTask(task) {
    const agent = this.agentManager.getAgent(task.agent_id);
    if (!agent) {
      this.taskQueue.updateTaskStatus(task.id, 'failed', 'Agent not found');
      return;
    }

    this.agentManager.setStatus(agent.id, 'active');

    const deduction = this.agentManager.deductBalance(agent.id, task.cost || 1.0, `Task: ${task.description}`);
    if (!deduction.success) {
      this.taskQueue.updateTaskStatus(task.id, 'failed', `Wallet: ${deduction.error}`);
      this.agentManager.setStatus(agent.id, 'idle');
      return;
    }

    const systemPrompt = this.buildSystemPrompt(agent);
    const userPrompt = this.buildUserPrompt(task, agent);

    this.agentManager.logActivity(agent.id, task.user_id, 'task_started', `Executing: ${task.description}`);
    this.acpServer.broadcastLog({
      id: uuidv4(), agent_id: agent.id, agent_name: agent.name,
      action: 'task_started', details: task.description
    });

    let result;
    try {
      result = await this.ollama.generate(systemPrompt, userPrompt, agent.model || 'llama3');
    } catch (err) {
      result = `[Ollama unavailable] Simulated response for "${task.description}": ` +
        `Agent ${agent.name} (${agent.type}) would process this task. ` +
        `Ensure Ollama is running at ${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'} ` +
        `with model "${agent.model || 'llama3'}" pulled.`;
    }

    this.taskQueue.updateTaskStatus(task.id, 'completed', result);
    this.agentManager.setStatus(agent.id, 'idle');

    this.agentManager.storeMemory(agent.id, `task_${task.id}`, {
      description: task.description,
      result,
      completedAt: new Date().toISOString()
    });

    this.agentManager.logActivity(agent.id, task.user_id, 'task_completed', result.substring(0, 500));
    this.acpServer.broadcastTaskUpdate({
      id: task.id, agent_id: agent.id, status: 'completed',
      description: task.description, result
    });
    this.acpServer.broadcastLog({
      id: uuidv4(), agent_id: agent.id, agent_name: agent.name,
      action: 'task_completed', details: result.substring(0, 200)
    });
  }

  buildSystemPrompt(agent) {
    const typeDescriptions = {
      twitter: 'You are a social media expert agent. You create engaging tweets, reply strategies, and social content. Respond with actionable tweet content or social media strategies.',
      research: 'You are a research analyst agent. You analyze trends, gather information, and produce insightful reports. Respond with detailed research findings.',
      growth: 'You are a growth hacking agent. You develop engagement strategies, audience growth tactics, and viral content plans. Respond with specific growth strategies.',
      trading: 'You are a market analysis agent. You analyze market conditions, identify opportunities, and provide trading insights. Respond with market analysis and recommendations.',
    };

    let prompt = typeDescriptions[agent.type] || 'You are an AI assistant agent.';
    prompt += `\n\nYour name is "${agent.name}".`;
    if (agent.personality) {
      prompt += `\nYour personality: ${agent.personality}`;
    }
    prompt += '\n\nProvide concise, actionable responses. Do not use markdown formatting.';
    return prompt;
  }

  buildUserPrompt(task, agent) {
    let prompt = `Task: ${task.description}`;
    if (task.type) prompt += `\nTask type: ${task.type}`;
    if (agent.twitter_handle) prompt += `\nTwitter handle: @${agent.twitter_handle}`;
    return prompt;
  }
}

module.exports = { OrchestratorEngine };
