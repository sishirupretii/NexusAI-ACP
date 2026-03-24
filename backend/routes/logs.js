const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  const logs = req.db.prepare(
    `SELECT l.*, a.name as agent_name FROM activity_logs l
     LEFT JOIN agents a ON a.id = l.agent_id
     ORDER BY l.created_at DESC
     LIMIT 200`
  ).all();
  res.json(logs);
});

router.get('/agent/:agentId', (req, res) => {
  const agent = req.db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.agentId);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const logs = req.db.prepare(
    'SELECT * FROM activity_logs WHERE agent_id = ? ORDER BY created_at DESC LIMIT 100'
  ).all(req.params.agentId);
  res.json(logs);
});

module.exports = router;
