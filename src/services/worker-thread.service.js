/**
 * Servicio que administra un Worker Thread fijo por proceso Cluster Worker.
 * Dispatcheo asíncrono, contador atómico sobre SharedArrayBuffer,
 * y bounded respawn ante salidas inesperadas.
 */
const { Worker } = require("worker_threads");
const path = require("path");

const MAX_CONSECUTIVE_RESTARTS = 3;

let worker = null;
let terminated = false;
let restarting = false;
let consecutiveRestarts = 0;

/** @type {Map<number, {eventId: number, startTime: number}>} */
const pendingJobs = new Map();

let nextJobId = 1;

// SharedArrayBuffer compartido entre el proceso Cluster Worker y su Worker Thread
const sharedBuffer = new SharedArrayBuffer(4);
const counter = new Int32Array(sharedBuffer);

function _spawnWorker() {
  const workerPath = path.join(__dirname, "..", "workers", "compute.worker.js");

  const w = new Worker(workerPath, {
    workerData: { sharedBuffer },
  });

  w.on("error", (err) => {
    console.error(`[Worker ${process.pid}] Worker Thread error:`, err.message);
    if (!w._guardianExitedHandled) {
      w._guardianExitedHandled = true;
      _handleWorkerExit();
    }
  });

  w.on("exit", (code) => {
    console.error(`[Worker ${process.pid}] Worker Thread exited with code ${code}`);
    if (!w._guardianExitedHandled) {
      w._guardianExitedHandled = true;
      _handleWorkerExit();
    }
  });

  w.on("message", (msg) => {
    if (msg.type === "COMPUTE_DONE") {
      const start = pendingJobs.get(msg.jobId);
      const processingMs = start ? Date.now() - start.startTime : null;
      pendingJobs.delete(msg.jobId);

      // IPC al Primary: notificar que el evento fue procesado
      if (process.send) {
        process.send({
          type: "INGEST_COMPLETED",
          eventId: msg.eventId,
          pid: process.pid,
          processingMs,
        });
      }
    }
  });

  return w;
}

function _handleWorkerExit() {
  terminated = true;
  worker = null;
  if (restarting || consecutiveRestarts >= MAX_CONSECUTIVE_RESTARTS) {
    console.warn(`[Worker ${process.pid}] Worker Thread recovery exhausted or already restarting.`);
    return;
  }
  restarting = true;
  consecutiveRestarts++;
  console.log(`[Worker ${process.pid}] Respawning Worker Thread (attempt ${consecutiveRestarts}/${MAX_CONSECUTIVE_RESTARTS})...`);

  try {
    worker = _spawnWorker();
    terminated = false;
    restarting = false;
    console.log(`[Worker ${process.pid}] Worker Thread respawned.`);
  } catch (err) {
    console.error(`[Worker ${process.pid}] Failed to respawn Worker Thread:`, err.message);
    restarting = false;
  }
}

function initWorkerThreadService() {
  if (worker) {
    console.warn(`[Worker ${process.pid}] Worker Thread ya está inicializado`);
    return;
  }
  worker = _spawnWorker();
  terminated = false;
  consecutiveRestarts = 0;
}

function isHealthy() {
  return worker !== null && !terminated && !restarting;
}

function dispatch(eventId) {
  if (!isHealthy()) {
    throw new Error("WORKER_UNAVAILABLE");
  }

  const jobId = nextJobId++;
  pendingJobs.set(jobId, { eventId, startTime: Date.now() });
  worker.postMessage({ type: "COMPUTE", jobId, eventId });
}

function getLocalCounter() {
  return Atomics.load(counter, 0);
}

function getLocalPid() {
  return process.pid;
}

module.exports = {
  initWorkerThreadService,
  isHealthy,
  dispatch,
  getLocalCounter,
  getLocalPid,
};
