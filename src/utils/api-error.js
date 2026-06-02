// ===== SECCIÓN: api-error.js — Clase de errores de API =====
/**
 * ApiError — Clase personalizada para errores HTTP de la API.
 *
 * ¿Qué es esto?
 *   En Node.js, el objeto Error nativo solo tiene message y stack.
 *   Nosotros necesitamos más info para responder HTTP consistentemente:
 *   - statusCode: qué código HTTP devolver (400, 404, 500, etc.).
 *   - code: un identificador interno (ej: "INVALID_QUERY", "NOT_FOUND").
 *   - message: descripción legible para el usuario.
 *
 * ¿Por qué extendemos Error?
 *   Para que instanceof funcione: errorMiddleware.js usa
 *   "if (err instanceof ApiError)" para decidir si es un error controlado
 *   o un bug inesperado.
 *
 * Uso típico:
 *   throw new ApiError(400, "INVALID_QUERY", "id must be a positive integer");
 *
 * Analogía:
 *   Es como un ticket de soporte que incluye: severidad (statusCode),
 *   categoría (code), y descripción del problema (message).
 */

class ApiError extends Error {
  /**
   * Crea un error de API.
   *
   * @param {number} statusCode — Código HTTP (400, 404, 500, etc.).
   * @param {string} code — Código interno del error (ej: "INVALID_QUERY").
   * @param {string} message — Mensaje descriptivo para el usuario.
   */
  constructor(statusCode, code, message) {
    // Llamamos al constructor de Error con el mensaje.
    // Esto setea this.message y crea el stack trace.
    super(message);

    this.statusCode = statusCode;
    this.code = code;
  }
}

module.exports = { ApiError };
