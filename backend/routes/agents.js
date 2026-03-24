const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

router.post('/', (req, res) => {
  const { name, type, personality, model, twitterHandle } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type are required' });
  }

  const validTypes = ['twitter', 'research', 'growth', 'trading'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `Type must be one of: ${validTypes.join(', ')}` });
  }

  const agentId = uuidv4();
  const walletId = uuidv4();

  const insertAgent = req.db.prepare(
    'INSERT INTO agents (id, user_id, name, type, personality, model, twitter_handle) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const insertWallet = req.db.prepare(
    'INSERT INTO wallets (id, agent_id, balance) VALUES (?, ?, ?)'
  );
  const insertTx = req.db.prepare(
    'INSERT INTO transactions (id, wallet_id, amount, type, description) VALUES (?, ?, ?, ?, ?)'
  );
  const insertLog = req.db.prepare(
    'INSERT INTO activity_logs (id, agent_id, user_id, action, details) VALUES (?, ?, ?, ?, ?)'
  );

  const txn = req.db.transaction(() => {
    insertAgent.run(agentId, 'public', name, type, personality || '', model || 'llama3', twitterHandle || '');
    insertWallet.run(walletId, agentId, 100.0);
    insertTx.run(uuidv4(), walletId, 100.0, 'credit', 'Initial agent balance');
    insertLog.run(uuidv4(), agentId, 'public', 'agent_created', `Agent "${name}" (${type}) created`);
  });

  txn();

  req.agentManager.registerAgent(agentId);

  const agent = req.db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
  const wallet = req.db.prepare('SELECT * FROM wallets WHERE agent_id = ?').get(agentId);

  res.json({ agent, wallet });
});

router.get('/', (req, res) => {
  const agents = req.db.prepare(
    `SELECT a.*, w.balance FROM agents a
     LEFT JOIN wallets w ON w.agent_id = a.id
     ORDER BY a.created_at DESC`
  ).all();
  res.json(agents);
});

router.get('/:id', (req, res) => {
  const agent = req.db.prepare(
    `SELECT a.*, w.balance FROM agents a
     LEFT JOIN wallets w ON w.agent_id = a.id
     WHERE a.id = ?`
  ).get(req.params.id);

  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
});

router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  const validStatuses = ['idle', 'active', 'paused', 'error'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
  }

  const agent = req.db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  req.db.prepare('UPDATE agents SET status = ? WHERE id = ?').run(status, req.params.id);
  req.db.prepare('INSERT INTO activity_logs (id, agent_id, user_id, action, details) VALUES (?, ?, ?, ?, ?)')
    .run(uuidv4(), req.params.id, 'public', 'status_change', `Status changed to ${status}`);

  res.json({ id: req.params.id, status });
});

router.delete('/:id', (req, res) => {
  const agent = req.db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const txn = req.db.transaction(() => {
    const wallet = req.db.prepare('SELECT id FROM wallets WHERE agent_id = ?').get(req.params.id);
    if (wallet) {
      req.db.prepare('DELETE FROM transactions WHERE wallet_id = ?').run(wallet.id);
      req.db.prepare('DELETE FROM wallets WHERE id = ?').run(wallet.id);
    }
    req.db.prepare('DELETE FROM agent_memory WHERE agent_id = ?').run(req.params.id);
    req.db.prepare('DELETE FROM tasks WHERE agent_id = ?').run(req.params.id);
    req.db.prepare('DELETE FROM activity_logs WHERE agent_id = ?').run(req.params.id);
    req.db.prepare('DELETE FROM agents WHERE id = ?').run(req.params.id);
  });

  txn();
  req.agentManager.unregisterAgent(req.params.id);
  res.json({ deleted: true });
});

router.get('/:id/memory', (req, res) => {
  const agent = req.db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const memory = req.db.prepare('SELECT * FROM agent_memory WHERE agent_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json(memory);
});

module.exports = router;
