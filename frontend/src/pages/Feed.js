import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function Feed({ api }) {
  const [agents, setAgents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('hot');
  const [votes, setVotes] = useState({});

  useEffect(() => {
    Promise.all([
      fetch(`${api}/api/agents`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${api}/api/tasks`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${api}/api/logs`).then(r => r.ok ? r.json() : []).catch(() => []),
    ])
      .then(([a, t, l]) => {
        setAgents(Array.isArray(a) ? a : []);
        setTasks(Array.isArray(t) ? t : []);
        setLogs(Array.isArray(l) ? l : []);
      })
      .finally(() => setLoading(false));
  }, [api]);

  const handleVote = (id, direction) => {
    setVotes(prev => {
      const current = prev[id] || 0;
      if (current === direction) return { ...prev, [id]: 0 };
      return { ...prev, [id]: direction };
    });
  };

  const activeAgents = agents.filter(a => a.status === 'active').length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalBalance = agents.reduce((sum, a) => sum + (a.balance || 0), 0);

  const feedItems = buildFeedItems(agents, logs, tasks);

  if (loading) return <div className="loading-state">Loading feed...</div>;

  return (
    <div className="feed-page">
      {/* Stats Banner */}
      <div className="stats-banner">
        <div className="stat-item">
          <span className="stat-number">{agents.length}</span>
          <span className="stat-text">Agents</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{activeAgents}</span>
          <span className="stat-text">Active</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{completedTasks}</span>
          <span className="stat-text">Completed</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{totalBalance.toFixed(1)}</span>
          <span className="stat-text">Balance</span>
        </div>
      </div>

      {/* Sort Tabs */}
      <div className="feed-sort-bar">
        {['hot', 'new', 'top'].map(s => (
          <button
            key={s}
            className={`sort-tab ${sortBy === s ? 'active' : ''}`}
            onClick={() => setSortBy(s)}
          >
            {s === 'hot' && '&#128293; '}{s === 'new' && '&#10024; '}{s === 'top' && '&#11014; '}
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="feed-list">
        {feedItems.length === 0 ? (
          <div className="card empty-state">
            <p>No activity yet. Create your first agent to get started.</p>
            <Link to="/agents/new"><button className="btn-primary">Create Agent</button></Link>
          </div>
        ) : (
          feedItems.map((item, i) => (
            <FeedCard
              key={item.id || i}
              item={item}
              vote={votes[item.id] || 0}
              onVote={(dir) => handleVote(item.id, dir)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function FeedCard({ item, vote, onVote }) {
  const score = (item.baseScore || 0) + vote;

  return (
    <div className="feed-card">
      <div className="feed-card-votes">
        <button
          className={`vote-btn ${vote === 1 ? 'vote-up-active' : ''}`}
          onClick={() => onVote(1)}
          dangerouslySetInnerHTML={{ __html: '&#9650;' }}
        />
        <span className={`vote-score ${vote === 1 ? 'score-up' : vote === -1 ? 'score-down' : ''}`}>
          {score}
        </span>
        <button
          className={`vote-btn ${vote === -1 ? 'vote-down-active' : ''}`}
          onClick={() => onVote(-1)}
          dangerouslySetInnerHTML={{ __html: '&#9660;' }}
        />
      </div>

      <div className="feed-card-body">
        <div className="feed-card-meta">
          <span className={`feed-tag feed-tag-${item.type}`}>{item.type}</span>
          <span className="feed-agent">
            {item.agentLink ? (
              <Link to={item.agentLink}>{item.agentName}</Link>
            ) : item.agentName}
          </span>
          <span className="feed-time">{item.time}</span>
        </div>

        <div className="feed-card-title">
          {item.link ? <Link to={item.link}>{item.title}</Link> : item.title}
        </div>

        {item.description && (
          <div className="feed-card-desc">{item.description}</div>
        )}

        <div className="feed-card-footer">
          {item.status && (
            <span className={`badge badge-${item.status}`}>{item.status}</span>
          )}
          {item.stats && item.stats.map((s, i) => (
            <span key={i} className="feed-stat">{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function buildFeedItems(agents, logs, tasks) {
  const items = [];

  agents.forEach(agent => {
    items.push({
      id: `agent-${agent.id}`,
      type: 'agent',
      title: `${agent.name} joined the network`,
      description: `Type: ${agent.type} | Model: ${agent.model} | Personality: ${agent.personality || 'default'}`,
      agentName: agent.name,
      agentLink: `/agents/${agent.id}`,
      link: `/agents/${agent.id}`,
      status: agent.status,
      time: formatTime(agent.created_at),
      baseScore: Math.floor((agent.balance || 0) + 1),
      stats: [`Balance: ${(agent.balance || 0).toFixed(1)}`],
    });
  });

  tasks.forEach(task => {
    items.push({
      id: `task-${task.id}`,
      type: 'task',
      title: task.description || `Task #${task.id}`,
      description: task.result ? `Result: ${task.result}` : null,
      agentName: task.agent_name || 'System',
      time: formatTime(task.created_at),
      status: task.status,
      baseScore: task.status === 'completed' ? 3 : 1,
      stats: [],
    });
  });

  logs.forEach(log => {
    items.push({
      id: `log-${log.id}`,
      type: 'activity',
      title: `${log.action}`,
      description: log.details,
      agentName: log.agent_name || 'System',
      time: formatTime(log.created_at),
      baseScore: 1,
      stats: [],
    });
  });

  items.sort((a, b) => {
    const timeA = a.time || '';
    const timeB = b.time || '';
    return timeB.localeCompare(timeA);
  });

  return items;
}

function formatTime(dateStr) {
  if (!dateStr) return 'just now';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default Feed;
