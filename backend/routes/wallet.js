const express = require('express');

const router = express.Router();

router.get('/:agentId', (req, res) => {
  const agent = req.db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.agentId);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const wallet = req.db.prepare('SELECT * FROM wallets WHERE agent_id = ?').get(req.params.agentId);
  if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

  const transactions = req.db.prepare(
    'SELECT * FROM transactions WHERE wallet_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(wallet.id);

  res.json({ wallet, transactions });
});

module.exports = router;
