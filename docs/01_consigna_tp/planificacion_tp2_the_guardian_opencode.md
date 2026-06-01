# Planificación final para OpenCode — The Guardian

**Proyecto:** The Guardian — Micro-Orquestador de Ingesta y Monitoreo Reactivo  
**Versión de planificación:** final ajustada con dashboard, SQLite, documentación de defensa e IPC en Primary  
**Stack decidido:** Node.js 20 + CommonJS + Express + Cluster + Worker Threads + SharedArrayBuffer + Atomics + SQLite + EJS

---

## 1. Decisiones finales confirmadas

| Tema | Decisión final |
|---|---|
| Runtime | Node.js 20 |
| Sistema de módulos | CommonJS |
| Servidor HTTP | Express |
| Endpoint principal de ingesta | `GET /ingest?id=4500` |
| `POST /ingest` | No obligatorio. Dejarlo como mejora opcional. |
| Respuesta de `/ingest` | `202 Accepted` |
| Monitoreo | `GET /health` |
| Dashboard | Sí, con EJS |
| Persistencia | Sí, con SQLite |
| Escrituras SQLite | Centralizadas en el Primary mediante IPC |
| Autenticación/permisos | Solo documentado como mejora, no implementarlo de entrada |
| Contador global | Agregación por IPC en el Primary |
| Contador atómico | Local por Worker de cluster usando `SharedArrayBuffer` + `Atomics.add()` |
| Script de evaluación | Node.js |
| Documentación | Carpeta `docs/` completa |
| Guía de defensa oral | Obligatoria |

---

## 2. Aclaración sobre método de `/ingest`

La consigna indica que la ruta obligatoria es:

```txt
/ingest?id=4500
```

y el método aparece como:

```txt
GET o POST
```

Además, el parámetro `id` se pide por **Query String**.

Por eso, para mantener el proyecto simple y alineado con el ejemplo de la consigna, la implementación principal debe ser:

```http
GET /ingest?id=4500
```

No hace falta implementar `POST /ingest` para cumplir.  
Si sobra tiempo, se puede agregar como compatibilidad secundaria, pero no debe distraer del objetivo principal.

---

## 3. Objetivo técnico del sistema

El sistema debe demostrar que Node.js puede mantener una API reactiva bajo carga si se separan correctamente las responsabilidades:

```txt
HTTP / I/O                 → Event Loop del Cluster Worker
Trabajo CPU-bound          → Worker Thread fijo
Sincronización por hilo    → SharedArrayBuffer + Atomics.add()
Escalado y resiliencia     → Cluster + Self-Healing
Persistencia y dashboard   → SQLite + EJS
Agregación entre procesos  → IPC hacia el Primary
```

---

# Parte 1 — Organización inicial obligatoria

## 4. Primer paso: organizar `docs/`

Antes de implementar código, OpenCode debe ordenar la documentación.

La estructura debe quedar así:

```txt
docs/
├── 00_guia_maestra_opencode.md
├── 01_consigna_tp/
│   ├── consignas_tp2_the_guardian.md
│   └── planificacion_tp2_the_guardian_opencode.md
├── 02_redes/
│   ├── clase_1_redes_nodejs.md
│   ├── clase_2_redes_tcp_udp_nodejs.md
│   ├── clase_3_arquitectura_flujo_datos.md
│   ├── clase_4_topologia_digital_udp_rudp_spoofing.md
│   ├── clase_5_colapso_sniffer_forense_nodejs.md
│   ├── clase_6_alta_concurrencia_self_healing_nodejs.md
│   └── clase_7_javascript_alto_rendimiento_concurrencia_atomics.md
├── 03_backend/
│   ├── clase_1_backend_introduccion_nodejs.md
│   ├── clase_2_backend_funciones_arrays_practica1.md
│   ├── clase_3_backend_arrays_funciones_objetos_practica2.md
│   ├── clase_4_backend_http_api_productos.md
│   ├── clase_5_backend_http_headers_fetch.md
│   ├── clase_6_backend_express_api_rest_usuarios.md
│   ├── clase_7_backend_sqlite_ejs_crud_roles_usuarios.md
│   └── tp_final_backend_permisos_roles_autenticacion.md
├── 04_defensa/
│   ├── guia_defensa_oral.md
│   ├── preguntas_frecuentes.md
│   └── decisiones_tecnicas.md
└── 05_pruebas/
    ├── guia_ejecucion.md
    ├── guia_script_evaluacion.md
    └── resultados_pruebas.md
```

---

## 5. Segundo paso: crear `AGENTS.md`

Crear en la raíz:

```txt
AGENTS.md
```

Este archivo debe indicar a OpenCode:

- qué stack usar;
- qué decisiones están cerradas;
- qué archivos consultar;
- qué no debe cambiar sin permiso;
- cómo trabajar por fases;
- qué documentación actualizar;
- cómo validar el resultado.

---

## 6. Estructura técnica final del proyecto

```txt
the-guardian/
├── AGENTS.md
├── README.md
├── package.json
├── src/
│   ├── primary.js
│   ├── app.js
│   ├── config/
│   │   ├── env.js
│   │   └── db.js
│   ├── database/
│   │   └── schema.sql
│   ├── models/
│   │   ├── ingest-event.model.js
│   │   ├── worker-restart.model.js
│   │   └── metric-snapshot.model.js
│   ├── routes/
│   │   ├── health.routes.js
│   │   ├── ingest.routes.js
│   │   ├── metrics.routes.js
│   │   └── dashboard.routes.js
│   ├── controllers/
│   │   ├── health.controller.js
│   │   ├── ingest.controller.js
│   │   ├── metrics.controller.js
│   │   └── dashboard.controller.js
│   ├── services/
│   │   ├── ingest.service.js
│   │   ├── metrics.service.js
│   │   ├── primary-ipc.service.js
│   │   ├── dashboard.service.js
│   │   └── worker-thread.service.js
│   ├── workers/
│   │   └── ingest.worker.js
│   ├── middlewares/
│   │   ├── not-found.middleware.js
│   │   └── error.middleware.js
│   ├── utils/
│   │   ├── logger.js
│   │   ├── response.js
│   │   └── time.js
│   └── views/
│       ├── layout.ejs
│       ├── dashboard.ejs
│       ├── events.ejs
│       └── error.ejs
├── public/
│   └── styles.css
├── scripts/
│   └── evaluate.js
└── docs/
    └── ...
```

---

# Parte 2 — Arquitectura general

## 7. Diagrama lógico

```txt
                         ┌──────────────────────────────┐
                         │        Primary Process        │
                         │                              │
                         │ - crea cluster               │
                         │ - revive Workers             │
                         │ - recibe mensajes IPC        │
                         │ - agrega contador global     │
                         │ - escribe eventos en SQLite  │
                         └──────────────┬───────────────┘
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             │                          │                          │
             ▼                          ▼                          ▼
┌────────────────────────┐ ┌────────────────────────┐ ┌────────────────────────┐
│ Cluster Worker         │ │ Cluster Worker         │ │ Cluster Worker         │
│ Express :8080          │ │ Express :8080          │ │ Express :8080          │
│                        │ │                        │ │                        │
│ /health                │ │ /health                │ │ /health                │
│ /ingest                │ │ /ingest                │ │ /ingest                │
│ /metrics               │ │ /metrics               │ │ /metrics               │
│ /dashboard             │ │ /dashboard             │ │ /dashboard             │
│                        │ │                        │ │                        │
│ SharedArrayBuffer      │ │ SharedArrayBuffer      │ │ SharedArrayBuffer      │
│ Worker Thread fijo     │ │ Worker Thread fijo     │ │ Worker Thread fijo     │
└──────────┬─────────────┘ └──────────┬─────────────┘ └──────────┬─────────────┘
           │                          │                          │
           ▼                          ▼                          ▼
┌────────────────────────┐ ┌────────────────────────┐ ┌────────────────────────┐
│ ingest.worker.js       │ │ ingest.worker.js       │ │ ingest.worker.js       │
│ CPU-bound work         │ │ CPU-bound work         │ │ CPU-bound work         │
│ Atomics.add()          │ │ Atomics.add()          │ │ Atomics.add()          │
└────────────────────────┘ └────────────────────────┘ └────────────────────────┘
```

---

## 8. Flujo de `/health`

```txt
Cliente
  ↓
GET /health
  ↓
Cluster Worker Express
  ↓
health.controller.js
  ↓
Respuesta inmediata con status + pid
```

`/health` no debe consultar SQLite, no debe esperar al Worker Thread y no debe ejecutar trabajo pesado.

---

## 9. Flujo de `/ingest`

```txt
Cliente
  ↓
GET /ingest?id=4500
  ↓
Cluster Worker Express
  ↓
ingest.controller.js
  ↓
Validar id
  ↓
ingest.service.js
  ↓
worker-thread.service.js
  ↓
Worker Thread fijo
  ↓
Cálculo pesado
  ↓
Atomics.add(counter, 0, 1)
  ↓
Mensaje al Cluster Worker
  ↓
Mensaje IPC al Primary
  ↓
Primary incrementa contador global y persiste en SQLite
```

La respuesta HTTP se envía antes de que termine el cálculo pesado:

```http
202 Accepted
```

---

# Parte 3 — Fases de implementación

## Fase 0 — Diagnóstico inicial

### Objetivo

Saber qué existe y qué falta.

### Tareas

1. Revisar estructura actual.
2. Verificar si existe `package.json`.
3. Verificar si existe `src/`.
4. Verificar si existe `docs/`.
5. Verificar si ya hay código previo.
6. Crear un resumen de estado.

### Resultado esperado

```md
## Diagnóstico inicial

- package.json: no existe / existe.
- src/: no existe / existe.
- docs/: no existe / existe.
- AGENTS.md: no existe / existe.
- Implementación cluster: pendiente.
- Implementación worker_threads: pendiente.
- SQLite: pendiente.
- Dashboard: pendiente.
```

---

## Fase 1 — Organizar documentación

### Objetivo

Dejar `docs/` ordenado como fuente de estudio y contexto para OpenCode.

### Tareas

1. Crear estructura `docs/`.
2. Colocar `00_guia_maestra_opencode.md`.
3. Ubicar consignas en `docs/01_consigna_tp/`.
4. Ubicar clases de Redes en `docs/02_redes/`.
5. Ubicar clases de Backend en `docs/03_backend/`.
6. Crear archivos de defensa.
7. Crear archivos de pruebas.

### Archivos mínimos nuevos

```txt
docs/04_defensa/guia_defensa_oral.md
docs/04_defensa/preguntas_frecuentes.md
docs/04_defensa/decisiones_tecnicas.md
docs/05_pruebas/guia_ejecucion.md
docs/05_pruebas/guia_script_evaluacion.md
docs/05_pruebas/resultados_pruebas.md
```

---

## Fase 2 — Crear `AGENTS.md`

### Objetivo

Definir reglas permanentes para OpenCode.

### Debe incluir

- Node.js 20.
- CommonJS.
- Express.
- Dashboard EJS.
- SQLite.
- Cluster.
- Worker Thread fijo.
- `SharedArrayBuffer`.
- `Atomics.add()`.
- IPC en Primary.
- `/health`.
- `/ingest`.
- Documentación de defensa.
- Prohibición de agregar autenticación obligatoria.
- `POST /ingest` solo como mejora opcional.

---

## Fase 3 — Inicializar proyecto Node.js

### Tareas

1. Crear `package.json`.
2. Instalar dependencias:

```bash
npm install express ejs better-sqlite3
npm install --save-dev nodemon
```

3. Configurar scripts:

```json
{
  "scripts": {
    "start": "node src/primary.js",
    "dev": "nodemon src/primary.js",
    "evaluate": "node scripts/evaluate.js"
  }
}
```

4. Definir Node:

```json
{
  "engines": {
    "node": ">=20"
  }
}
```

---

## Fase 4 — Configuración base de Express

### Tareas

1. Crear `src/app.js`.
2. Configurar:
   - `express.json()`;
   - `express.urlencoded({ extended: false })`;
   - `express.static('public')`;
   - EJS;
   - rutas;
   - 404;
   - error handler.
3. Montar:
   - `/health`;
   - `/ingest`;
   - `/metrics`;
   - `/dashboard`.

### `app.js` esperado

```js
const express = require('express');
const path = require('path');

const healthRoutes = require('./routes/health.routes');
const ingestRoutes = require('./routes/ingest.routes');
const metricsRoutes = require('./routes/metrics.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const notFoundMiddleware = require('./middlewares/not-found.middleware');
const errorMiddleware = require('./middlewares/error.middleware');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '../public')));

app.use('/health', healthRoutes);
app.use('/ingest', ingestRoutes);
app.use('/metrics', metricsRoutes);
app.use('/dashboard', dashboardRoutes);

app.get('/', (req, res) => res.redirect('/dashboard'));

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
```

---

## Fase 5 — Configurar SQLite

### Objetivo

Persistir eventos, métricas y reinicios sin escribir desde todos los procesos al mismo tiempo.

### Decisión clave

Solo el **Primary** debe escribir de forma centralizada en SQLite.  
Los Cluster Workers informan eventos mediante IPC.

### Dependencia

```bash
npm install better-sqlite3
```

### `src/config/db.js`

Debe:

1. Abrir archivo `guardian.db`.
2. Activar WAL.
3. Activar foreign keys.
4. Configurar busy timeout.
5. Crear tablas si no existen.

### PRAGMAs recomendados

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
```

### Tablas recomendadas

```sql
CREATE TABLE IF NOT EXISTS ingest_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  accepted_by_pid INTEGER,
  completed_by_pid INTEGER,
  status TEXT NOT NULL,
  accepted_at TEXT,
  completed_at TEXT,
  processing_ms INTEGER,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS worker_restarts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  old_pid INTEGER,
  new_pid INTEGER,
  code INTEGER,
  signal TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS metric_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  total_accepted INTEGER NOT NULL,
  total_completed INTEGER NOT NULL,
  total_failed INTEGER NOT NULL,
  total_restarts INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
```

### Criterio de aceptación

Debe crearse `guardian.db` al iniciar el sistema.

---

## Fase 6 — Modelos SQLite

### Archivos

```txt
src/models/ingest-event.model.js
src/models/worker-restart.model.js
src/models/metric-snapshot.model.js
```

### `ingest-event.model.js`

Debe permitir:

- registrar evento aceptado;
- marcar evento completado;
- marcar evento fallido;
- listar últimos eventos;
- contar aceptados;
- contar completados;
- contar fallidos.

### `worker-restart.model.js`

Debe permitir:

- registrar reinicio;
- listar últimos reinicios;
- contar reinicios.

### `metric-snapshot.model.js`

Debe permitir:

- guardar snapshot;
- obtener últimos snapshots.

---

## Fase 7 — Implementar `/health`

### Endpoint

```http
GET /health
```

### Respuesta recomendada

```json
{
  "status": "ok",
  "pid": 12345,
  "uptime": 12.5,
  "timestamp": "2026-05-26T00:00:00.000Z"
}
```

### Reglas

- No consultar SQLite.
- No esperar al Worker Thread.
- No ejecutar cálculo pesado.
- Responder lo más rápido posible.

---

## Fase 8 — Implementar Cluster

### Archivo

```txt
src/primary.js
```

### Tareas

1. Importar `cluster` y `os`.
2. Calcular:

```js
const workerCount = Math.max(1, Math.floor(os.cpus().length / 2));
```

3. Si es Primary:
   - inicializar SQLite;
   - crear Workers;
   - escuchar mensajes IPC;
   - manejar reinicios.
4. Si es Worker:
   - levantar Express en puerto `8080`.

### Logs esperados

```txt
[PRIMARY] PID 1000 iniciado
[PRIMARY] CPUs disponibles: 8
[PRIMARY] Workers a levantar: 4
[WORKER] PID 1001 escuchando en puerto 8080
```

---

## Fase 9 — Self-healing

### Tareas

1. Escuchar:

```js
cluster.on('exit', (worker, code, signal) => {
  ...
});
```

2. Registrar reinicio en SQLite.
3. Crear nuevo Worker:

```js
const newWorker = cluster.fork();
```

4. Guardar:
   - PID viejo;
   - PID nuevo;
   - código;
   - señal;
   - fecha.

### Criterio de aceptación

Al ejecutar:

```bash
kill -9 PID
```

debe crearse otro Worker automáticamente.

---

## Fase 10 — IPC en el Primary

### Objetivo

Recibir desde los Workers eventos como:

- evento aceptado;
- evento completado;
- evento fallido;
- contador local;
- error del Worker Thread.

### Mensajes sugeridos

```js
{
  type: 'INGEST_ACCEPTED',
  eventId,
  pid,
  acceptedAt
}
```

```js
{
  type: 'INGEST_COMPLETED',
  eventId,
  pid,
  processingMs,
  completedAt
}
```

```js
{
  type: 'INGEST_FAILED',
  eventId,
  pid,
  errorMessage
}
```

### Responsabilidad del Primary

1. Actualizar contadores globales.
2. Persistir en SQLite.
3. Guardar snapshots periódicos.
4. Registrar reinicios.

---

## Fase 11 — Worker Thread fijo

### Archivos

```txt
src/services/worker-thread.service.js
src/workers/ingest.worker.js
```

### Reglas

- Crear un Worker Thread una sola vez por proceso Worker.
- No crear un Worker Thread por request.
- Reutilizarlo para todas las tareas.
- Pasar `SharedArrayBuffer` al crearlo.
- Manejar `message`, `error` y `exit`.

---

## Fase 12 — SharedArrayBuffer + Atomics

### Implementación

En el Worker del cluster:

```js
const sharedBuffer = new SharedArrayBuffer(4);
const counter = new Int32Array(sharedBuffer);
```

En el Worker Thread:

```js
const counter = new Int32Array(workerData.sharedBuffer);
Atomics.add(counter, 0, 1);
```

Para leer:

```js
const value = Atomics.load(counter, 0);
```

### Documentar

Explicar en comentarios:

- el buffer tiene 4 bytes porque `Int32Array` usa enteros de 32 bits;
- `Atomics.add()` evita race conditions;
- este contador es local al proceso Worker del cluster;
- el total global se agrega por IPC en el Primary.

---

## Fase 13 — Implementar `/ingest`

### Endpoint principal

```http
GET /ingest?id=4500
```

### Validaciones

- `id` debe existir.
- `id` debe ser numérico.
- `id` debe ser mayor que cero.

### Respuesta válida

```json
{
  "ok": true,
  "status": "accepted",
  "id": 4500,
  "pid": 12345
}
```

### Código HTTP

```txt
202 Accepted
```

### Respuesta inválida

```json
{
  "ok": false,
  "message": "id inválido o ausente"
}
```

### Código HTTP

```txt
400 Bad Request
```

### Flujo

1. Controller valida.
2. Service encola/delega al Worker Thread.
3. Worker informa al Primary por IPC.
4. Respuesta HTTP sale rápido.

---

## Fase 14 — Cálculo pesado

### Dónde debe ejecutarse

Solo en:

```txt
src/workers/ingest.worker.js
```

### Dónde no debe ejecutarse

Nunca en:

- `ingest.controller.js`;
- `ingest.service.js`;
- `app.js`;
- `primary.js`.

### Simulación recomendada

Usar una función pesada, pero configurable para no destruir la máquina durante desarrollo.

Ejemplo:

```js
const iterations = Number(process.env.HEAVY_ITERATIONS || 5_000_000);
```

Para defensa, explicar que la consigna original simulaba CPU-bound con un loop pesado y que se dejó configurable para pruebas reproducibles.

---

## Fase 15 — Métricas

### Endpoint

```http
GET /metrics
```

### Respuesta recomendada

```json
{
  "pid": 12345,
  "local": {
    "accepted": 20,
    "completed": 18,
    "atomicCounter": 18
  },
  "database": {
    "totalAccepted": 500,
    "totalCompleted": 500,
    "totalFailed": 0,
    "totalRestarts": 1
  }
}
```

### Nota

Como el endpoint corre en un Worker del cluster, puede mostrar:

- métricas locales del Worker;
- métricas globales leídas desde SQLite.

---

## Fase 16 — Dashboard EJS

### Endpoint

```http
GET /dashboard
```

### Objetivo

Mostrar un panel simple pero funcional para defender el TP.

### Debe mostrar

1. Estado del proceso que respondió.
2. Total de eventos aceptados.
3. Total de eventos completados.
4. Total de eventos fallidos.
5. Total de reinicios.
6. Últimos eventos.
7. Últimos reinicios.
8. Link a `/health`.
9. Link a `/metrics`.
10. Instrucciones rápidas de prueba.

### Vista principal

```txt
src/views/dashboard.ejs
```

### Estilos

```txt
public/styles.css
```

### Importante

El dashboard es una mejora de backend.  
No debe complicar ni romper la consigna central de redes.

---

## Fase 17 — Script de evaluación

### Archivo

```txt
scripts/evaluate.js
```

### Requisitos

1. Usar `fetch` nativo de Node.js 20.
2. Enviar 500 requests concurrentes a `/ingest`.
3. Consultar `/health` en paralelo.
4. Medir latencias.
5. Consultar `/metrics`.
6. Consultar o validar datos persistidos.
7. Imprimir resumen claro.
8. Opcional: guardar resultados en `docs/05_pruebas/resultados_pruebas.md`.

### Salida esperada

```txt
Evaluación The Guardian
-----------------------
Requests /ingest enviados: 500
Aceptados 202: 500
Errores: 0

Health checks: 50
Promedio /health: 5 ms
Máximo /health: 22 ms

SQLite:
Eventos aceptados: 500
Eventos completados: 500
Fallidos: 0

Resultado: OK
```

---

## Fase 18 — Documentación de ejecución

### Archivo

```txt
docs/05_pruebas/guia_ejecucion.md
```

### Debe incluir

- instalar dependencias;
- levantar servidor;
- probar `/health`;
- probar `/ingest`;
- abrir dashboard;
- correr evaluación;
- probar self-healing;
- interpretar resultados.

---

## Fase 19 — Documentación del dashboard y SQLite

### Archivo sugerido

```txt
docs/04_defensa/dashboard_sqlite.md
```

### Debe explicar

- por qué se agregó dashboard;
- qué datos muestra;
- qué tablas usa SQLite;
- por qué el Primary centraliza escrituras;
- qué problemas evita WAL;
- qué valor aporta a la defensa.

---

## Fase 20 — Guía de estudio para defensa oral

### Archivo obligatorio

```txt
docs/04_defensa/guia_defensa_oral.md
```

### Debe incluir

- resumen del proyecto;
- problema técnico;
- arquitectura;
- flujo de `/health`;
- flujo de `/ingest`;
- Cluster;
- self-healing;
- Worker Threads;
- Event Loop;
- CPU-bound;
- `SharedArrayBuffer`;
- `Atomics.add()`;
- IPC en Primary;
- SQLite;
- Dashboard;
- límites técnicos;
- preguntas frecuentes.

---

## Fase 21 — Decisiones técnicas

### Archivo

```txt
docs/04_defensa/decisiones_tecnicas.md
```

### Tabla mínima

| Decisión | Motivo |
|---|---|
| Express | Aplicar backend aprendido y organizar rutas |
| Dashboard EJS | Facilitar defensa visual |
| SQLite | Persistir evidencia de ejecución |
| Escritura SQLite en Primary | Evitar escrituras concurrentes desde varios procesos |
| IPC | Agregar métricas globales entre procesos |
| GET `/ingest` | La consigna usa query string y ejemplo `/ingest?id=4500` |
| Worker Thread fijo | Evitar bloquear Event Loop y evitar overhead |
| `SharedArrayBuffer` | Compartir contador con el Worker Thread |
| `Atomics.add()` | Evitar race conditions |
| Autenticación | Documentada, no implementada para no desviar alcance |

---

## Fase 22 — Preguntas frecuentes

### Archivo

```txt
docs/04_defensa/preguntas_frecuentes.md
```

### Preguntas mínimas

1. ¿Por qué usaste Express?
2. ¿Por qué usaste Cluster?
3. ¿Por qué la mitad de los núcleos?
4. ¿Qué hace self-healing?
5. ¿Qué pasa si un Worker muere con tareas en vuelo?
6. ¿Por qué usaste Worker Thread?
7. ¿Qué es CPU-bound?
8. ¿Por qué `/health` no se bloquea?
9. ¿Qué es `SharedArrayBuffer`?
10. ¿Qué hace `Atomics.add()`?
11. ¿Por qué el contador global usa IPC?
12. ¿Por qué SQLite escribe desde el Primary?
13. ¿Qué muestra el dashboard?
14. ¿Por qué no implementaste autenticación?

---

## Fase 23 — README

### Debe incluir

- descripción;
- stack;
- instalación;
- comandos;
- endpoints;
- dashboard;
- SQLite;
- script de evaluación;
- estructura;
- documentación;
- defensa rápida.

### Comandos

```bash
npm install
npm start
npm run dev
npm run evaluate
```

---

# Parte 4 — Plan de pruebas

## 23.1. Prueba manual de health

```bash
curl http://localhost:8080/health
```

Esperado:

```json
{
  "status": "ok",
  "pid": 12345
}
```

---

## 23.2. Prueba manual de ingest

```bash
curl "http://localhost:8080/ingest?id=1"
```

Esperado:

```json
{
  "ok": true,
  "status": "accepted",
  "id": 1,
  "pid": 12345
}
```

---

## 23.3. Prueba de ID inválido

```bash
curl "http://localhost:8080/ingest?id=abc"
```

Esperado:

```json
{
  "ok": false,
  "message": "id inválido o ausente"
}
```

---

## 23.4. Prueba de dashboard

Abrir:

```txt
http://localhost:8080/dashboard
```

Debe mostrar métricas persistidas.

---

## 23.5. Prueba de metrics

```bash
curl http://localhost:8080/metrics
```

Debe mostrar métricas locales y globales.

---

## 23.6. Prueba de carga

```bash
npm run evaluate
```

Debe enviar 500 requests y medir `/health`.

---

## 23.7. Prueba de self-healing

1. Identificar PID de un Worker.
2. Ejecutar:

```bash
kill -9 PID
```

3. Verificar que el Primary cree otro Worker.
4. Verificar que se registre en SQLite.
5. Verificar que aparezca en dashboard.

---

# Parte 5 — Orden final recomendado de implementación

OpenCode debe implementar en este orden:

1. Ordenar `docs/`.
2. Crear `AGENTS.md`.
3. Crear `package.json`.
4. Instalar dependencias.
5. Crear estructura `src/`.
6. Crear `app.js` Express.
7. Crear `/health`.
8. Crear configuración SQLite.
9. Crear modelos SQLite.
10. Crear `primary.js` con cluster.
11. Crear self-healing.
12. Crear servicio IPC del Primary.
13. Crear Worker Thread fijo.
14. Crear `SharedArrayBuffer`.
15. Crear `Atomics.add()` en Worker Thread.
16. Crear `/ingest`.
17. Crear `/metrics`.
18. Crear dashboard EJS.
19. Crear script de evaluación.
20. Crear documentación de ejecución.
21. Crear guía de defensa.
22. Crear README.
23. Probar manualmente.
24. Probar carga.
25. Ajustar errores.
26. Registrar resultados en docs.

---

# Parte 6 — Checklist final de aceptación

## Funcional

- [ ] `npm start` levanta el sistema.
- [ ] Node.js 20 funciona.
- [ ] Express corre en Workers del cluster.
- [ ] Se usa la mitad de CPUs.
- [ ] Self-healing funciona.
- [ ] `/health` responde rápido.
- [ ] `/ingest?id=...` responde `202`.
- [ ] ID inválido responde `400`.
- [ ] Worker Thread procesa tareas.
- [ ] `SharedArrayBuffer` existe.
- [ ] `Atomics.add()` se usa.
- [ ] Primary recibe IPC.
- [ ] SQLite persiste eventos.
- [ ] Dashboard muestra métricas.
- [ ] Script envía 500 requests.
- [ ] `/health` se consulta durante carga.
- [ ] Contador final llega a 500 o se explica claramente.

## Documentación

- [ ] `AGENTS.md` existe.
- [ ] `docs/00_guia_maestra_opencode.md` existe.
- [ ] `docs/04_defensa/guia_defensa_oral.md` existe.
- [ ] `docs/04_defensa/decisiones_tecnicas.md` existe.
- [ ] `docs/04_defensa/preguntas_frecuentes.md` existe.
- [ ] `docs/05_pruebas/guia_ejecucion.md` existe.
- [ ] `docs/05_pruebas/guia_script_evaluacion.md` existe.
- [ ] `docs/05_pruebas/resultados_pruebas.md` existe.
- [ ] README explica cómo correr todo.

---

# Parte 7 — Alcance recomendado

## Implementar sí o sí

- Express.
- Cluster.
- Self-healing.
- Worker Thread fijo.
- `/health`.
- `/ingest`.
- `SharedArrayBuffer`.
- `Atomics.add()`.
- IPC en Primary.
- SQLite.
- Dashboard.
- Script de evaluación.
- Documentación de defensa.

## Dejar documentado, no implementar ahora

- Login.
- Roles.
- Permisos.
- Middleware de autorización.

Motivo:

> La consigna central es de redes, concurrencia y Node.js internals. Autenticación y permisos son aprendizajes de backend que se pueden mencionar como mejora futura, pero no deben poner en riesgo el cumplimiento principal.

---

# Parte 8 — Frase final para guiar a OpenCode

> Primero cumplir perfectamente la consigna de redes. Después, usar Express, SQLite y dashboard como mejoras de presentación y defensa, sin romper la arquitectura concurrente principal.
