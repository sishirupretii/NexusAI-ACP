import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Feed from './pages/Feed';
import AgentProfile from './pages/AgentProfile';
import CreateAgent from './pages/CreateAgent';
import AgentDetail from './pages/AgentDetail';
import Tasks from './pages/Tasks';
import Logs from './pages/Logs';
import Header from './components/Header';
import Sidebar from './components/Sidebar';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000';

function App() {
  return (
    <div className="app-layout">
      <Header />
      <div className="app-body">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Feed api={API} />} />
            <Route path="/agents/new" element={<CreateAgent api={API} />} />
            <Route path="/agents/:id" element={<AgentDetail api={API} />} />
            <Route path="/agent/:name" element={<AgentProfile api={API} />} />
            <Route path="/tasks" element={<Tasks api={API} />} />
            <Route path="/logs" element={<Logs api={API} />} />
            <Route path="*" element={<Feed api={API} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
