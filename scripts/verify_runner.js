// ===== SECCIÓN: scripts/verify_runner.js — Script de Verificación Manual =====
/**
 * Script de verificación paso a paso del TP The Guardian.
 *
 * ¿Qué es esto?
 *   Este script hace requests HTTP manualmente a cada endpoint clave
 *   y muestra los resultados en consola. Es útil para VER a ojo que todo
 *   funciona antes de correr la evaluación automatizada (evaluate.js).
 *
 * ¿Por qué usa el módulo nativo "http" en vez de fetch()?
 *   Node.js incluye "http" nativamente desde siempre (no necesita npm).
 *   Es más "low-level" (bajo nivel) y permite entender cómo funciona
 *   HTTP por debajo de las abstracciones como Axios o la API fetch global.
 *
 * Pasos que ejecuta:
 *   1. GET /health → verifica que el servidor esté vivo.
 *   2. GET /metrics → ve los contadores antes de ingest.
 *   3. GET /ingest?id=4500 → envía un evento.
 *   4. Espera 2 segundos para IPC + SQLite.
 *   5. GET /metrics → verifica que el contador subió.
 *   6. Envía 3 ingests más.
 *   7. Espera 3 segundos.
 *   8. GET /metrics → verifica el contador final.
 */

const http = require('http');
const path = require('path');

// URL base de la API. Usamos localhost:8080 (puerto default del TP).
const BASE_URL = 'http://localhost:8080';

/**
 * Hace una request HTTP GET al servidor y devuelve el resultado.
 *
 * ¿Qué hace paso a paso?
 *   1. Crea un objeto de opciones con hostname, puerto, path y método.
 *   2. Llama a http.request() que devuelve un objeto ClientRequest.
 *   3. Registra listeners para 'data' (pedazos de respuesta) y 'end' (fin).
 *   4. Intenta parsear el body como JSON. Si no es JSON, devuelve el string crudo.
 *   5. Maneja errores de conexión con el listener 'error'.
 *   6. Llama reqObj.end() para enviar la request.
 *
 * @param {string} method — Método HTTP (GET, POST, etc.).
 * @param {string} urlPath — Ruta con query string (ej: "/ingest?id=4500").
 * @returns {Promise<{status: number, body: any}>}
 */
function req(method, urlPath) {
  return new Promise((resolve, reject) => {
    // Opciones para http.request().
    const opts = { hostname: 'localhost', port: 8080, path: urlPath, method };

    // Creamos la request. No se envía todavía.
    const reqObj = http.request(opts, (res) => {
      let data = '';

      // Cada vez que llega un "chunk" (pedazo) de datos, lo concatenamos.
      // Las respuestas HTTP pueden llegar en varios pedazos si son grandes.
      res.on('data', (chunk) => (data += chunk));

      // Cuando la respuesta termina, intentamos parsear el JSON.
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          // Si no es JSON válido (ej: HTML de error), devolvemos el string crudo.
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    // Si hay error de conexión (servidor caído, puerto incorrecto, etc.).
    reqObj.on('error', reject);

    // ¡Enviamos la request! Sin esto, la request nunca llega al servidor.
    reqObj.end();
  });
}

/**
 * Ejecuta la suite de verificación paso a paso.
 */
async function run() {
  console.log('--- /health ---');
  const health = await req('GET', '/health');
  console.log(health);

  console.log('--- /metrics (before ingest) ---');
  const metricsBefore = await req('GET', '/metrics');
  console.log(metricsBefore);

  console.log('--- /ingest?id=4500 ---');
  const ingest = await req('GET', '/ingest?id=4500');
  console.log(ingest);

  // Wait for IPC + SQLite
  // Los eventos no se completan instantáneamente: el Worker Thread tarda
  // unos segundos en procesar el loop de 10M iteraciones y enviar
  // el mensaje IPC al Primary. Le damos tiempo.
  console.log('--- waiting 2s for IPC+SQLite ---');
  await new Promise((r) => setTimeout(r, 2000));

  console.log('--- /metrics (after ingest) ---');
  const metricsAfter = await req('GET', '/metrics');
  console.log(metricsAfter);

  // Multiple ingests
  // Enviamos 3 eventos más en secuencia (no paralelo) para ver
  // cómo se incrementa el contador.
  console.log('--- Sending 3 more ingests ---');
  const ids = [1, 2, 3];
  for (const id of ids) {
    const r = await req('GET', `/ingest?id=${id}`);
    console.log('ingest', id, 'status', r.status);
  }
  await new Promise((r) => setTimeout(r, 3000));

  console.log('--- /metrics (after 4 ingests) ---');
  const metricsFinal = await req('GET', '/metrics');
  console.log(metricsFinal);

  console.log('--- DONE ---');
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
