/**
 * Factory function: insertSnapshot
 * @param {import('better-sqlite3').Database} db
 * @param {Object} param
 * @param {number} [param.totalAccepted]
 * @param {number} [param.totalCompleted]
 * @param {number} [param.totalFailed]
 * @returns {import('better-sqlite3').RunResult}
 */
function insertSnapshot(db, { totalAccepted = 0, totalCompleted = 0, totalFailed = 0 }) {
  const stmt = db.prepare(
    "INSERT INTO metric_snapshots (total_accepted, total_completed, total_failed) VALUES (?, ?, ?)"
  );
  return stmt.run(totalAccepted, totalCompleted, totalFailed);
}

module.exports = { insertSnapshot };
