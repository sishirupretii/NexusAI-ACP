import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateAgent from './pages/CreateAgent';
import AgentDetail from './pages/AgentDetail';
import Tasks from './pages/Tasks';
import Logs from './pages/Logs';
import Navbar from './components/Navbar';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000';

function App() {
  const [token, setToken] = useState(localStorage.getItem('nexusai_token') || '');
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (token) {
      fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(setUser)
        .catch(() => { setToken(''); localStorage.removeItem('nexusai_token'); });
    }
  }, [token]);

  const login = (t, u) => {
    localStorage.setItem('nexusai_token', t);
    setToken(t);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('nexusai_token');
    setToken('');
    setUser(null);
  };

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={login} api={API} />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    );
  }

  return (
    <div className="app-layout">
      <Navbar user={user} onLogout={logout} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard api={API} token={token} />} />
          <Route path="/agents/new" element={<CreateAgent api={API} token={token} />} />
          <Route path="/agents/:id" element={<AgentDetail api={API} token={token} />} />
          <Route path="/tasks" element={<Tasks api={API} token={token} />} />
          <Route path="/logs" element={<Logs api={API} token={token} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
