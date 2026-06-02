// ===== SECCIÓN: not-found.middleware.js — Middleware de 404 =====
/**
 * Middleware de ruta no encontrada (404 Not Found).
 *
 * ¿Qué es esto?
 *   Este middleware se ejecuta cuando NINGUNA otra ruta capturó el request.
 *   Express lo pone al final de la cadena de middlewares con app.use().
 *
 * ¿Por qué responde JSON y no HTML?
 *   Porque este TP es principalmente una API. Si alguien pide /foobar,
 *   le devolvemos un JSON estructurado con "code" y "message" para que
 *   un cliente programado (script, frontend JavaScript) pueda parsearlo fácil.
 */

/**
 * Responde 404 JSON cuando la ruta no existe.
 *
 * @param {import("express").Request} req — Request HTTP.
 * @param {import("express").Response} res — Response para enviar JSON.
 */
function notFoundMiddleware(req, res) {
  res.status(404).json({
    ok: false,
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
    },
  });
}

module.exports = { notFoundMiddleware };
