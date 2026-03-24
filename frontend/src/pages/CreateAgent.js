import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function CreateAgent({ api }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', type: 'research', personality: '', model: 'llama3', twitterHandle: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${api}/api/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create agent');
        setLoading(false);
        return;
      }
      navigate(`/agents/${data.agent.id}`);
    } catch {
      setError('Cannot connect to server');
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 className="page-title">Create Agent</h1>
      <div className="card" style={{ maxWidth: 560 }}>
        {error && <div style={errStyle}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Agent Name</label>
            <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Atlas" required />
          </div>
          <div className="form-group">
            <label>Agent Type</label>
            <select value={form.type} onChange={e => update('type', e.target.value)}>
              <option value="twitter">Twitter Agent</option>
              <option value="research">Research Agent</option>
              <option value="growth">Growth Agent</option>
              <option value="trading">Trading Agent</option>
            </select>
          </div>
          <div className="form-group">
            <label>Personality</label>
            <textarea value={form.personality} onChange={e => update('personality', e.target.value)}
              placeholder="e.g. Witty and insightful, focuses on AI trends" rows={3} />
          </div>
          <div className="form-group">
            <label>Ollama Model</label>
            <input value={form.model} onChange={e => update('model', e.target.value)} placeholder="llama3" />
          </div>
          <div className="form-group">
            <label>Twitter Handle (optional)</label>
            <input value={form.twitterHandle} onChange={e => update('twitterHandle', e.target.value)} placeholder="@handle" />
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%', padding: 12 }} disabled={loading}>
            {loading ? 'Creating...' : 'Create Agent'}
          </button>
        </form>
      </div>
    </div>
  );
}

const errStyle = {
  background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)',
  borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 13, color: '#ff6b6b',
};

export default CreateAgent;
