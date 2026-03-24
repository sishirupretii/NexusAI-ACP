const { OllamaClient } = require('./ollamaClient');

class TwitterAgent {
  constructor(agentConfig, agentManager) {
    this.config = agentConfig;
    this.manager = agentManager;
    this.ollama = new OllamaClient();
  }

  async composeTweet(topic) {
    const systemPrompt = `You are ${this.config.name}, a Twitter content creator. ` +
      `${this.config.personality || 'You write engaging, concise tweets.'}` +
      `\nWrite a single tweet (max 280 chars). No quotes, no hashtag spam. Be authentic.`;

    const result = await this.ollama.generate(systemPrompt, `Write a tweet about: ${topic}`, this.config.model);
    return result.substring(0, 280);
  }

  async composeReply(originalTweet, context) {
    const systemPrompt = `You are ${this.config.name}. Write a reply tweet (max 280 chars). Be conversational and relevant.`;
    const prompt = `Original tweet: "${originalTweet}"\nContext: ${context || 'general engagement'}\nWrite a reply:`;

    const result = await this.ollama.generate(systemPrompt, prompt, this.config.model);
    return result.substring(0, 280);
  }

  async planContentStrategy(goals) {
    const systemPrompt = `You are ${this.config.name}, a social media strategist. Create a content plan.`;
    const prompt = `Goals: ${goals}\nCreate a 7-day content strategy with specific tweet ideas for each day.`;

    return this.ollama.generate(systemPrompt, prompt, this.config.model);
  }
}

module.exports = { TwitterAgent };
