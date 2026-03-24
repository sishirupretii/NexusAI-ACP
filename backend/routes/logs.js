const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  const logs = req.db.prepare(
    `SELECT l.*, a.name as agent_name FROM activity_logs l
     LEFT JOIN agents a ON a.id = l.agent_id
     WHERE l.user_id = ? OR l.agent_id IN (SELECT id FROM agents WHERE user_id = ?)
     ORDER BY l.created_at DESC
     LIMIT 200`
  ).all(req.userId, req.userId);
  res.json(logs);
});

router.get('/agent/:agentId', (req, res) => {
  const agent = req.db.prepare('SELECT * FROM agents WHERE id = ? AND user_id = ?').get(req.params.agentId, req.userId);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const logs = req.db.prepare(
    'SELECT * FROM activity_logs WHERE agent_id = ? ORDER BY created_at DESC LIMIT 100'
  ).all(req.params.agentId);
  res.json(logs);
});

module.exports = router;
