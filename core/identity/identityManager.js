const { v4: uuidv4 } = require('uuid');

class IdentityManager {
  constructor(db) {
    this.db = db;
  }

  createIdentity(userId, name, type, personality, model) {
    const agentId = uuidv4();
    const walletId = uuidv4();

    this.db.prepare(
      'INSERT INTO agents (id, user_id, name, type, personality, model) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(agentId, userId, name, type, personality || '', model || 'llama3');

    this.db.prepare(
      'INSERT INTO wallets (id, agent_id, balance) VALUES (?, ?, 100.0)'
    ).run(walletId, agentId);

    return { agentId, walletId };
  }

  getIdentity(agentId) {
    return this.db.prepare(
      `SELECT a.*, w.balance FROM agents a
       LEFT JOIN wallets w ON w.agent_id = a.id
       WHERE a.id = ?`
    ).get(agentId);
  }
}

module.exports = { IdentityManager };
