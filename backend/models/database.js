const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

// Wrapper that provides a better-sqlite3 compatible API on top of sql.js
function createDBWrapper(sqlDb, dbPath) {
  const db = {};

  // Save database to disk
  const save = () => {
    const data = sqlDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  };

  // Auto-save after writes (debounced)
  let saveTimer = null;
  const scheduleSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 100);
  };

  db.exec = (sql) => {
    sqlDb.run(sql);
    scheduleSave();
  };

  db.pragma = (pragma) => {
    try {
      sqlDb.run(`PRAGMA ${pragma}`);
    } catch (e) {
      // sql.js doesn't support all pragmas (e.g. WAL mode)
    }
  };

  db.prepare = (sql) => {
    return {
      run(...params) {
        sqlDb.run(sql, params);
        scheduleSave();
        return { changes: sqlDb.getRowsModified() };
      },
      get(...params) {
        const stmt = sqlDb.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const cols = stmt.getColumnNames();
          const vals = stmt.get();
          stmt.free();
          const row = {};
          cols.forEach((col, i) => { row[col] = vals[i]; });
          return row;
        }
        stmt.free();
        return undefined;
      },
      all(...params) {
        const results = [];
        const stmt = sqlDb.prepare(sql);
        stmt.bind(params);
        while (stmt.step()) {
          const cols = stmt.getColumnNames();
          const vals = stmt.get();
          const row = {};
          cols.forEach((col, i) => { row[col] = vals[i]; });
          results.push(row);
        }
        stmt.free();
        return results;
      }
    };
  };

  db.transaction = (fn) => {
    return (...args) => {
      sqlDb.run('BEGIN TRANSACTION');
      try {
        const result = fn(...args);
        sqlDb.run('COMMIT');
        scheduleSave();
        return result;
      } catch (err) {
        sqlDb.run('ROLLBACK');
        throw err;
      }
    };
  };

  db.close = () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      save();
    }
    sqlDb.close();
  };

  return db;
}

let _dbInstance = null;

async function initDB() {
  if (_dbInstance) return _dbInstance;

  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, '..', 'nexusai.db');

  let sqlDb;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    sqlDb = new SQL.Database(fileBuffer);
  } else {
    sqlDb = new SQL.Database();
  }

  const db = createDBWrapper(sqlDb, dbPath);

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

  _dbInstance = db;
  return db;
}

module.exports = { initDB };
