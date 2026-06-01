# The Guardian

TP de Programación sobre Redes con Node.js.

## Setup

```bash
npm install
```

Requiere Node.js 20+.

## Modos de ejecución

### Modo cluster (producción)

```bash
npm start
```

Levanta el Primary mediante `src/primary.js`, que forkea `Math.max(1, Math.floor(os.cpus().length / 2))` workers.
Cada worker mantiene un Worker Thread fijo (`worker_threads` + `SharedArrayBuffer` + `Atomics.add()`).

### Modo standalone (desarrollo)

```bash
npm run dev
```

Ejecuta directamente `src/server.js` sin cluster, con un Worker Thread fijo local. Útil para desarrollo local y para probar `/health` y `/ingest` de forma aislada.

## Endpoints

- `GET /health` -> 200 `{ status: "ok", pid: <number> }`
- `GET /ingest?id=NUM` -> 202 `{ ok: true, status: "accepted", id: NUM, pid: <number> }` (aceptado) o 503 `{ ok: false, error: { code: "WORKER_UNAVAILABLE", message: "..." } }` (Worker Thread no disponible)
- `GET /metrics` -> 200 con `pid`, `localCounter`, `acceptedEvents`, `completedEvents`, `failedEvents`, `totalRestarts`, `activeWorkers` (más aliases `globalCounter` y `totalEvents` por compatibilidad)
- `GET /dashboard` -> Renderiza vista EJS con métricas, eventos y reinicios

## Verificación manual del cluster

1. Iniciar en modo cluster:
   ```bash
   npm start
   ```

2. Llamar a los endpoints repetidamente; el `pid` debe variar entre workers:
   ```bash
   curl http://localhost:8080/health
   curl "http://localhost:8080/ingest?id=1"
   ```

3. Forzar la caída de un worker (self-healing):
   ```bash
   # En otro terminal, buscar un worker (no el Primary) y matarlo
   kill -9 <worker_pid>
   ```
   El Primary debe detectar la salida, registrar el evento en `worker_restarts` (SQLite) y forkear un reemplazo.

4. Enviar SIGTERM al Primary (shutdown ordenado):
   ```bash
   kill -TERM <primary_pid>
   ```
   Todos los workers deben desconectarse y el proceso debe terminar sin dejar huérfanos, **sin** registrar la salida como reinicio.

## Script de evaluación

```bash
npm run evaluate
```

Envía 500 peticiones concurrentes a `/ingest`, consulta `/health` en paralelo, mide latencias y verifica que `completedEvents` alcance 500. Guarda los resultados en `docs/05_pruebas/resultados_pruebas.md`.

## Cleanup / reset

Para resetear el estado antes de entregar o probar desde cero:

```bash
rm -rf node_modules data/*.sqlite* && npm install
```

## Stack y decisiones clave

- **Node.js 20**, CommonJS, Express.
- **SQLite** (`better-sqlite3`) con WAL, foreign_keys y busy_timeout. Escrituras centralizadas en el Primary.
- **Cluster**: escalado y self-healing. El Primary reemplaza workers que mueren inesperadamente.
- **Worker Threads**: cálculo pesado CPU-bound fuera del Event Loop principal. Un Worker Thread fijo por Cluster Worker.
- **SharedArrayBuffer + Atomics.add()**: contador local sincronizado entre el Cluster Worker y su Worker Thread.
- **IPC**: mensajes `INGEST_ACCEPTED`, `INGEST_COMPLETED`, `INGEST_FAILED` desde los workers hacia el Primary.
- **Dashboard EJS** y **script de evaluación** (`scripts/evaluate.js`) incluidos.

## Entrega — qué incluir en el ZIP

Incluir:

- `README.md`
- `package.json`
- `src/` (código de la aplicación)
- `public/` (assets estáticos)
- `scripts/` (evaluación)
- `docs/` (documentación de defensa, guías y resultados)
- `data/` — el directorio vacío está bien (la base de datos se crea en runtime);
  no incluir archivos `*.sqlite*`

No incluir:

- `node_modules/`
- `.atl/`
- `openspec/`
- `data/*.sqlite*`
- archivos ocultos o de IDE (`.git/`, `.vscode/`, etc.)

> Estos directorios existen en el repo para desarrollo y auditoría,
> pero no deben formar parte del paquete de entrega académica.
