/**
 * Controller del dashboard.
 * Renderiza la vista EJS con métricas leídas desde SQLite y contadores globales.
 */

const { buildDashboardData } = require("../services/dashboard.service");

async function dashboardController(req, res) {
  const data = await buildDashboardData();
  res.render("dashboard", data);
}

module.exports = { dashboardController };
