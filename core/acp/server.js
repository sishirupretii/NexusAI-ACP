const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

class ACPServer {
  constructor(httpServer, db, agentManager) {
    this.db = db;
    this.agentManager = agentManager;
    this.clients = new Map();
    this.subscriptions = new Map();

    this.wss = new WebSocket.Server({ server: httpServer, path: '/acp' });

    this.wss.on('connection', (ws) => {
      const clientId = uuidv4();
      this.clients.set(clientId, ws);

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          this.handleMessage(clientId, ws, msg);
        } catch (e) {
          ws.send(JSON.stringify({ type: 'error', error: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        for (const [agentId, cId] of this.subscriptions.entries()) {
          if (cId === clientId) this.subscriptions.delete(agentId);
        }
      });

      ws.send(JSON.stringify({ type: 'connected', clientId }));
    });
  }

  handleMessage(clientId, ws, msg) {
    switch (msg.type) {
      case 'subscribe':
        if (msg.agentId) {
          this.subscriptions.set(msg.agentId, clientId);
          ws.send(JSON.stringify({ type: 'subscribed', agentId: msg.agentId }));
        }
        break;

      case 'agent_message':
        this.routeAgentMessage(msg);
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;

      default:
        ws.send(JSON.stringify({ type: 'error', error: `Unknown message type: ${msg.type}` }));
    }
  }

  routeAgentMessage(msg) {
    const { fromAgent, toAgent, payload } = msg;

    const messageId = uuidv4();
    this.db.prepare(
      'INSERT INTO acp_messages (id, from_agent, to_agent, type, payload) VALUES (?, ?, ?, ?, ?)'
    ).run(messageId, fromAgent, toAgent, msg.messageType || 'general', JSON.stringify(payload));

    const targetClientId = this.subscriptions.get(toAgent);
    if (targetClientId) {
      const targetWs = this.clients.get(targetClientId);
      if (targetWs && targetWs.readyState === WebSocket.OPEN) {
        targetWs.send(JSON.stringify({
          type: 'agent_message',
          id: messageId,
          fromAgent,
          toAgent,
          messageType: msg.messageType || 'general',
          payload,
          timestamp: new Date().toISOString()
        }));
      }
    }

    this.broadcastToAll({
      type: 'acp_activity',
      id: messageId,
      fromAgent,
      toAgent,
      messageType: msg.messageType || 'general',
      timestamp: new Date().toISOString()
    });
  }

  sendToAgent(toAgentId, message) {
    const targetClientId = this.subscriptions.get(toAgentId);
    if (targetClientId) {
      const ws = this.clients.get(targetClientId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
        return true;
      }
    }
    return false;
  }

  broadcastToAll(message) {
    const data = JSON.stringify(message);
    for (const [, ws] of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  broadcastTaskUpdate(task) {
    this.broadcastToAll({
      type: 'task_update',
      task: {
        id: task.id,
        agentId: task.agent_id,
        status: task.status,
        description: task.description,
        result: task.result
      },
      timestamp: new Date().toISOString()
    });
  }

  broadcastLog(log) {
    this.broadcastToAll({
      type: 'activity_log',
      log,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = { ACPServer };
