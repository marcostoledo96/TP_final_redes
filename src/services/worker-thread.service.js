// ===== SECCIÓN: Servicio del Worker Thread fijo =====
/**
 * Servicio que administra un Worker Thread fijo por proceso Cluster Worker.
 * Dispatcheo asíncrono, contador atómico sobre SharedArrayBuffer,
 * y bounded respawn ante salidas inesperadas.
 *
 * ¿Qué es esto?
 *   Este archivo es el CORAZÓN de la concurrencia del TP. Administra el
 *   Worker Thread que hace los cálculos pesados de CPU (simulados con un loop).
 *
 * ¿Por qué NO se crea un Worker Thread por request?
 *   -------------------------------------------------------------------
 *   ¡ESTO ES LA CLAVE DEL TP!
 *   -------------------------------------------------------------------
 *   Crear un Worker Thread es COSTOSO: el sistema operativo debe reservar
 *   memoria, inicializar un nuevo intérprete de JavaScript, cargar módulos,
 *   etc. Si creáramos un Worker Thread por cada request /ingest, con 500
 *   requests concurrentes tendríamos 500 Threads consumiendo memoria.
 *   Eso "mataría" al servidor.
 *
 *   En cambio, creamos UN SOLO Worker Thread por proceso Cluster Worker
 *   ("Worker Thread fijo"). Ese thread recibe todas las tareas por una
 *   cola de mensajes (parentPort/postMessage). Es como tener un empleado
 *   dedicado que hace las tareas una por una, pero siempre es el mismo.
 *
 *   Analogía:
 *     Crear un Worker Thread por request = contratar y despedir un
 *     chef nuevo por cada plato. Es lento y costoso.
 *     Worker Thread fijo = tenés un chef fijo que cocina un plato,
 *     luego otro, luego otro... sin parar.
 */

const { Worker } = require("worker_threads");
const path = require("path");

// ===== SECCIÓN: Constantes de configuración =====

// Máximo de reinicios consecutivos permitidos. Si el Worker Thread
// se cae más de 3 veces seguidas, dejamos de intentar re-spawnearlo.
// Esto evita un "bucle infinito" de reinicios si hay un bug grave.
const MAX_CONSECUTIVE_RESTARTS = 3;

// ===== SECCIÓN: Variables de estado del servicio =====

// Referencia al objeto Worker Thread actual (o null si no existe).
let worker = null;

// Flag: ¿el Worker Thread fue terminado (kill)?
let terminated = false;

// Flag: ¿estamos en medio de un re-spawn?
let restarting = false;

// Contador de reinicios consecutivos (se resetea cuando un spawn tiene éxito).
let consecutiveRestarts = 0;

// Mapa de trabajos (jobs) que están siendo procesados por el Worker Thread.
// Clave: jobId único. Valor: { eventId, startTime }.
// Sirve para calcular cuánto tardó cada trabajo cuando termina.
/** @type {Map<number, {eventId: number, startTime: number}>} */
const pendingJobs = new Map();

// Contador autoincremental para generar IDs únicos de trabajo.
let nextJobId = 1;

// ===== SECCIÓN: SharedArrayBuffer y Atomics =====
//
// ¿Qué es SharedArrayBuffer?
//   Es un tipo especial de ArrayBuffer (bloque de memoria) que puede ser
//   COMPARTIDO entre múltiples threads. Normalmente, en JavaScript cada
//   "contexto" (pestaña del navegador, proceso Node.js, Worker Thread)
//   tiene su propia memoria aislada. SharedArrayBuffer rompe esa barrera
//   y permite que DOS threads lean y escriban la MISMA memoria.
//
// ¿Por qué se usa con Atomics?
//   Si dos threads escriben al mismo tiempo en la misma dirección de memoria,
//   puede ocurrir una "condición de carrera" (race condition): el resultado
//   final depende de quién llegó primero, y puede ser incorrecto.
//   Atomics nos da operaciones atómicas (indivisibles) que el procesador
//   garantiza que se ejecutan de forma segura, sin que otro thread se
//   interponga en el medio.
//
// En este TP: creamos un SharedArrayBuffer de 4 bytes (1 entero de 32 bits)
// y lo pasamos al Worker Thread por workerData. Ambos (el proceso Cluster
// Worker y su Worker Thread) pueden leer y escribir ese entero de forma segura.

// SharedArrayBuffer compartido entre el proceso Cluster Worker y su Worker Thread
const sharedBuffer = new SharedArrayBuffer(4);   // 4 bytes = 1 entero de 32 bits
const counter = new Int32Array(sharedBuffer);      // Interpretamos esos 4 bytes como entero

// ===== SECCIÓN: Spawn y manejo del Worker Thread =====

/**
 * Crea un nuevo Worker Thread, configurándolo con event listeners.
 *
 * ¿Qué hace?
 *   Instancia un nuevo Worker Thread con el archivo compute.worker.js
 *   y le pasa el SharedArrayBuffer por workerData. Luego registra
 *   listeners para errores, salidas y mensajes completados.
 *
 * ¿Qué espera recibir?
 *   No recibe parámetros; usa el sharedBuffer del closure del módulo.
 *
 * ¿Qué devuelve?
 *   @returns {import("worker_threads").Worker} El objeto Worker creado.
 */
function _spawnWorker() {
  // Ruta absoluta al archivo del Worker Thread (compute.worker.js).
  const workerPath = path.join(__dirname, "..", "workers", "compute.worker.js");

  // Creamos el Worker Thread.
  // workerData se pasa al Worker Thread y está disponible allí como
  // require("worker_threads").workerData. Es la forma de pasar datos
  // iniciales al thread sin usar postMessage.
  const w = new Worker(workerPath, {
    workerData: { sharedBuffer },
  });

  // --- Listener de ERROR ---
  // Si ocurre un error interno del Worker Thread (excepción no capturada),
  //Node.js emite el evento "error". Intentamos re-spawnear.
  w.on("error", (err) => {
    console.error(`[Worker ${process.pid}] Worker Thread error:`, err.message);
    // _guardianExitedHandled evita que manejemos el mismo evento dos veces
    // (por ejemplo, si "error" y "exit" se disparan casi juntos).
    if (!w._guardianExitedHandled) {
      w._guardianExitedHandled = true;
      _handleWorkerExit();
    }
  });

  // --- Listener de EXIT ---
  // Se dispara cuando el Worker Thread termina, sea por éxito o error.
  w.on("exit", (code) => {
    console.error(`[Worker ${process.pid}] Worker Thread exited with code ${code}`);
    if (!w._guardianExitedHandled) {
      w._guardianExitedHandled = true;
      _handleWorkerExit();
    }
  });

  // --- Listener de MESSAGE ---
  // Se dispara cuando el Worker Thread envía un mensaje de vuelta
  // usando parentPort.postMessage(). Acá manejamos COMPUTE_DONE.
  w.on("message", (msg) => {
    if (msg.type === "COMPUTE_DONE") {
      // Buscamos el trabajo en pendingJobs para calcular su duración.
      const start = pendingJobs.get(msg.jobId);
      const processingMs = start ? Date.now() - start.startTime : null;
      pendingJobs.delete(msg.jobId);

      // IPC al Primary: notificar que el evento fue procesado.
      // process.send() solo existe cuando estamos en un cluster worker.
      // En modo standalone (npm run dev) no hay Primary, así que verificamos.
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

/**
 * Maneja la salida inesperada del Worker Thread intentando re-spawnearlo.
 *
 * ¿Qué hace?
 *   Marca el worker como terminado, controla el límite de reinicios
 *   consecutivos, y si está permitido, crea un nuevo Worker Thread.
 *
 * ¿Por qué existe?
 *   Centraliza la lógica de recuperación para que _spawnWorker() solo
 *   se encargue de crear el thread, y esta función decida SI se re-spawnea.
 */
function _handleWorkerExit() {
  terminated = true;
  worker = null;

  // Si ya estamos re-spawneando o superamos el límite, nos rendimos.
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

/**
 * Inicializa el Worker Thread fijo por primera vez.
 *
 * ¿Qué hace?
 *   Crea el Worker Thread si no existe todavía y resetea los contadores
 *   de reinicio. Se llama UNA SOLA VEZ por cada Cluster Worker, al arrancar.
 */
function initWorkerThreadService() {
  if (worker) {
    console.warn(`[Worker ${process.pid}] Worker Thread ya está inicializado`);
    return;
  }
  worker = _spawnWorker();
  terminated = false;
  consecutiveRestarts = 0;
}

/**
 * Verifica si el Worker Thread está sano y disponible para recibir tareas.
 *
 * ¿Qué hace?
 *   Devuelve true solo si el worker existe, no fue terminado, y no está
 *   en medio de un reinicio.
 *
 * ¿Por qué es importante?
 *   Antes de enviar una tarea, el controller de /inget verifica esto.
 *   Si el Worker Thread está caído, responde 503 (Service Unavailable)
 *   en vez de colgar o fallar silenciosamente.
 *
 * @returns {boolean} true si el Worker Thread está sano.
 */
function isHealthy() {
  return worker !== null && !terminated && !restarting;
}

/**
 * Envía una tarea al Worker Thread para que la procese.
 *
 * ¿Qué hace?
 *   Crea un jobId único, lo guarda en pendingJobs con la hora de inicio,
 *   y le envía un mensaje COMPUTE al Worker Thread por postMessage.
 *
 * ¿Por qué guardamos pendingJobs?
 *   Para poder calcular cuánto tardó el Worker Thread en procesar la tarea
 *   cuando nos responde con COMPUTE_DONE.
 *
 * @param {number} eventId — El ID del evento a procesar.
 * @throws {Error} "WORKER_UNAVAILABLE" si el Worker Thread no está sano.
 */
function dispatch(eventId) {
  if (!isHealthy()) {
    throw new Error("WORKER_UNAVAILABLE");
  }

  const jobId = nextJobId++;
  pendingJobs.set(jobId, { eventId, startTime: Date.now() });
  worker.postMessage({ type: "COMPUTE", jobId, eventId });
}

/**
 * Lee el contador local del SharedArrayBuffer usando Atomics.load().
 *
 * ¿Qué hace?
 *   Usa Atomics.load() para leer de forma segura el valor actual del
 *   contador compartido entre el Cluster Worker y su Worker Thread.
 *
 * ¿Por qué Atomics.load() y no counter[0] directamente?
 *   Atomics.load() garantiza que la lectura sea "atómica" y coherente
 *   con las escrituras del Worker Thread. Sin Atomics, el motor V8
 *   podría optimizar y leer un valor cacheado (stale) que no refleje
 *   la última escritura del otro thread.
 *
 * @returns {number} El valor actual del contador local.
 */
function getLocalCounter() {
  return Atomics.load(counter, 0);
}

/**
 * Devuelve el PID del proceso actual (Cluster Worker).
 *
 * @returns {number} process.pid
 */
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
