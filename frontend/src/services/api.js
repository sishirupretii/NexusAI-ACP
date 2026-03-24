const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

export async function apiCall(endpoint, token, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers: { ...headers, ...options.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export function connectWebSocket(onMessage) {
  const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:4000';
  const ws = new WebSocket(`${wsUrl}/acp`);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch {}
  };

  ws.onclose = () => {
    setTimeout(() => connectWebSocket(onMessage), 3000);
  };

  return ws;
}
