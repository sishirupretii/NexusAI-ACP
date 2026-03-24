const { OllamaClient } = require('./ollamaClient');

class TradingAgent {
  constructor(agentConfig, agentManager) {
    this.config = agentConfig;
    this.manager = agentManager;
    this.ollama = new OllamaClient();
  }

  async analyzeMarket(asset) {
    const systemPrompt = `You are ${this.config.name}, a market analyst. ` +
      `${this.config.personality || 'You provide balanced, risk-aware market analysis.'}` +
      `\nProvide analysis with bull/bear cases and risk assessment. This is for educational purposes only, not financial advice.`;

    return this.ollama.generate(systemPrompt, `Analyze the market outlook for: ${asset}`, this.config.model);
  }

  async identifyOpportunities(sector) {
    const systemPrompt = `You are ${this.config.name}, a market opportunity scout. Educational analysis only.`;
    const prompt = `Identify potential opportunities in the ${sector} sector. Include risk factors.`;
    return this.ollama.generate(systemPrompt, prompt, this.config.model);
  }
}

module.exports = { TradingAgent };
