/**
 * Factory function: insertWorkerRestart
 * @param {import('better-sqlite3').Database} db
 * @param {Object} param
 * @param {number} param.oldPid
 * @param {number} [param.newPid]
 * @param {number|null} [param.code]
 * @param {string|null} [param.signal]
 * @returns {import('better-sqlite3').RunResult}
 */
function insertWorkerRestart(db, { oldPid, newPid = null, code = null, signal = null }) {
  const stmt = db.prepare(
    "INSERT INTO worker_restarts (old_pid, new_pid, code, signal) VALUES (?, ?, ?, ?)"
  );
  return stmt.run(oldPid, newPid, code, signal);
}

module.exports = { insertWorkerRestart };
