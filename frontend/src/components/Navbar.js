import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbar({ user, onLogout }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? 'nav-active' : '';

  return (
    <nav style={styles.nav}>
      <div style={styles.logo}>
        <span style={styles.logoIcon}>N</span>
        <span style={styles.logoText}>NexusAI</span>
      </div>

      <div style={styles.links}>
        <Link to="/" className={isActive('/')} style={styles.link}>
          <span style={styles.linkIcon}>&#9632;</span> Dashboard
        </Link>
        <Link to="/agents/new" className={isActive('/agents/new')} style={styles.link}>
          <span style={styles.linkIcon}>+</span> Create Agent
        </Link>
        <Link to="/tasks" className={isActive('/tasks')} style={styles.link}>
          <span style={styles.linkIcon}>&#9654;</span> Tasks
        </Link>
        <Link to="/logs" className={isActive('/logs')} style={styles.link}>
          <span style={styles.linkIcon}>&#9776;</span> Activity Logs
        </Link>
      </div>

      <div style={styles.footer}>
        {user && <div style={styles.username}>{user.username}</div>}
        <button onClick={onLogout} style={styles.logoutBtn}>Log Out</button>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    position: 'fixed', left: 0, top: 0, bottom: 0, width: 240,
    background: '#12121a', borderRight: '1px solid #2a2a4a',
    display: 'flex', flexDirection: 'column', padding: '24px 0',
    zIndex: 100,
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '0 20px', marginBottom: 32,
  },
  logoIcon: {
    width: 36, height: 36, borderRadius: 10,
    background: 'linear-gradient(135deg, #6c5ce7, #00cec9)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, fontWeight: 700, color: 'white',
    textAlign: 'center', lineHeight: '36px',
  },
  logoText: { fontSize: 18, fontWeight: 700, color: '#e8e8f0' },
  links: { flex: 1, display: 'flex', flexDirection: 'column', gap: 4 },
  link: {
    padding: '10px 20px', color: '#8888aa', textDecoration: 'none',
    fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10,
    transition: 'all 0.2s',
  },
  linkIcon: { fontSize: 12 },
  footer: { padding: '16px 20px', borderTop: '1px solid #2a2a4a' },
  username: { fontSize: 13, color: '#8888aa', marginBottom: 8 },
  logoutBtn: {
    background: 'none', border: '1px solid #2a2a4a', color: '#8888aa',
    padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
    width: '100%',
  },
};

export default Navbar;
