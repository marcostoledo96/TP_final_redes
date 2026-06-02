// ===== SECCIÓN: worker-entry.js — Punto de entrada del Worker de Cluster =====
/**
 * ¿Qué es esto?
 *   Este archivo es el "envoltorio" que corre en CADA proceso worker del cluster.
 *   Cuando primary.js hace cluster.fork(), Node.js ejecuta primary.js de nuevo
 *   pero en modo worker (cluster.isPrimary === false). Ese worker entra en la
 *   rama "else" de primary.js, que hace require("./worker-entry").
 *
 * ¿Por qué existe como archivo separado?
 *   Separar el arranque del worker del Primary permite que el código sea más claro:
 *   primary.js se encarga de "gestionar" (fork, IPC, SQLite).
 *   worker-entry.js se encarga de "trabajar" (HTTP server, Worker Thread).
 *
 * Analogía:
 *   primary.js = gerente que contrata mozos.
 *   worker-entry.js = cada mozo que llega, se pone el delantal (Worker Thread)
 *                     y se para junto a la puerta listo para atender clientes.
 */

// Importamos el servicio que administra el Worker Thread fijo.
// Cada Cluster Worker tiene SU PROPIO Worker Thread (no comparten threads
// entre procesos del cluster).
const { initWorkerThreadService } = require("./services/worker-thread.service");

// Importamos la función que levanta el servidor HTTP de Express.
const { startServer } = require("./server");

// PASO 1: Inicializar el Worker Thread fijo.
// -----------------------------------------------------------------
// ¿Por qué ANTES de levantar el servidor?
//   Si llega un request a /ingest inmediatamente, el Worker Thread ya debe estar
//   listo para recibir tareas. Si lo creáramos "lazy" (a demanda), el primer
//   request podría fallar o tardar más de lo esperado.
initWorkerThreadService();

// PASO 2: Levantar el servidor HTTP.
// -----------------------------------------------------------------
// A partir de acá, este proceso worker escucha requests en el puerto compartido.
// El módulo cluster del kernel de Linux distribuye las conexiones entrantes
// entre todos los workers que comparten el puerto (balanceo round-robin).
startServer();

// Confirmación en consola para saber que este worker arrancó bien.
console.log(`Worker ${process.pid} started (Worker Thread fijo activo)`);
