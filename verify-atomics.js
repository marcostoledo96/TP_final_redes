// ===== SECCIÓN: verify-atomics.js — Verificación de Worker Thread + Atomics =====
/**
 * Script rápido de verificación: prueba Worker Thread + SharedArrayBuffer + Atomics.add
 *
 * ¿Qué es esto?
 *   Es un script INDEPENDIENTE del servidor que verifica que la arquitectura
 *   de Worker Thread + SharedArrayBuffer + Atomics.add funcione correctamente.
 *   Lo podés correr con: node verify-atomics.js
 *
 * ¿Qué verifica?
 *   1. Que el Worker Thread se cree sin errores.
 *   2. Que reciba mensajes COMPUTE y los procese (loop de CPU).
 *   3. Que el contador del SharedArrayBuffer se incremente con Atomics.add().
 *   4. Que el contador final sea exactamente igual a la cantidad de requests.
 *
 * Analogía:
 *   Es como probar el motor del auto antes de salir a la ruta:
 *   aceleramos un poco, verificamos que funcione, y apagamos.
 */

const { Worker } = require("worker_threads");
const path = require("path");
const os = require("os");

// Creamos nuestro propio SharedArrayBuffer para este test.
// Es INDEPENDIENTE del que usa el servidor real.
const sharedBuffer = new SharedArrayBuffer(4);
const counter = new Int32Array(sharedBuffer);

// Ruta al Worker Thread (el mismo que usa el servidor en producción).
const workerPath = path.join(__dirname, "src", "workers", "compute.worker.js");

// Creamos el Worker Thread, pasándole nuestro sharedBuffer.
const worker = new Worker(workerPath, {
  workerData: { sharedBuffer },
});

const ITERATIONS = 5;
let completed = 0;

/**
 * Función auxiliar para esperar N milisegundos.
 * Útil en tests para darle tiempo al Worker Thread de procesar.
 */
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ejecuta la verificación paso a paso.
 */
async function run() {
  // Leyemos el contador inicial con Atomics.load().
  // Usamos Atomics.load() en vez de counter[0] para leer de forma atómica
  // y coherente con las escrituras del Worker Thread.
  console.log("Contador antes:", Atomics.load(counter, 0));

  // Enviamos 5 tareas al Worker Thread.
  for (let i = 0; i < ITERATIONS; i++) {
    worker.postMessage({ type: "COMPUTE", eventId: i + 1 });
  }

  // Escuchamos los mensajes COMPUTE_DONE del Worker Thread.
  worker.on("message", (msg) => {
    if (msg.type === "COMPUTE_DONE") {
      completed++;
      // Mostramos el contador actual después de cada evento completado.
      // Usamos Atomics.load() para obtener el valor más reciente de forma segura.
      console.log(`Hecho evento ${msg.eventId}. Contador actual:`, Atomics.load(counter, 0));

      // Si completamos todas las iteraciones, mostramos el resultado final.
      if (completed === ITERATIONS) {
        console.log("\nResultado final del contador:", Atomics.load(counter, 0));
        console.log("Esperado:", ITERATIONS);
        console.log(
          Atomics.load(counter, 0) === ITERATIONS ? "✅ PASS" : "❌ FAIL"
        );
        // Terminamos el Worker Thread y salimos del proceso.
        worker.terminate().then(() => process.exit(0));
      }
    }
  });
}

run();
