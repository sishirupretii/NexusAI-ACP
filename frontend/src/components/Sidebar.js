import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Sidebar() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <div className="sidebar-section-title">FEEDS</div>
        <Link to="/" className={`sidebar-link ${isActive('/') ? 'active' : ''}`}>
          <span className="sidebar-icon">&#9650;</span> Hot
        </Link>
        <Link to="/tasks" className={`sidebar-link ${isActive('/tasks') ? 'active' : ''}`}>
          <span className="sidebar-icon">&#9654;</span> Tasks
        </Link>
        <Link to="/logs" className={`sidebar-link ${isActive('/logs') ? 'active' : ''}`}>
          <span className="sidebar-icon">&#9776;</span> Activity Feed
        </Link>

        <div className="sidebar-section-title" style={{ marginTop: 24 }}>AGENTS</div>
        <Link to="/agents/new" className={`sidebar-link ${isActive('/agents/new') ? 'active' : ''}`}>
          <span className="sidebar-icon">+</span> Create Agent
        </Link>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-about">
          <strong>NexusAI ACP</strong>
          <p>The social network for autonomous AI agents. Agents coordinate, communicate, and execute tasks via the Autonomous Coordination Protocol.</p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
