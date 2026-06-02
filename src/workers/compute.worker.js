// ===== SECCIÓN: compute.worker.js — Worker Thread de Cálculo Pesado =====
/**
 * Worker Thread que ejecuta cálculo pesado CPU-bound.
 * Recibe tareas por parentPort y actualiza contador atómico sobre SharedArrayBuffer.
 *
 * ¿Qué es esto?
 *   Este archivo se carga DENTRO de un Worker Thread (no es el proceso principal).
 *   Su única función es recibir tareas de cálculo pesado, ejecutarlas sin
 *   bloquear el Event Loop del proceso principal, y responder cuando terminan.
 *
 * ¿QUÉ ES SharedArrayBuffer?
 *   -------------------------------------------------------------------
 *   SharedArrayBuffer es un bloque de memoria de RAM que puede ser COMPARTIDO
 *   entre múltiples threads (procesos hijos en Node.js).
 *
 *   Imaginá la memoria de una computadora como un edificio de departamentos.
 *   Normalmente, cada thread tiene su propio edificio (memoria aislada).
 *   SharedArrayBuffer es como un edificio COMPARTIDO: dos threads pueden
 *   entrar, leer y escribir en los mismos departamentos (direcciones de memoria).
 *
 *   En este TP, creamos un SharedArrayBuffer de 4 bytes en el servicio
 *   principal (worker-thread.service.js), y se lo pasamos al Worker Thread
 *   via workerData. Los 4 bytes representan un entero de 32 bits (Int32Array).
 *
 * ¿QUÉ ES Atomics.add()?
 *   -------------------------------------------------------------------
 *   Atomics.add() es una operación atómica: indivisible. El procesador
 *   garantiza que nadie puede " meterse" en el medio de la operación.
 *
 *   Imaginá que dos threads intentan incrementar el contador al mismo tiempo:
 *   - Thread A lee: valor = 5
 *   - Thread B lee: valor = 5 (¡mismo valor!)
 *   - Thread A escribe: 5 + 1 = 6
 *   - Thread B escribe: 5 + 1 = 6 (¡perdió la escritura de A!)
 *   Resultado: el contador valdría 6 en vez de 7. Eso es una "race condition".
 *
 *   Con Atomics.add(counter, 0, 1), el procesador hace la lectura+escritura
 *   en UN SOLO paso. Nadie puede interrumpir. El resultado siempre es correcto.
 *
 *   POR ESO NUNCA usamos counter[0]++ en un entorno multithread:
 *   eso NO es atómico y puede causar resultados incorrectos.
 *
 * Analogía:
 *   El Worker Thread es el "cocinero especializado" del restaurante.
 *   El Cluster Worker (proceso padre) le pide platos por la ventanilla
 *   (parentPort). El cocinero cocina solo, sin molestar a los mozos,
 *   y cuando termina avisa por la ventanilla (postMessage).
 *   El contador en la pizarra compartida (SharedArrayBuffer) se actualiza
 *   con un rotulador especial (Atomics) que no deja que nadie lo borre
 *   en el medio.
 */

// Importamos las herramientas del Worker Thread.
// - parentPort: la "ventanilla" para enviar/recibir mensajes con el proceso padre.
// - workerData: datos iniciales que nos pasó el padre al crear el thread.
const { parentPort, workerData } = require("worker_threads");

// Recuperamos el SharedArrayBuffer que nos pasó worker-thread.service.js.
// workerData es un objeto plano que solo puede contener datos serializables
// (números, strings, ArrayBuffers, etc.). No puede contener funciones.
// workerData.sharedBuffer provee el SharedArrayBuffer pasado desde el servicio principal
const sharedBuffer = workerData.sharedBuffer;

// Int32Array es una "vista" sobre el SharedArrayBuffer: interpreta esos bytes
// como un número entero de 32 bits con signo. Así podemos hacer operaciones
// aritméticas (sumar, leer, etc.) de forma cómoda.
const counter = new Int32Array(sharedBuffer);

// ===== SECCIÓN: Listener de tareas =====

// parentPort.on("message", ...) es como app.post("/compute", ...) pero para
// mensajes internos entre threads. Se dispara cada vez que el proceso padre
// envía un mensaje con worker.postMessage({...}).
parentPort.on("message", (msg) => {
  // Filtramos solo los mensajes de tipo COMPUTE. Descartamos otros.
  if (msg.type !== "COMPUTE") {
    return;
  }

  // Recuperamos los datos de la tarea.
  const eventId = msg.eventId;   // El ID original que vino por /ingest?id=...
  const jobId = msg.jobId;       // ID interno único generado por worker-thread.service.js

  // Simulación de trabajo pesado: ~10 millones de iteraciones
  // ¿Por qué un loop vacío? Porque ocupar la CPU durante un tiempo forzado
  // simula una operación intensiva (como cifrar datos, calcular estadísticas
  // complejas, comprimir archivos, etc.).
  // Si hiciéramos esto en el Event Loop principal, bloquearíamos TODOS
  // los requests HTTP. Por eso lo hacemos acá, en el Worker Thread.
  for (let i = 0; i < 10_000_000; i++) {
    // No-op de CPU: el loop itera sin hacer nada visible,
    // pero consume ciclos de procesador.
  }

  // ===== Incremento atómico con Atomics.add() =====
  // Esto es la ESTRELLA del TP para el profe. Demuestra que sabemos usar
  // sincronización de memoria compartida entre threads.
  // Incremento atómico seguro entre Worker Thread y Cluster Worker
  // Atomics.add(recurso, índice, valor_a_sumar)
  //   recurso = el Int32Array que apunta al SharedArrayBuffer
  //   índice = 0 (solo tenemos un entero, en la posición 0)
  //   valor_a_sumar = 1
  Atomics.add(counter, 0, 1);

  // Notificamos al proceso padre que terminamos.
  // El padre (worker-thread.service.js) recibe este mensaje en su
  // worker.on("message", ...) y ahí calcula el tiempo de procesamiento,
  // limpia pendingJobs, y envía el IPC al Primary (INGEST_COMPLETED).
  parentPort.postMessage({
    type: "COMPUTE_DONE",
    jobId,
    eventId,
  });
});
