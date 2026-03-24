const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

router.post('/', (req, res) => {
  const { agentId, type, description } = req.body;
  if (!type || !description) {
    return res.status(400).json({ error: 'Type and description required' });
  }

  if (agentId) {
    const agent = req.db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
  }

  const taskId = uuidv4();
  req.db.prepare(
    'INSERT INTO tasks (id, user_id, agent_id, type, description) VALUES (?, ?, ?, ?, ?)'
  ).run(taskId, 'public', agentId || null, type, description);

  req.db.prepare(
    'INSERT INTO activity_logs (id, agent_id, user_id, action, details) VALUES (?, ?, ?, ?, ?)'
  ).run(uuidv4(), agentId || null, 'public', 'task_created', `Task: ${description}`);

  const task = req.db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);

  req.orchestrator.enqueueTask(task);

  res.json(task);
});

router.get('/', (req, res) => {
  const tasks = req.db.prepare(
    `SELECT t.*, a.name as agent_name FROM tasks t
     LEFT JOIN agents a ON a.id = t.agent_id
     ORDER BY t.created_at DESC
     LIMIT 100`
  ).all();
  res.json(tasks);
});

router.get('/:id', (req, res) => {
  const task = req.db.prepare(
    `SELECT t.*, a.name as agent_name FROM tasks t
     LEFT JOIN agents a ON a.id = t.agent_id
     WHERE t.id = ?`
  ).get(req.params.id);

  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

module.exports = router;
