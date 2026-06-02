// ===== SECCIÓN: health.controller.js — Controller de Health Check =====
/**
 * ¿Qué es un controller?
 *   En el patrón MVC (Model-View-Controller), el controller es la capa que
 *   recibe el request HTTP, llama al servicio para obtener datos,
 *   y decide qué responder al cliente (status code, JSON, HTML, etc.).
 *
 *   NO debe contener lógica de negocio compleja. Solo "orquesta":
 *   recibe, delega al service, responde.
 */

const { getHealth } = require("../services/health.service");

/**
 * Responde al health check con JSON y status 200.
 *
 * @param {import("express").Request} req — Objeto request de Express (contiene headers, query, etc.).
 * @param {import("express").Response} res — Objeto response de Express (para enviar la respuesta).
 */
function healthController(req, res) {
  // Llamamos al servicio y respondemos JSON 200 inmediatamente.
  res.status(200).json(getHealth());
}

module.exports = { healthController };
