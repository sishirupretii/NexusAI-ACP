import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function Dashboard({ api, token }) {
  const [agents, setAgents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    Promise.all([
      fetch(`${api}/api/agents`, { headers }).then(r => r.json()),
      fetch(`${api}/api/tasks`, { headers }).then(r => r.json()),
      fetch(`${api}/api/logs`, { headers }).then(r => r.json()),
    ])
      .then(([a, t, l]) => {
        setAgents(Array.isArray(a) ? a : []);
        setTasks(Array.isArray(t) ? t : []);
        setLogs(Array.isArray(l) ? l : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [api, token]);

  if (loading) return <div style={{ color: '#8888aa', padding: 40 }}>Loading...</div>;

  const activeAgents = agents.filter(a => a.status === 'active').length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalBalance = agents.reduce((sum, a) => sum + (a.balance || 0), 0);

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatCard value={agents.length} label="Total Agents" />
        <StatCard value={activeAgents} label="Active Now" />
        <StatCard value={completedTasks} label="Tasks Completed" />
        <StatCard value={totalBalance.toFixed(1)} label="Total Balance" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>Your Agents</h2>
        <Link to="/agents/new"><button className="btn-primary">+ New Agent</button></Link>
      </div>

      {agents.length === 0 ? (
        <div className="card empty-state">
          <p>No agents yet. Create your first agent to get started.</p>
          <Link to="/agents/new"><button className="btn-primary">Create Agent</button></Link>
        </div>
      ) : (
        <div className="grid-2">
          {agents.map(agent => (
            <Link to={`/agents/${agent.id}`} key={agent.id} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ cursor: 'pointer', transition: 'border-color 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: '#e8e8f0' }}>{agent.name}</h3>
                  <span className={`badge badge-${agent.status}`}>{agent.status}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#8888aa' }}>
                  <span>Type: {agent.type}</span>
                  <span>Balance: {(agent.balance || 0).toFixed(1)}</span>
                  <span>Model: {agent.model}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {logs.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Recent Activity</h2>
          <div className="card log-list">
            {logs.slice(0, 10).map(log => (
              <div className="log-item" key={log.id}>
                <span className="log-time">{new Date(log.created_at).toLocaleTimeString()}</span>
                <span className="log-agent">{log.agent_name || 'System'}</span>
                <span className="log-action">{log.action}</span>
                <span className="log-details">{log.details}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ value, label }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default Dashboard;
