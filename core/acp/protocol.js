const MESSAGE_TYPES = {
  TASK_REQUEST: 'task_request',
  TASK_RESPONSE: 'task_response',
  COLLABORATION_REQUEST: 'collaboration_request',
  COLLABORATION_RESPONSE: 'collaboration_response',
  DATA_SHARE: 'data_share',
  STATUS_UPDATE: 'status_update',
  HEARTBEAT: 'heartbeat',
};

function createACPMessage(fromAgent, toAgent, messageType, payload) {
  return {
    type: 'agent_message',
    fromAgent,
    toAgent,
    messageType,
    payload,
    timestamp: new Date().toISOString()
  };
}

function createTaskRequest(fromAgent, toAgent, taskDescription, context) {
  return createACPMessage(fromAgent, toAgent, MESSAGE_TYPES.TASK_REQUEST, {
    task: taskDescription,
    context: context || {}
  });
}

function createTaskResponse(fromAgent, toAgent, taskId, result, success) {
  return createACPMessage(fromAgent, toAgent, MESSAGE_TYPES.TASK_RESPONSE, {
    taskId,
    result,
    success
  });
}

function createCollaborationRequest(fromAgent, toAgent, topic, data) {
  return createACPMessage(fromAgent, toAgent, MESSAGE_TYPES.COLLABORATION_REQUEST, {
    topic,
    data
  });
}

module.exports = { MESSAGE_TYPES, createACPMessage, createTaskRequest, createTaskResponse, createCollaborationRequest };
