// ===== SECCIÓN: Primary — El "capo" del Cluster =====
/**
 * Punto de entrada del Primary (master) para el runtime de cluster.
 *
 * ¿Qué es esto?
 *   Este archivo es el CEREBRO del TP. Cuando ejecutás "npm start",
 *   Node.js carga ESTE archivo primero. Acá es donde nace el Primary
 *   (también llamado "master") del cluster.
 *
 * ¿Por qué existe?
 *   En Node.js, por defecto, todo corre en UN SOLO hilo (event loop).
 *   Eso significa que si tenés 8 núcleos de CPU, 7 se quedan mirando.
 *   Con el módulo "cluster", podemos crear varios procesos Node.js
 *   (llamados "workers") que comparten el mismo puerto HTTP.
 *   El Primary se encarga de "forkear" (crear) workers, vigilar que no
 *   se caigan, y agregar los contadores globales que le envían por IPC.
 *
 * Analogía:
 *   Imaginá un restaurante. El Primary es el gerente (no atiende mesas).
 *   Los Workers son los mozos (atienden clientes). Si un mozo se enferma,
 *   el gerente contrata uno nuevo. El gerente también lleva la cuenta total
 *   de platos servidos por TODOS los mozos.
 *
 * Funciones principales:
 *   - Fork workers iniciales.
 *   - Auto-recuperación (self-healing) si un worker muere.
 *   - Recepción de mensajes IPC para contadores globales.
 *   - Escritura centralizada en SQLite (solo el Primary escribe).
 *   - Shutdown graceful: cierra todo de forma controlada.
 */

// ===== SECCIÓN: Importaciones =====

// "cluster" es un módulo NATIVO de Node.js (no necesita npm install).
// Nos da la API para crear procesos hijos y manejar el balanceo de carga.
const cluster = require("cluster");

// "os" también es nativo. Nos permite saber cuántas CPUs tiene la máquina
// para decidir cuántos workers crear.
const os = require("os");

// Conexión a SQLite. SOLO el Primary escribe en la base de datos.
// Los Workers nunca tocan SQLite directamente; le avisan al Primary
// por IPC y el Primary persiste. Esto evita corrupciones de concurrencia.
const { createDatabaseConnection } = require("./database/connection");

// Modelos: funciones que encapsulan las consultas SQL.
// Separar SQL en archivos "model" es una buena práctica de backend.
const { insertIngestEvent } = require("./models/ingest-event.model");
const { insertWorkerRestart } = require("./models/worker-restart.model");
const { insertSnapshot } = require("./models/metric-snapshot.model");

// ===== SECCIÓN: Configuración y estado global del Primary =====

// Si la variable de entorno GRACEFUL_TIMEOUT_MS existe, la usamos;
// si no, el timeout default es 5000 ms (5 segundos).
// El graceful timeout es cuánto tiempo esperamos a que los workers
// terminen sus requests antes de matarlos forzosamente.
const GRACEFUL_TIMEOUT_MS = Number(process.env.GRACEFUL_TIMEOUT_MS) || 5000;

// Number of workers: half the CPUs, minimum 1
// Cantidad de workers: la mitad de CPUs redondeada hacia abajo, mínimo 1.
// ¿Por qué la mitad y no todas? Porque cada Cluster Worker TIENE ADENTRO
// un Worker Thread que consume CPU intensivamente. Entonces cada Cluster
// Worker en realidad usa 2 "hilos" de CPU (uno para HTTP y otro para cálculo).
// Si tenés 8 CPUs, creamos 4 Cluster Workers = 8 "hilos" totales.
const workerCount = Math.max(1, Math.floor(os.cpus().length / 2));

// In-memory telemetry per PID: { forkedAt, restartCount, lastExit }
// Telemetría en memoria: un Mapa que guarda info de cada worker vivo.
// Clave: PID del proceso worker. Valor: objeto con forkedAt, restartCount, etc.
// Esto es solo para monitoreo; la "verdad" persistente está en SQLite.
const telemetry = new Map();

// Global counters aggregated via IPC from all workers
// Contadores globales agregados vía IPC desde TODOS los workers.
// Estas variables viven solo en la memoria del Primary y se persisten
// en SQLite al apagar (shutdown) para no perder estadísticas.
let acceptedEvents = 0;   // Cuántos eventos fueron ACEPTADOS por los workers
let completedEvents = 0;  // Cuántos eventos fueron PROCESADOS por los Worker Threads
let failedEvents = 0;     // Cuántos eventos FALLARON (worker no disponible, etc.)
let totalRestarts = 0;    // Cuántos workers se reiniciaron durante la vida del Primary

// Flag para saber si estamos apagando. Si es true, no re-spawneamos workers
// que se mueran (porque es un cierre controlado, no un error).
let shuttingDown = false;

// Referencia a la base de datos SQLite. Solo el Primary la usa para escribir.
let db = null;

// ===== SECCIÓN: Funciones del ciclo de vida del Cluster =====

/**
 * Crea un nuevo proceso worker usando cluster.fork().
 *
 * ¿Qué hace?
 *   "Fork" significa "bifurcar". El Primary crea una copia de sí mismo
 *   (mismo código, mismo archivo), pero esa copia se ejecuta como un proceso
 *   SEPARADO en el sistema operativo. Cada worker tiene su propio PID,
 *   su propia memoria, su propio Event Loop, y su propio Worker Thread.
 *
 * ¿Por qué existe?
 *   Necesitamos una función centralizada para registrar cada nuevo worker
 *   en nuestra telemetría en memoria. Así sabemos cuándo nació, cuántas
 *   veces se reinició, etc.
 *
 * @param {number} [restartCountBase=0] — Cuántos reinicios previos tuvo este worker
 *   (sirve para llevar la cuenta cuando reemplazamos un worker caído).
 * @returns {cluster.Worker} El objeto worker creado por cluster.fork()
 */
function forkWorker(restartCountBase = 0) {
  // cluster.fork() lanza el mismo archivo (primary.js) pero en modo "worker".
  // Node.js sabe diferenciar porque cluster.isPrimary es false en el hijo.
  const worker = cluster.fork();

  // Cada proceso en Linux tiene un PID (Process ID) único.
  // Si todavía no está listo, usamos el ID interno de cluster como fallback.
  const pid = worker.process ? worker.process.pid : worker.id;

  // Guardamos en el Mapa de telemetría cuándo nació y su estado.
  telemetry.set(pid, {
    forkedAt: Date.now(),           // Timestamp de nacimiento
    restartCount: restartCountBase,   // Cuántas veces se reinició
    lastExit: null,                 // Info del último cierre (se llena si muere)
  });
  console.log(`[Primary ${process.pid}] Forked worker PID ${pid}`);
  return worker;
}

// ===== SECCIÓN: Lógica del Primary (solo si somos el proceso principal) =====

if (cluster.isPrimary) {
  // 1) Initialize SQLite BEFORE forking workers
  // PASO 1: Inicializar SQLite ANTES de crear los workers.
  // -----------------------------------------------------------------
  // ¿Por qué antes? Porque los workers pueden empezar a llegar requests
  // inmediatamente y el Primary necesita estar listo para persistir.
  // Además, better-sqlite3 abre el archivo de base de datos y crea las tablas
  // si no existen (definido en connection.js).
  db = createDatabaseConnection();

  console.log(`[Primary ${process.pid}] Starting with ${workerCount} workers`);

  // Initial fork of all workers
  // PASO 2: Creación inicial de todos los workers.
  // -----------------------------------------------------------------
  // Hacemos un loop for para fork() la cantidad calculada de workers.
  // Cada worker va a ejecutar la rama "else" de este if (más abajo),
  // que a su vez requiere worker-entry.js y levanta el servidor HTTP.
  for (let i = 0; i < workerCount; i++) {
    forkWorker(0);
  }

  // ===== SECCIÓN: Auto-recuperación (Self-healing) =====
  //
  // "cluster.on('exit', ...)" se dispara cuando un worker muere
  // (sea por error, por SIGKILL, o porque salió por su cuenta).
  //
  // ¿Por qué es importante?
  //   Si un worker se cae por un error inesperado, el Primary lo detecta
  //   y crea uno nuevo automáticamente. Esto hace al sistema RESILIENTE.
  //
  // Analogía: si un mozo se cae de la escalera, el gerente contrata otro
  //           inmediatamente para que el restaurante siga funcionando.
  // -----------------------------------------------------------------
  // Self-healing: replace dead workers unless we are shutting down
  cluster.on("exit", (worker, code, signal) => {
    // Obtenemos el PID del worker que murió.
    const pid = worker.process ? worker.process.pid : null;

    console.log(`[Primary ${process.pid}] Worker ${pid || worker.id} exited (code=${code}, signal=${signal})`);

    // Update last exit info for telemetry
    // Actualizamos la telemetría con los detalles del cierre.
    if (pid && telemetry.has(pid)) {
      const entry = telemetry.get(pid);
      entry.lastExit = { code, signal };
    }

    // Si estamos apagando el sistema de forma controlada, NO reemplazamos
    // al worker. Simplemente dejamos que muera y listo.
    if (shuttingDown) {
      console.log(`[Primary ${process.pid}] Shutdown in progress — not replacing worker`);
      return;
    }

    totalRestarts++;

    // Fork replacement with incremented restartCount
    // Creamos el reemplazo, llevando la cuenta de reinicios del anterior.
    const oldEntry = pid ? telemetry.get(pid) : null;
    const restartCountBase = oldEntry ? oldEntry.restartCount + 1 : 0;
    const replacement = forkWorker(restartCountBase);
    const newPid = replacement.process ? replacement.process.pid : replacement.id;

    // Persist worker restart in SQLite (Primary only writes)
    // Persistimos el reinicio en SQLite.
    // Solo el Primary escribe; los Workers nunca tocan SQLite directamente.
    if (pid && db) {
      try {
        insertWorkerRestart(db, { oldPid: pid, newPid, code, signal });
      } catch (err) {
        console.error(`[Primary ${process.pid}] Error inserting worker restart:`, err.message);
      }
    }
  });

  // ===== SECCIÓN: IPC — Comunicación entre Workers y Primary =====
  //
  // ¿Qué es IPC?
  //   IPC = Inter-Process Communication (comunicación entre procesos).
  //   En Node.js, cuando usamos cluster, cada worker puede enviar mensajes
  //   al Primary usando process.send({...}) y el Primary recibe esos
  //   mensajes con cluster.on("message", ...).
  //
  // ¿Por qué usar IPC en vez de que cada worker escriba en SQLite?
  //   1. Concurrencia: varios procesos escribiendo al mismo archivo SQLite
  //      puede causar corrupción o deadlocks (bloqueos mutuos).
  //   2. Centralización: el Primary es la "fuente de la verdad" global.
  //   3. Rendimiento: SQLite con WAL soporta MUCHAS lecturas, pero las
  //      escrituras concurrentes son más complicadas. Con IPC serializamos
  //      las escrituras de forma natural (el Primary las hace de a una).
  //
  // Mensajes que manejamos:
  //   INGEST_ACCEPTED  → Un worker aceptó un evento (lo encoló en el Worker Thread).
  //   INGEST_COMPLETED → Un Worker Thread terminó de procesar un evento.
  //   INGEST_FAILED    → Un evento no pudo ser procesado (worker caído, etc.).
  //   GET_METRICS      → Un worker pide métricas globales para responder /metrics.
  // -----------------------------------------------------------------
  // IPC: aggregate counters and persist to SQLite
  cluster.on("message", (worker, message) => {
    // Si el mensaje no tiene tipo, lo ignoramos (mensaje extraño).
    if (!message || !message.type) return;

    // --- INGEST_ACCEPTED ---
    // Cuando un worker recibe un request /ingest y el Worker Thread está sano,
    // acepta el evento y le avisa al Primary: "sumá uno al acceptedEvents".
    if (message.type === "INGEST_ACCEPTED") {
      acceptedEvents++;
      console.log(`[Primary ${process.pid}] INGEST_ACCEPTED from PID ${message.pid} — eventId=${message.eventId}, acceptedEvents=${acceptedEvents}`);
      return;
    }

    // --- INGEST_COMPLETED ---
    // Cuando el Worker Thread termina el cálculo pesado, el worker le avisa
    // al Primary: "terminé, guardá el evento en SQLite y sumá uno a completados".
    if (message.type === "INGEST_COMPLETED") {
      completedEvents++;

      // Persist event in SQLite with processing_ms
      // Persistimos el evento en SQLite. Guardamos ID, PID del worker que lo procesó,
      // cuánto tardó (processingMs), y el estado "completed".
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

    // --- INGEST_FAILED ---
    // Si el Worker Thread está caído o no puede procesar, el worker le avisa
    // al Primary: "falló, guardá el evento como failed_dispatch".
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

    // --- GET_METRICS ---
    // Cuando alguien pide GET /metrics, el worker le pregunta al Primary:
    // "¿cuántos eventos aceptados, completados, fallidos, reinicios y workers
    // activos hay en total?". El Primary responde con un objeto JSON
    // que el worker luego devuelve al cliente HTTP.
    if (message.type === "GET_METRICS") {
      const workerPid = worker.process ? worker.process.pid : worker.id;

      // Contamos cuántos workers siguen vivos (no están muertos).
      const activeWorkers = Object.values(cluster.workers || {})
        .filter((w) => !w.isDead())
        .length;

      // Respond directly to the worker that asked
      // Respondemos DIRECTAMENTE a ESE worker que preguntó.
      // El worker recibe este mensaje en su process.on("message", ...).
      worker.send({
        type: "METRICS_RESPONSE",
        acceptedEvents,
        completedEvents,
        failedEvents,
        totalRestarts,
        activeWorkers,
        pid: process.pid,
        // Legacy aliases for backward compatibility
        // Alias heredados para compatibilidad hacia atrás.
        // Antes se llamaban "globalCounter" y "totalEvents" en alguna parte;
        // mantenemos ambos nombres para que no rompa nada.
        globalCounter: completedEvents,
        totalEvents: acceptedEvents,
      });
      return;
    }
  });

  // ===== SECCIÓN: Shutdown Graceful (Apagado elegante) =====
  //
  // ¿Qué es un shutdown graceful?
  //   Es apagar el sistema SIN matar requests que están en progreso.
  //   Primero decimos a los workers: "no aceptes más requests nuevos",
  //   luego esperamos a que terminen los que están activos, y finalmente
  //   cerramos todo. Si un worker no responde a tiempo, lo forzamos.
  //
  // ¿Por qué es importante?
  //   En producción real, no queremos que un usuario que está haciendo un
  //   request vea un error porque el servidor se apagó justo en medio.
  //   Es una señal de calidad y profesionalismo.
  // -----------------------------------------------------------------

  /**
   * Apaga el sistema de forma controlada.
   *
   * @param {string} signal — El nombre de la señal recibida ("SIGTERM" o "SIGINT")
   */
  function shutdown(signal) {
    // Si ya estamos apagando, no hacemos nada (evita doble ejecución).
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`\n[Primary ${process.pid}] Received ${signal}. Shutting down gracefully...`);

    // Persist snapshot before exit
    // PASO 1: Guardar snapshot de métricas en SQLite antes de salir.
    // Así no perdemos estadísticas si el Primary se reinicia.
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

    // Si no hay workers, salimos directamente.
    if (workers.length === 0) {
      console.log(`[Primary ${process.pid}] No workers to shut down.`);
      process.exit(0);
    }

    // Enviamos a cada worker un mensaje SHUTDOWN para que cierren sus servidores HTTP.
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
    // PASO 2: Si algún worker no termina dentro del timeout, lo matamos.
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
    // PASO 3: Revisamos cada 200 ms si todos los workers ya terminaron.
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
    // Red de seguridad: si por algún motivo el interval nunca se limpia,
    // forzamos la salida después de 2x el timeout.
    setTimeout(() => {
      clearInterval(checkInterval);
      for (const t of timeouts) clearTimeout(t);
      console.error(`[Primary ${process.pid}] Forced exit after extended shutdown timeout.`);
      process.exit(1);
    }, GRACEFUL_TIMEOUT_MS * 2);
  }

  // Registramos los listeners para las señales del sistema operativo.
  // SIGTERM: señal de "por favor, terminate" (enviada por Docker, systemd, etc.).
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  // SIGINT: señal de "interrupción" (cuando apretás Ctrl+C en la terminal).
  process.on("SIGINT", () => shutdown("SIGINT"));
} else {
  // ===== SECCIÓN: Rama del Worker (proceso hijo) =====
  //
  // Si este archivo se ejecuta como worker (cluster.isPrimary === false),
  // entramos acá. Normalmente los workers se lanzan con worker-entry.js,
  // pero esta rama es un "guardia de seguridad": si alguien corre primary.js
  // de forma inesperada como worker, simplemente arranca el servidor.
  //
  // require("./worker-entry") carga worker-entry.js, que a su vez carga
  // el servicio del Worker Thread y levanta el servidor HTTP.
  // This branch should not normally be hit because workers are launched via worker-entry.js,
  // but we keep it safe: if the primary file is somehow executed as a worker, just boot.
  require("./worker-entry");
}
