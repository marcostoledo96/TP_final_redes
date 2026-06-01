/**
 * Worker entrypoint — thin wrapper around the shared HTTP bootstrap.
 * Inicializa el Worker Thread fijo antes de levantar el servidor HTTP.
 */

const { initWorkerThreadService } = require("./services/worker-thread.service");
const { startServer } = require("./server");

initWorkerThreadService();
startServer();
console.log(`Worker ${process.pid} started (Worker Thread fijo activo)`);
