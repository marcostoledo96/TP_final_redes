/**
 * Servicio de ingest.
 * Dispara el Worker Thread y decide si se acepta (202) o se rechaza (503).
 */
const { dispatch, getLocalPid, isHealthy } = require("./worker-thread.service");

function acceptIngest(id) {
  if (!isHealthy()) {
    // Emitir IPC de fallo si Primary está disponible
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

  try {
    dispatch(id);
  } catch (err) {
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

  // Notificar al Primary que fue aceptado
  if (process.send) {
    process.send({
      type: "INGEST_ACCEPTED",
      eventId: id,
      pid: getLocalPid(),
      acceptedAt: Date.now(),
    });
  }

  return {
    accepted: true,
    ok: true,
    status: "accepted",
    id,
    pid: getLocalPid(),
  };
}

module.exports = { acceptIngest };
