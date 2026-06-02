// ===== SECCIÓN: scripts/evaluate.js — Script de Evaluación de Carga =====
/**
 * Script de evaluación The Guardian.
 * Envía 500 requests concurrentes a /ingest, consulta /health en paralelo
 * mientras se procesan los eventos, mide latencias y verifica que
 * completedEvents alcance 500.
 *
 * ¿Qué es esto?
 *   Este es nuestro "test de estrés" del TP. Simula una carga real:
 *   muchos requests llegando al mismo tiempo, con health checks periódicos
 *   para verificar que el servidor no se cae bajo presión.
 *
 * ¿Qué mide?
 *   1. ¿Acepta todos los 500 requests? (debería responder 202).
 *   2. ¿Completa todos los 500 eventos? (Worker Threads deben procesarlos).
 *   3. ¿El health check sigue respondiendo durante la carga?
 *   4. ¿Cuánto tarda /health en responder? (latencia).
 *   5. ¿Hay "drift" entre aceptados y completados?
 *      "Drift" es la diferencia: acceptedEvents - completedEvents.
 *      Si hay events aceptados que nunca se completaron, hay un problema.
 *
 * Analogía:
 *   Es como hacer una prueba de manejo en condiciones extremas:
 *   acelerar a fondo, frenar de golpe, girar con lluvia...
 *   para verificar que el auto (nuestro servidor) no explota.
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
const TOTAL_REQUESTS = 500;
const HEALTH_INTERVAL_MS = 50;
const METRICS_POLL_MS = 500;
const METRICS_TIMEOUT_MS = 30000;

// Array para guardar los tiempos de respuesta de /health (en milisegundos).
// Nos permite calcular latencia promedio y máxima al final.
const healthLatencies = [];

/**
 * Consulta /health y mide cuánto tarda en responder.
 *
 * ¿Por qué medimos latencia?
 *   Si bajo carga, /health tarda mucho, significa que el Event Loop
 *   del Cluster Worker está saturado o que el Worker Thread está
 *   bloqueando recursos. En nuestro caso, /health debería ser rápido
 *   SIEMPRE porque no toca SQLite ni Worker Threads.
 *
 * @returns {Promise<boolean>} true si respondió HTTP 200, false si falló.
 */
async function fetchHealth() {
  const start = performance.now();   // Timestamp de inicio (alta precisión)
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const end = performance.now();     // Timestamp de fin
    // Guardamos la diferencia (tiempo transcurrido) en el array.
    healthLatencies.push(end - start);
    return res.ok;
  } catch {
    // Si falló (timeout, conexión rechazada, etc.), igual guardamos la latencia
    // pero marcando que fue un fallo.
    healthLatencies.push(performance.now() - start);
    return false;
  }
}

/**
 * Envía un request a /ingest con el ID dado.
 *
 * @param {number} id — El ID del evento.
 * @returns {Promise<boolean>} true si respondió HTTP 202 (Accepted).
 */
async function sendIngest(id) {
  try {
    const res = await fetch(`${BASE_URL}/ingest?id=${id}`);
    return res.status === 202;
  } catch {
    return false;
  }
}

/**
 * Consulta /metrics y devuelve los contadores globales.
 *
 * @returns {Promise<Object|null>} Objeto con métricas, o null si falló.
 */
async function fetchMetrics() {
  try {
    const res = await fetch(`${BASE_URL}/metrics`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * Ejecuta toda la evaluación paso a paso.
 */
async function run() {
  console.log("=== The Guardian — Evaluación de Carga ===\n");

  // 1) Verificar que el servidor esté vivo
  // Si no responde /health, cancelamos todo y salimos con error.
  const alive = await fetchHealth();
  if (!alive) {
    console.error("Error: servidor no responde en " + BASE_URL);
    process.exit(1);
  }

  // 2) Health checks en paralelo durante toda la prueba
  // -----------------------------------------------------------------
  // Creamos un loop asíncrono que consulta /health cada 50 ms.
  // Esto corre EN PARALELO con los requests de ingest.
  // Usamos una flag "keepCheckingHealth" para detenerlo cuando terminamos.
  let keepCheckingHealth = true;
  let healthChecks = 0;  // Cuántos health checks hicimos en total
  let healthOk = 0;      // Cuántos de esos respondieron OK (200)

  async function healthLoop() {
    while (keepCheckingHealth) {
      const ok = await fetchHealth();
      healthChecks++;
      if (ok) healthOk++;
      // Esperamos 50 ms antes del próximo health check.
      await new Promise((r) => setTimeout(r, HEALTH_INTERVAL_MS));
    }
  }

  // Iniciamos el loop de health checks en segundo plano.
  const healthPromise = healthLoop();

  // 3) Enviar 500 requests concurrentes a /ingest
  // -----------------------------------------------------------------
  // Creamos un array de 500 promesas. Cada promesa es un sendIngest(i).
  // Promise.all() ejecuta TODAS las promesas en paralelo (concurrentemente).
  // Esto simula muchos clientes llegando al mismo tiempo al servidor.
  const ingestPromises = Array.from({ length: TOTAL_REQUESTS }, (_, i) =>
    sendIngest(i + 1)
  );

  const ingestResults = await Promise.all(ingestPromises);

  // Contamos cuántos requests fueron aceptados (status 202).
  const accepted = ingestResults.filter(Boolean).length;
  const rejected = TOTAL_REQUESTS - accepted;

  // 4) Polling a /metrics hasta que completedEvents >= 500 o timeout
  // -----------------------------------------------------------------
  // Los Worker Threads procesan los eventos EN SEGUNDO PLANO.
  // No podemos saber cuándo terminaron solo mirando los responses de /ingest
  // (que solo nos dicen "aceptado", no "terminado").
  // Por eso hacemos polling: consultamos /metrics cada 500 ms hasta que
  // el contador completedEvents llegue a 500 (o se agote el tiempo).
  let finalMetrics = null;
  const startPoll = performance.now();

  while (true) {
    finalMetrics = await fetchMetrics();
    const completedEvents = finalMetrics?.completedEvents ?? 0;

    // Si completamos todos, salimos del loop.
    if (completedEvents >= TOTAL_REQUESTS) break;

    // Si pasaron 30 segundos y todavía no terminó, cortamos con warning.
    if (performance.now() - startPoll > METRICS_TIMEOUT_MS) {
      console.warn("Timeout esperando contador completado (30s).");
      break;
    }

    // Esperamos 500 ms antes de volver a consultar.
    await new Promise((r) => setTimeout(r, METRICS_POLL_MS));
  }

  // 5) Detener health checks y esperar que terminen
  // -----------------------------------------------------------------
  keepCheckingHealth = false;
  await healthPromise;  // Esperamos a que el healthLoop salga de su while.

  // Extraemos los contadores finales del objeto de métricas.
  const completedEvents = finalMetrics?.completedEvents ?? 0;
  const acceptedEvents = finalMetrics?.acceptedEvents ?? 0;

  // Drift = acceptedEvents - completedEvents.
  // Si es 0, significa que TODO lo que fue aceptado fue completado.
  // Si es > 0, hay eventos "perdidos" (aceptados pero no completados).
  const drift = acceptedEvents - completedEvents;

  // 6) Calcular latencias
  // -----------------------------------------------------------------
  // Latencia promedio = suma de todas las latencias / cantidad de latencias.
  const avgLatency =
    healthLatencies.length > 0
      ? healthLatencies.reduce((a, b) => a + b, 0) / healthLatencies.length
      : 0;
  // Latencia máxima = el peor caso (el health check que más tardó).
  const maxLatency =
    healthLatencies.length > 0 ? Math.max(...healthLatencies) : 0;

  // 7) Resumen en consola
  console.log(`Peticiones enviadas:      ${TOTAL_REQUESTS}`);
  console.log(`Peticiones aceptadas:     ${accepted}`);
  console.log(`Peticiones rechazadas:    ${rejected}`);
  console.log(`Health checks:            ${healthChecks} (OK: ${healthOk})`);
  console.log(`Latencia /health promedio: ${avgLatency.toFixed(2)} ms`);
  console.log(`Latencia /health máxima:   ${maxLatency.toFixed(2)} ms`);
  console.log(`Eventos aceptados global: ${acceptedEvents}`);
  console.log(`Eventos completados global: ${completedEvents}`);
  console.log(`Drift:                    ${drift}`);

  // Criterio de aprobación:
  // - Todos los 500 requests fueron aceptados.
  // - No hay drift (accepted === completed).
  // - Se completaron al menos 500 eventos.
  const passed = accepted === TOTAL_REQUESTS && drift === 0 && completedEvents >= TOTAL_REQUESTS;
  console.log(`\nEstado:                   ${passed ? "✅ APROBADO" : "❌ FALLIDO"}`);

  // 8) Guardar resultado en docs/05_pruebas/resultados_pruebas.md
  // -----------------------------------------------------------------
  const fs = require("fs");
  const path = require("path");
  const resultPath = path.join(__dirname, "..", "docs", "05_pruebas", "resultados_pruebas.md");

  const timestamp = new Date().toISOString();
  const resultBlock = `
## Resultado — ${timestamp}

- Peticiones enviadas: ${TOTAL_REQUESTS}
- Peticiones aceptadas: ${accepted}
- Peticiones rechazadas: ${rejected}
- Health checks: ${healthChecks} (OK: ${healthOk})
- Latencia /health promedio: ${avgLatency.toFixed(2)} ms
- Latencia /health máxima: ${maxLatency.toFixed(2)} ms
- Eventos aceptados global: ${acceptedEvents}
- Eventos completados global: ${completedEvents}
- Drift: ${drift}
- Estado: ${passed ? "APROBADO" : "FALLIDO"}

---
`;

  try {
    let existing = "";
    // Si el archivo ya existe, lo leemos para no perder resultados anteriores.
    if (fs.existsSync(resultPath)) {
      existing = fs.readFileSync(resultPath, "utf-8");
    }
    // Normalizamos: si el archivo ya tiene un bloque de resultado anterior,
    // reemplazamos solo esa parte (preservando el encabezado si existe).
    const canonicalHeader = "## Resultado —";
    let output;
    if (existing.includes(canonicalHeader)) {
      const idx = existing.indexOf(canonicalHeader);
      output = existing.slice(0, idx) + resultBlock.trim() + "\n";
    } else {
      output = resultBlock + existing;
    }
    fs.writeFileSync(resultPath, output, "utf-8");
    console.log(`\nResultado guardado en: ${resultPath}`);
  } catch (err) {
    console.error("Error guardando resultado:", err.message);
  }

  // Salimos con código 0 (éxito) si pasó, o 1 (error) si falló.
  process.exit(passed ? 0 : 1);
}

// Ejecutamos la evaluación y capturamos cualquier error inesperado.
run().catch((err) => {
  console.error("Error inesperado en evaluación:", err);
  process.exit(1);
});
