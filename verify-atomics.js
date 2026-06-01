/**
 * Script rápido de verificación: prueba Worker Thread + SharedArrayBuffer + Atomics.add
 */
const { Worker } = require("worker_threads");
const path = require("path");
const os = require("os");

const sharedBuffer = new SharedArrayBuffer(4);
const counter = new Int32Array(sharedBuffer);

const workerPath = path.join(__dirname, "src", "workers", "compute.worker.js");

const worker = new Worker(workerPath, {
  workerData: { sharedBuffer },
});

const ITERATIONS = 5;
let completed = 0;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log("Contador antes:", Atomics.load(counter, 0));

  for (let i = 0; i < ITERATIONS; i++) {
    worker.postMessage({ type: "COMPUTE", eventId: i + 1 });
  }

  worker.on("message", (msg) => {
    if (msg.type === "COMPUTE_DONE") {
      completed++;
      console.log(`Hecho evento ${msg.eventId}. Contador actual:`, Atomics.load(counter, 0));
      if (completed === ITERATIONS) {
        console.log("\nResultado final del contador:", Atomics.load(counter, 0));
        console.log("Esperado:", ITERATIONS);
        console.log(
          Atomics.load(counter, 0) === ITERATIONS ? "✅ PASS" : "❌ FAIL"
        );
        worker.terminate().then(() => process.exit(0));
      }
    }
  });
}

run();
