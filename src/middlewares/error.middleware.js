// ===== SECCIÓN: error.middleware.js — Middleware de Errores =====
/**
 * Middleware de manejo de errores (Error Handler).
 *
 * ¿Qué es esto?
 *   En Express, un middleware con 4 parámetros (err, req, res, next)
 *   se considera un "error handler". Express lo invoca automáticamente
 *   cuando algún middleware anterior lanza un error con next(err) o throw.
 *
 * ¿Qué hace?
 *   - Si el error es una instancia de ApiError, responde con el statusCode
 *     y código definidos en el error (ej: 400 BAD_REQUEST).
 *   - Si el error es cualquier otra cosa (bug inesperado), responde 500
 *     y loguea el error en consola para debugging.
 *
 * ¿Por qué es importante?
 *   Sin este middleware, Express respondería con un HTML feo de error
 *   por defecto. Nosotros controlamos la respuesta y la hacemos consistente
 *   (siempre JSON con la misma estructura).
 */

const { ApiError } = require("../utils/api-error");

/**
 * Maneja errores que ocurrieron durante el procesamiento de un request.
 *
 * @param {Error} err — El error lanzado (puede ser ApiError o Error genérico).
 * @param {import("express").Request} req — Request HTTP.
 * @param {import("express").Response} res — Response para enviar JSON.
 * @param {import("express").NextFunction} _next — Función next (no usada acá, pero requerida por Express).
 */
function errorMiddleware(err, req, res, _next) {
  // Si el error es un ApiError conocido, respondemos con su statusCode.
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      ok: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  // Si el error es inesperado (bug), logueamos TODO en consola para poder
  // diagnosticar y respondemos 500 genérico (sin exponer detalles del bug).
  console.error("Unhandled error:", err);
  return res.status(500).json({
    ok: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal server error",
    },
  });
}

module.exports = { errorMiddleware };
