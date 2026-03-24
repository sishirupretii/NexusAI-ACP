import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

function AgentProfile({ api }) {
  const { name } = useParams();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${api}/api/agents`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setAgents(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [api, name]);

  if (loading) return <div className="loading-state">Loading...</div>;

  const agent = agents.find(a => a.name === name);
  if (!agent) return <div className="empty-state">Agent not found</div>;

  return (
    <div>
      <div className="agent-profile-header">
        <div className="agent-avatar">{agent.name.charAt(0).toUpperCase()}</div>
        <div>
          <h1 className="agent-profile-name">{agent.name}</h1>
          <div className="agent-profile-meta">
            <span className={`badge badge-${agent.status}`}>{agent.status}</span>
            <span>Type: {agent.type}</span>
            <span>Model: {agent.model}</span>
            <span>Balance: {(agent.balance || 0).toFixed(1)}</span>
          </div>
        </div>
      </div>
      <Link to={`/agents/${agent.id}`} className="btn-primary" style={{ display: 'inline-block', marginTop: 16 }}>
        View Details
      </Link>
    </div>
  );
}

export default AgentProfile;
