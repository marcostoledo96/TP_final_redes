# Guía de Arquitectura y Organización de Carpetas — The Guardian

> **Propósito:** Explicar cómo está armado el sistema y por qué cada carpeta está donde está.
> **Audiencia:** Alumno junior que va a defender el TP ante el profesor.
> **Estado:** Fuente de verdad
> **Última actualización:** 2026-06-02

---

## 1. Visión general del sistema (con analogía)

Imaginá que **The Guardian** es un **restaurante**.

| Rol en el sistema | Parte del restaurante | Qué hace |
|---|---|---|
| **Primary** (`primary.js`) | El **gerente** | No atiende mesas. Contrata mozos, vigila que no se caigan, y lleva la cuenta total de platos servidos por todos. |
| **Cluster Workers** (`server.js`, `worker-entry.js`) | Los **mozos** | Atienden a los clientes (requests HTTP). Cada mozo tiene su propia mesa y su propio cerebro (Event Loop). |
| **Worker Thread** (`compute.worker.js`) | El **chef especializado** | Hace los platos más complicados (cálculo pesado de CPU) sin molestar a los mozos. Cada mozo tiene su propio chef. |
| **SharedArrayBuffer + Atomics** | La **pizarra compartida** | El chef y el mozo escriben en la misma pizarra, pero con un rotulador especial que no deja que nadie borre en el medio. |
| **IPC (mensajes)** | Los **paseadores de notas** | Cuando un mozo tiene novedades, manda una nota al gerente para que registre todo. |
| **SQLite** (`database/connection.js`) | La **caja registradora** | Solo el gerente escribe en ella. Los mozos pueden mirar, pero no tocar. |
| **Express** (`app.js`) | La **puerta de entrada del restaurante** | Recibe a los clientes, los deriva al mozo correcto, y maneja las quejas. |
| **EJS Dashboard** (`views/dashboard.ejs`) | El **tablero de avisos** | En la pared del restaurante, el gerente pone un cartel con las estadísticas del día. |

El TP aplica estos conceptos del mundo real:
- **`cluster`** → varios mozos (procesos) atendiendo clientes.
- **`worker_threads`** → chef especializado que cocina sin molestar al mozo.
- **`SharedArrayBuffer`** → pizarra compartida entre mozo y chef.
- **`Atomics.add()`** → rotulador especial que evita que dos escriban al mismo tiempo.
- **`IPC`** → notas que los mozos le pasan al gerente.
- **`SQLite`** → caja registradora donde el gerente guarda todo.
- **`Express`** → la puerta principal del restaurante.
- **`EJS`** → cartel estático que el gerente arma y pega en la pared.

---

## 2. Diagrama mental de capas (texto, no imagen)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  NIVEL 1: CLIENTE                                                           │
│  ─────────────                                                              │
│  curl, navegador, Postman, scripts/evaluate.js                              │
│                                                                             │
│  GET /health        GET /ingest?id=4500     GET /metrics      GET /dashboard│
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  NIVEL 2: EXPRESS (HTTP) — Puerto TCP compartido entre todos los Workers   │
│  ─────────────────────────                                                    │
│  src/app.js configura middleware, vistas EJS, archivos estáticos, rutas    │
│  src/server.js abre el socket TCP y empieza a escuchar requests             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  NIVEL 3: ROUTES                                                            │
│  ─────────────                                                              │
│  src/routes/index.js monta todos los routers                                │
│  /health → healthRouter    /ingest → ingestRouter                           │
│  /metrics → metricsRouter  /dashboard → dashboardRouter                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  NIVEL 4: CONTROLLERS                                                       │
│  ────────────────────                                                       │
│  Reciben req, VALIDAN (middlewares), DELEGAN a services, RESPONDEN JSON/EJS│
│  ingest.controller.js    metrics.controller.js                              │
│  dashboard.controller.js health.controller.js                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  NIVEL 5: SERVICES (lógica de negocio)                                      │
│  ─────────────────────────────────────                                      │
│  ingest.service.js       → decide si acepta/rechaza, encola en Worker Thread│
│  metrics.service.js      → lee localCounter + pide globales por IPC         │
│  dashboard.service.js    → arma paquete de datos: local + global + SQLite   │
│  health.service.js       → responde { status: "ok", pid } inmediatamente   │
│  worker-thread.service.js → administra el Worker Thread fijo (spawn, health, dispatch)│
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
              ┌─────────────────────┴─────────────────────┐
              ▼                                           ▼
┌─────────────────────────────────────┐     ┌─────────────────────────────────────┐
│  NIVEL 6A: WORKER THREAD (CPU-bound)│     │  NIVEL 6B: IPC → PRIMARY            │
│  ─────────────────────────────────── │     │  ──────────────────────               │
│  src/workers/compute.worker.js      │     │  process.send({ type, eventId, pid }) │
│  - Recibe tarea por parentPort      │     │  Mensajes: INGEST_ACCEPTED            │
│  - Hace loop de 10 millones iterac. │     │            INGEST_COMPLETED           │
│  - Atomics.add(counter, 0, 1)       │     │            INGEST_FAILED              │
│  - Responde COMPUTE_DONE            │     │            GET_METRICS / METRICS_RESPONSE│
└─────────────────────────────────────┘     └─────────────────────────────────────┘
              │                                           │
              ▼                                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  NIVEL 7: PRIMARY (proceso único, no atiende HTTP)                          │
│  ─────────────────────────────────────────────────                            │
│  src/primary.js                                                              │
│  - Fork de workers iniciales (cluster.fork)                                 │
│  - Self-healing: si un worker muere, crea uno nuevo                         │
│  - Recibe IPC, agrega contadores, escribe en SQLite                         │
│  - Shutdown graceful: cierra todo ordenado                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  NIVEL 8: SQLITE (WAL mode)                                                 │
│  ──────────────────────────                                                   │
│  data/the-guardian.sqlite                                                    │
│  Tablas: ingest_events, worker_restarts, metric_snapshots                     │
│  Solo el Primary escribe. Los Workers pueden leer (WAL permite lecturas concurrentes).│
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  NIVEL 9: DASHBOARD EJS (Server-Side Rendering)                             │
│  ──────────────────────────────────────────────                             │
│  src/views/dashboard.ejs genera HTML en el servidor con los datos            │
│  El navegador recibe HTML plano, no ve código EJS                            │
│  CSS en public/css/dashboard.css (estilos vanilla, sin frameworks)           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Árbol de carpetas explicado

Para **CADA** carpeta explicamos: qué contiene, por qué existe, qué problemas resuelve, y qué archivos clave tiene dentro.

```
├── src/
│   ├── primary.js               <- Punto de entrada del Cluster Primary
│   ├── app.js                   <- Fábrica de la app Express (routes + middlewares)
│   ├── server.js                <- Entrada del Worker del cluster + init HTTP
│   ├── worker-entry.js          <- Entrada que inicializa el Worker Thread antes de HTTP
│   ├── routes/                  <- Declaración de rutas GET
│   ├── controllers/             <- Reciben request, delegan a services, responden
│   ├── services/                <- Lógica de negocio (ingesta, métricas, dashboard, health, worker thread)
│   ├── workers/                 <- compute.worker.js (cálculo pesado CPU-bound)
│   ├── middlewares/             <- Validación, errores, 404
│   ├── models/                  <- Funciones para INSERT en SQLite
│   ├── database/                <- Conexión a SQLite con PRAGMAs
│   ├── views/                   <- Templates EJS del dashboard
│   └── utils/                   <- ApiError (clase de errores HTTP)
├── public/css/                  <- Estilos del dashboard
├── scripts/                     <- evaluate.js (carga de 500 reqs) + verify_runner.js
├── docs/                        <- Documentación
└── package.json
```

### 3.1 `src/primary.js`

| Atributo | Valor |
|---|---|
| ¿Qué contiene? | El ciclo de vida del proceso **Primary** (master) del cluster. |
| ¿Por qué existe? | Es el **cerebro** del sistema. Cuando ejecutás `npm start`, Node.js carga este archivo primero. |
| ¿Qué problemas resuelve? | - **Escalado horizontal**: crea N workers para usar todas las CPUs. - **Self-healing**: si un worker muere, lo reemplaza automáticamente. - **Centralización de escritura**: solo el Primary toca SQLite; evita corrupción. - **Agregación global**: suma contadores que llegan por IPC de todos los workers. - **Shutdown graceful**: cierra todo ordenado ante SIGTERM/SIGINT. |
| Archivos clave dentro | Ninguno (está en la raíz de `src/`). |

Código clave en `primary.js`:

```js
// Número de workers: mitad de CPUs (porque cada worker tiene un Worker Thread)
const workerCount = Math.max(1, Math.floor(os.cpus().length / 2));

// Fork de workers iniciales
for (let i = 0; i < workerCount; i++) {
  forkWorker(0);
}

// Self-healing: si un worker muere, crear uno nuevo
cluster.on("exit", (worker, code, signal) => { ... });

// IPC: recibir mensajes de los workers
cluster.on("message", (worker, message) => {
  if (message.type === "INGEST_COMPLETED") { ... }
});
```

### 3.2 `src/app.js`

| Atributo | Valor |
|---|---|
| ¿Qué contiene? | La **fábrica** que arma una instancia de Express con todo configurado. |
| ¿Por qué existe? | Separar "configuración de la app" de "inicio del servidor" es **separation of concerns**. Así podemos testear la app sin levantar un puerto real. |
| ¿Qué problemas resuelve? | - Centraliza middleware globales (`express.json`, `express.static`). - Configura EJS como motor de vistas. - Monta todas las rutas en un solo lugar. - Agrega middlewares finales de "red de seguridad": 404 y error handler. |
| Archivos clave dentro | Ninguno (archivo suelto). |

Código clave en `app.js`:

```js
function createApp() {
  const app = express();
  app.use(express.json());
  app.set("view engine", "ejs");
  app.use(express.static(path.join(__dirname, "..", "public")));
  mountRoutes(app);
  app.use(notFoundMiddleware);   // 404
  app.use(errorMiddleware);       // 500
  return app;
}
```

### 3.3 `src/server.js`

| Atributo | Valor |
|---|---|
| ¿Qué contiene? | La función que **levanta el servidor HTTP** escuchando en un puerto TCP. |
| ¿Por qué existe? | `app.js` arma la cocina; `server.js` abre la puerta al público. `
| ¿Qué problemas resuelve? | - Aisla el inicio del servidor para testing. - Maneja shutdown graceful del worker (SIGTERM, SIGINT, mensaje SHUTDOWN del Primary). - En modo standalone (`npm run dev`), inicializa el Worker Thread porque no hay Primary que lo haga. |
| Archivos clave dentro | Ninguno (archivo suelto). |

Código clave en `server.js`:

```js
function startServer(options = {}) {
  const app = createApp();
  const port = options.port || process.env.PORT || 8080;
  const server = app.listen(port, () => {
    console.log(`Worker ${process.pid} listening on ${port}`);
  });
  // ... shutdown graceful
}
```

### 3.4 `src/worker-entry.js`

| Atributo | Valor |
|---|---|
| ¿Qué contiene? | El **envoltorio** que corre en cada proceso worker del cluster. |
| ¿Por qué existe? | Separar el arranque del worker del Primary: `primary.js` gestiona; `worker-entry.js` trabaja. |
| ¿Qué problemas resuelve? | - Inicializa el Worker Thread **ANTES** de levantar el servidor HTTP, así llega el primer request ya está listo. - Mantiene el código del worker limpio y enfocado. |
| Archivos clave dentro | Ninguno (archivo suelto). |

Código clave en `worker-entry.js`:

```js
initWorkerThreadService();  // PASO 1: Chef listo antes de abrir la puerta
startServer();              // PASO 2: Abrir la puerta al público
```

### 3.5 `src/routes/`

| Atributo | Valor |
|---|---|
| ¿Qué contiene? | Definición de las rutas HTTP (`GET /health`, `GET /ingest`, etc.). |
| ¿Por qué existe? | Separar "qué URLs existen" de "qué hacen". Las rutas solo declaran el camino; la lógica vive en controllers y services. |
| ¿Qué problemas resuelve? | - Evita que `app.js` se llene de definiciones de rutas. - Permite agregar nuevos endpoints sin tocar la configuración base. - Cada archivo de ruta se enfoca en UN dominio (health, ingest, metrics, dashboard). |
| Archivos clave dentro | `index.js` (monta todas), `ingest.routes.js` (GET /ingest + validación), `health.routes.js`, `metrics.routes.js`, `dashboard.routes.js` |

### 3.6 `src/controllers/`

| Atributo | Valor |
|---|---|
| ¿Qué contiene? | Funciones que reciben el request HTTP, delegan al service, y deciden qué responder al cliente. |
| ¿Por qué existe? | Es la capa **orquestadora**: no tiene lógica de negocio compleja, solo coordina. |
| ¿Qué problemas resuelve? | - Desacopla Express (HTTP) de la lógica de negocio (services). - Permite testear la lógica sin simular requests HTTP. - Mantiene los responses consistentes (siempre JSON con `ok` y `error`). |
| Archivos clave dentro | `ingest.controller.js` (202 vs 503), `metrics.controller.js` (JSON), `dashboard.controller.js` (renderiza EJS), `health.controller.js` (JSON rápido). |

### 3.7 `src/services/`

| Atributo | Valor |
|---|---|
| ¿Qué contiene? | Toda la **lógica de negocio**: qué hacer cuando llega un request. |
| ¿Por qué existe? | Los controllers no deben tener lógica; los services son donde "pasa la magia". |
| ¿Qué problemas resuelve? | - `ingest.service.js` → decide si el Worker Thread está sano y encola la tarea. - `metrics.service.js` → combina localCounter (SharedArrayBuffer) con globales (IPC). - `dashboard.service.js` → arma el paquete completo de datos para la vista. - `health.service.js` → responde inmediatamente sin tocar SQLite. - `worker-thread.service.js` → administra el Worker Thread fijo (spawn, respawn, dispatch, getLocalCounter). |
| Archivos clave dentro | Los 5 archivos mencionados arriba. |

### 3.8 `src/workers/`

| Atributo | Valor |
|---|---|
| ¿Qué contiene? | El archivo del **Worker Thread** (`compute.worker.js`). Es el único archivo que corre dentro de un `new Worker(...)`. |
| ¿Por qué existe? | Separar el código que corre en el thread secundario del código del proceso principal. |
| ¿Qué problemas resuelve? | - Evita bloquear el Event Loop con cálculo pesado de CPU. - Demuestra uso de `worker_threads`, `SharedArrayBuffer` y `Atomics.add()`. - Es un chef dedicado: recibe tareas, cocina, y avisa cuando termina. |
| Archivos clave dentro | `compute.worker.js` (cálculo simulado de 10 millones de iteraciones + Atomics.add). |

Código clave en `compute.worker.js`:

```js
const sharedBuffer = workerData.sharedBuffer;
const counter = new Int32Array(sharedBuffer);

parentPort.on("message", (msg) => {
  if (msg.type !== "COMPUTE") return;
  for (let i = 0; i < 10_000_000; i++) { /* cpu-bound */ }
  Atomics.add(counter, 0, 1);   // ⭐ ESTRELLA DEL TP
  parentPort.postMessage({ type: "COMPUTE_DONE", jobId, eventId });
});
```

### 3.9 `src/middlewares/`

| Atributo | Valor |
|---|---|
| ¿Qué contiene? | Funciones que se ejecutan **antes** de llegar al controller. |
| ¿Por qué existe? | En Express, un middleware puede modificar el request, validar datos, o detener la cadena. |
| ¿Qué problemas resuelve? | - `validate-ingest-query.middleware.js` → revisa que `?id` sea número entero positivo antes de llegar al controller. Responde 400 si está mal. - `error.middleware.js` → captura errores (incluidos ApiError) y responde JSON consistente. - `not-found.middleware.js` → responde 404 JSON cuando ninguna ruta capturó el request. |
| Archivos clave dentro | Los 3 archivos mencionados arriba. |

### 3.10 `src/models/`

| Atributo | Valor |
|---|---|
| ¿Qué contiene? | Funciones que encapsulan las consultas SQL para cada entidad. |
| ¿Por qué existe? | Evita escribir SQL crudo en el Primary. Cada función tiene un nombre claro (`insertIngestEvent`, `insertWorkerRestart`, `insertSnapshot`). |
| ¿Qué problemas resuelve? | - Centraliza las queries en un solo lugar. - Usa **prepared statements** (`?` placeholders) para evitar SQL Injection. - Hace el código más legible y testeable. |
| Archivos clave dentro | `ingest-event.model.js`, `worker-restart.model.js`, `metric-snapshot.model.js`. |

### 3.11 `src/database/`

| Atributo | Valor |
|---|---|
| ¿Qué contiene? | La función `createDatabaseConnection()` que abre SQLite y crea las tablas. |
| ¿Por qué existe? | Centralizar la configuración de la base de datos en un solo archivo. |
| ¿Qué problemas resuelve? | - Aplica PRAGMAs obligatorios: `journal_mode = WAL`, `foreign_keys = ON`, `busy_timeout = 5000`. - Crea tablas si no existen (`CREATE TABLE IF NOT EXISTS`). - Solo el Primary usa esta función; los Workers nunca la llaman. |
| Archivos clave dentro | `connection.js` |

### 3.12 `src/views/`

| Atributo | Valor |
|---|---|
| ¿Qué contiene? | La plantilla EJS del dashboard. |
| ¿Por qué existe? | EJS es el motor de vistas que Express usa para generar HTML server-side. |
| ¿Qué problemas resuelve? | - El dashboard muestra métricas, eventos y reinicios en una página web simple. - No necesita React ni Vue: es un TP backend, el frontend es estático. - Las variables `<%= variable %>` se reemplazan por datos reales en el servidor. |
| Archivos clave dentro | `dashboard.ejs` (HTML + JS embebido). |

### 3.13 `src/utils/`

| Atributo | Valor |
|---|---|
| ¿Qué contiene? | Utilidades reutilizables que no pertenecen a ninguna capa específica. |
| ¿Por qué existe? | Evita repetir código y mantiene las utilidades centralizadas. |
| ¿Qué problemas resuelve? | - `api-error.js` define la clase `ApiError` que extiende `Error` con `statusCode` y `code`. El `error.middleware.js` usa `instanceof ApiError` para distinguir errores controlados de bugs inesperados. |
| Archivos clave dentro | `api-error.js` |

### 3.14 `public/css/`

| Atributo | Valor |
|---|---|
| ¿Qué contiene? | Archivos CSS estáticos. |
| ¿Por qué existe? | Express sirve archivos estáticos desde `public/` gracias a `express.static()`. |
| ¿Qué problemas resuelve? | - `dashboard.css` estiliza el dashboard con CSS vanilla (sin frameworks). - El navegador carga `/css/dashboard.css` directamente, sin pasar por controllers. |
| Archivos clave dentro | `dashboard.css` |

### 3.15 `scripts/`

| Atributo | Valor |
|---|---|
| ¿Qué contiene? | Scripts de evaluación y testing. |
| ¿Por qué existe? | Automatizar la prueba de carga del TP. |
| ¿Qué problemas resuelve? | - `evaluate.js` envía 500 requests concurrentes a `/ingest`, consulta `/health` en paralelo, mide latencias, hace polling a `/metrics` hasta que `completedEvents` alcance 500, calcula drift, y guarda resultados en `docs/05_pruebas/resultados_pruebas.md`. - `verify_runner.js` (opcional): ejecuta verificaciones adicionales. |
| Archivos clave dentro | `evaluate.js`, `verify_runner.js` |

### 3.16 `docs/`

| Atributo | Valor |
|---|---|
| ¿Qué contiene? | Documentación del TP para la defensa oral. |
| ¿Por qué existe? | El profesor puede pedir explicaciones sobre decisiones técnicas, flujos, o resultados de pruebas. |
| ¿Qué problemas resuelve? | Organiza toda la documentación en carpetas semánticas: `01_consigna_tp`, `02_redes`, `03_backend`, `04_defensa`, `05_pruebas`. |
| Archivos clave dentro | `04_defensa/guia_defensa_oral.md`, `04_defensa/preguntas_frecuentes.md`, `04_defensa/decisiones_tecnicas.md`, `04_defensa/dashboard_sqlite.md`, `05_pruebas/guia_ejecucion.md`, `05_pruebas/guia_script_evaluacion.md`, `05_pruebas/resultados_pruebas.md`. |

---

## 4. Conceptos clave explicados para el profesor

### 4.1 ¿Por qué `cluster`?

Node.js es **single-threaded** (un solo hilo de ejecución JavaScript). Eso significa que si tu máquina tiene 8 núcleos de CPU, por defecto Node.js usa **uno solo**; los otros 7 miran. El módulo `cluster` permite crear varios procesos Node.js (workers) que comparten el mismo puerto TCP. El kernel de Linux distribuye las conexiones entrantes entre todos los workers (balanceo round-robin).

> **Para decirle al profe:** "Node.js es single-threaded. Sin cluster, solo usamos una CPU. Con cluster, aprovechamos TODAS las CPUs del servidor."

### 4.2 ¿Por qué Worker Thread **fijo**?

Creá un Worker Thread es **costoso**: el sistema operativo debe reservar memoria, inicializar un nuevo intérprete de JavaScript, cargar módulos, etc. Si creáramos un Worker Thread por cada request `/ingest`, con 500 requests concurrentes tendríamos 500 threads consumiendo memoria. Eso "mataría" al servidor.

En cambio, creamos **UN SOLO Worker Thread** por proceso Cluster Worker. Ese thread recibe todas las tareas por una **cola de mensajes** (`postMessage`). Es como tener un empleado dedicado que hace las tareas una por una, pero siempre es el mismo.

> **Analogía:** Contratar y despedir un chef nuevo por cada plato es lento y costoso. Un chef fijo cocina un plato, luego otro, luego otro… sin parar.

### 4.3 ¿Por qué `SharedArrayBuffer` + `Atomics`?

`SharedArrayBuffer` es un bloque de memoria de RAM que puede ser **compartido** entre múltiples threads. Normalmente, cada thread tiene su propia memoria aislada. `SharedArrayBuffer` rompe esa barrera.

El problema: si dos threads escriben al mismo tiempo en la misma dirección de memoria, puede ocurrir una **condición de carrera** (race condition). El resultado final depende de quién llegó primero, y puede ser incorrecto.

`Atomics.add(counter, 0, 1)` es una operación **indivisible**: el procesador garantiza que nadie puede "meterse" en el medio. La lectura + escritura se hace en UN SOLO paso.

> **NUNCA** usamos `counter[0]++` en un entorno multithread: eso NO es atómico.

> **Para decirle al profe:** "SharedArrayBuffer permite que el proceso principal y el Worker Thread lean y escriban la misma memoria. Atomics.add() garantiza que el incremento sea atómico, evitando condiciones de carrera."

### 4.4 ¿Por qué IPC?

IPC = Inter-Process Communication (comunicación entre procesos). En Node.js, cuando usamos `cluster`, cada worker puede enviar mensajes al Primary usando `process.send({...})`.

**¿Por qué no escribe cada worker en SQLite?**
- **Concurrencia**: varios procesos escribiendo al mismo archivo puede causar corrupción o deadlocks (bloqueos mutuos).
- **Centralización**: el Primary es la "fuente de la verdad" global.
- **Rendimiento**: con IPC serializamos las escrituras de forma natural (el Primary las hace de a una).

> **Para decirle al profe:** "Los Workers informan al Primary por IPC; el Primary es el único que escribe en SQLite. Esto evita condiciones de carrera en la base de datos."

### 4.5 ¿Por qué WAL en SQLite?

WAL = Write-Ahead Logging. Es un modo de journaling que permite que **lecturas y escrituras sean más concurrentes**.

En vez de bloquear toda la base de datos al escribir, SQLite escribe primero en un archivo de log (`.wal`) y luego sincroniza con el archivo principal. Esto permite que:
- El Primary escriba sin bloquear.
- Los Workers lean el archivo principal en paralelo sin problemas.

> **Para decirle al profe:** "WAL permite lecturas concurrentes seguras mientras el Primary escribe. Así el dashboard puede leer datos sin bloquearse."

### 4.6 ¿Por qué EJS?

EJS es un motor de plantillas **server-side rendering**. El servidor genera el HTML completo antes de enviarlo al navegador.

Ventajas para este TP:
- No necesita estado del lado del cliente (no hay React, Vue, ni Angular).
- Es más simple para un TP backend: el servidor controla todo.
- El navegador recibe HTML plano; no ejecuta JavaScript complejo.

> **Para decirle al profe:** "EJS genera HTML en el servidor. El dashboard muestra los datos sin necesidad de un framework frontend."

---

## 5. Flujo de una petición `GET /ingest?id=4500` (paso a paso)

```
Paso 1: Cliente → Express
         El cliente (curl, navegador, evaluate.js) envía la request.
         Express la recibe en el puerto TCP (8080 por defecto).
         El kernel la deriva a uno de los Workers (round-robin).

Paso 2: Middleware valida
         validateIngestQuery revisa que ?id exista y sea número entero > 0.
         Si falla: responde 400 Bad Request y corta la cadena.
         Si pasa: guarda req.validatedId = 4500 y sigue al controller.

Paso 3: Controller delega
         ingestController extrae req.validatedId.
         Llama a acceptIngest(id) del ingest.service.js.
         NO decide nada solo; solo "pasa la pelota".

Paso 4: Service verifica Worker Thread
         ingest.service.js pregunta: "¿El Worker Thread está sano?"
         Llama a isHealthy() del worker-thread.service.js.
         Si NO está sano → envía INGEST_FAILED por IPC al Primary y devuelve
         { accepted: false, reason: "worker_unavailable" }.

Paso 5: Service encola la tarea
         Si el Worker Thread está sano, llama a dispatch(eventId).
         dispatch() crea un jobId único, lo guarda en pendingJobs con startTime,
         y envía un mensaje COMPUTE al Worker Thread por postMessage().
         Luego envía INGEST_ACCEPTED por IPC al Primary.

Paso 6: Controller responde 202
         Si acceptIngest devolvió accepted: true,
         el controller responde HTTP 202 Accepted:
         { ok: true, status: "accepted", id: 4500, pid: <PID_del_worker> }.
         ¡IMPORTANTE! El cliente ya tiene la respuesta, pero el Worker Thread
         todavía está procesando el cálculo. La operación es ASÍNCRONA.

Paso 7: Worker Thread hace cálculo pesado
         compute.worker.js recibe el mensaje COMPUTE.
         Ejecuta un loop de 10_000_000 iteraciones (simula CPU-bound).
         Al terminar, hace: Atomics.add(counter, 0, 1).

Paso 8: Worker Thread responde al proceso padre
         El Worker Thread envía COMPUTE_DONE por parentPort.postMessage().
         El worker-thread.service.js recibe el mensaje, calcula processingMs,
         elimina el job de pendingJobs, y envía INGEST_COMPLETED por IPC.

Paso 9: Primary recibe IPC y persiste
         El Primary recibe INGEST_COMPLETED.
         Suma +1 a completedEvents.
         Guarda el evento en SQLite: INSERT INTO ingest_events (...).
         Imprime log en consola.
```

### Tabla resumen del flujo

| Paso | Quién actúa | Qué hace | Código clave |
|---|---|---|---|
| 1 | Cliente → Express | Envía request HTTP | `curl http://localhost:8080/ingest?id=4500` |
| 2 | Middleware | Valida que `id` sea entero positivo | `validateIngestQuery(req, res, next)` |
| 3 | Controller | Delega al service | `ingestController(req, res)` |
| 4 | IngestService | Verifica Worker Thread sano | `isHealthy()` |
| 5 | IngestService | Encola tarea + envía IPC_ACCEPTED | `dispatch(id)` + `process.send({ type: "INGEST_ACCEPTED" })` |
| 6 | Controller | Responde 202 al cliente | `res.status(202).json({ ok: true, ... })` |
| 7 | Worker Thread | Cálculo pesado + Atomics.add | `Atomics.add(counter, 0, 1)` en `compute.worker.js` |
| 8 | WorkerThreadService | Recibe COMPUTE_DONE, envía IPC_COMPLETED | `process.send({ type: "INGEST_COMPLETED" })` |
| 9 | Primary | Agrega contador global + INSERT SQLite | `completedEvents++` + `insertIngestEvent(db, {...})` |

---

## 6. Flujo de `/dashboard` (paso a paso)

```
Paso 1: Cliente pide /dashboard
         El navegador hace GET http://localhost:8080/dashboard.

Paso 2: Controller delega
         dashboardController llama a buildDashboardData() del DashboardService.

Paso 3: Service lee contador local
         buildDashboardData() llama a getLocalCounter() del WorkerThreadService.
         Esto hace Atomics.load(counter, 0) → lee de forma segura el contador
         local del SharedArrayBuffer.

Paso 4: Service pide métricas globales por IPC
         buildDashboardData() envía GET_METRICS al Primary por IPC.
         Espera METRICS_RESPONSE (con timeout de 2000 ms).
         El Primary responde con acceptedEvents, completedEvents, failedEvents,
         totalRestarts, activeWorkers.

Paso 5: Service lee SQLite (solo lectura)
         Abre better-sqlite3 en modo lectura sobre data/the-guardian.sqlite.
         Aplica los mismos PRAGMAs (WAL, foreign_keys, busy_timeout).
         Ejecuta SELECT sobre ingest_events (últimos 20) y worker_restarts (últimos 10).
         Cierra la conexión inmediatamente (db.close()).

Paso 6: Service arma el paquete de datos
         Combina todo en un objeto:
         { systemStatus, pid, localCounter, acceptedCount, completedCount,
           failedCount, totalRestarts, activeWorkers, recentEvents, recentRestarts }

Paso 7: Controller renderiza EJS
         res.render("dashboard", data) busca src/views/dashboard.ejs.
         Express reemplaza <%= variables %> por valores reales.
         Genera HTML plano.

Paso 8: Express envía HTML al cliente
         El navegador recibe HTML + CSS y lo muestra.
         El navegador NUNCA ve código EJS ni consulta a la base de datos.
```

### Tabla resumen del flujo

| Paso | Quién actúa | Qué hace | Código clave |
|---|---|---|---|
| 1 | Cliente (navegador) | Pide GET /dashboard | `http://localhost:8080/dashboard` |
| 2 | Dashboard Controller | Delega al service | `dashboardController(req, res)` |
| 3 | DashboardService | Lee contador local | `getLocalCounter()` → `Atomics.load(counter, 0)` |
| 4 | DashboardService | Pide globales al Primary | `process.send({ type: "GET_METRICS" })` |
| 5 | DashboardService | Lee SQLite (solo SELECT) | `new Database(DB_PATH)` + SELECTs |
| 6 | DashboardService | Arma objeto con todos los datos | `return { ... }` |
| 7 | Dashboard Controller | Renderiza EJS | `res.render("dashboard", data)` |
| 8 | Express | Envía HTML plano al navegador | HTTP 200 con body HTML |

---

## 7. Decisiones arquitectónicas activas

Estas son las decisiones que tomamos y que podés defender ante el profesor.

| Decisión | Por qué la tomamos | Alternativa descartada | Argumento para el profesor |
|---|---|---|---|
| **SQLite con WAL** en vez de Postgres/MySQL | Es un TP académico; no necesita red externa. WAL permite lecturas concurrentes sin bloquear escrituras. | Postgresql o MySQL | "SQLite es embebida: un solo archivo, sin servidor externo. WAL permite que el dashboard lea mientras el Primary escribe." |
| **Worker Thread fijo** en vez de Pool | Simplicidad académica: demuestra el concepto `worker_threads` sin gestionar un pool complejo con colas y limites. | Pool de Worker Threads | "Un pool es más robusto, pero para un TP un Worker Thread fijo es suficiente. Demuestra `worker_threads`, `SharedArrayBuffer` y `Atomics` sin complejidad extra." |
| **IPC centralizado** en vez de que cada Worker escriba en SQLite | Evita condiciones de carrera en escritura. Centraliza consistencia. Serializa escrituras naturalmente. | Cada worker escribe directamente | "Si 4 workers escriben al mismo archivo SQLite al mismo tiempo, puede haber corrupción. Con IPC, el Primary es el único escritor y las operaciones son atómicas." |
| **Half of CPUs** para Cluster Workers | Cada Cluster Worker TIENE un Worker Thread adentro. 4 workers + 4 threads = 8 hilos de CPU. Si ponemos 8 workers, tendríamos 16 hilos y saturaríamos la máquina. | Todos los CPUs como workers | "Cada Cluster Worker consume 2 "hilos": uno para HTTP y otro para cálculo. Usamos la mitad de CPUs para no saturar." |
| **EJS** en vez de React/Vue | Server-side rendering para un dashboard simple. No hay estado del lado del cliente. | React, Vue, Angular | "EJS genera HTML en el servidor. Para un TP backend es suficiente; no necesitamos manejar estado en el navegador." |
| **CommonJS** en vez de ES Modules | El TP no pide ES Modules. CommonJS es la forma tradicional de Node.js (`require`/`module.exports`). ES Modules requiere `"type": "module"` en package.json. | ES Modules (`import`/`export`) | "El TP pide CommonJS y `require`. ES Modules es más moderno pero cambia la sintaxis y no aporta valor académico para este caso." |
| **better-sqlite3** en vez de sqlite3 (async) | Es síncrono, más rápido para lecturas/escrituras aisladas. Solo el Primary escribe, así que no hay problema de bloqueo entre procesos. | sqlite3 (basado en callbacks/promesas) | "better-sqlite3 es síncrono y más rápido. Como solo el Primary escribe, no hay problemas de concurrencia." |
| **Graceful shutdown** | En producción real, no queremos matar requests en progreso. Es una señal de calidad. | `process.exit()` inmediato | "El Primary envía SHUTDOWN a cada worker, espera a que terminen sus requests, y solo entonces sale. Si no responden a tiempo, los fuerza." |
| **Bounded respawn** del Worker Thread (máx 3 reinicios) | Evita un bucle infinito de reinicios si hay un bug grave. | Respawn sin límite | "Si el Worker Thread se cae 3 veces seguidas, dejamos de intentar. Esto evita que el servidor se cuelgue reiniciando sin parar." |

---

## 8. Glosario rápido para la defensa

| Término | Definición simple para decirle al profe |
|---|---|
| **Primary** | El proceso "gerente" del cluster. No atiende HTTP; forkea workers, vigila que no se caigan, y escribe en SQLite. |
| **Worker (cluster)** | Proceso hijo del Primary que atiende requests HTTP. Comparte el puerto TCP con los demás workers. Cada uno tiene su propio Event Loop. |
| **Worker Thread** | Thread (no proceso) que corre `compute.worker.js`. Hace cálculo pesado de CPU sin bloquear el Event Loop del proceso padre. |
| **IPC** | Inter-Process Communication. Los workers envían mensajes al Primary con `process.send()`. El Primary recibe con `cluster.on("message", ...)`. |
| **SharedArrayBuffer** | Bloque de memoria RAM compartido entre el proceso principal y el Worker Thread. Ambos pueden leer y escribir las mismas direcciones. |
| **Atomics.add()** | Operación indivisible: el procesador garantiza que nadie interrumpa la lectura+escritura. Evita condiciones de carrera. |
| **Event Loop** | El "cerebro" de Node.js: un bucle que procesa callbacks, timers, I/O. Si bloqueamos el Event Loop (con un loop pesado), TODOS los requests se congelan. |
| **CPU-bound** | Operación que usa mucho procesador (cálculo matemático, compresión). Debe ir en Worker Thread. |
| **I/O-bound** | Operación que espera recursos externos (leer archivo, consultar base de datos). Node.js las maneja bien con el Event Loop y no bloquea. |
| **WAL** | Write-Ahead Logging. Modo de SQLite que escribe primero en un log y luego sincroniza. Permite lecturas concurrentes seguras. |
| **JSDoc** | Formato de comentarios `/** ... */` con `@param` y `@returns`. Sirve para documentar funciones y que los IDEs autocompleteen mejor. |
| **CommonJS** | Sistema de módulos de Node.js con `require()` e `module.exports`. Es el default; no requiere configuración especial. |

---

## 9. Qué decirle al profesor (guía de palabras)

Frases preparadas para la defensa oral. No las leas de memoria; entendélas y adaptalas a tu estilo.

### "¿Por qué usaron cluster?"

> "Node.js es single-threaded: por defecto usa solo un núcleo de CPU. Con el módulo `cluster` creamos varios procesos que comparten el mismo puerto TCP. El kernel de Linux distribuye las conexiones entre todos. Así aprovechamos TODAS las CPUs de la máquina."

### "¿Por qué Worker Threads?"

> "Porque el cálculo es CPU-bound: un loop de 10 millones de iteraciones. Si lo corriéramos en el Event Loop principal, bloquearía TODOS los requests HTTP. El Worker Thread corre en un hilo separado, así que el Event Loop sigue libre para atender /health y otros endpoints."

### "¿Por qué Atomics?"

> "Porque SharedArrayBuffer es compartido. Si dos threads intentan incrementar el contador al mismo tiempo con `counter[0]++`, pueden leer el mismo valor y perder una escritura. `Atomics.add()` es atómica: el procesador garantiza que la operación sea indivisible. El resultado siempre es correcto."

### "¿Por qué IPC en vez de que cada Worker escriba en SQLite?"

> "Si varios procesos escriben al mismo archivo SQLite al mismo tiempo, puede haber corrupción o deadlocks. Con IPC, solo el Primary escribe. Los workers le informan por mensajes y él serializa las escrituras de forma natural."

### "¿Por qué 202 Accepted en vez de 200 OK?"

> "202 significa 'recibido y encolado para proceso asíncrono'. El cliente sabe que la tarea se va a procesar en segundo plano, pero todavía no está lista. 200 implicaría que ya terminó, y eso no es verdad."

### "¿Por qué half of CPUs y no todos?"

> "Cada Cluster Worker tiene adentro un Worker Thread. Entonces cada worker consume 2 hilos de CPU: uno para HTTP y otro para cálculo. Si tenemos 8 CPUs, 4 workers + 4 threads = 8 hilos. Si pusieramos 8 workers, tendríamos 16 hilos y saturaríamos la máquina."

### "¿Por qué EJS y no React?"

> "El TP pide un dashboard simple. EJS es server-side rendering: el servidor genera HTML plano y el navegador lo muestra. No necesitamos manejar estado del lado del cliente, ni instalar React, ni compilar JSX."

### "¿Por qué WAL?"

> "WAL = Write-Ahead Logging. SQLite escribe primero en un archivo de log y luego sincroniza. Esto permite que mientras el Primary escribe, los Workers lean el archivo principal sin bloquearse. Es clave para que el dashboard pueda mostrar datos actualizados en tiempo real."

### "¿Qué pasa si un Worker Thread se cae?"

> "El worker-thread.service.js tiene bounded respawn: si el Worker Thread se cae, intenta recrearlo hasta 3 veces. Si después de 3 intentos sigue fallando, deja de intentar para no entrar en un bucle infinito. El cliente recibe 503 Service Unavailable y puede reintentar."

### "¿Qué pasa si un Cluster Worker se cae?"

> "El Primary detecta la salida con `cluster.on('exit', ...)`. Si no estamos apagando el sistema, crea un nuevo worker automáticamente y guarda el reinicio en SQLite. El sistema sigue funcionando sin intervención humana."

### "¿Cómo se mide la carga del sistema?"

> "Con el script `scripts/evaluate.js`. Envía 500 requests concurrentes a `/ingest`, consulta `/health` cada 50 ms en paralelo para medir latencia, hace polling a `/metrics` hasta que `completedEvents` alcance 500, y calcula el drift entre aceptados y completados. Si drift = 0 y completados = 500, el test pasa."

---

> **Frase guía del TP:**
>
> *"HTTP y monitoreo en Event Loop. CPU pesada en Worker Thread. Escalado y resiliencia con Cluster. Sincronización con SharedArrayBuffer y Atomics. Persistencia y defensa con SQLite y Dashboard."*
