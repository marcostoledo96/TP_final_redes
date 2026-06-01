/**
 * SQLite connection module.
 * Uses better-sqlite3, PRAGMAs WAL + foreign_keys + busy_timeout.
 * Centralized in Primary — Workers never touch this directly.
 */

const Database = require("better-sqlite3");
const path = require("path");

function createDatabaseConnection(dbPath = null) {
  const resolvedPath =
    dbPath ||
    process.env.SQLITE_PATH ||
    path.join(__dirname, "..", "..", "data", "the-guardian.sqlite");

  const db = new Database(resolvedPath);

  // PRAGMAs obligatorios
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  // Tablas mínimas
  db.exec(`
    CREATE TABLE IF NOT EXISTS ingest_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      pid INTEGER NOT NULL,
      processing_ms INTEGER,
      status TEXT DEFAULT 'completed',
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS worker_restarts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      old_pid INTEGER,
      new_pid INTEGER,
      code INTEGER,
      signal TEXT,
      restarted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS metric_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total_accepted INTEGER DEFAULT 0,
      total_completed INTEGER DEFAULT 0,
      total_failed INTEGER DEFAULT 0,
      taken_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log(`[DB] Connected at ${resolvedPath}`);
  return db;
}

module.exports = { createDatabaseConnection };
