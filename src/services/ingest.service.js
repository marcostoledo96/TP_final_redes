// ===== SECCIÓN: ingest.service.js — Servicio de Ingest =====
/**
 * Servicio de ingest.
 * Dispara el Worker Thread y decide si se acepta (202) o se rechaza (503).
 *
 * ¿Qué es esto?
 *   Cuando alguien hace GET /ingest?id=4500, el controller llama a este servicio
 *   con el ID ya validado. Este servicio decide si el Worker Thread está sano
 *   y, si lo está, le encola la tarea.
 *
 * ¿Qué hace paso a paso?
 *   1. Verifica si el Worker Thread fijo está sano (isHealthy()).
 *   2. Si NO está sano, envía un mensaje INGEST_FAILED al Primary (por IPC)
 *      para que lo guarde en SQLite y devuelve { accepted: false }.
 *   3. Si está sano, llama a dispatch(id) para enviar la tarea al Worker Thread.
 *   4. Si dispatch falla, envía INGEST_FAILED al Primary.
 *   5. Si todo sale bien, envía INGEST_ACCEPTED al Primary y devuelve éxito.
 *
 * ¿Por qué 202 Accepted y no 200 OK?
 *   202 significa: "Request recibido y aceptado para procesamiento, pero
 *   NO está completo todavía". Es el código HTTP correcto para operaciones
 *   asíncronas: el cliente sabe que la tarea está "en cola" y se va a
 *   procesar en segundo plano.
 *
 * Analogía:
 *   Es como dejar tu auto en un lavadero: te dan un ticket (202 Accepted)
 *   y vos sabés que lo van a lavar, pero todavía no está listo.
 */

const { dispatch, getLocalPid, isHealthy } = require("./worker-thread.service");

/**
 * Intenta aceptar un evento de ingest y encolarlo en el Worker Thread.
 *
 * ¿Qué espera recibir?
 *   @param {number} id — El ID del evento (ya validado por el middleware).
 *
 * ¿Qué devuelve?
 *   @returns {{accepted: boolean, ok?: boolean, status?: string, id?: number, pid?: number}|
 *             {accepted: boolean, reason: string}} Objeto con:
 *     - accepted: true si el Worker Thread recibió la tarea, false si falló.
 *     - ok/status/id/pid: solo si accepted === true.
 *     - reason: solo si accepted === false (ej: "worker_unavailable").
 */
function acceptIngest(id) {
  // PASO 1: Verificar que el Worker Thread esté sano.
  if (!isHealthy()) {
    // El Worker Thread está caído o se está reiniciando.
    // Emitimos un mensaje IPC al Primary para que registre el fallo.
    // process.send solo existe en modo cluster (dentro de un worker).
    if (process.send) {
      process.send({
        type: "INGEST_FAILED",
        eventId: id,
        pid: getLocalPid(),
        reason: "worker_unavailable",
      });
    }
    return {
      accepted: false,
      reason: "worker_unavailable",
    };
  }

  // PASO 2: Intentar encolar la tarea en el Worker Thread.
  try {
    dispatch(id);
  } catch (err) {
    // Si dispatch falla (ej: WORKER_UNAVAILABLE), notificamos al Primary
    // y devolvemos error al controller.
    if (process.send) {
      process.send({
        type: "INGEST_FAILED",
        eventId: id,
        pid: getLocalPid(),
        reason: err.message,
      });
    }
    return {
      accepted: false,
      reason: err.message,
    };
  }

  // PASO 3: Notificar al Primary que el evento fue aceptado.
  // El Primary suma +1 a acceptedEvents y eventualmente lo persiste en SQLite.
  if (process.send) {
    process.send({
      type: "INGEST_ACCEPTED",
      eventId: id,
      pid: getLocalPid(),
      // acceptedAt es útil para debugging: saber cuándo el worker aceptó.
      acceptedAt: Date.now(),
    });
  }

  // Devolvemos éxito al controller, que responderá HTTP 202.
  return {
    accepted: true,
    ok: true,
    status: "accepted",
    id,
    pid: getLocalPid(),
  };
}

module.exports = { acceptIngest };
