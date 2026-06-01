/**
 * Controller de métricas.
 * Responde 200 con JSON que incluye localCounter y globalCounter.
 */

const { fetchMetrics } = require("../services/metrics.service");

async function metricsController(req, res) {
  const metrics = await fetchMetrics();
  res.status(200).json(metrics);
}

module.exports = { metricsController };
