// ===== SECCIÓN: health.service.js — Servicio de Health Check =====
/**
 * Servicio de health check.
 *
 * ¿Qué es esto?
 *   El endpoint /health es la forma más simple y rápida de verificar
 *   que el servidor está vivo y respondiendo. Devuelve un JSON con
 *   "status": "ok" y el PID del proceso que respondió.
 *
 * ¿Por qué existe?
 *   En producción, los balanceadores de carga (load balancers) y los
 *   sistemas de monitoreo (como UptimeRobot o Datadog) hacen requests
 *   periódicos a /health. Si responde con error o tarda demasiado,
 *   el monitor marca el servicio como "caído" y alerta.
 *
 * ¿Por qué NO depende de SQLite?
 *   Si SQLite estuviera corrupta o bloqueada, /health seguiría funcionando.
 *   Esto evita falsos positivos: un problema de base de datos no debería
 *   hacer que el balanceador nos marque como "todo caído".
 *
 * Analogía:
 *   Es como tocar el timbre de un negocio: si alguien grito
 *   "¡Abierto!", sabés que hay gente adentro. No necesitás pedir
 *   el menú completo para confirmarlo.
 */

/**
 * Devuelve el estado de salud del proceso actual.
 *
 * ¿Qué espera recibir?
 *   Nada. No usa parámetros.
 *
 * ¿Qué devuelve?
 *   @returns {{status: string, pid: number}} Objeto con:
 *     - status: siempre "ok" (este TP no implementa health checks profundos).
 *     - pid: el Process ID del proceso worker que respondió.
 */
function getHealth() {
  return { status: "ok", pid: process.pid };
}

module.exports = { getHealth };
