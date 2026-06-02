// ===== SECCIÓN: model — worker-restart.model.js =====
/**
 * Módulo de modelo para reinicios de workers.
 *
 * ¿Qué es esto?
 *   Cuando un Cluster Worker muere inesperadamente, el Primary crea uno nuevo.
 *   Esta función guarda ese evento en la tabla worker_restarts de SQLite.
 *
 * ¿Por qué es importante registrar reinicios?
 *   En producción, los reinicios frecuentes pueden indicar bugs, memory leaks
 *   (fugas de memoria), o problemas de infraestructura. Tener un registro
 *   histórico permite diagnosticar y auditar el comportamiento del sistema.
 *
 * Analogía:
 *   Es como el libro de incidentes del gerente: "el mozo Juan (PID 12345)
 *   se cayó a las 14:30; lo reemplazó Pedro (PID 12346)".
 */

/**
 * Inserta un registro de reinicio de worker en SQLite.
 *
 * ¿Qué hace?
 *   Guarda la información de un reinicio: quién murió, quién lo reemplazó,
 *   con qué código salió, y qué señal lo mató (si aplica).
 *
 * ¿Qué espera recibir?
 *   @param {import('better-sqlite3').Database} db — Conexión a SQLite abierta.
 *   @param {Object} param — Datos del reinicio.
 *   @param {number} param.oldPid — PID del worker que murió.
 *   @param {number} [param.newPid] — PID del nuevo worker (puede ser null).
 *   @param {number|null} [param.code] — Código de salida del proceso (0 = éxito, otro = error).
 *   @param {string|null} [param.signal] — Señal que causó la muerte (ej: 'SIGKILL').
 *
 * ¿Qué devuelve?
 *   @returns {import('better-sqlite3').RunResult} Objeto con info de la ejecución.
 */
function insertWorkerRestart(db, { oldPid, newPid = null, code = null, signal = null }) {
  // Prepared statement con placeholders ? para evitar SQL Injection.
  const stmt = db.prepare(
    "INSERT INTO worker_restarts (old_pid, new_pid, code, signal) VALUES (?, ?, ?, ?)"
  );
  return stmt.run(oldPid, newPid, code, signal);
}

module.exports = { insertWorkerRestart };
