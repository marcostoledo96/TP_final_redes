const { createApp } = require("./app");
const { initWorkerThreadService } = require("./services/worker-thread.service");

/**
 * Start the HTTP server.
 * @param {Object} options
 * @param {number} [options.port] - Port to listen on (defaults to process.env.PORT || 8080)
 * @returns {import("http").Server}
 */
function startServer(options = {}) {
  const app = createApp();
  const port = options.port || process.env.PORT || 8080;
  const server = app.listen(port, () => {
    console.log(`Worker ${process.pid} listening on ${port}`);
  });

  function gracefulShutdown(signal) {
    console.log(`\n[Worker ${process.pid}] Received ${signal}. Closing HTTP server...`);
    server.close(() => {
      console.log(`[Worker ${process.pid}] HTTP server closed.`);
      process.exit(0);
    });

    // If connections are still active after a short buffer, force exit so the shutdown doesn't hang
    setTimeout(() => {
      console.error(`[Worker ${process.pid}] Forced exit after shutdown timeout.`);
      process.exit(1);
    }, 5000);
  }

  // Listen for Primary's coordinated shutdown message
  process.on("message", (msg) => {
    if (msg && msg.type === "SHUTDOWN") {
      console.log(`[Worker ${process.pid}] Received SHUTDOWN from Primary.`);
      gracefulShutdown("SHUTDOWN");
    }
  });

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  return server;
}

// Standalone mode: auto-init Worker Thread so /ingest works in dev mode
if (require.main === module) {
  initWorkerThreadService();
  startServer();
}

module.exports = { startServer };
