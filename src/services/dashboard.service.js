/**
 * Servicio del dashboard.
 * Lee datos de SQLite y obtiene contadores locales/globales.
 */

const path = require("path");
const Database = require("better-sqlite3");
const { getLocalCounter } = require("./worker-thread.service");

const IPC_TIMEOUT_MS = 2000;

const DB_PATH = path.join(__dirname, "..", "..", "data", "the-guardian.sqlite");

/**
 * Lee métricas globales del Primary vía IPC.
 * @returns {Promise<{
 *   acceptedEvents: number|null,
 *   completedEvents: number|null,
 *   failedEvents: number|null,
 *   totalRestarts: number|null,
 *   activeWorkers: number|null,
 * }>}
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
 * @param {import('better-sqlite3').Database} db
 * @param {number} [limit=20]
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
 * @param {import('better-sqlite3').Database} db
 * @param {number} [limit=10]
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
 * @returns {Promise<Object>}
 */
async function buildDashboardData() {
  const localCounter = getLocalCounter();
  const pid = process.pid;

  const {
    acceptedEvents,
    completedEvents,
    failedEvents,
    totalRestarts,
    activeWorkers,
  } = await fetchGlobalMetrics();

  // Leer de SQLite directamente en el Worker (sólo lectura, Primary es el único que escribe)
  let recentEvents = [];
  let recentRestarts = [];

  try {
    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 5000");

    recentEvents = getRecentEvents(db, 20);
    recentRestarts = getRecentRestarts(db, 10);

    db.close();
  } catch (err) {
    console.error(`[Dashboard ${process.pid}] Error leyendo SQLite:`, err.message);
  }

  return {
    systemStatus: completedEvents !== null ? "ok" : "degraded",
    pid,
    localCounter,
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
