// ===== SECCIÓN: routes/index.js — Registro central de rutas =====
/**
 * ¿Qué es esto?
 *   Este archivo importa TODAS las rutas de la aplicación y las monta
 *   en la instancia de Express mediante una función única: mountRoutes().
 *
 * ¿Por qué existe?
 *   En vez de importar cada router directamente en app.js, centralizamos
 *   todo acá. Así app.js no necesita saber cuántas rutas hay ni cómo se
 *   llaman: solo llama mountRoutes(app) y listo. Es más limpio.
 *
 * Analogía:
 *   Es como el organizador de menús que conecta cada sección del restaurante
 *   (carnes, pastas, postres) con la recepción principal. La cocina principal
 *   (app.js) solo le dice "montate todo".
 */

const { healthRouter } = require("./health.routes");
const { ingestRouter } = require("./ingest.routes");
const { metricsRouter } = require("./metrics.routes");
const { dashboardRouter } = require("./dashboard.routes");

/**
 * Monta todas las rutas en la aplicación Express.
 *
 * ¿Qué hace?
 *   Registra cada router en el orden: health, ingest, metrics, dashboard.
 *   El orden importa: las rutas se evalúan de arriba hacia abajo.
 *
 * @param {import("express").Application} app — La instancia de Express.
 */
function mountRoutes(app) {
  app.use(healthRouter);
  app.use(ingestRouter);
  app.use(metricsRouter);
  app.use(dashboardRouter);
}

module.exports = { mountRoutes };
