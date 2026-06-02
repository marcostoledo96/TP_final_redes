// ===== SECCIÓN: model — ingest-event.model.js =====
/**
 * Módulo de modelo para eventos de ingest.
 *
 * ¿Qué es un "modelo" en backend?
 *   Es una capa de código que encapsula las operaciones de base de datos
 *   para una entidad específica. En vez de escribir SQL crudo en el
 *   Primary o en los controllers, usamos funciones con nombres claros.
 *   Esto hace el código más legible, testeable y mantenible.
 *
 * ¿Cuándo se llama esta función?
 *   Cuando el Primary recibe un mensaje IPC del tipo INGEST_COMPLETED
 *   o INGEST_FAILED. El Primary llama a insertIngestEvent() para
 *   guardar el evento en SQLite.
 *
 * Analogía:
 *   Es como el archivista del restaurante: cuando un mozo termina de
 *   atender una mesa, el archivista registra la orden en el libro de cuentas.
 */

/**
 * Inserta un evento de ingest en la tabla ingest_events.
 *
 * ¿Qué hace?
 *   Prepara una sentencia INSERT parametrizada y la ejecuta con los datos
 *   del evento. Usa "prepared statements" (consultas preparadas) para
 *   evitar SQL Injection, que es una técnica de ataque donde un hacker
 *   inyecta código SQL malicioso a través de los inputs.
 *
 * ¿Qué espera recibir?
 *   @param {import('better-sqlite3').Database} db — Conexión a SQLite abierta.
 *   @param {Object} param — Datos del evento.
 *   @param {number} param.eventId — ID del evento (lo que vino por query string /ingest?id=...).
 *   @param {number} param.pid — PID del proceso worker que procesó el evento.
 *   @param {number} [param.processingMs] — Tiempo que tardó el Worker Thread en procesar (ms).
 *   @param {string} [param.status='completed'] — Estado del evento: 'completed' o 'failed_dispatch'.
 *
 * ¿Qué devuelve?
 *   @returns {import('better-sqlite3').RunResult} Objeto con info de la ejecución
 *     (ejemplo: lastInsertRowid, changes).
 */
function insertIngestEvent(db, { eventId, pid, processingMs, status = "completed" }) {
  // db.prepare() crea una "consulta preparada" (prepared statement).
  // Las ? son placeholders que se reemplazan con valores en stmt.run().
  // Esto evita SQL Injection, porque SQLite trata los valores como DATOS,
  // no como parte del comando SQL.
  const stmt = db.prepare(
    "INSERT INTO ingest_events (event_id, pid, processing_ms, status) VALUES (?, ?, ?, ?)"
  );
  // processingMs ?? null: si processingMs es undefined, usamos null (no dejamos undefined).
  return stmt.run(eventId, pid, processingMs ?? null, status);
}

module.exports = { insertIngestEvent };
