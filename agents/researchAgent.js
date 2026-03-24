const { OllamaClient } = require('./ollamaClient');

class ResearchAgent {
  constructor(agentConfig, agentManager) {
    this.config = agentConfig;
    this.manager = agentManager;
    this.ollama = new OllamaClient();
  }

  async analyzeTrend(topic) {
    const systemPrompt = `You are ${this.config.name}, a research analyst. ` +
      `${this.config.personality || 'You provide thorough, data-driven analysis.'}` +
      `\nProvide structured analysis with key findings and actionable insights.`;

    return this.ollama.generate(systemPrompt, `Analyze the current trend: ${topic}`, this.config.model);
  }

  async summarizeInfo(content) {
    const systemPrompt = `You are ${this.config.name}, a research summarizer. Create concise, informative summaries.`;
    return this.ollama.generate(systemPrompt, `Summarize the following:\n${content}`, this.config.model);
  }

  async compareTopics(topicA, topicB) {
    const systemPrompt = `You are ${this.config.name}, a comparative analyst. Provide balanced, detailed comparisons.`;
    const prompt = `Compare and contrast:\nA: ${topicA}\nB: ${topicB}\nProvide a structured comparison.`;

    return this.ollama.generate(systemPrompt, prompt, this.config.model);
  }
}

module.exports = { ResearchAgent };
