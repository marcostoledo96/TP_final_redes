// ===== SECCIÓN: metrics.service.js — Servicio de Métricas =====
/**
 * Servicio de métricas.
 * Obtiene el contador local del Worker Thread y consulta al Primary por métricas globales.
 *
 * ¿Qué es esto?
 *   Cuando alguien hace GET /metrics, el controller llama a este servicio.
 *   Este servicio hace DOS cosas:
 *   1. Lee el contador LOCAL del Worker Thread (el que comparte con su
 *      Worker Thread vía SharedArrayBuffer).
 *   2. Pide al PRIMARY (por IPC) los contadores GLOBALES: cuántos eventos
 *      aceptaron TODOS los workers, cuántos completaron, cuántos fallaron, etc.
 *
 * ¿Por qué necesitamos ambos?
 *   - El contador local es "chico": solo cuenta los eventos que PROCESÓ
 *     el Worker Thread de ESTE proceso. Es rápido de leer (Atomics.load).
 *   - Los contadores globales son "grandes": el Primary los agregó recibiendo
 *     mensajes IPC de TODOS los workers. Son la "verdad" del sistema completo.
 *
 * Analogía:
 *   El localCounter es el contador de platos de CADA mozo.
 *   El globalCounter es la suma de platos de TODOS los mozos (la lleva el gerente).
 */

// Importamos la función que lee el contador local del SharedArrayBuffer.
const { getLocalCounter } = require("./worker-thread.service");

// Timeout para esperar la respuesta del Primary por IPC.
// Si el Primary no responde en 2 segundos, devolvemos solo las métricas locales.
const IPC_TIMEOUT_MS = 2000;

/**
 * Consulta métricas al Primary vía IPC y devuelve locals + globals.
 *
 * ¿Qué hace?
 *   1. Lee el contador local con getLocalCounter().
 *   2. Si estamos en modo standalone (sin cluster), devuelve solo local.
 *   3. Si estamos en cluster, envía un mensaje GET_METRICS al Primary.
 *   4. Espera la respuesta METRICS_RESPONSE. Si llega, devuelve todo junto.
 *   5. Si no responde a tiempo (timeout), devuelve solo local.
 *
 * ¿Por qué devuelve null para los globales en standalone?
 *   En modo dev (npm run dev) no hay Primary ni cluster, así que no hay
 *   nadie que lleve contadores globales. Devolvemos null para que el
 *   frontend sepa que esos datos no están disponibles.
 *
 * ¿Qué devuelve?
 *   @returns {Promise<<{
 *     pid: number,                  // PID del worker que respondió
 *     localCounter: number,         // Contador local de este worker
 *     acceptedEvents: number|null,  // Global: eventos aceptados (null = no disponible)
 *     completedEvents: number|null, // Global: eventos completados
 *     failedEvents: number|null,    // Global: eventos fallidos
 *     totalRestarts: number|null,   // Global: reinicios de workers
 *     activeWorkers: number|null,   // Global: cantidad de workers vivos
 *     globalCounter: number|null,  // Alias legacy de completedEvents
 *     totalEvents: number|null,    // Alias legacy de acceptedEvents
 *   }>}
 */
function fetchMetrics() {
  return new Promise((resolve) => {
    // Obtenemos el contador local del Worker Thread (SharedArrayBuffer).
    const localCounter = getLocalCounter();
    const pid = process.pid;

    // Si process.send no existe, estamos en modo standalone (sin cluster).
    // No hay IPC disponible, así que devolvemos solo lo local.
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

    // Flag para evitar resolver la promesa más de una vez (double-resolve).
    let resolved = false;

    /**
     * Listener temporal de mensajes IPC.
     * Se registra con process.on("message", ...) y se remueve cuando
     * llega la respuesta o cuando se agota el timeout.
     */
    function onMessage(msg) {
      if (!resolved && msg && msg.type === "METRICS_RESPONSE") {
        resolved = true;
        // removeListener es IMPORTANTE: si no lo hacemos, cada request a
        // /metrics deja un listener acumulado, causando memory leak (fuga de memoria).
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
          // Estos nombres existen para no romper código antiguo que esperaba
          // las claves "globalCounter" y "totalEvents".
          globalCounter: msg.globalCounter,
          totalEvents: msg.totalEvents,
        });
      }
    }

    // Registramos el listener de IPC.
    process.on("message", onMessage);

    // Enviamos el request al Primary.
    // El Primary recibe esto en cluster.on("message", ...) y responde
    // con worker.send({ type: "METRICS_RESPONSE", ... }).
    // Send request to Primary
    process.send({ type: "GET_METRICS" });

    // Fallback: si el Primary no responde en IPC_TIMEOUT_MS (2 segundos),
    // devolvemos solo métricas locales. Esto evita que el request se "cuelgue"
    // indefinidamente si el Primary está ocupado o caído.
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
