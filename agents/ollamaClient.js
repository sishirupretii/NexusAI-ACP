const http = require('http');

class OllamaClient {
  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  }

  async generate(systemPrompt, userPrompt, model) {
    const url = new URL('/api/generate', this.baseUrl);
    const body = JSON.stringify({
      model: model || process.env.OLLAMA_MODEL || 'llama3',
      prompt: userPrompt,
      system: systemPrompt,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 512
      }
    });

    return new Promise((resolve, reject) => {
      const req = http.request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeout: 120000
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.response) {
              resolve(parsed.response.trim());
            } else if (parsed.error) {
              reject(new Error(`Ollama error: ${parsed.error}`));
            } else {
              resolve(data.trim());
            }
          } catch {
            reject(new Error(`Failed to parse Ollama response: ${data.substring(0, 200)}`));
          }
        });
      });

      req.on('error', (err) => {
        reject(new Error(`Ollama connection failed: ${err.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Ollama request timed out'));
      });

      req.write(body);
      req.end();
    });
  }

  async chat(messages, model) {
    const url = new URL('/api/chat', this.baseUrl);
    const body = JSON.stringify({
      model: model || process.env.OLLAMA_MODEL || 'llama3',
      messages,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 512
      }
    });

    return new Promise((resolve, reject) => {
      const req = http.request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeout: 120000
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.message?.content?.trim() || data.trim());
          } catch {
            reject(new Error(`Failed to parse Ollama chat response`));
          }
        });
      });

      req.on('error', (err) => reject(new Error(`Ollama connection failed: ${err.message}`)));
      req.on('timeout', () => { req.destroy(); reject(new Error('Ollama request timed out')); });
      req.write(body);
      req.end();
    });
  }

  async isAvailable() {
    const url = new URL('/api/tags', this.baseUrl);
    return new Promise((resolve) => {
      const req = http.request(url, { method: 'GET', timeout: 5000 }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ available: true, models: parsed.models?.map(m => m.name) || [] });
          } catch {
            resolve({ available: false, models: [] });
          }
        });
      });
      req.on('error', () => resolve({ available: false, models: [] }));
      req.on('timeout', () => { req.destroy(); resolve({ available: false, models: [] }); });
      req.end();
    });
  }
}

module.exports = { OllamaClient };
