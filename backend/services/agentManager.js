const { v4: uuidv4 } = require('uuid');

class AgentManager {
  constructor(db) {
    this.db = db;
    this.activeAgents = new Map();
  }

  registerAgent(agentId) {
    this.activeAgents.set(agentId, { id: agentId, startedAt: new Date().toISOString() });
  }

  unregisterAgent(agentId) {
    this.activeAgents.delete(agentId);
  }

  isActive(agentId) {
    return this.activeAgents.has(agentId);
  }

  getAgent(agentId) {
    return this.db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
  }

  getAgentsByUser(userId) {
    return this.db.prepare('SELECT * FROM agents WHERE user_id = ?').all(userId);
  }

  getAgentsByType(type) {
    return this.db.prepare('SELECT * FROM agents WHERE type = ? AND status != ?').all(type, 'paused');
  }

  setStatus(agentId, status) {
    this.db.prepare('UPDATE agents SET status = ? WHERE id = ?').run(status, agentId);
  }

  storeMemory(agentId, key, value) {
    const existing = this.db.prepare('SELECT id FROM agent_memory WHERE agent_id = ? AND key = ?').get(agentId, key);
    if (existing) {
      this.db.prepare('UPDATE agent_memory SET value = ? WHERE id = ?').run(JSON.stringify(value), existing.id);
    } else {
      this.db.prepare('INSERT INTO agent_memory (id, agent_id, key, value) VALUES (?, ?, ?, ?)')
        .run(uuidv4(), agentId, key, JSON.stringify(value));
    }
  }

  getMemory(agentId, key) {
    const row = this.db.prepare('SELECT value FROM agent_memory WHERE agent_id = ? AND key = ?').get(agentId, key);
    if (!row) return null;
    try { return JSON.parse(row.value); } catch { return row.value; }
  }

  logActivity(agentId, userId, action, details) {
    this.db.prepare('INSERT INTO activity_logs (id, agent_id, user_id, action, details) VALUES (?, ?, ?, ?, ?)')
      .run(uuidv4(), agentId, userId, action, details);
  }

  deductBalance(agentId, amount, description) {
    const wallet = this.db.prepare('SELECT * FROM wallets WHERE agent_id = ?').get(agentId);
    if (!wallet) return { success: false, error: 'No wallet' };
    if (wallet.balance < amount) return { success: false, error: 'Insufficient balance' };

    this.db.prepare('UPDATE wallets SET balance = balance - ? WHERE id = ?').run(amount, wallet.id);
    this.db.prepare('INSERT INTO transactions (id, wallet_id, amount, type, description) VALUES (?, ?, ?, ?, ?)')
      .run(uuidv4(), wallet.id, amount, 'debit', description);

    return { success: true, newBalance: wallet.balance - amount };
  }

  creditBalance(agentId, amount, description) {
    const wallet = this.db.prepare('SELECT * FROM wallets WHERE agent_id = ?').get(agentId);
    if (!wallet) return { success: false, error: 'No wallet' };

    this.db.prepare('UPDATE wallets SET balance = balance + ? WHERE id = ?').run(amount, wallet.id);
    this.db.prepare('INSERT INTO transactions (id, wallet_id, amount, type, description) VALUES (?, ?, ?, ?, ?)')
      .run(uuidv4(), wallet.id, amount, 'credit', description);

    return { success: true, newBalance: wallet.balance + amount };
  }
}

module.exports = { AgentManager };
