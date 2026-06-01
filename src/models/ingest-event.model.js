/**
 * Factory function: insertIngestEvent
 * @param {import('better-sqlite3').Database} db
 * @param {Object} param
 * @param {number} param.eventId
 * @param {number} param.pid
 * @param {number} [param.processingMs]
 * @param {string} [param.status='completed']
 * @returns {import('better-sqlite3').RunResult}
 */
function insertIngestEvent(db, { eventId, pid, processingMs, status = "completed" }) {
  const stmt = db.prepare(
    "INSERT INTO ingest_events (event_id, pid, processing_ms, status) VALUES (?, ?, ?, ?)"
  );
  return stmt.run(eventId, pid, processingMs ?? null, status);
}

module.exports = { insertIngestEvent };
