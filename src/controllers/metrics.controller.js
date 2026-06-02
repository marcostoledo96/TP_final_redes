// ===== SECCIÓN: metrics.controller.js — Controller de Métricas =====
/**
 * Controller de métricas.
 * Responde 200 con JSON que incluye localCounter y globalCounter.
 *
 * ¿Qué hace?
 *   Llama al servicio fetchMetrics() que combina contadores locales
 *   (SharedArrayBuffer) con globales (via IPC al Primary), y devuelve
 *   todo en un JSON con status 200.
 */

const { fetchMetrics } = require("../services/metrics.service");

/**
 * Obtiene y devuelve las métricas del sistema.
 *
 * @param {import("express").Request} req — Request HTTP.
 * @param {import("express").Response} res — Response para enviar JSON.
 */
async function metricsController(req, res) {
  const metrics = await fetchMetrics();
  res.status(200).json(metrics);
}

module.exports = { metricsController };
