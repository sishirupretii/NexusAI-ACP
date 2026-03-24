const { v4: uuidv4 } = require('uuid');

class TaskQueue {
  constructor(db) {
    this.db = db;
    this.queue = [];
    this.processing = false;
  }

  enqueue(task) {
    this.queue.push(task);
  }

  dequeue() {
    return this.queue.shift() || null;
  }

  peek() {
    return this.queue[0] || null;
  }

  get length() {
    return this.queue.length;
  }

  getPendingTasks() {
    return this.db.prepare("SELECT * FROM tasks WHERE status = 'pending' ORDER BY created_at ASC").all();
  }

  updateTaskStatus(taskId, status, result) {
    const completedAt = (status === 'completed' || status === 'failed') ? new Date().toISOString() : null;
    this.db.prepare('UPDATE tasks SET status = ?, result = ?, completed_at = ? WHERE id = ?')
      .run(status, result || '', completedAt, taskId);
  }

  createSubtask(parentTaskId, userId, agentId, type, description) {
    const id = uuidv4();
    this.db.prepare(
      'INSERT INTO tasks (id, user_id, agent_id, parent_task_id, type, description) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, userId, agentId, parentTaskId, type, description);
    return this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  }
}

module.exports = { TaskQueue };
