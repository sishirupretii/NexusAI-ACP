const Database = require('better-sqlite3');
const path = require('path');

function initDB() {
  const dbPath = path.join(__dirname, '..', 'nexusai.db');
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('twitter','research','growth','trading')),
      status TEXT DEFAULT 'idle' CHECK(status IN ('idle','active','paused','error')),
      personality TEXT DEFAULT '',
      model TEXT DEFAULT 'llama3',
      twitter_handle TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY,
      agent_id TEXT UNIQUE NOT NULL,
      balance REAL DEFAULT 100.0,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      wallet_id TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('credit','debit')),
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (wallet_id) REFERENCES wallets(id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      agent_id TEXT,
      parent_task_id TEXT,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','assigned','running','completed','failed')),
      result TEXT DEFAULT '',
      cost REAL DEFAULT 1.0,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS agent_memory (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      agent_id TEXT,
      user_id TEXT,
      action TEXT NOT NULL,
      details TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS acp_messages (
      id TEXT PRIMARY KEY,
      from_agent TEXT NOT NULL,
      to_agent TEXT NOT NULL,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  return db;
}

module.exports = { initDB };
