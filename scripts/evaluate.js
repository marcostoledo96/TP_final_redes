/**
 * Script de evaluación The Guardian.
 * Envía 500 requests concurrentes a /ingest, consulta /health en paralelo
 * mientras se procesan los eventos, mide latencias y verifica que
 * completedEvents alcance 500.
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
const TOTAL_REQUESTS = 500;
const HEALTH_INTERVAL_MS = 50;
const METRICS_POLL_MS = 500;
const METRICS_TIMEOUT_MS = 30000;

const healthLatencies = [];

async function fetchHealth() {
  const start = performance.now();
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const end = performance.now();
    healthLatencies.push(end - start);
    return res.ok;
  } catch {
    healthLatencies.push(performance.now() - start);
    return false;
  }
}

async function sendIngest(id) {
  try {
    const res = await fetch(`${BASE_URL}/ingest?id=${id}`);
    return res.status === 202;
  } catch {
    return false;
  }
}

async function fetchMetrics() {
  try {
    const res = await fetch(`${BASE_URL}/metrics`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function run() {
  console.log("=== The Guardian — Evaluación de Carga ===\n");

  // 1) Verificar que el servidor esté vivo
  const alive = await fetchHealth();
  if (!alive) {
    console.error("Error: servidor no responde en " + BASE_URL);
    process.exit(1);
  }

  // 2) Health checks en paralelo durante toda la prueba
  let keepCheckingHealth = true;
  let healthChecks = 0;
  let healthOk = 0;

  async function healthLoop() {
    while (keepCheckingHealth) {
      const ok = await fetchHealth();
      healthChecks++;
      if (ok) healthOk++;
      await new Promise((r) => setTimeout(r, HEALTH_INTERVAL_MS));
    }
  }

  const healthPromise = healthLoop();

  // 3) Enviar 500 requests concurrentes a /ingest
  const ingestPromises = Array.from({ length: TOTAL_REQUESTS }, (_, i) =>
    sendIngest(i + 1)
  );

  const ingestResults = await Promise.all(ingestPromises);
  const accepted = ingestResults.filter(Boolean).length;
  const rejected = TOTAL_REQUESTS - accepted;

  // 4) Polling a /metrics hasta que completedEvents >= 500 o timeout
  let finalMetrics = null;
  const startPoll = performance.now();

  while (true) {
    finalMetrics = await fetchMetrics();
    const completedEvents = finalMetrics?.completedEvents ?? 0;
    if (completedEvents >= TOTAL_REQUESTS) break;

    if (performance.now() - startPoll > METRICS_TIMEOUT_MS) {
      console.warn("Timeout esperando contador completado (30s).");
      break;
    }

    await new Promise((r) => setTimeout(r, METRICS_POLL_MS));
  }

  // 5) Detener health checks y esperar que terminen
  keepCheckingHealth = false;
  await healthPromise;

  const completedEvents = finalMetrics?.completedEvents ?? 0;
  const acceptedEvents = finalMetrics?.acceptedEvents ?? 0;
  const drift = acceptedEvents - completedEvents;

  // 6) Calcular latencias
  const avgLatency =
    healthLatencies.length > 0
      ? healthLatencies.reduce((a, b) => a + b, 0) / healthLatencies.length
      : 0;
  const maxLatency =
    healthLatencies.length > 0 ? Math.max(...healthLatencies) : 0;

  // 7) Resumen
  console.log(`Peticiones enviadas:      ${TOTAL_REQUESTS}`);
  console.log(`Peticiones aceptadas:     ${accepted}`);
  console.log(`Peticiones rechazadas:    ${rejected}`);
  console.log(`Health checks:            ${healthChecks} (OK: ${healthOk})`);
  console.log(`Latencia /health promedio: ${avgLatency.toFixed(2)} ms`);
  console.log(`Latencia /health máxima:   ${maxLatency.toFixed(2)} ms`);
  console.log(`Eventos aceptados global: ${acceptedEvents}`);
  console.log(`Eventos completados global: ${completedEvents}`);
  console.log(`Drift:                    ${drift}`);

  const passed = accepted === TOTAL_REQUESTS && drift === 0 && completedEvents >= TOTAL_REQUESTS;
  console.log(`\nEstado:                   ${passed ? "✅ APROBADO" : "❌ FALLIDO"}`);

  // 8) Guardar resultado en docs/05_pruebas/resultados_pruebas.md
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
    if (fs.existsSync(resultPath)) {
      existing = fs.readFileSync(resultPath, "utf-8");
    }
    // Normalize: if the file already contains a canonical header, replace everything after it;
    // otherwise prepend the block above the existing content.
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

  process.exit(passed ? 0 : 1);
}

run().catch((err) => {
  console.error("Error inesperado en evaluación:", err);
  process.exit(1);
});
