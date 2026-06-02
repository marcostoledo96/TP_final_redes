// ===== SECCIÓN: validate-ingest-query.middleware.js — Validación de Query =====
/**
 * Middleware que valida el query param "id" en GET /ingest?id=...
 *
 * ¿Qué es esto?
 *   Express permite registrar middleware ANTES del controller final.
 *   Este middleware revisa que el parámetro "id" exista, sea un número
 *   y sea positivo. Si no cumple, lanza un ApiError que captura el
 *   errorMiddleware (500 handler) y responde 400 Bad Request.
 *
 * ¿Por qué 400 Bad Request?
 *   El código HTTP 400 significa que el CLIENTE envió datos incorrectos.
 *   Es la forma de decirle al usuario: "che, revisá lo que me estás mandando".
 *   No es culpa del servidor; es culpa del request.
 *
 * ¿Por qué guardamos req.validatedId?
 *   Para evitar re-validar en el controller. El middleware ya hizo el trabajo
 *   de convertir a número y verificar. El controller confía en que validatedId
 *   es seguro de usar.
 *
 * Analogía:
 *   Es como el seguridad de un edificio: revisa tu DNI antes de dejarte pasar.
 *   Si no lo tenés o está vencido, te para en la puerta.
 */

const { ApiError } = require("../utils/api-error");

/**
 * Valida que req.query.id sea un entero positivo.
 *
 * @param {import("express").Request} req — Request con req.query.id.
 * @param {import("express").Response} _res — Response (no usado directamente, se pasa al next).
 * @param {import("express").NextFunction} next — Función que pasa al siguiente middleware o controller.
 */
function validateIngestQuery(req, _res, next) {
  // req.query.id puede ser string (viene del query string).
  const raw = req.query.id;

  // Intentamos convertir a número.
  const id = Number(raw);

  // ¿El parámetro existe y no está vacío?
  if (raw === undefined || raw === null || raw === "") {
    return next(new ApiError(400, "INVALID_QUERY", "Query param id is required"));
  }

  // ¿Es un número finito, entero y positivo?
  // Number.isFinite(id) rechaza Infinity, NaN, -Infinity.
  // Number.isInteger(id) rechaza decimales (1.5, 3.14).
  // id <= 0 rechaza negativos y cero.
  if (!Number.isFinite(id) || !Number.isInteger(id) || id <= 0) {
    return next(
      new ApiError(400, "INVALID_QUERY", "Query param id must be a positive integer")
    );
  }

  // Guardamos el ID validado en el request para que el controller lo use.
  req.validatedId = id;

  // next() sin argumentos pasa al siguiente middleware/controller.
  // Si next recibe un argumento (next(err)), salta al error handler.
  next();
}

module.exports = { validateIngestQuery };
