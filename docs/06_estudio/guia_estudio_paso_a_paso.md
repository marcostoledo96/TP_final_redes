# Guía de Estudio Paso a Paso — The Guardian

> Propósito: Ruta de aprendizaje archivo por archivo, en orden, para entender el TP de redes completamente.
> Audiencia: Alumno junior que sabe muy poco pero necesita defender un TP ante el profesor.
> Estado: Fuente de verdad
> Última actualización: 2026-06-02

---

## Nota antes de empezar

No copies código. No memorices. El objetivo es que cuando el profesor te pregunte:
- "¿Por qué usaste X?"
- "¿Qué hace este archivo?"
- "¿Por qué no usaste Y?"

...seas capaz de explicarlo con tus palabras, usando las analogías que entendiste.

Cada archivo tiene comentarios ultra-didácticos. Léelos en voz alta si hace falta.

---

## ORDEN DE ESTUDIO (Top 15 archivos)

### 🔵 NIVEL 1: La base (día 1)

Estos son los cimientos. Sin entenderlos, todo lo demás es magia negra.

#### 1. `docs/04_defensa/guia_arquitectura_carpetas.md`

**¿Por qué primero?**
Esto es tu mapa. Si te perdés, volvé acá.

**Qué hacé:**
- Leé la "Analogía del restaurante" (sección 1).
- Mirá el "Diagrama mental de capas" (sección 2).
- Recorré el "Árbol de carpetas" (sección 3) entender dónde vive cada cosa.
- Leé la "Guía de palabras" (sección 9) — son las frases para la defensa oral.

**Tiempo estimado:** 30 minutos.

**Checkpoint:**
- ¿Podés explicar qué es el Primary usando la analogía del restaurante?
- ¿Podés dibujar en un papel cómo llega un request desde el cliente hasta SQLite?

---

#### 2. `package.json`

**¿Por qué segundo?**
Es el DNA del proyecto: qué dependencias usamos, qué comandos ejecutamos, qué versión de Node necesitamos.

**Qué hacé:**
- Mirá cuáles son las dependencias: `express`, `ejs`, `better-sqlite3`.
- Mirá los scripts: `start`, `dev`, `evaluate`.
- Fijate `engines`: `"node": ">=20.0.0"`.

**Tiempo estimado:** 5 minutos.

**Checkpoint:**
- ¿Qué comando levanta el servidor en modo cluster?
- ¿Qué dependencia NO está acá (TypeScript, MongoDB, Redis)?

---

#### 3. `src/database/connection.js`

**¿Por qué tercero?**
Antes de entender el código que usa SQLite, tenés que entender cómo nos conectamos.

**Qué hacé:**
- Leé los comentarios sobre cada PRAGMA (WAL, foreign_keys, busy_timeout).
- Mirá el esquema de las tablas: `ingest_events`, `worker_restarts`, `metric_snapshots`.

**Tiempo estimado:** 10 minutos.

**Checkpoint (para la defensa):**
- "¿Por qué WAL?" → "WAL permite lecturas concurrentes sin bloquear escrituras."
- "¿Por qué workers nunca escriben en SQLite?" → "Para evitar condiciones de carrera. Solo el Primary escribe."

---

#### 4. `src/workers/compute.worker.js`

**¿Por qué cuarto?**
Este archivo es la estrella del TP. Es donde ocurre la magia de Worker Threads + SharedArrayBuffer + Atomics.

**Qué hacé:**
- Leé TODO el comentario introductorio (líneas 1-51). Es la explicación más larga y clara de todo el proyecto.
- Fijate `workerData.sharedBuffer` — de dónde viene ese dato.
- Entendé el loop de 10_000_000 iteraciones: ¿por qué existe? ¿Qué simula?
- Mirá `Atomics.add(counter, 0, 1)` — la línea más importante del TP.
- Leé el comentario explicando por qué NUNCA usamos `counter[0]++`.

**Tiempo estimado:** 30 minutos.

**Checkpoint:**
> "Profesor, este archivo es el Worker Thread. Recibe tareas, hace el cálculo pesado de CPU, y actualiza el contador con `Atomics.add()` porque si usáramos `counter[0]++`, dos threads podrían leer el mismo valor y perder una escritura. Eso es una race condition."

---

---

### 🟢 NIVEL 2: El flujo HTTP (día 2)

Entrá desde el navegador hacia adentro.

#### 5. `src/server.js`

**¿Por qué?**
Es la puerta de entrada al mundo HTTP del proyecto.

**Qué hacé:**
- Mirá `createApp()` — de dónde viene.
- Leé el comentario sobre `require.main === module` — ¿qué es? ¿Por qué importa?
- Entendé `startServer(port)` — ¿qué而且她 devuelve?
- Leé el manejo de `SIGTERM` + graceful shutdown.

**Tiempo estimado:** 15 minutos

**Checkpoint:**
- "¿Qué pasa si cierro la terminal con `Ctrl+C`?"
→ "El server recibe `SIGTERM`, cierra el HTTP server, y espera que se cierren las conexiones activas."

---

#### 6. `src/app.js`

**¿Por qué?**
Es la fábrica de Express. Todo el stack de middlewares, rutas y renderizado.

**Qué hacé:**
- Mirá cada `app.use()`: ¿qué hace cada middleware?
- Fijate `app.set("view engine", "ejs")` — ¿por qué EJS y no React/Vue?
- Leé `express.static()` — ¿qué sirve la carpeta public?
- Mirá el orden: JSON parser → rutas → not found → error middleware.

**Tiempo estimado:** 10 minutos

**Checkpoint:**
- "¿Por qué va `notFoundMiddleware` al final?"
→ "Porque Express recorre los middlewares en orden. Si ninguna ruta matcheó, llega al 404."

---

#### 7. `src/routes/ingest.routes.js`

**¿Por qué?**
`GET /ingest` es el endpoint principal del TP. Es lo que el profe seguro te va a preguntar.

**Qué hacé:**
- Fijate la ruta: `GET /` (no `/ingest`, porque se monta en el router).
- Mirá `validateIngestQuery` — ¿qué valida? ¿por qué primero?
- Entendé que delega al `ingestController`.

**Tiempo estimado:** 10 minutos

**Checkpoint:**
- "¿Por qué GET /ingest?id=... en vez de POST?"
→ "La consigna especificaba GET. Nosotros obedecemos la consigna."

---

#### 8. `src/middlewares/validate-ingest-query.middleware.js`

**¿Por qué?**
Validación es fundamental. El profe puede preguntar qué pasa si llega `/ingest?d=500`.

**Qué hacé:**
- Leé cómo extrae `req.query.id`.
- Mirá `Number(id)` — ¿qué pasa si mandan letras?
- Fijate `req.validatedId` — ¿a quién le sirve?
- `next(err)` — ¿qué hace? ¿a dónde va ese error?

**Tiempo estimado:** 10 minutos

**Checkpoint:**
- "¿Y si llega `/ingest?d=500`?"
→ "El middleware valida que exista `id`, verifica que sea un número entero > 0, y si falla devuelve 400 con mensaje claro."

---

#### 9. `src/controllers/ingest.controller.js`

**¿Por qué?**
El controller es el que toma la decisión: ¿202 o 503?

**Qué hacé:**
- `ingestService.sendJob(...)` — ¿qué devuelve? Es una Promise.
- `res.status(202)` — ¿qué significa 202 Accepted?
- `res.status(503)` — ¿qué significa 503?
- Leé todos los campos del JSON de respuesta.

**Tiempo estimado:** 10 minutos

**Checkpoint:**
> "Profesor, el controller es como el mozo que recibe el pedido. Si el cocinero está disponible, toma la orden y devuelve 202 (ya te aviso). Si el cocinero está sobrecargado, devuelve 503 (no podemos aceptar más)."

---

#### 10. `src/services/ingest.service.js`

**¿Por qué?**
Acá es donde se decide si aceptar o no la tarea.

**Qué hacé:**
- Mirá `workerThreadService.sendJob(eventId)` — ¿qué devuelve?
- `if (!accepted)` → `res.status(503)` — ¿por qué?
- El IPC `INGEST_ACCEPTED` — ¿quién lo recibe? ¿para qué?

**Tiempo estimado:** 15 minutos

**Checkpoint:**
- "¿Por qué 202 en vez de 200?"
→ "200 significa 'ya está listo'. 202 significa 'acepté, pero todavía no terminó'. Es correcto para procesamiento asíncrono."

---

---

### 🟡 NIVEL 3: El cerebro (día 3)

#### 11. `src/services/worker-thread.service.js`

**¿Por qué?**
Este archivo es el gerente de cocineros. Administra el Worker Thread fijo.

**Qué hacé:**
- Leé el comentario completo. Es largo y vale la pena.
- Fijate cómo crea el `Worker` (uno solo, no por request).
- Mirá `SharedArrayBuffer` + `Int32Array`.
- `pendingJobs` — ¿por qué existe?
- `EVENTS_PER_WORKER` — ¿qué limita?
- `MAX_RESPAWN` — ¿qué hace si el Worker Thread muere?
- `sendJob` — ¿qué devuelve? (¿Promise? ¿otra cosa?)

**Tiempo estimado:** 30 minutos

**Checkpoint (la pregunta del millón):**
> "¿Por qué NO crean un Worker Thread por request?"
→ "Porque `new Worker(...)` carga un archivo del disco, inicia un V8 nuevo, y reserva memoria. Eso tarda ~50ms + memoria. Si llegan 500 requests, crear 500 Workers mataría la máquina. Creamos UNO SOLO al inicio y le mandamos mensajes."

---

#### 12. `src/primary.js`

**¿Por qué?**
Es el archivo más grande y el más importante. El Primary es el gerente del restaurante.

**Qué hacé (no de una, en etapas):**

**Primera pasada (skim):**
- Mirá la estructura: `cluster.isPrimary` → if/else.
- En el bloque de Primary:
  - `getWorkerCount()` → ¿cuántos workers forkea?
  - for loop inicial → ¿qué forkea?
  - `cluster.on('exit', ...)` → ¿qué hace cuando muere un Worker?
  - `process.on('message')` → ¿qué mensajes escucha?
  - `process.on('SIGTERM')` → ¿qué hace al apagar?

**Segunda pasada (deep dive):**
- Leé los comentarios de cada bloque.
- Fijate `ipcMetrics` — ¿qué guarda? ¿por qué un Map?
- Busca donde se llama `db.prepare(...)` — ¿qué tablas toca?
- Mirá `metricSnapshots` — ¿cuándo se guarda?

**Tiempo estimado:** 45 minutos

**Checkpoint (pregunta clásica del profe):**
> "¿Cómo sabe el Primary cuántos eventos se completaron?"
→ "Por IPC. Cada Cluster Worker, cuando el Worker Thread termina, manda un mensaje `INGEST_COMPLETED` por `process.send()`. El Primary suma al contador global y guarda en SQLite."

---

#### 13. `src/services/metrics.service.js`

**¿Por qué?**
Es el archivo que junta contadores locales (`localCounter`) y globales (`completedEvents`).

**Qué hacé:**
- `Atomics.load(counter, 0)` — ¿qué devuelve? ¿por qué `load` y no leer `counter[0]`?
- El bloque IPC: ¿qué pide? ¿qué recibe? ¿qué pasa si el Primary no responde?
- `timeoutPromise` — ¿por qué 2 segundos?

**Tiempo estimado:** 20 minutos

**Checkpoint:**
> "Profesor, `localCounter` es el contador del Worker Thread del proceso que atendió mi request. Ese contador se incrementa con `Atomics.add()`, así que es seguro en concurrencia. `completedEvents` es el total acumulado por el Primary vía IPC de todos los workers."

---

#### 14. `src/views/dashboard.ejs`

**¿Por qué?**
Es lo que ve el cliente. El profe va a abrir el navegador.

**Qué hacé:**
- Mirá las etiquetas `<%= variable %>` — ¿qué son?
- `<% if (...) %>` — ¿cómo funciona?
- `recentEvents.forEach(...)` — ¿qué genera?
- Leé los comentarios HTML. Son didácticos.

**Tiempo estimado:** 15 minutos

**Checkpoint:**
> "Profesor, el dashboard usa EJS, que es server-side rendering. El servidor consulta SQLite, inyecta los datos en el template, y envía el HTML completo al navegador. No hace fetch desde JavaScript."

---

#### 15. `scripts/evaluate.js`

**¿Por qué?**
Es el examen. Tenés que saber qué mide, por qué mide eso, y qué hace con los resultados.

**Qué hacé:**
- Mirá `TOTAL_REQUESTS = 500` — ¿por qué 500?
- `Promise.all(ingestPromises)` — ¿qué simula?
- `healthLoop()` — ¿cuánto duerme? ¿qué mide?
- `while (true)` → polling de /metrics — ¿por qué?
- `METRICS_TIMEOUT_MS = 30000` — ¿por qué 30 segundos?
- `drift` — ¿qué es? ¿qué fecha si es > 0?
- Leé la sección 4 del documento `guia_demostracion_profesor.md` para entender cómo defender un FAIL.

**Tiempo estimado:** 20 minutos

**Checkpoint:**
> "Profesor, el script de evaluación envía 500 requests concurrentes con `Promise.all()`, mide la latencia de `/health` cada 50ms, y luego hace polling a `/metrics` cada 500ms. Si `completedEvents` no llega a 500 en 30 segundos, corta con FAIL. Pero si esperamos 10 segundos más y consultamos `/metrics`, el drift es 0."

---

---

### 🟠 NIVEL 4: Los extras (día 4)

Estos son importantes pero menos críticos para la defensa.

| Orden | Archivo | Qué aprender | Prioridad |
|---|---|---|---|
| 16 | `src/middlewares/error.middleware.js` | Patrón: ApiError vs errores inesperados | Media |
| 17 | `src/middlewares/not-found.middleware.js` | Por qué va al final | Baja |
| 18 | `src/controllers/health.controller.js` | Simple pero rápido | Baja |
| 19 | `src/controllers/metrics.controller.js` | Juntar datos y responder JSON | Baja |
| 20 | `src/controllers/dashboard.controller.js` | `res.render()` con EJS | Media |
| 21 | `src/routes/index.js` | Cómo montar las rutas | Baja |
| 22 | `src/routes/dashboard.routes.js` | Montar el dashboard | Baja |
| 23 | `src/models/ingest-event.model.js` | Insert prepared statement | Media |
| 24 | `src/models/worker-restart.model.js` | Insert de reinicios | Baja |
| 25 | `src/models/metric-snapshot.model.js` | Insert de snapshot | Baja |
| 26 | `src/services/dashboard.service.js` | Leer SQLite + IPC al Primary | Media |
| 27 | `src/services/health.service.js` | Servicio trivial pero es patrón | Baja |
| 28 | `src/utils/api-error.js` | Extender Error con statusCode | Baja |
| 29 | `src/routes/metrics.routes.js` | Endpoint de métricas | Baja |
| 30 | `src/routes/health.routes.js` | Endpoint de health | Baja |
| 31 | `src/worker-entry.js` | Wrapper: init Worker Thread antes de HTTP | Media |
| 32 | `verify-atomics.js` | Demostración de que Atomics funciona | Media |
| 33 | `docs/05_pruebas/guia_demostracion_profesor.md` | TU BIBLIA DE LA DEFENSA ORAL | **ALTA** |

---

---

## 📅 Plan de 4 días

### Día 1: La base (2-3 horas)
1. `guia_arquitectura_carpetas.md` (30 min)
2. `package.json` (5 min)
3. `src/database/connection.js` (10 min)
4. `src/workers/compute.worker.js` (30 min)
5. **DESCANSO**
6. `src/workers/compute.worker.js` (otra pasada, 15 min)
7. **Checkpoint**: ¿Podés explicarle a un amigo qué es Atomics.add()?

### Día 2: El flujo HTTP (2-3 horas)
1. `src/server.js` (15 min)
2. `src/app.js` (10 min)
3. `src/routes/ingest.routes.js` (10 min)
4. `src/middlewares/validate-ingest-query.middleware.js` (10 min)
5. `src/controllers/ingest.controller.js` (10 min)
6. `src/services/ingest.service.js` (15 min)
7. **Checkpoint**: ¿Podés dibujar el flujo de un request desde el navegador hasta SQLite?

### Día 3: El cerebro (3 horas)
1. `src/services/worker-thread.service.js` (30 min)
2. `src/primary.js` (primera pasada, 20 min)
3. **DESCANSO**
4. `src/primary.js` (segunda pasada, 25 min)
5. `src/services/metrics.service.js` (20 min)
6. `src/views/dashboard.ejs` (15 min)
7. **Checkpoint**: ¿Podés explcar por qué el Primary escribe en SQLite y los Workers no?

### Día 4: Extras + Ensayo (2-3 horas)
1. Los archivos del nivel 4 (1 hora, a tu ritmo)
2. Leé `guia_demostracion_profesor.md` COMPLETO (30 min)
3. **Ensayo oral**: Parate frente a un espejo o grabate con el celu. Contestá estas preguntas:
   - "¿Por qué usaron cluster?"
   - "¿Por qué Worker Threads?"
   - "¿Qué es Atomics.add()?"
   - "¿Por qué 202 Accepted?"
   - "¿Qué pasa si el Worker Thread muere?"
   - "¿Por qué salió FALLIDO el evaluate?"
4. Corré `npm start` y `npm run evaluate` vos solo. Mirá los resultados.
5. **Checkpoint**: ¿Podés hacer toda la demo sin mirar la guía?

---

## 🎯 Preguntas killer para la defensa

Estas son las que el 90% de los profesores hacen. Si sabés estas, pasás:

### Sobre Cluster
1. "¿Qué es el Primary y qué hace?"
2. "¿Cuántos Workers se levantan?"
3. "¿Qué pasa si un Worker se muere?"
4. "¿Por qué la mitad de las CPUs?"

### Sobre Worker Threads
5. "¿Qué es un Worker Thread?"
6. "¿Por qué NO crean uno por request?"
7. "¿Quién habla con quién? (Cluster Worker ↔ Worker Thread)"
8. "¿Qué es SharedArrayBuffer?"

### Sobre Atomics
9. "¿Por qué Atomics.add() y no counter[0]++?"
10. "¿Qué es una race condition? Explicá con un ejemplo numérico."

### Sobre IPC y SQLite
11. "¿Qué es IPC?"
12. "¿Por qué solo el Primary escribe en SQLite?"
13. "¿Qué es WAL y por qué se usa?"
14. "¿Cómo sabe el Primary que un evento terminó?"

### Sobre la demo
15. "¿Por qué 202 Accepted y no 200 OK?"
16. "¿Qué es el drift y por qué salió 286?"
17. "¿Por qué el evaluate sale FALLIDO?"
18. "¿Cómo demostrás que el sistema funciona a pesar del FALL?"

### Sobre conceptos generales
19. "¿Qué es el Event Loop de Node.js?"
20. "¿Cuál es la diferencia entre CPU-bound e I/O-bound?"
21. "¿Por qué no usaron TypeScript / ES Modules?"

**Respuestas pre-armadas:** están en `docs/05_pruebas/guia_demostracion_profesor.md`, sección 6.

---

## 📝 Checklist de estudio

- [ ] Día 1 completo (base)
- [ ] Día 2 completo (flujo HTTP)
- [ ] Día 3 completo (cerebro)
- [ ] Día 4 completo (extras + ensayo)
- [ ] Pude explicar la analogía del restaurante
- [ ] Pude explicar qué es Atomics.add()
- [ ] Pude explicar el flujo de /ingest paso a paso
- [ ] Pude explicar por qué sale FAIL y cómo defenderlo
- [ ] Hice la demo completa yo solo sin mirar la guía
- [ ] Pude contestar las 21 preguntas killer

---

## 🎬 Frase de cierre

> El objetivo no es memorizar el código. Es entender la historia de cada decisión.
> Si entendés el "por qué", podés defender cualquier cosa.
