import React, { useState, useEffect } from 'react';

function Tasks({ api }) {
  const [tasks, setTasks] = useState([]);
  const [agents, setAgents] = useState([]);
  const [form, setForm] = useState({ agentId: '', type: 'general', description: '' });
  const [sending, setSending] = useState(false);

  const load = () => {
    fetch(`${api}/api/tasks`).then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setTasks(d); }).catch(() => {});
    fetch(`${api}/api/agents`).then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setAgents(d); }).catch(() => {});
  };

  useEffect(() => { load(); const iv = setInterval(load, 5000); return () => clearInterval(iv); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) return;
    setSending(true);
    try {
      await fetch(`${api}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: form.agentId || undefined,
          type: form.type,
          description: form.description
        }),
      });
      setForm(f => ({ ...f, description: '' }));
      setTimeout(load, 2000);
    } catch {}
    setSending(false);
  };

  return (
    <div>
      <h1 className="page-title">Tasks</h1>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#a29bfe' }}>Create Task</h3>
        <form onSubmit={submit} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '0 0 180px' }}>
            <label style={labelStyle}>Agent (optional)</label>
            <select value={form.agentId} onChange={e => setForm(f => ({ ...f, agentId: e.target.value }))}>
              <option value="">Auto-assign</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
            </select>
          </div>
          <div style={{ flex: '0 0 140px' }}>
            <label style={labelStyle}>Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="general">General</option>
              <option value="tweet">Tweet</option>
              <option value="research">Research</option>
              <option value="growth">Growth</option>
              <option value="trading">Trading</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={labelStyle}>Description</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What should the agent do?" required />
          </div>
          <button type="submit" className="btn-primary" disabled={sending}>
            {sending ? 'Sending...' : 'Submit'}
          </button>
        </form>
      </div>

      {tasks.length === 0 ? (
        <div className="card empty-state"><p>No tasks yet. Create one above.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tasks.map(task => (
            <div className="card" key={task.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span className={`badge badge-${task.status}`}>{task.status}</span>
                  <span style={{ fontSize: 13, color: '#8888aa' }}>{task.type}</span>
                  {task.agent_name && <span style={{ fontSize: 13, color: '#a29bfe' }}>{task.agent_name}</span>}
                </div>
                <span style={{ fontSize: 12, color: '#8888aa' }}>{new Date(task.created_at).toLocaleString()}</span>
              </div>
              <p style={{ fontSize: 14, marginBottom: 8 }}>{task.description}</p>
              {task.result && (
                <div style={{ background: '#12121a', borderRadius: 8, padding: 12, fontSize: 13, color: '#8888aa', whiteSpace: 'pre-wrap' }}>
                  {task.result}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: 'block', marginBottom: 4, fontSize: 12, color: '#8888aa' };

export default Tasks;
