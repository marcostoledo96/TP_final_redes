/**
 * Primary (master) entrypoint for cluster runtime.
 * Forks workers, tracks in-memory telemetry, self-heals, handles IPC,
 * persists to SQLite (Primary-only writes), and graceful shutdown.
 */

const cluster = require("cluster");
const os = require("os");

const { createDatabaseConnection } = require("./database/connection");
const { insertIngestEvent } = require("./models/ingest-event.model");
const { insertWorkerRestart } = require("./models/worker-restart.model");
const { insertSnapshot } = require("./models/metric-snapshot.model");

const GRACEFUL_TIMEOUT_MS = Number(process.env.GRACEFUL_TIMEOUT_MS) || 5000;

// Number of workers: half the CPUs, minimum 1
const workerCount = Math.max(1, Math.floor(os.cpus().length / 2));

// In-memory telemetry per PID: { forkedAt, restartCount, lastExit }
const telemetry = new Map();

// Global counters aggregated via IPC from all workers
let acceptedEvents = 0;
let completedEvents = 0;
let failedEvents = 0;
let totalRestarts = 0;

let shuttingDown = false;
let db = null;

function forkWorker(restartCountBase = 0) {
  const worker = cluster.fork();
  const pid = worker.process ? worker.process.pid : worker.id;
  telemetry.set(pid, {
    forkedAt: Date.now(),
    restartCount: restartCountBase,
    lastExit: null,
  });
  console.log(`[Primary ${process.pid}] Forked worker PID ${pid}`);
  return worker;
}

if (cluster.isPrimary) {
  // 1) Initialize SQLite BEFORE forking workers
  db = createDatabaseConnection();

  console.log(`[Primary ${process.pid}] Starting with ${workerCount} workers`);

  // Initial fork of all workers
  for (let i = 0; i < workerCount; i++) {
    forkWorker(0);
  }

  // Self-healing: replace dead workers unless we are shutting down
  cluster.on("exit", (worker, code, signal) => {
    const pid = worker.process ? worker.process.pid : null;
    console.log(`[Primary ${process.pid}] Worker ${pid || worker.id} exited (code=${code}, signal=${signal})`);

    // Update last exit info for telemetry
    if (pid && telemetry.has(pid)) {
      const entry = telemetry.get(pid);
      entry.lastExit = { code, signal };
    }

    if (shuttingDown) {
      console.log(`[Primary ${process.pid}] Shutdown in progress — not replacing worker`);
      return;
    }

    totalRestarts++;

    // Fork replacement with incremented restartCount
    const oldEntry = pid ? telemetry.get(pid) : null;
    const restartCountBase = oldEntry ? oldEntry.restartCount + 1 : 0;
    const replacement = forkWorker(restartCountBase);
    const newPid = replacement.process ? replacement.process.pid : replacement.id;

    // Persist worker restart in SQLite (Primary only writes)
    if (pid && db) {
      try {
        insertWorkerRestart(db, { oldPid: pid, newPid, code, signal });
      } catch (err) {
        console.error(`[Primary ${process.pid}] Error inserting worker restart:`, err.message);
      }
    }
  });

  // IPC: aggregate counters and persist to SQLite
  cluster.on("message", (worker, message) => {
    if (!message || !message.type) return;

    if (message.type === "INGEST_ACCEPTED") {
      acceptedEvents++;
      console.log(`[Primary ${process.pid}] INGEST_ACCEPTED from PID ${message.pid} — eventId=${message.eventId}, acceptedEvents=${acceptedEvents}`);
      return;
    }

    if (message.type === "INGEST_COMPLETED") {
      completedEvents++;

      // Persist event in SQLite with processing_ms
      if (db) {
        try {
          insertIngestEvent(db, {
            eventId: message.eventId,
            pid: message.pid,
            processingMs: message.processingMs,
            status: "completed",
          });
        } catch (err) {
          console.error(`[Primary ${process.pid}] Error inserting ingest event:`, err.message);
        }
      }

      console.log(`[Primary ${process.pid}] INGEST_COMPLETED from PID ${message.pid} — eventId=${message.eventId}, completedEvents=${completedEvents}`);
      return;
    }

    if (message.type === "INGEST_FAILED") {
      failedEvents++;

      if (db) {
        try {
          insertIngestEvent(db, {
            eventId: message.eventId,
            pid: message.pid,
            status: "failed_dispatch",
          });
        } catch (err) {
          console.error(`[Primary ${process.pid}] Error inserting failed ingest event:`, err.message);
        }
      }

      console.log(`[Primary ${process.pid}] INGEST_FAILED from PID ${message.pid} — eventId=${message.eventId}, reason=${message.reason}, failedEvents=${failedEvents}`);
      return;
    }

    if (message.type === "GET_METRICS") {
      const workerPid = worker.process ? worker.process.pid : worker.id;
      const activeWorkers = Object.values(cluster.workers || {})
        .filter((w) => !w.isDead())
        .length;
      // Respond directly to the worker that asked
      worker.send({
        type: "METRICS_RESPONSE",
        acceptedEvents,
        completedEvents,
        failedEvents,
        totalRestarts,
        activeWorkers,
        pid: process.pid,
        // Legacy aliases for backward compatibility
        globalCounter: completedEvents,
        totalEvents: acceptedEvents,
      });
      return;
    }
  });

  function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[Primary ${process.pid}] Received ${signal}. Shutting down gracefully...`);

    // Persist snapshot before exit
    if (db) {
      try {
        insertSnapshot(db, {
          totalAccepted: acceptedEvents,
          totalCompleted: completedEvents,
          totalFailed: failedEvents,
        });
        console.log(`[Primary ${process.pid}] Metric snapshot saved.`);
      } catch (err) {
        console.error(`[Primary ${process.pid}] Error saving snapshot:`, err.message);
      }
    }

    const workers = Object.values(cluster.workers || {});
    if (workers.length === 0) {
      console.log(`[Primary ${process.pid}] No workers to shut down.`);
      process.exit(0);
    }

    for (const worker of workers) {
      if (worker.isConnected && worker.isConnected()) {
        try {
          worker.send({ type: 'SHUTDOWN' });
        } catch (err) {
          console.error(`[Primary ${process.pid}] Failed to send SHUTDOWN to worker:`, err.message);
        }
      }
    }

    // Force-kill any worker that did not exit within the timeout
    const timeouts = new Set();
    for (const worker of workers) {
      const timeout = setTimeout(() => {
        timeouts.delete(timeout);
        if (!worker.isDead()) {
          console.log(`[Primary ${process.pid}] Force-killing worker ${worker.process.pid} after timeout`);
          worker.process.kill("SIGKILL");
        }
      }, GRACEFUL_TIMEOUT_MS);
      timeouts.add(timeout);
    }

    // Wait for all workers to actually be gone
    const checkInterval = setInterval(() => {
      const alive = Object.values(cluster.workers || {}).filter(
        (w) => !w.isDead()
      );
      if (alive.length === 0) {
        clearInterval(checkInterval);
        for (const t of timeouts) clearTimeout(t);
        console.log(`[Primary ${process.pid}] All workers exited. Shutdown complete.`);
        process.exit(0);
      }
    }, 200);
    // Safety net: if somehow interval never clears, force exit after 2x timeout
    setTimeout(() => {
      clearInterval(checkInterval);
      for (const t of timeouts) clearTimeout(t);
      console.error(`[Primary ${process.pid}] Forced exit after extended shutdown timeout.`);
      process.exit(1);
    }, GRACEFUL_TIMEOUT_MS * 2);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
} else {
  // This branch should not normally be hit because workers are launched via worker-entry.js,
  // but we keep it safe: if the primary file is somehow executed as a worker, just boot.
  require("./worker-entry");
}
