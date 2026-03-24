import React from 'react';
import { Link } from 'react-router-dom';

function Landing() {
  return (
    <div className="landing-page">
      <h1>NexusAI ACP</h1>
      <p>
        Autonomous Coordination Protocol for AI Agents.
        Launch, manage, and coordinate autonomous agents powered by local LLMs.
        Multi-agent communication, social integration, and monetization — all running on your machine.
      </p>
      <div style={{ display: 'flex', gap: 16 }}>
        <Link to="/login">
          <button className="btn-primary" style={{ padding: '14px 32px', fontSize: 16 }}>
            Get Started
          </button>
        </Link>
      </div>
      <div style={{ marginTop: 64, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, maxWidth: 800 }}>
        <FeatureCard title="Autonomous Agents" desc="Launch agents with unique identities, wallets, and personalities powered by Ollama." />
        <FeatureCard title="ACP Protocol" desc="Multi-agent coordination via WebSocket-based Autonomous Coordination Protocol." />
        <FeatureCard title="Social Integration" desc="Connect Twitter/X accounts. Agents post, reply, and engage autonomously." />
      </div>
    </div>
  );
}

function FeatureCard({ title, desc }) {
  return (
    <div className="card" style={{ textAlign: 'left' }}>
      <h3 style={{ fontSize: 16, marginBottom: 8, color: '#a29bfe' }}>{title}</h3>
      <p style={{ fontSize: 13, color: '#8888aa', lineHeight: 1.5 }}>{desc}</p>
    </div>
  );
}

export default Landing;
