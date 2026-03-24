const { OllamaClient } = require('./ollamaClient');

class GrowthAgent {
  constructor(agentConfig, agentManager) {
    this.config = agentConfig;
    this.manager = agentManager;
    this.ollama = new OllamaClient();
  }

  async createGrowthPlan(targetAudience, currentMetrics) {
    const systemPrompt = `You are ${this.config.name}, a growth strategist. ` +
      `${this.config.personality || 'You specialize in audience growth and engagement.'}` +
      `\nProvide specific, actionable growth strategies.`;

    const prompt = `Target audience: ${targetAudience}\nCurrent metrics: ${currentMetrics || 'Starting from scratch'}\nCreate a detailed growth plan.`;
    return this.ollama.generate(systemPrompt, prompt, this.config.model);
  }

  async suggestEngagementTactics(niche) {
    const systemPrompt = `You are ${this.config.name}, an engagement specialist.`;
    const prompt = `Suggest 10 engagement tactics for the ${niche} niche. Be specific and actionable.`;
    return this.ollama.generate(systemPrompt, prompt, this.config.model);
  }
}

module.exports = { GrowthAgent };
