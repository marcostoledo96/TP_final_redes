/**
 * Worker Thread que ejecuta cálculo pesado CPU-bound.
 * Recibe tareas por parentPort y actualiza contador atómico sobre SharedArrayBuffer.
 */
const { parentPort, workerData } = require("worker_threads");

// workerData.sharedBuffer provee el SharedArrayBuffer pasado desde el servicio principal
const sharedBuffer = workerData.sharedBuffer;
const counter = new Int32Array(sharedBuffer);

parentPort.on("message", (msg) => {
  if (msg.type !== "COMPUTE") {
    return;
  }

  const eventId = msg.eventId;
  const jobId = msg.jobId;

  // Simulación de trabajo pesado: ~10 millones de iteraciones
  for (let i = 0; i < 10_000_000; i++) {
    // No-op de CPU
  }

  // Incremento atómico seguro entre Worker Thread y Cluster Worker
  Atomics.add(counter, 0, 1);

  parentPort.postMessage({
    type: "COMPUTE_DONE",
    jobId,
    eventId,
  });
});
