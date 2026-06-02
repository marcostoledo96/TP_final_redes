// ===== SECCIÓN: server.js — Levanta el servidor HTTP =====
/**
 * ¿Qué es esto?
 *   Este archivo crea la aplicación Express (usando createApp de app.js),
 *   la pone a escuchar en un puerto TCP, y maneja el shutdown elegante.
 *
 * ¿Por qué existe separado de app.js?
 *   app.js arma la "cocina"; server.js abre la "puerta del restaurante".
 *   Separarlos permite testear la app sin ocupar un puerto real de red.
 *   También permite que "npm start" cree workers (cluster) que cada uno
 *   corra server.js de forma independiente.
 *
 * ¿Cuándo corre como standalone vs dentro de cluster?
 *   - "npm run dev" → corre directamente server.js (modo standalone, 1 proceso).
 *   - "npm start" → primary.js crea workers, cada worker ejecuta worker-entry.js
 *     que a su vez requiere server.js. Todos los workers comparten el puerto.
 */

const { createApp } = require("./app");
const { initWorkerThreadService } = require("./services/worker-thread.service");

/**
 * Inicia el servidor HTTP escuchando en un puerto.
 *
 * ¿Qué hace?
 *   1. Crea la app Express con createApp().
 *   2. Llama a app.listen() para abrir un socket TCP y empezar a recibir requests.
 *   3. Registra manejadores de shutdown (SIGTERM, SIGINT, mensaje SHUTDOWN del Primary).
 *
 * ¿Qué espera recibir?
 *   @param {Object} [options={}] — Opciones de configuración.
 *   @param {number} [options.port] — Puerto en el que escuchar.
 *     Si no se pasa, usa process.env.PORT o el default 8080.
 *
 * ¿Qué devuelve?
 *   @returns {import("http").Server} El objeto servidor HTTP nativo de Node.js.
 *     Este objeto tiene métodos como .close() para dejar de escuchar.
 */
function startServer(options = {}) {
  // Creamos la instancia de Express ya configurada (rutas, middleware, vistas).
  const app = createApp();

  // Resolví el puerto: opciones > variable de entorno > default 8080.
  const port = options.port || process.env.PORT || 8080;

  // app.listen() es un atajo de Express que:
  // 1. Crea un servidor HTTP nativo de Node.js (require("http")).
  // 2. Lo pone a escuchar en el puerto indicado.
  // 3. Retorna el objeto servidor para poder cerrarlo luego.
  const server = app.listen(port, () => {
    console.log(`Worker ${process.pid} listening on ${port}`);
  });

  // ===== SECCIÓN: Shutdown Graceful del Worker =====
  //
  // ¿Por qué?
  //   Cuando el Primary decide apagar todo (Ctrl+C, SIGTERM, o deploy nuevo),
  //   envía a cada worker el mensaje SHUTDOWN. El worker debe dejar de aceptar
  //   requests nuevos, terminar los que están en progreso, y salir limpio.
  //
  // Analogía:
  //   El gerente dice "cierre, no entren más clientes". Los mozos atienden
  //   las mesas que ya están ocupadas y luego se van a casa.

  /**
   * Cierra el servidor HTTP de forma controlada.
   *
   * @param {string} signal — El nombre de la señal o motivo del cierre.
   */
  function gracefulShutdown(signal) {
    console.log(`\n[Worker ${process.pid}] Received ${signal}. Closing HTTP server...`);

    // server.close() deja de aceptar CONEXIONES NUEVAS.
    // Las conexiones activas siguen funcionando hasta que terminen.
    // Una vez que no queda ninguna, se ejecuta el callback.
    server.close(() => {
      console.log(`[Worker ${process.pid}] HTTP server closed.`);
      process.exit(0); // Salimos con código 0 = éxito.
    });

    // Fallback de seguridad: si hay conexiones "zombie" que nunca terminan,
    // después de 5 segundos forzamos la salida para que no se cuelgue.
    setTimeout(() => {
      console.error(`[Worker ${process.pid}] Forced exit after shutdown timeout.`);
      process.exit(1); // Código 1 = error (salida forzada).
    }, 5000);
  }

  // Escuchamos el mensaje SHUTDOWN coordinado por el Primary vía IPC.
  // Esto solo funciona cuando estamos dentro de un cluster (no standalone).
  process.on("message", (msg) => {
    if (msg && msg.type === "SHUTDOWN") {
      console.log(`[Worker ${process.pid}] Received SHUTDOWN from Primary.`);
      gracefulShutdown("SHUTDOWN");
    }
  });

  // SIGTERM: señal del sistema operativo (Docker stop, systemd stop, kill).
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

  // SIGINT: Ctrl+C en la terminal.
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  return server;
}

// ===== SECCIÓN: Modo Standalone =====
//
// ¿Qué es require.main === module?
//   Esto evalúa a "true" SOLO si ejecutamos este archivo directamente con
//   "node src/server.js". Si lo importamos con require() desde otro archivo
//   (como primary.js o worker-entry.js), esto es false y no se ejecuta.
//
// ¿Por qué inicializamos el Worker Thread acá?
//   En modo standalone no hay cluster, así que nadie más se encarga de
//   inicializar el Worker Thread. Debemos hacerlo nosotros antes de
//   que llegue el primer request a /ingest.
// Standalone mode: auto-init Worker Thread so /ingest works in dev mode
if (require.main === module) {
  initWorkerThreadService();
  startServer();
}

// Exportamos startServer para que worker-entry.js y los tests lo usen.
module.exports = { startServer };
