# Dashboard y SQLite — Guía de defensa

## ¿Por qué se agregó dashboard?

El dashboard facilita la defensa ante el profesor porque permite visualizar métricas, eventos y reinicios sin depender únicamente de la terminal. Convierte datos técnicos en evidencia visible.

## ¿Qué datos muestra?

- Estado del sistema.
- PID del proceso que respondió.
- Eventos aceptados por cada Worker.
- Eventos completados (procesados por Worker Thread).
- Eventos fallidos (errores o validaciones).
- Reinicios de Workers (self-healing).
- Últimos eventos recibidos.
- Últimos reinicios registrados.
- Links directos a `/health` y `/metrics`.

## ¿Qué tablas usa SQLite?

### `ingest_events`

Registra cada evento recibido:
- `id`: autoincremental.
- `event_id`: ID del evento enviado por query string.
- `pid`: PID del Worker que procesó el evento.
- `processing_ms`: tiempo de procesamiento (cuando aplica).
- `status`: estado (`completed`, `failed_dispatch`).
- `completed_at`: timestamp de finalización.

### `worker_restarts`

Registra reinicios por self-healing:
- `id`: autoincremental.
- `old_pid`: PID del Worker que murió.
- `new_pid`: PID del nuevo Worker.
- `code`, `signal`: código y señal de salida.
- `restarted_at`: timestamp del reinicio.

### `metric_snapshots`

Guarda snapshots periódicos del estado global:
- `id`: autoincremental.
- `total_accepted`: total de eventos aceptados.
- `total_completed`: total de eventos completados.
- `total_failed`: total de eventos fallidos.
- `taken_at`: timestamp del snapshot.

## ¿Quién escribe y quién lee SQLite?

- **El Primary es el único que escribe en SQLite.**
  - Recibe mensajes IPC de los Workers y persiste eventos, reinicios y snapshots.
- **Los Workers solo leen SQLite** para alimentar el dashboard (`/dashboard`).
  - Cada Worker abre su propia conexión de solo lectura (`new Database(DB_PATH)`) para evitar interferir con las escrituras del Primary.

## ¿Por qué el Primary centraliza escrituras?

SQLite no maneja múltiples escrituras concurrentes tan bien como PostgreSQL. Si varios procesos del cluster escribieran al mismo tiempo, podrían generarse bloqueos. El Primary recibe mensajes IPC de los Workers y escribe secuencialmente, evitando condiciones de carrera.

## ¿Qué problemas evita WAL?

`PRAGMA journal_mode = WAL` permite que lecturas y escrituras coexistan mejor. Sin WAL, SQLite usa locking más agresivo y puede bloquear lecturas durante escrituras. WAL mejora concurrencia de lectura sin romper la simplicidad de SQLite.

## ¿Qué valor aporta a la defensa?

- Demuestra persistencia real de eventos.
- Muestra que self-healing registró reinicios.
- Permite consultar métricas históricas.
- Valida que el sistema no solo funciona en memoria, sino que deja rastro.
- Justifica la decisión de centralizar escrituras.
