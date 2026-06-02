// ===== SECCIÓN: ingest.controller.js — Controller de Ingest =====
/**
 * Controller de ingest.
 * Responde 202 Accepted solo si la petición fue aceptada para procesamiento.
 * Responde 503 Service Unavailable si el Worker Thread no está disponible.
 *
 * ¿Qué hace?
 *   Recibe el request de /ingest?id=..., extrae el ID validado por middleware,
 *   llama al servicio acceptIngest(), y decide el status HTTP según el resultado.
 *
 * ¿Por qué 202 y 503?
 *   - 202 Accepted = "Recibí tu pedido, lo encolé para proceso asíncrono".
 *     Es correcto para operaciones que no terminan inmediatamente.
 *   - 503 Service Unavailable = "El servicio no puede atenderte ahora"
 *     (en este caso, porque el Worker Thread está caído o reiniciándose).
 */

const { acceptIngest } = require("../services/ingest.service");

/**
 * Procesa una petición de ingest.
 *
 * @param {import("express").Request} req — Request con req.validatedId (seteado por middleware).
 * @param {import("express").Response} res — Response para enviar JSON.
 */
function ingestController(req, res) {
  // req.validatedId fue asignado por validateIngestQuery (middleware).
  // Ya sabemos que es un entero positivo, así que no hace falta re-validar.
  const id = req.validatedId;

  // Delegamos la decisión de aceptar/rechazar al servicio.
  const result = acceptIngest(id);

  // Si el Worker Thread está sano y encoló la tarea, respondemos 202.
  if (result.accepted) {
    return res.status(202).json({
      ok: true,
      status: "accepted",
      id,
      pid: result.pid,
    });
  }

  // Si el Worker Thread está caído o dispatch falló, respondemos 503.
  return res.status(503).json({
    ok: false,
    error: {
      code: "WORKER_UNAVAILABLE",
      message: "Worker Thread is unavailable; try again later",
    },
  });
}

module.exports = { ingestController };
