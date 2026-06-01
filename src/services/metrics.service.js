/**
 * Servicio de métricas.
 * Obtiene el contador local del Worker Thread y consulta al Primary por métricas globales.
 */

const { getLocalCounter } = require("./worker-thread.service");

const IPC_TIMEOUT_MS = 2000;

/**
 * Consulta métricas al via IPC al Primary.
 * @returns {Promise<{
 *   pid: number,
 *   localCounter: number,
 *   acceptedEvents: number | null,
 *   completedEvents: number | null,
 *   failedEvents: number | null,
 *   totalRestarts: number | null,
 *   activeWorkers: number | null,
 *   globalCounter: number | null,
 *   totalEvents: number | null,
 * }>}
 */
function fetchMetrics() {
  return new Promise((resolve) => {
    const localCounter = getLocalCounter();
    const pid = process.pid;

    if (!process.send) {
      // No IPC available (standalone mode)
      return resolve({
        pid,
        localCounter,
        acceptedEvents: null,
        completedEvents: null,
        failedEvents: null,
        totalRestarts: null,
        activeWorkers: null,
        globalCounter: null,
        totalEvents: null,
      });
    }

    let resolved = false;

    function onMessage(msg) {
      if (!resolved && msg && msg.type === "METRICS_RESPONSE") {
        resolved = true;
        process.removeListener("message", onMessage);
        resolve({
          pid,
          localCounter,
          acceptedEvents: msg.acceptedEvents,
          completedEvents: msg.completedEvents,
          failedEvents: msg.failedEvents,
          totalRestarts: msg.totalRestarts,
          activeWorkers: msg.activeWorkers,
          // Legacy aliases for backward compatibility
          globalCounter: msg.globalCounter,
          totalEvents: msg.totalEvents,
        });
      }
    }

    process.on("message", onMessage);

    // Send request to Primary
    process.send({ type: "GET_METRICS" });

    // Fallback: si no responde a tiempo, devolvemos solo local
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        process.removeListener("message", onMessage);
        resolve({
          pid,
          localCounter,
          acceptedEvents: null,
          completedEvents: null,
          failedEvents: null,
          totalRestarts: null,
          activeWorkers: null,
          globalCounter: null,
          totalEvents: null,
        });
      }
    }, IPC_TIMEOUT_MS);
  });
}

module.exports = { fetchMetrics };
