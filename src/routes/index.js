const { healthRouter } = require("./health.routes");
const { ingestRouter } = require("./ingest.routes");
const { metricsRouter } = require("./metrics.routes");
const { dashboardRouter } = require("./dashboard.routes");

function mountRoutes(app) {
  app.use(healthRouter);
  app.use(ingestRouter);
  app.use(metricsRouter);
  app.use(dashboardRouter);
}

module.exports = { mountRoutes };