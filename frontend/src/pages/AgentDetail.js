import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function AgentDetail({ api }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [memory, setMemory] = useState([]);
  const [taskDesc, setTaskDesc] = useState('');
  const [taskType, setTaskType] = useState('general');
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState([]);

  const load = () => {
    fetch(`${api}/api/agents/${id}`).then(r => r.json()).then(setAgent).catch(() => {});
    fetch(`${api}/api/wallet/${id}`).then(r => r.json()).then(d => {
      if (d.wallet) setWallet(d.wallet);
      if (d.transactions) setTransactions(d.transactions);
    }).catch(() => {});
    fetch(`${api}/api/agents/${id}/memory`).then(r => r.json()).then(d => {
      if (Array.isArray(d)) setMemory(d);
    }).catch(() => {});
    fetch(`${api}/api/logs/agent/${id}`).then(r => r.json()).then(d => {
      if (Array.isArray(d)) setLogs(d);
    }).catch(() => {});
  };

  useEffect(() => { load(); const iv = setInterval(load, 5000); return () => clearInterval(iv); }, [id]);

  const assignTask = async (e) => {
    e.preventDefault();
    if (!taskDesc.trim()) return;
    setSending(true);
    try {
      await fetch(`${api}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: id, type: taskType, description: taskDesc }),
      });
      setTaskDesc('');
      setTimeout(load, 2000);
    } catch {}
    setSending(false);
  };

  const updateStatus = async (status) => {
    await fetch(`${api}/api/agents/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const deleteAgent = async () => {
    if (!window.confirm('Delete this agent? This cannot be undone.')) return;
    await fetch(`${api}/api/agents/${id}`, { method: 'DELETE' });
    navigate('/');
  };

  if (!agent) return <div className="loading-state">Loading agent...</div>;

  return (
    <div>
      <div className="agent-detail-header">
        <div className="agent-avatar-lg">{agent.name.charAt(0).toUpperCase()}</div>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>{agent.name}</h1>
          <span className={`badge badge-${agent.status}`}>{agent.status}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card">
          <h3 style={h3}>Agent Info</h3>
          <InfoRow label="ID" value={agent.id} />
          <InfoRow label="Type" value={agent.type} />
          <InfoRow label="Status" value={<span className={`badge badge-${agent.status}`}>{agent.status}</span>} />
          <InfoRow label="Model" value={agent.model} />
          <InfoRow label="Personality" value={agent.personality || 'Default'} />
          {agent.twitter_handle && <InfoRow label="Twitter" value={`@${agent.twitter_handle}`} />}
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            {agent.status !== 'active' && <button className="btn-primary" onClick={() => updateStatus('active')}>Activate</button>}
            {agent.status !== 'paused' && <button className="btn-secondary" onClick={() => updateStatus('paused')}>Pause</button>}
            <button className="btn-danger" onClick={deleteAgent}>Delete</button>
          </div>
        </div>

        <div className="card">
          <h3 style={h3}>Wallet</h3>
          <div className="stat-value">{wallet ? wallet.balance.toFixed(2) : (agent.balance || 0).toFixed(2)}</div>
          <div className="stat-label" style={{ marginBottom: 16 }}>Token Balance</div>
          {transactions.length > 0 && (
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {transactions.slice(0, 10).map(tx => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid #2a2a4a' }}>
                  <span style={{ color: '#8888aa' }}>{tx.description}</span>
                  <span style={{ color: tx.type === 'credit' ? '#00cec9' : '#ff6b6b', fontWeight: 600 }}>
                    {tx.type === 'credit' ? '+' : '-'}{tx.amount.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={h3}>Assign Task</h3>
        <form onSubmit={assignTask} style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: '0 0 150px' }}>
            <label style={labelStyle}>Type</label>
            <select value={taskType} onChange={e => setTaskType(e.target.value)}>
              <option value="general">General</option>
              <option value="tweet">Tweet</option>
              <option value="research">Research</option>
              <option value="growth">Growth</option>
              <option value="trading">Trading</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Description</label>
            <input value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Describe the task..." required />
          </div>
          <button type="submit" className="btn-primary" disabled={sending} style={{ whiteSpace: 'nowrap' }}>
            {sending ? 'Sending...' : 'Send Task'}
          </button>
        </form>
      </div>

      {logs.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={h3}>Activity Log</h3>
          <div className="log-list">
            {logs.slice(0, 20).map(log => (
              <div className="log-item" key={log.id}>
                <span className="log-time">{new Date(log.created_at).toLocaleTimeString()}</span>
                <span className="log-action">{log.action}</span>
                <span className="log-details">{log.details}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {memory.length > 0 && (
        <div className="card">
          <h3 style={h3}>Memory</h3>
          {memory.slice(0, 10).map(m => (
            <div key={m.id} style={{ padding: '8px 0', borderBottom: '1px solid #2a2a4a', fontSize: 13 }}>
              <span style={{ color: '#a29bfe', fontWeight: 600 }}>{m.key}</span>
              <pre style={{ color: '#8888aa', marginTop: 4, whiteSpace: 'pre-wrap', fontSize: 12 }}>
                {typeof m.value === 'string' ? m.value : JSON.stringify(m.value, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, borderBottom: '1px solid #1a1a2e' }}>
      <span style={{ color: '#8888aa' }}>{label}</span>
      <span style={{ color: '#e8e8f0' }}>{value}</span>
    </div>
  );
}

const h3 = { fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#a29bfe' };
const labelStyle = { display: 'block', marginBottom: 4, fontSize: 12, color: '#8888aa' };

export default AgentDetail;
