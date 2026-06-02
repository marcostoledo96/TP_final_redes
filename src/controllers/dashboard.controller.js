// ===== SECCIÓN: dashboard.controller.js — Controller del Dashboard =====
/**
 * Controller del dashboard.
 * Renderiza la vista EJS con métricas leídas desde SQLite y contadores globales.
 *
 * ¿Qué hace?
 *   Llama al servicio buildDashboardData() para armar el paquete de datos
 *   completo (métricas, eventos, reinicios), y luego renderiza la vista
 *   dashboard.ejs pasándole esos datos.
 *
 * ¿Qué es res.render()?
 *   Es un método de Express que busca un archivo de plantilla (EJS en este caso),
 *   lo compila con los datos que le pasamos, y devuelve HTML al navegador.
 *   El navegador no ve el código EJS; solo ve el HTML resuelto.
 */

const { buildDashboardData } = require("../services/dashboard.service");

/**
 * Renderiza el dashboard EJS con datos actualizados.
 *
 * @param {import("express").Request} req — Request HTTP.
 * @param {import("express").Response} res — Response para renderizar HTML.
 */
async function dashboardController(req, res) {
  const data = await buildDashboardData();
  res.render("dashboard", data);
}

module.exports = { dashboardController };
