// ===== SECCIÓN: Conexión a SQLite con better-sqlite3 =====
/**
 * Módulo de conexión SQLite.
 * Usa better-sqlite3, PRAGMAs WAL + foreign_keys + busy_timeout.
 * Centralizado en el Primary — los Workers nunca lo tocan directamente.
 *
 * ¿Qué es esto?
 *   Este archivo se encarga de CONECTARSE a la base de datos SQLite
 *   y de CREAR las tablas necesarias si no existen todavía.
 *
 * ¿Qué es SQLite?
 *   SQLite es una base de datos EMBEBIDA: no necesita un servidor externo
 *   como MySQL o PostgreSQL. Toda la base de datos vive en UN SOLO ARCHIVO
 *   (the-guardian.sqlite). Es ideal para proyectos pequeños, TPs,
 *   o aplicaciones que no necesitan miles de conexiones simultáneas.
 *
 * ¿Por qué better-sqlite3 y no sqlite3?
 *   - better-sqlite3 es SÍNCRONO: las queries se ejecutan inmediatamente
 *     y devuelven el resultado. No hay callbacks ni promesas.
 *   - Es mucho más rápido para lecturas y escrituras aisladas.
 *   - Solo el Primary escribe, así que no hay problema de bloqueo entre procesos.
 *
 * ¿Quién toca esto?
 *   SOLO el Primary de cluster. Los Workers nunca llaman a esta función.
 *   Los Workers se comunican con el Primary por IPC para que el Primary
 *   guarde los datos. Esto evita que varios procesos escriban al mismo
 *   archivo SQLite al mismo tiempo (lo cual puede causar corrupción).
 */

const Database = require("better-sqlite3");
const path = require("path");

/**
 * Crea y configura una conexión a SQLite.
 *
 * ¿Qué hace?
 *   1. Resuelve la ruta del archivo .sqlite.
//    2. Abre (o crea) la base de datos con better-sqlite3.
//    3. Aplica PRAGMAs de configuración obligatorios.
//    4. Crea las tablas si no existen.
 *
//  ¿Qué espera recibir?
//    @param {string|null} [dbPath=null] — Ruta personalizada al archivo SQLite.
//      Si es null, usa la variable de entorno SQLITE_PATH o el default
//      data/the-guardian.sqlite (relativo a la raíz del proyecto).
 *
 * ¿Qué devuelve?
 *   @returns {import('better-sqlite3').Database} Objeto de conexión listo para usar.
 *     Este objeto tiene métodos como .prepare(), .exec(), .close(), etc.
 */
function createDatabaseConnection(dbPath = null) {
  // ===== PASO 1: Resolver la ruta del archivo de base de datos =====
  // La prioridad es: parámetro > variable de entorno > ruta default.
  const resolvedPath =
    dbPath ||
    process.env.SQLITE_PATH ||
    path.join(__dirname, "..", "..", "data", "the-guardian.sqlite");

  // ===== PASO 2: Abrir la base de datos =====
  // new Database() abre el archivo. Si no existe, lo crea automáticamente.
  const db = new Database(resolvedPath);

  // ===== PASO 3: PRAGMAs obligatorios =====
  //
  // ¿Qué es un PRAGMA?
  //   Es un comando especial de SQLite para configurar comportamientos
  //   de la base de datos. No son sentencias SQL estándar; son extensiones
  //   específicas de SQLite.
  //
  // PRAGMA journal_mode = WAL
  //   WAL = Write-Ahead Logging. Es un modo de journaling que permite
  //   que lecturas y escrituras sean más concurrentes. En vez de bloquear
  //   toda la base de datos al escribir, SQLite escribe primero en un archivo
  //   de log (.wal) y luego sincroniza. Esto mejora mucho el rendimiento.
  db.pragma("journal_mode = WAL");

  // PRAGMA foreign_keys = ON
  //   Activa las claves foráneas. En SQLite, ¡por defecto están DESACTIVADAS!
  //   Aunque en este TP no usamos FK todavía, es buena práctica activarlas
  //   para que si el día de mañana agregamos relaciones entre tablas,
  //   SQLite las respete y no permita datos inconsistentes.
  db.pragma("foreign_keys = ON");

  // PRAGMA busy_timeout = 5000
  //   Si un proceso intenta escribir y la base está bloqueada por otro,
  //   SQLite espera 5000 ms (5 segundos) antes de devolver el error BUSY.
  //   En nuestro caso solo el Primary escribe, así que esto es un
  //   "cinturón de seguridad" por si algo inesperado sucede.
  db.pragma("busy_timeout = 5000");

  // ===== PASO 4: Crear tablas si no existen =====
//
//  Usamos db.exec() para ejecutar múltiples sentencias CREATE TABLE.
//  "IF NOT EXISTS" significa que si la tabla ya existe, no pasa nada.
//  Esto se ejecuta en CADA inicio del Primary.
//
//  Tablas del TP:
//    - ingest_events: cada vez que el Worker Thread termina de procesar
//      un evento, el Primary guarda acá el event_id, PID, tiempo y estado.
//    - worker_restarts: cada vez que un worker se cae y el Primary crea
//      uno nuevo, se guarda el old_pid, new_pid, código de salida y señal.
//    - metric_snapshots: antes de apagar el sistema, el Primary guarda
//      un "snapshot" con los contadores totales para no perder estadísticas.
  db.exec(`
    CREATE TABLE IF NOT EXISTS ingest_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,  -- ID interno autoincremental
      event_id INTEGER NOT NULL,             -- El ID que llegó por query string
      pid INTEGER NOT NULL,                  -- PID del worker que lo procesó
      processing_ms INTEGER,                 -- Tiempo de procesamiento en ms (puede ser null)
      status TEXT DEFAULT 'completed',       -- Estado: 'completed' o 'failed_dispatch'
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP  -- Fecha/hora automática
    );

    CREATE TABLE IF NOT EXISTS worker_restarts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      old_pid INTEGER,                       -- PID del worker que murió
      new_pid INTEGER,                       -- PID del nuevo worker que lo reemplazó
      code INTEGER,                          -- Código de salida del proceso (puede ser null)
      signal TEXT,                           -- Señal que causó la salida (puede ser null)
      restarted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS metric_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total_accepted INTEGER DEFAULT 0,      -- Total de eventos aceptados al momento del snapshot
      total_completed INTEGER DEFAULT 0,     -- Total de eventos completados al momento del snapshot
      total_failed INTEGER DEFAULT 0,        -- Total de eventos fallidos al momento del snapshot
      taken_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log(`[DB] Connected at ${resolvedPath}`);
  return db;
}

// Exportamos la función para que primary.js la pueda usar.
module.exports = { createDatabaseConnection };
