// ===== SECCIÓN: model — metric-snapshot.model.js =====
/**
 * Módulo de modelo para snapshots de métricas.
 *
 * ¿Qué es esto?
 *   Antes de que el Primary se apague (shutdown graceful), guarda un último
 *   "snapshot" con los contadores totales. Así, si reiniciamos el sistema,
 *   podemos saber cuántos eventos se procesaron en la sesión anterior.
 *
 * ¿Por qué es útil?
 *   En un TP o en producción, queremos saber la historia. Si el Primary
 *   se reinicia por un deploy nuevo, no queremos perder la cuenta total
 *   de eventos. Los snapshots sirven para auditoría y debugging.
 *
 * Analogía:
 *   Es como la caja registradora al cierre del día: el gerente cuenta
 *   cuántos platos se vendieron y guarda el total en el cajón.
 */

/**
 * Inserta un snapshot de métricas globales en SQLite.
 *
 * ¿Qué hace?
 *   Guarda los contadores totales (aceptados, completados, fallidos)
 *   en la tabla metric_snapshots junto con la fecha y hora automática.
 *
 * ¿Qué espera recibir?
 *   @param {import('better-sqlite3').Database} db — Conexión a SQLite abierta.
 *   @param {Object} param — Contadores del snapshot.
 *   @param {number} [param.totalAccepted=0] — Total de eventos aceptados.
 *   @param {number} [param.totalCompleted=0] — Total de eventos completados.
 *   @param {number} [param.totalFailed=0] — Total de eventos fallidos.
 *
 * ¿Qué devuelve?
 *   @returns {import('better-sqlite3').RunResult} Objeto con info de la ejecución.
 */
function insertSnapshot(db, { totalAccepted = 0, totalCompleted = 0, totalFailed = 0 }) {
  // Prepared statement: valores se pasan por placeholders ?.
  const stmt = db.prepare(
    "INSERT INTO metric_snapshots (total_accepted, total_completed, total_failed) VALUES (?, ?, ?)"
  );
  return stmt.run(totalAccepted, totalCompleted, totalFailed);
}

module.exports = { insertSnapshot };
