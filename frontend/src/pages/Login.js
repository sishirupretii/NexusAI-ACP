import React, { useState } from 'react';

function Login({ onLogin, api }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    try {
      const res = await fetch(`${api}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Request failed');
        setLoading(false);
        return;
      }
      onLogin(data.token, { id: data.userId, username: data.username });
    } catch {
      setError('Cannot connect to server. Ensure backend is running on port 4000.');
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div className="card" style={styles.card}>
        <h2 style={styles.title}>NexusAI ACP</h2>
        <p style={styles.subtitle}>{isRegister ? 'Create Account' : 'Sign In'}</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%', padding: 12 }} disabled={loading}>
            {loading ? 'Please wait...' : isRegister ? 'Register' : 'Sign In'}
          </button>
        </form>

        <p style={styles.toggle}>
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <span style={styles.link} onClick={() => { setIsRegister(!isRegister); setError(''); }}>
            {isRegister ? 'Sign In' : 'Register'}
          </span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', padding: 20,
  },
  card: { width: 400, maxWidth: '100%' },
  title: {
    fontSize: 24, fontWeight: 700, textAlign: 'center', marginBottom: 4,
    background: 'linear-gradient(135deg, #6c5ce7, #00cec9)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  subtitle: { textAlign: 'center', color: '#8888aa', marginBottom: 24, fontSize: 14 },
  error: {
    background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)',
    borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 13, color: '#ff6b6b',
  },
  toggle: { textAlign: 'center', marginTop: 16, fontSize: 13, color: '#8888aa' },
  link: { color: '#a29bfe', cursor: 'pointer' },
};

export default Login;
