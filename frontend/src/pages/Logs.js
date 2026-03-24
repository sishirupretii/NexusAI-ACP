import React, { useState, useEffect } from 'react';

function Logs({ api, token }) {
  const [logs, setLogs] = useState([]);
  const headers = { Authorization: `Bearer ${token}` };

  const load = () => {
    fetch(`${api}/api/logs`, { headers }).then(r => r.json()).then(d => { if (Array.isArray(d)) setLogs(d); });
  };

  useEffect(() => { load(); const iv = setInterval(load, 4000); return () => clearInterval(iv); }, []);

  return (
    <div>
      <h1 className="page-title">Activity Logs</h1>

      {logs.length === 0 ? (
        <div className="card empty-state"><p>No activity yet. Create agents and assign tasks to see logs.</p></div>
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
