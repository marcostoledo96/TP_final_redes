/**
 * Controller de ingest.
 * Responde 202 Accepted solo si la petición fue aceptada para procesamiento.
 * Responde 503 Service Unavailable si el Worker Thread no está disponible.
 */

const { acceptIngest } = require("../services/ingest.service");

function ingestController(req, res) {
  const id = req.validatedId;
  const result = acceptIngest(id);

  if (result.accepted) {
    return res.status(202).json({
      ok: true,
      status: "accepted",
      id,
      pid: result.pid,
    });
  }

  return res.status(503).json({
    ok: false,
    error: {
      code: "WORKER_UNAVAILABLE",
      message: "Worker Thread is unavailable; try again later",
    },
  });
}

module.exports = { ingestController };
