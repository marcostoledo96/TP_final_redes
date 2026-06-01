# AGENTS.md — Reglas para OpenCode en The Guardian

## 1. Rol de la IA

Sos una IA de asistencia de coding trabajando en el proyecto **The Guardian**.

Tu objetivo es implementar un TP de Programación sobre Redes con Node.js, aplicando también conocimientos de Backend del cuatrimestre anterior.

El trabajo debe ser funcional, claro, documentado y defendible ante un profesor.

---

## 2. Stack obligatorio

Usar:

- Node.js 20.
- CommonJS.
- Express.
- EJS para dashboard.
- SQLite con `better-sqlite3`.
- `cluster`.
- `worker_threads`.
- `SharedArrayBuffer`.
- `Atomics.add()`.
- IPC entre Cluster Workers y Primary.
- Script de evaluación en Node.js.

No migrar a TypeScript ni ES Modules.

---

## 3. Decisiones cerradas

| Tema | Decisión |
|---|---|
| Dashboard | Sí |
| SQLite | Sí |
| Autenticación/permisos | Solo documentado, no implementar al inicio |
| Endpoint `/ingest` | Implementar `GET /ingest?id=...` |
| `POST /ingest` | Opcional, no necesario |
| Contador global | IPC en el Primary |
| Escrituras SQLite | Centralizadas en el Primary |

---

## 4. Regla de oro

Antes de tocar código, revisar:

```txt
docs/00_guia_maestra_opencode.md
```

Si hay dudas sobre un tema técnico, ese archivo indica qué documento consultar.

### Worker Threads slice guardrails (estado actual)
- Cluster runtime ya está activo.
- Worker Thread fijo (`src/workers/compute.worker.js`) y servicio (`src/services/worker-thread.service.js`) implementados con bounded respawn.
- `SharedArrayBuffer` e `Int32Array` se crean en el servicio y se pasan al Worker Thread por `workerData`.
- El contador local se incrementa SOLO con `Atomics.add(counter, 0, 1)` — nunca con `counter[0]++`.
- `GET /ingest?id=...` dispara el Worker Thread y responde **202 solo si el Worker Thread está sano y aceptó la tarea**; si no está disponible, devuelve **503**.
- El contador local es **local al proceso** (SharedArrayBuffer no se comparte entre procesos). El contador global se agrega por IPC en el Primary.
- **IPC y SQLite activos**: Primary recibe mensajes `INGEST_ACCEPTED`, `INGEST_COMPLETED`, `INGEST_FAILED` y persiste en SQLite.
- **SQLite**: escrituras centralizadas en el Primary; Workers nunca tocan SQLite directamente.
- **Puerto default**: 8080 (override por `process.env.PORT`).
- `GET /metrics` devuelve `pid`, `localCounter`, `acceptedEvents`, `completedEvents`, `failedEvents`, `totalRestarts`, `activeWorkers` (más aliases `globalCounter` y `totalEvents` por compatibilidad).
- Dashboard EJS, `scripts/evaluate.js` y auto-respawn del Worker Thread implementados.
- Solo CommonJS; sin TypeScript ni ES Modules.

---

## 5. Orden obligatorio de trabajo

1. Organizar `docs/`.
2. Crear/actualizar `AGENTS.md`.
3. Crear estructura del proyecto.
4. Configurar `package.json`.
5. Crear Express base.
6. Crear `/health`.
7. Configurar SQLite.
8. Crear modelos SQLite.
9. Implementar `cluster`.
10. Implementar self-healing.
11. Implementar IPC hacia Primary.
12. Crear Worker Thread fijo.
13. Implementar `SharedArrayBuffer`.
14. Implementar `Atomics.add()`.
15. Crear `/ingest`.
16. Crear `/metrics`.
17. Crear dashboard EJS.
18. Crear script de evaluación.
19. Crear guía de defensa.
20. Probar todo.
21. Documentar resultados.

---

## 6. Estructura esperada

```txt
the-guardian/
├── AGENTS.md
├── README.md
├── package.json
├── src/
│   ├── primary.js
│   ├── app.js
│   ├── config/
│   ├── database/
│   ├── models/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── workers/
│   ├── middlewares/
│   ├── utils/
│   └── views/
├── public/
├── scripts/
└── docs/
```

---

## 7. Reglas de código

El código debe:

- usar CommonJS;
- tener nombres claros;
- separar rutas, controladores, servicios y modelos;
- validar entradas;
- manejar errores;
- responder JSON consistente;
- comentar partes complejas;
- evitar bloquear el Event Loop;
- no crear un Worker Thread por request;
- centralizar escritura SQLite en Primary;
- mantener `/health` rápido.

---

## 8. Endpoints requeridos

### `GET /health`

Respuesta:

```json
{
  "status": "ok",
  "pid": 12345
}
```

Debe responder rápido y no depender de SQLite.

---

### `GET /ingest?id=4500`

Respuesta:

```json
{
  "ok": true,
  "status": "accepted",
  "id": 4500,
  "pid": 12345
}
```

Debe responder con `202 Accepted`.

---

### `GET /metrics`

Debe mostrar métricas locales y globales.

---

### `GET /dashboard`

Debe mostrar dashboard EJS con métricas, eventos y reinicios.

---

## 9. SQLite

Usar `better-sqlite3`.

Configurar:

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
```

Tablas mínimas:

- `ingest_events`;
- `worker_restarts`;
- `metric_snapshots`.

El Primary escribe.  
Los Workers informan por IPC.

---

## 10. IPC

Los Cluster Workers deben enviar mensajes al Primary:

```js
process.send({
  type: 'INGEST_COMPLETED',
  eventId,
  pid: process.pid
});
```

El Primary debe:

- agregar contador global;
- persistir en SQLite;
- registrar reinicios;
- guardar snapshots.

---

## 11. Worker Thread

Cada Cluster Worker debe tener un Worker Thread fijo.

No crear:

```js
new Worker(...)
```

por cada request.

El Worker Thread debe:

- recibir tareas;
- ejecutar cálculo pesado;
- incrementar contador con `Atomics.add()`;
- responder al Cluster Worker.

---

## 12. SharedArrayBuffer y Atomics

Usar:

```js
const sharedBuffer = new SharedArrayBuffer(4);
const counter = new Int32Array(sharedBuffer);
```

Incrementar solo con:

```js
Atomics.add(counter, 0, 1);
```

Nunca usar:

```js
counter[0]++;
```

---

## 13. Dashboard

El dashboard debe ser simple, no decorativo.

Debe mostrar:

- estado del sistema;
- PID que respondió;
- eventos aceptados;
- eventos completados;
- eventos fallidos;
- reinicios;
- últimos eventos;
- últimos reinicios;
- links a `/health` y `/metrics`.

---

## 14. Documentación obligatoria

Debe existir:

```txt
docs/04_defensa/guia_defensa_oral.md
docs/04_defensa/preguntas_frecuentes.md
docs/04_defensa/decisiones_tecnicas.md
docs/04_defensa/dashboard_sqlite.md
docs/05_pruebas/guia_ejecucion.md
docs/05_pruebas/guia_script_evaluacion.md
docs/05_pruebas/resultados_pruebas.md
```

---

## 15. Script de evaluación

`scripts/evaluate.js` debe:

- enviar 500 requests concurrentes a `/ingest`;
- consultar `/health` en paralelo;
- medir latencias;
- consultar `/metrics`;
- imprimir resumen;
- opcionalmente guardar resultados en docs.

---

## 16. Cosas que no hacer sin permiso

No hacer sin pedir confirmación:

- migrar a TypeScript;
- migrar a ES Modules;
- cambiar Express por otro framework;
- implementar autenticación completa;
- implementar roles/permisos completos;
- cambiar `/ingest` por otro endpoint;
- eliminar documentación;
- escribir en SQLite desde todos los procesos sin justificarlo.

---

## 17. Criterio de éxito

El proyecto está listo cuando:

- `npm start` funciona;
- cluster levanta la mitad de CPUs;
- self-healing funciona;
- `/health` responde rápido;
- `/ingest` acepta 500 eventos;
- Worker Thread procesa sin bloquear;
- `Atomics.add()` incrementa contador;
- Primary agrega total global por IPC;
- SQLite guarda eventos;
- dashboard muestra resultados;
- guía de defensa explica todo.

---

## 18. Frase guía

```txt
HTTP y monitoreo en Event Loop.
CPU pesada en Worker Thread.
Escalado y resiliencia con Cluster.
Sincronización con SharedArrayBuffer y Atomics.
Persistencia y defensa con SQLite y Dashboard.
```
