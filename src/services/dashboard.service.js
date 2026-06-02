// ===== SECCIÓN: dashboard.service.js — Servicio del Dashboard =====
/**
 * Servicio del dashboard.
 * Lee datos de SQLite y obtiene contadores locales/globales.
 *
 * ¿Qué es esto?
 *   Este servicio armá el "paquete" de datos que el controller de /dashboard
 *   necesita para renderizar la vista EJS. Combina:
 *   - Métricas globales del Primary (vía IPC).
 *   - Contador local del Worker Thread (vía SharedArrayBuffer).
 *   - Últimos eventos de ingest de SQLite (lectura directa).
 *   - Últimos reinicios de workers de SQLite (lectura directa).
 *
 * ¿Por qué lee de SQLite directamente si solo el Primary escribe?
 *   El Primary es el único que ESCRIBE en SQLite, pero cualquier proceso
 *   (incluido un Cluster Worker) puede LEER del archivo .sqlite de forma
 *   segura cuando usa WAL mode. WAL permite lecturas concurrentes sin
 *   bloquear las escrituras. Esto es una ventaja de SQLite con journal_mode=WAL.
 *
 * Analogía:
 *   Es como si el gerente escribiera en el libro de cuentas, pero cualquier
 *   mozo puede leer el libro cuando el gerente no está escribiendo. Con WAL,
 *   el gerente escribe en un papel aparte (.wal) y luego sincroniza,
 *   así que los mozos leen el libro principal sin problemas.
 */

const path = require("path");
const Database = require("better-sqlite3");
const { getLocalCounter } = require("./worker-thread.service");

const IPC_TIMEOUT_MS = 2000;

// Ruta absoluta al archivo de SQLite. Usamos lectura directa para el dashboard.
const DB_PATH = path.join(__dirname, "..", "..", "data", "the-guardian.sqlite");

/**
 * Lee métricas globales del Primary vía IPC.
 *
 * ¿Qué hace?
 *   Envía un mensaje GET_METRICS al Primary y espera METRICS_RESPONSE.
 *   Es similar a metrics.service.js pero solo devuelve los campos
 *   que necesita el dashboard (sin los aliases legacy).
 *
 * ¿Qué devuelve?
 *   @returns {Promise<{
 *     acceptedEvents: number|null,
 *     completedEvents: number|null,
 *     failedEvents: number|null,
 *     totalRestarts: number|null,
 *     activeWorkers: number|null,
 *   }>}
 */
function fetchGlobalMetrics() {
  return new Promise((resolve) => {
    if (!process.send) {
      return resolve({ acceptedEvents: null, completedEvents: null, failedEvents: null, totalRestarts: null, activeWorkers: null });
    }

    let resolved = false;

    function onMessage(msg) {
      if (!resolved && msg && msg.type === "METRICS_RESPONSE") {
        resolved = true;
        process.removeListener("message", onMessage);
        resolve({
          acceptedEvents: msg.acceptedEvents,
          completedEvents: msg.completedEvents,
          failedEvents: msg.failedEvents,
          totalRestarts: msg.totalRestarts,
          activeWorkers: msg.activeWorkers,
        });
      }
    }

    process.on("message", onMessage);
    process.send({ type: "GET_METRICS" });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        process.removeListener("message", onMessage);
        resolve({ acceptedEvents: null, completedEvents: null, failedEvents: null, totalRestarts: null, activeWorkers: null });
      }
    }, IPC_TIMEOUT_MS);
  });
}

/**
 * Obtiene los últimos eventos de ingest de SQLite.
 *
 * ¿Qué hace?
 *   Ejecuta un SELECT sobre la tabla ingest_events, ordenando por fecha
 *   descendente (más reciente primero) y limitando a N resultados.
 *
 * @param {import('better-sqlite3').Database} db — Conexión a SQLite abierta.
 * @param {number} [limit=20] — Cuántos eventos traer (default: 20).
 * @returns {Array<{id: number, event_id: number, pid: number, status: string, completed_at: string}>}
 */
function getRecentEvents(db, limit = 20) {
  const stmt = db.prepare(
    "SELECT id, event_id, pid, status, completed_at FROM ingest_events ORDER BY completed_at DESC LIMIT ?"
  );
  return stmt.all(limit);
}

/**
 * Obtiene los últimos reinicios de Workers de SQLite.
 *
 * ¿Qué hace?
 *   Ejecuta un SELECT sobre la tabla worker_restarts, ordenando por fecha
 *   descendente. Muestra cuándo y por qué se reinició un worker.
 *
 * @param {import('better-sqlite3').Database} db — Conexión a SQLite abierta.
 * @param {number} [limit=10] — Cuántos reinicios traer (default: 10).
 * @returns {Array<{id: number, old_pid: number|null, new_pid: number|null, code: number|null, signal: string|null, restarted_at: string}>}
 */
function getRecentRestarts(db, limit = 10) {
  const stmt = db.prepare(
    "SELECT id, old_pid, new_pid, code, signal, restarted_at FROM worker_restarts ORDER BY restarted_at DESC LIMIT ?"
  );
  return stmt.all(limit);
}

/**
 * Construye el objeto de datos para renderizar el dashboard.
 *
 * ¿Qué hace?
 *   1. Lee el contador local del Worker Thread.
 *   2. Pide métricas globales al Primary por IPC.
 *   3. Abre SQLite en modo lectura y trae últimos eventos y reinicios.
 *   4. Cierra la conexión a SQLite (importante para no dejar handles abiertos).
 *   5. Devuelve un objeto con TODO lo que la vista EJS necesita.
 *
 * ¿Qué devuelve?
 *   @returns {Promise<Object>} Objeto con métricas, eventos y reinicios.
 */
async function buildDashboardData() {
  // Contador local: cuántos eventos procesó el Worker Thread de ESTE proceso.
  const localCounter = getLocalCounter();
  const pid = process.pid;

  // Métricas globales del Primary (por IPC).
  const {
    acceptedEvents,
    completedEvents,
    failedEvents,
    totalRestarts,
    activeWorkers,
  } = await fetchGlobalMetrics();

  // ===== Lectura directa de SQLite =====
  // Leer de SQLite directamente en el Worker (sólo lectura, Primary es el único que escribe)
  // Como explicamos arriba, en modo WAL las lecturas concurrentes son seguras.
  let recentEvents = [];
  let recentRestarts = [];

  try {
    // Abrimos la base de datos SOLO para lectura.
    const db = new Database(DB_PATH);

    // Aplicamos los mismos PRAGMAs que usa el Primary para consistencia.
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 5000");

    recentEvents = getRecentEvents(db, 20);
    recentRestarts = getRecentRestarts(db, 10);

    // Cerramos la conexión para no dejar archivo abierto.
    db.close();
  } catch (err) {
    console.error(`[Dashboard ${process.pid}] Error leyendo SQLite:`, err.message);
  }

  return {
    // systemStatus: si completamos globales = todo ok; si no = "degraded".
    systemStatus: completedEvents !== null ? "ok" : "degraded",
    pid,
    localCounter,
    // Usamos el operador ?? (nullish coalescing) para reemplazar null por 0.
    // La diferencia con || es que ?? solo reemplaza null/undefined, no el 0.
    acceptedCount: acceptedEvents ?? 0,
    completedCount: completedEvents ?? 0,
    failedCount: failedEvents ?? 0,
    totalRestarts: totalRestarts ?? 0,
    activeWorkers: activeWorkers ?? 0,
    recentEvents,
    recentRestarts,
  };
}

module.exports = { buildDashboardData };
