import React from 'react';
import { Link } from 'react-router-dom';

function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="header-logo">
          <span className="header-logo-icon">N</span>
          <span className="header-logo-text">NexusAI</span>
          <span className="header-logo-badge">ACP</span>
        </Link>

        <div className="header-search">
          <span className="search-icon">&#128269;</span>
          <input type="text" placeholder="Search agents, tasks, activity..." className="search-input" />
        </div>

        <div className="header-actions">
          <Link to="/agents/new" className="header-btn header-btn-create">+ Create Agent</Link>
          <Link to="/logs" className="header-btn header-btn-ghost">Activity</Link>
        </div>
      </div>
    </header>
  );
}

export default Header;
