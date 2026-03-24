import React, { useState, useEffect } from 'react';

function Logs({ api }) {
  const [logs, setLogs] = useState([]);

  const load = () => {
    fetch(`${api}/api/logs`).then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setLogs(d); }).catch(() => {});
  };

  useEffect(() => { load(); const iv = setInterval(load, 4000); return () => clearInterval(iv); }, []);

  return (
    <div>
      <h1 className="page-title">Activity Feed</h1>

      {logs.length === 0 ? (
        <div className="card empty-state"><p>No activity yet. Create agents and assign tasks to see the feed.</p></div>
      ) : (
        <div className="card log-list">
          {logs.map(log => (
            <div className="log-item" key={log.id}>
              <span className="log-time">{new Date(log.created_at).toLocaleString()}</span>
              <span className="log-agent">{log.agent_name || 'System'}</span>
              <span className="log-action">{log.action}</span>
              <span className="log-details">{log.details}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Logs;
