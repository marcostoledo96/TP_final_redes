# Guía maestra de contexto para OpenCode

**Proyecto:** TP 2 — “The Guardian” / Micro-Orquestador de Ingesta y Monitoreo Reactivo  
**Autor:** Marcos Toledo  
**Objetivo de este archivo:** servir como índice de consulta para que una IA de coding en OpenCode sepa **qué documento revisar según el tema técnico que necesite implementar o defender**.

---

## 1. Propósito de esta guía

Este archivo no reemplaza los apuntes completos. Funciona como una **guía de navegación**.

Cuando la IA de OpenCode necesite más contexto sobre un tema, debe usar este archivo para decidir qué documento abrir.

Ejemplo:

- Si necesita entender `cluster`, debe revisar la clase 6 de Redes.
- Si necesita entender `worker_threads`, `SharedArrayBuffer` o `Atomics`, debe revisar la clase 7 de Redes.
- Si necesita estructurar el proyecto con Express, rutas y controladores, debe revisar la clase 6 de Backend.
- Si necesita persistencia, roles o permisos, debe revisar la clase 7 de Backend y el TP final de Backend.
- Si necesita entender por qué `/health` no debe bloquearse, debe revisar la clase 5 de Redes.

---

## 2. Convenciones técnicas del proyecto actual

Para el TP “The Guardian”, las decisiones actuales son:

| Decisión | Valor |
|---|---|
| Estilo de módulos | CommonJS |
| Versión objetivo de Node.js | Node.js 20 |
| Framework HTTP | Express |
| Script de evaluación | Node.js |
| Endpoint `/ingest` | Debe responder rápido con `202 Accepted` |
| Endpoint `/health` | Debe responder de forma inmediata |
| Procesamiento pesado | Debe delegarse a Worker Thread |
| Código | Debe estar bien comentado |
| Documentación | Debe incluir carpeta `docs/` con guías de estudio |
| Defensa oral | El proyecto debe poder explicarse ante el profesor |

---

## 3. Punto técnico importante sobre el contador global

La consigna del TP pide:

- uso de `cluster`,
- un Worker Thread fijo por Worker del cluster,
- `SharedArrayBuffer`,
- `Atomics.add()`,
- contador final exacto de 500 eventos.

Hay una aclaración técnica importante:

> `SharedArrayBuffer` sirve para compartir memoria entre hilos dentro de un mismo proceso. En cambio, `cluster` crea procesos separados, y los procesos no comparten memoria directamente como los hilos.

Por eso, si el proyecto usa varios procesos de `cluster`, hay que decidir cómo se interpreta el “contador global”:

1. **Contador local por Worker de cluster:** cada proceso tiene su propio `SharedArrayBuffer` con su Worker Thread.
2. **Agregación global por IPC:** el Primary/Master recibe reportes de cada Worker y suma el total global.
3. **Arquitectura centralizada:** un único proceso o servicio central administra el contador global.
4. **Aclaración en documentación:** explicar la limitación técnica y cómo se resolvió.

Para una entrega defendible, se recomienda:

- usar `SharedArrayBuffer` + `Atomics.add()` dentro de cada proceso Worker con su Worker Thread;
- sumar métricas globales mediante mensajes IPC al Primary;
- documentar claramente que `cluster` trabaja con procesos y `worker_threads` con hilos.

Consultar especialmente:

- `clase_6_alta_concurrencia_self_healing_nodejs.md`
- `clase_7_javascript_alto_rendimiento_concurrencia_atomics.md`
- `docs/01_consigna_tp/consignas_tp2_the_guardian.md`
- `docs/01_consigna_tp/planificacion_tp2_the_guardian_opencode.md`

---

## 4. Estructura recomendada de carpeta `docs/`

Para que OpenCode y el profesor puedan navegar el material, se recomienda organizar la documentación así:

```txt
docs/
├── 00_guia_maestra_opencode.md
├── 01_consigna_tp/
│   ├── docs/01_consigna_tp/consignas_tp2_the_guardian.md
│   └── docs/01_consigna_tp/planificacion_tp2_the_guardian_opencode.md
├── 02_redes/
│   ├── clase_1_redes_nodejs.md
│   ├── clase_2_redes_tcp_udp_nodejs.md
│   ├── clase_3_arquitectura_flujo_datos.md
│   ├── clase_4_topologia_digital_udp_rudp_spoofing.md
│   ├── clase_5_colapso_sniffer_forense_nodejs.md
│   ├── clase_6_alta_concurrencia_self_healing_nodejs.md
│   └── clase_7_javascript_alto_rendimiento_concurrencia_atomics.md
├── docs/03_backend/
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

# 5. Mapa rápido de temas

## 5.1. Si necesitás entender Node.js como entorno

Consultar:

- `clase_1_backend_introduccion_nodejs.md`
- `clase_1_redes_nodejs.md`

Temas:

- qué es backend,
- Node.js como entorno de ejecución,
- V8,
- libuv,
- Event Loop,
- APIs nativas,
- módulos,
- diferencia entre navegador y servidor.

---

## 5.2. Si necesitás JavaScript básico para backend

Consultar:

- `clase_2_backend_funciones_arrays_practica1.md`
- `clase_3_backend_arrays_funciones_objetos_practica2.md`

Temas:

- variables,
- condicionales,
- ciclos,
- arrays,
- objetos,
- funciones,
- arrow functions,
- callbacks,
- higher order functions,
- closures,
- módulos CommonJS,
- `fs`,
- `path`,
- `os`,
- `http`.

---

## 5.3. Si necesitás crear servidores HTTP

Consultar:

- `clase_4_backend_http_api_productos.md`
- `clase_5_backend_http_headers_fetch.md`

Temas:

- `http.createServer`,
- `req`,
- `res`,
- rutas manuales,
- JSON,
- códigos HTTP,
- headers,
- `User-Agent`,
- favicon,
- HTML desde Node.js,
- `fetch`,
- archivos estáticos,
- separación frontend/backend.

---

## 5.4. Si necesitás Express y arquitectura por capas

Consultar:

- `clase_6_backend_express_api_rest_usuarios.md`

Temas:

- Express,
- `express.Router`,
- `app.use`,
- `express.json`,
- `express.urlencoded`,
- rutas,
- controladores,
- modelos,
- servicios,
- middlewares,
- CRUD,
- API REST,
- EJS,
- manejo de errores.

---

## 5.5. Si necesitás SQLite, EJS, roles y persistencia

Consultar:

- `clase_7_backend_sqlite_ejs_crud_roles_usuarios.md`

Temas:

- SQLite,
- `better-sqlite3`,
- `db.prepare`,
- `.all`,
- `.get`,
- `.run`,
- tablas,
- claves primarias,
- claves foráneas,
- roles,
- usuarios,
- EJS,
- formularios,
- `LEFT JOIN`,
- `LIMIT`,
- `OFFSET`,
- `LIKE`,
- soft delete,
- `morgan`,
- `chalk`,
- `http-errors`.

---

## 5.6. Si necesitás permisos, autenticación o autorización

Consultar:

- `tp_final_backend_permisos_roles_autenticacion.md`

Temas:

- permisos por rol,
- tabla `permisos`,
- tabla `rol_permiso`,
- relación muchos a muchos,
- ABM de permisos,
- checkboxes para asignar permisos,
- visualización de permisos desde roles,
- visualización de permisos desde usuarios,
- autenticación,
- cookies,
- sesiones,
- `sessionMiddleware`,
- `checkPermission`,
- diferencia entre autenticación y autorización.

---

## 5.7. Si necesitás TCP, UDP o transporte de datos

Consultar:

- `clase_2_redes_tcp_udp_nodejs.md`
- `clase_4_topologia_digital_udp_rudp_spoofing.md`

Temas:

- TCP,
- UDP,
- three-way handshake,
- SYN,
- SYN-ACK,
- ACK,
- RST,
- datagramas,
- `dgram`,
- `net`,
- backpressure,
- RUDP,
- spoofing,
- HMAC,
- validación de integridad.

---

## 5.8. Si necesitás streams, buffers o flujo de datos

Consultar:

- `clase_1_redes_nodejs.md`
- `clase_3_arquitectura_flujo_datos.md`

Temas:

- Buffer,
- octetos,
- endianness,
- streams,
- chunks,
- `pipe`,
- `pipeline`,
- backpressure,
- flujo de datos,
- transferencia por partes,
- HTTP chunked,
- procesamiento eficiente.

---

## 5.9. Si necesitás Event Loop limpio y CPU-bound

Consultar:

- `clase_5_colapso_sniffer_forense_nodejs.md`
- `clase_7_javascript_alto_rendimiento_concurrencia_atomics.md`

Temas:

- Event Loop,
- Call Stack,
- tareas CPU-bound,
- bloqueo del hilo principal,
- pérdida de paquetes UDP,
- `/status` o `/health` bloqueado,
- Worker Threads,
- delegación de tareas pesadas,
- mantener API reactiva.

---

## 5.10. Si necesitás cluster, self-healing o IPC

Consultar:

- `clase_6_alta_concurrencia_self_healing_nodejs.md`

Temas:

- `cluster`,
- Primary/Master,
- Worker process,
- `cluster.fork`,
- `cluster.on('exit')`,
- self-healing,
- procesos,
- IPC,
- señales,
- `SIGTERM`,
- `SIGKILL`,
- graceful shutdown,
- peticiones en vuelo,
- consistencia de datos.

---

## 5.11. Si necesitás Worker Threads, memoria compartida o Atomics

Consultar:

- `clase_7_javascript_alto_rendimiento_concurrencia_atomics.md`

Temas:

- `worker_threads`,
- `Worker`,
- `postMessage`,
- transferencia de buffers,
- `SharedArrayBuffer`,
- `Atomics.add`,
- `Atomics.wait`,
- `Atomics.notify`,
- race conditions,
- mutex,
- waitgroups,
- worker pools,
- sincronización por hardware.

---

# 6. Índice de documentos de Redes

## 6.1. `clase_1_redes_nodejs.md`

### Cuándo consultarlo

Revisar este archivo cuando se necesite explicar la base de Node.js aplicada a redes.

### Contiene

- I/O no bloqueante.
- Modelo tradicional de hilos vs modelo Node.js.
- Event Loop.
- libuv.
- POSIX.
- `epoll`, `kqueue`, IOCP.
- Modelo OSI y TCP/IP.
- RFCs.
- Buffer.
- Octetos.
- Endianness.
- Network Byte Order.

### Útil para el TP porque

Ayuda a justificar por qué Node.js puede manejar muchas conexiones, pero necesita delegar operaciones pesadas para no bloquear el Event Loop.

---

## 6.2. `clase_2_redes_tcp_udp_nodejs.md`

### Cuándo consultarlo

Revisar este archivo cuando haya que trabajar con TCP, UDP, puertos o diagnóstico de red.

### Contiene

- TCP según RFC 9293.
- UDP según RFC 768.
- Three-way handshake.
- Estados TCP.
- TCB.
- `SYN`, `SYN-ACK`, `ACK`, `RST`.
- UDP stateless.
- Cabecera UDP de 8 bytes.
- `net` y `dgram` en Node.js.
- Eventos `data`, `message`, `error`, `drain`.
- Backpressure.
- Diagnóstico con Wireshark o tcpdump.

### Útil para el TP porque

Permite explicar por qué UDP puede perder paquetes si el receptor se bloquea y por qué TCP tiene backpressure pero UDP no.

---

## 6.3. `clase_3_arquitectura_flujo_datos.md`

### Cuándo consultarlo

Revisar este archivo cuando se necesite entender flujos, streams, chunking y backpressure.

### Contiene

- Procesamiento por fragmentos.
- Streams.
- `Readable`, `Writable`, `Duplex`, `Transform`.
- `pipe`.
- `pipeline`.
- Backpressure.
- HTTP `Content-Length`.
- HTTP `Transfer-Encoding: chunked`.
- Procesamiento eficiente de archivos grandes.
- AFF4 y reconstrucción virtual de datos.

### Útil para el TP porque

Refuerza la idea de no procesar todo de forma monolítica y de mantener el flujo bajo control.

---

## 6.4. `clase_4_topologia_digital_udp_rudp_spoofing.md`

### Cuándo consultarlo

Revisar este archivo cuando se necesite trabajar con UDP, confiabilidad sobre UDP o validación de paquetes.

### Contiene

- UDP como protocolo rápido y stateless.
- Comparación TCP vs UDP.
- RUDP.
- Confirmaciones en capa de aplicación.
- Secuencias.
- Reintentos.
- HMAC.
- Spoofing.
- Validación de integridad.
- `dgram`.

### Útil para el TP porque

Sirve para entender cómo validar eventos o logs recibidos y cómo pensar confiabilidad cuando el transporte no la garantiza.

---

## 6.5. `clase_5_colapso_sniffer_forense_nodejs.md`

### Cuándo consultarlo

Revisar este archivo cuando haya problemas de bloqueo del servidor o latencia alta en `/health`.

### Contiene

- Caso del sniffer forense.
- UDP en puerto `7000`.
- API HTTP de monitoreo.
- Bloqueo con bucle de `500_000_000` iteraciones.
- Event Loop bloqueado.
- Call Stack ocupado.
- Packet loss.
- Timeout en `/status`.
- Solución con Worker Threads.

### Útil para el TP porque

Es la clase más directamente relacionada con el requisito de mantener `/health` rápido mientras `/ingest` recibe carga pesada.

---

## 6.6. `clase_6_alta_concurrencia_self_healing_nodejs.md`

### Cuándo consultarlo

Revisar este archivo cuando se implemente `cluster`, resiliencia o reinicio automático de Workers.

### Contiene

- Alta concurrencia.
- Arquitecturas basadas en hilos vs eventos.
- IPC.
- `node:cluster`.
- Primary/Master.
- Worker process.
- `cluster.fork()`.
- `cluster.on('exit')`.
- Self-healing.
- Graceful shutdown.
- `SIGTERM`, `SIGINT`, `SIGKILL`.
- Peticiones en vuelo.
- Consistencia de datos.
- El dilema del recolector de evidencia.

### Útil para el TP porque

El TP exige levantar un cluster usando la mitad de los núcleos y revivir Workers si mueren.

---

## 6.7. `clase_7_javascript_alto_rendimiento_concurrencia_atomics.md`

### Cuándo consultarlo

Revisar este archivo cuando se implemente `worker_threads`, `SharedArrayBuffer` o `Atomics`.

### Contiene

- Límite del hilo único.
- `child_process`.
- `cluster`.
- `worker_threads`.
- Transferencia de buffers.
- Structured Clone.
- `SharedArrayBuffer`.
- Race conditions.
- `Atomics.add`.
- `Atomics.wait`.
- `Atomics.notify`.
- Mutex.
- WaitGroups.
- Worker pools.

### Útil para el TP porque

El TP exige usar memoria compartida y `Atomics.add()` para contar eventos sin condiciones de carrera.

---

# 7. Índice de documentos del TP actual

## 7.1. `docs/01_consigna_tp/consignas_tp2_the_guardian.md`

### Cuándo consultarlo

Revisar este archivo antes de implementar cualquier cambio importante del TP.

### Contiene

- Consigna oficial.
- Objetivo del proyecto.
- Requisitos de arquitectura.
- Uso de cluster.
- Self-healing.
- `/health`.
- `/ingest`.
- Worker Thread fijo.
- `SharedArrayBuffer`.
- `Atomics.add`.
- Script de evaluación.
- 500 peticiones concurrentes.
- Criterios de evaluación.

### Útil para el TP porque

Es la fuente principal para no desviarse de lo pedido por el profesor.

---

## 7.2. `docs/01_consigna_tp/planificacion_tp2_the_guardian_opencode.md`

### Cuándo consultarlo

Revisar este archivo para decidir la arquitectura, las fases de implementación y el orden de trabajo.

### Contiene

- Planificación detallada.
- Estructura de carpetas recomendada.
- Decisiones técnicas.
- Prompts por fase para OpenCode.
- Checklist de implementación.
- Checklist de defensa.
- Carpeta `docs/`.
- Guías de estudio.
- Estrategia de pruebas.
- Riesgos técnicos.

### Útil para el TP porque

Es el plan operativo para construir el proyecto con ayuda de OpenCode.

---

# 8. Índice de documentos de Backend

## 8.1. `clase_1_backend_introduccion_nodejs.md`

### Cuándo consultarlo

Revisar este archivo cuando se necesite explicar qué es backend, qué hace Node.js y cómo se relaciona con frontend.

### Contiene

- Página estática vs dinámica.
- Sitio web vs aplicación web.
- Backend.
- Frontend.
- APIs.
- Node.js.
- V8.
- libuv.
- Event Loop.
- Accesibilidad.
- Relación cliente-servidor.

### Útil para el TP porque

Ayuda a explicar la base conceptual del backend y por qué el servidor debe responder solicitudes correctamente.

---

## 8.2. `clase_2_backend_funciones_arrays_practica1.md`

### Cuándo consultarlo

Revisar este archivo para fundamentos de JavaScript en Node.js y módulos nativos.

### Contiene

- Browser vs Node.js.
- `window` vs `global`.
- `process.version`.
- `__dirname`.
- `__filename`.
- Timers.
- CommonJS.
- `module.exports`.
- `require`.
- `os`.
- `path`.
- `fs`.
- HTTP básico.
- Práctica 1 resuelta.

### Útil para el TP porque

El proyecto usa CommonJS, módulos, timers, rutas de archivos y posiblemente módulos nativos.

---

## 8.3. `clase_3_backend_arrays_funciones_objetos_practica2.md`

### Cuándo consultarlo

Revisar este archivo para manipular arrays, objetos, callbacks y funciones reutilizables.

### Contiene

- Arrays.
- Métodos básicos.
- `push`, `pop`, `shift`, `unshift`.
- `splice`, `slice`, `join`, `concat`.
- `indexOf`, `includes`, `reverse`.
- `forEach`, `map`, `filter`, `reduce`.
- Arrow functions.
- Callbacks.
- Higher Order Functions.
- Factory functions.
- Clases.
- Closures.
- Práctica 2 resuelta.

### Útil para el TP porque

Se usan arrays para métricas, resultados de pruebas, workers activos, latencias y datos procesados.

---

## 8.4. `clase_4_backend_http_api_productos.md`

### Cuándo consultarlo

Revisar este archivo para entender cómo crear una API HTTP con Node.js nativo.

### Contiene

- `http.createServer`.
- `url.parse`.
- Query strings.
- Endpoint `/productos`.
- Promesas.
- `async/await`.
- `try/catch`.
- Respuestas JSON.
- Códigos 200, 404 y 500.
- `Content-Type`.
- Versión equivalente con Express.

### Útil para el TP porque

Ayuda a entender la base de los endpoints `/health` y `/ingest`.

---

## 8.5. `clase_5_backend_http_headers_fetch.md`

### Cuándo consultarlo

Revisar este archivo para trabajar con headers, respuestas HTML/JSON y consumo desde frontend.

### Contiene

- `req.method`.
- `req.url`.
- `req.headers`.
- `User-Agent`.
- Favicon.
- `fs.createReadStream`.
- HTML desde Node.js.
- JSON desde Node.js.
- `fetch`.
- Frontend simple.
- Diferencia entre navegador, Postman y curl.

### Útil para el TP porque

Sirve si se agrega una interfaz web, dashboard o pruebas desde navegador.

---

## 8.6. `clase_6_backend_express_api_rest_usuarios.md`

### Cuándo consultarlo

Revisar este archivo para estructurar el TP con Express de forma ordenada.

### Contiene

- Express.
- `express.Router`.
- `app.use`.
- `express.json`.
- `express.urlencoded`.
- EJS.
- Router.
- Controller.
- Model.
- Service.
- Middleware.
- API REST.
- CRUD.
- `nodemon`.
- Manejo de errores.
- Proyecto `gestion-usuarios`.

### Útil para el TP porque

El TP se va a hacer con Express y debe estar modularizado. Este archivo define la base de esa estructura.

---

## 8.7. `clase_7_backend_sqlite_ejs_crud_roles_usuarios.md`

### Cuándo consultarlo

Revisar este archivo si se decide agregar persistencia, roles, EJS o dashboard.

### Contiene

- SQLite.
- `better-sqlite3`.
- `config/db.js`.
- Tablas `users` y `roles`.
- CRUD.
- EJS.
- Formularios.
- `LEFT JOIN`.
- Filtros.
- Paginación.
- Soft delete.
- `morgan`.
- `chalk`.
- `http-errors`.
- Errores detectados y mejoras.

### Útil para el TP porque

Permite aplicar lo aprendido en backend al TP actual, por ejemplo guardando métricas o eventos procesados.

---

## 8.8. `tp_final_backend_permisos_roles_autenticacion.md`

### Cuándo consultarlo

Revisar este archivo si se quiere agregar autenticación, permisos, sesiones o control de acceso.

### Contiene

- TP final de Backend.
- Permisos por rol.
- ABM de permisos.
- Tablas `permisos` y `rol_permiso`.
- Relación muchos a muchos.
- Checkboxes para permisos.
- Visualización de permisos desde usuario.
- Bonus de middleware de acceso.
- Ejemplo de autenticación.
- Registro.
- Login.
- Cookies.
- Sesiones.
- Logout.
- `/me`.
- `sessionMiddleware`.
- `checkPermission`.

### Útil para el TP porque

Si se desea aplicar lo aprendido el cuatrimestre anterior, este archivo sirve para agregar un dashboard protegido o permisos de administración.

---

# 9. Tabla de consulta rápida por necesidad

| Necesidad de OpenCode | Archivo a revisar primero | Archivo complementario |
|---|---|---|
| Entender la consigna del TP | `docs/01_consigna_tp/consignas_tp2_the_guardian.md` | `docs/01_consigna_tp/planificacion_tp2_the_guardian_opencode.md` |
| Definir arquitectura del proyecto | `docs/01_consigna_tp/planificacion_tp2_the_guardian_opencode.md` | `clase_6_backend_express_api_rest_usuarios.md` |
| Implementar Express | `clase_6_backend_express_api_rest_usuarios.md` | `clase_4_backend_http_api_productos.md` |
| Crear rutas `/health` y `/ingest` | `docs/01_consigna_tp/consignas_tp2_the_guardian.md` | `clase_6_backend_express_api_rest_usuarios.md` |
| Mantener `/health` rápido | `clase_5_colapso_sniffer_forense_nodejs.md` | `clase_7_javascript_alto_rendimiento_concurrencia_atomics.md` |
| Evitar bloqueo del Event Loop | `clase_5_colapso_sniffer_forense_nodejs.md` | `clase_1_redes_nodejs.md` |
| Implementar Worker Thread | `clase_7_javascript_alto_rendimiento_concurrencia_atomics.md` | `clase_5_colapso_sniffer_forense_nodejs.md` |
| Usar `SharedArrayBuffer` | `clase_7_javascript_alto_rendimiento_concurrencia_atomics.md` | `docs/01_consigna_tp/consignas_tp2_the_guardian.md` |
| Usar `Atomics.add()` | `clase_7_javascript_alto_rendimiento_concurrencia_atomics.md` | `docs/01_consigna_tp/consignas_tp2_the_guardian.md` |
| Implementar `cluster` | `clase_6_alta_concurrencia_self_healing_nodejs.md` | `clase_7_javascript_alto_rendimiento_concurrencia_atomics.md` |
| Implementar self-healing | `clase_6_alta_concurrencia_self_healing_nodejs.md` | `docs/01_consigna_tp/planificacion_tp2_the_guardian_opencode.md` |
| Crear script de evaluación | `docs/01_consigna_tp/consignas_tp2_the_guardian.md` | `clase_3_backend_arrays_funciones_objetos_practica2.md` |
| Calcular latencias promedio | `clase_3_backend_arrays_funciones_objetos_practica2.md` | `docs/01_consigna_tp/planificacion_tp2_the_guardian_opencode.md` |
| Usar CommonJS | `clase_2_backend_funciones_arrays_practica1.md` | `clase_6_backend_express_api_rest_usuarios.md` |
| Crear estructura routes/controllers/services | `clase_6_backend_express_api_rest_usuarios.md` | `docs/01_consigna_tp/planificacion_tp2_the_guardian_opencode.md` |
| Agregar SQLite | `clase_7_backend_sqlite_ejs_crud_roles_usuarios.md` | `tp_final_backend_permisos_roles_autenticacion.md` |
| Agregar dashboard EJS | `clase_7_backend_sqlite_ejs_crud_roles_usuarios.md` | `clase_5_backend_http_headers_fetch.md` |
| Agregar login/cookies | `tp_final_backend_permisos_roles_autenticacion.md` | `clase_7_backend_sqlite_ejs_crud_roles_usuarios.md` |
| Agregar permisos o roles | `tp_final_backend_permisos_roles_autenticacion.md` | `clase_7_backend_sqlite_ejs_crud_roles_usuarios.md` |
| Explicar TCP/UDP | `clase_2_redes_tcp_udp_nodejs.md` | `clase_4_topologia_digital_udp_rudp_spoofing.md` |
| Explicar pérdida de paquetes UDP | `clase_5_colapso_sniffer_forense_nodejs.md` | `clase_2_redes_tcp_udp_nodejs.md` |
| Explicar backpressure | `clase_3_arquitectura_flujo_datos.md` | `clase_2_redes_tcp_udp_nodejs.md` |
| Explicar autenticación vs autorización | `tp_final_backend_permisos_roles_autenticacion.md` | `clase_6_backend_express_api_rest_usuarios.md` |

---

# 10. Reglas para la IA de OpenCode

## 10.1. Antes de escribir código

Antes de implementar una funcionalidad, OpenCode debe:

1. Identificar qué parte de la consigna toca.
2. Buscar en esta guía qué archivo explica ese tema.
3. Leer el archivo correspondiente.
4. Implementar respetando las decisiones técnicas del proyecto.
5. Comentar el código de forma clara.
6. Actualizar documentación en `docs/` si la funcionalidad es importante.

---

## 10.2. Estilo de código esperado

El código debe:

- usar CommonJS;
- correr en Node.js 20;
- usar Express;
- estar organizado por carpetas;
- evitar archivos gigantes;
- tener nombres claros;
- manejar errores;
- responder JSON consistente;
- tener comentarios explicativos en partes complejas;
- evitar bloquear el Event Loop;
- delegar CPU-bound work a Worker Threads;
- documentar decisiones técnicas.

---

## 10.3. Estructura sugerida del proyecto The Guardian

```txt
the-guardian/
├── src/
│   ├── primary.js
│   ├── app.js
│   ├── routes/
│   │   ├── health.routes.js
│   │   └── ingest.routes.js
│   ├── controllers/
│   │   ├── health.controller.js
│   │   └── ingest.controller.js
│   ├── services/
│   │   ├── ingest.service.js
│   │   ├── metrics.service.js
│   │   └── worker-thread.service.js
│   ├── workers/
│   │   └── ingest.worker.js
│   ├── middlewares/
│   │   ├── error.middleware.js
│   │   └── not-found.middleware.js
│   └── utils/
│       ├── logger.js
│       └── response.js
├── scripts/
│   └── evaluate.js
├── docs/
│   ├── 00_guia_maestra_opencode.md
│   ├── guia_defensa_oral.md
│   ├── decisiones_tecnicas.md
│   └── guia_ejecucion.md
├── package.json
└── README.md
```

---

## 10.4. Endpoints mínimos del TP

### `GET /health`

Debe responder inmediatamente:

```json
{
  "status": "ok",
  "pid": 12345
}
```

Debe tener latencia muy baja incluso durante ráfagas a `/ingest`.

---

### `GET /ingest?id=4500`

Debe:

1. Validar que `id` exista.
2. Validar que `id` sea numérico.
3. Delegar el trabajo pesado al Worker Thread.
4. Incrementar contador usando `Atomics.add()`.
5. Responder rápido con `202 Accepted`.

Respuesta sugerida:

```json
{
  "ok": true,
  "status": "accepted",
  "id": 4500,
  "pid": 12345
}
```

---

## 10.5. Script de evaluación

El script debe:

1. Enviar 500 peticiones concurrentes a `/ingest`.
2. Consultar `/health` en paralelo.
3. Medir latencias de `/health`.
4. Mostrar si `/health` respondió de forma rápida.
5. Mostrar contador final esperado.
6. Verificar si el total llegó a 500 o explicar cómo se agrega el total global.

Consultar:

- `docs/01_consigna_tp/consignas_tp2_the_guardian.md`
- `docs/01_consigna_tp/planificacion_tp2_the_guardian_opencode.md`
- `clase_3_backend_arrays_funciones_objetos_practica2.md`

---

# 11. Guía de defensa oral

## 11.1. Preguntas que el profesor podría hacer

### ¿Por qué usaste Express?

Porque permite organizar el backend en rutas, controladores, servicios y middlewares, evitando el ruteo manual con `http.createServer`.

Consultar:

- `clase_6_backend_express_api_rest_usuarios.md`

---

### ¿Por qué `/ingest` responde `202 Accepted`?

Porque el endpoint acepta el trabajo y lo delega a un Worker Thread. No espera a terminar el cálculo pesado, así evita bloquear la API.

Consultar:

- `clase_5_colapso_sniffer_forense_nodejs.md`
- `clase_7_javascript_alto_rendimiento_concurrencia_atomics.md`

---

### ¿Por qué se usa Worker Thread?

Porque el cálculo pesado es CPU-bound. Si se ejecuta en el hilo principal, bloquea el Event Loop y `/health` deja de responder rápido.

Consultar:

- `clase_5_colapso_sniffer_forense_nodejs.md`
- `clase_7_javascript_alto_rendimiento_concurrencia_atomics.md`

---

### ¿Por qué se usa `cluster`?

Porque permite crear varios procesos Worker y aprovechar varios núcleos de CPU, manteniendo la API disponible y aplicando self-healing si un proceso muere.

Consultar:

- `clase_6_alta_concurrencia_self_healing_nodejs.md`

---

### ¿Qué hace `cluster.on('exit')`?

Detecta cuando un Worker del cluster muere. El Primary puede ejecutar `cluster.fork()` para crear otro Worker y mantener la disponibilidad.

Consultar:

- `clase_6_alta_concurrencia_self_healing_nodejs.md`

---

### ¿Qué hace `SharedArrayBuffer`?

Permite que varios hilos dentro de un proceso compartan una región de memoria.

Consultar:

- `clase_7_javascript_alto_rendimiento_concurrencia_atomics.md`

---

### ¿Qué hace `Atomics.add()`?

Incrementa un valor en memoria compartida de forma atómica, evitando condiciones de carrera.

Consultar:

- `clase_7_javascript_alto_rendimiento_concurrencia_atomics.md`

---

### ¿Cuál es la diferencia entre `cluster` y `worker_threads`?

`cluster` crea procesos separados.  
`worker_threads` crea hilos dentro de un proceso.

Consultar:

- `clase_6_alta_concurrencia_self_healing_nodejs.md`
- `clase_7_javascript_alto_rendimiento_concurrencia_atomics.md`

---

### ¿Cuál es el riesgo de reiniciar Workers automáticamente?

El proceso se recupera, pero las peticiones que estaban en vuelo pueden perderse o quedar incompletas si no hay persistencia, colas o idempotencia.

Consultar:

- `clase_6_alta_concurrencia_self_healing_nodejs.md`

---

### ¿Por qué UDP puede perder paquetes?

Porque UDP no tiene control de flujo, ACKs ni retransmisión automática. Si el receptor se bloquea, el kernel o la red pueden descartar datagramas.

Consultar:

- `clase_2_redes_tcp_udp_nodejs.md`
- `clase_5_colapso_sniffer_forense_nodejs.md`

---

### ¿Qué aprendizaje de Backend se aplicó?

Se aplicó Express, estructura modular, rutas, controladores, servicios, middlewares, manejo de errores, respuestas JSON y documentación.

Consultar:

- `clase_6_backend_express_api_rest_usuarios.md`
- `clase_7_backend_sqlite_ejs_crud_roles_usuarios.md`

---

# 12. Orden recomendado de lectura para OpenCode

## 12.1. Para implementar el TP mínimo

Leer en este orden:

1. `docs/01_consigna_tp/consignas_tp2_the_guardian.md`
2. `docs/01_consigna_tp/planificacion_tp2_the_guardian_opencode.md`
3. `clase_5_colapso_sniffer_forense_nodejs.md`
4. `clase_6_alta_concurrencia_self_healing_nodejs.md`
5. `clase_7_javascript_alto_rendimiento_concurrencia_atomics.md`
6. `clase_6_backend_express_api_rest_usuarios.md`

---

## 12.2. Para mejorar el TP con documentación y defensa

Leer además:

1. `clase_1_redes_nodejs.md`
2. `clase_2_redes_tcp_udp_nodejs.md`
3. `clase_3_arquitectura_flujo_datos.md`
4. `clase_4_topologia_digital_udp_rudp_spoofing.md`
5. `clase_1_backend_introduccion_nodejs.md`

---

## 12.3. Para agregar persistencia, dashboard o autenticación

Leer además:

1. `clase_5_backend_http_headers_fetch.md`
2. `clase_7_backend_sqlite_ejs_crud_roles_usuarios.md`
3. `tp_final_backend_permisos_roles_autenticacion.md`

---

# 13. Prompt recomendado para OpenCode

Usar este prompt inicial dentro de OpenCode:

```txt
Vas a trabajar en el TP “The Guardian” de Programación sobre Redes.

Antes de modificar código, revisá docs/00_guia_maestra_opencode.md para saber qué documento consultar según el tema.

Decisiones obligatorias:
- Usar Node.js 20.
- Usar CommonJS.
- Usar Express.
- Implementar cluster con la mitad de los núcleos disponibles.
- Implementar self-healing con cluster.on('exit') y cluster.fork().
- Exponer GET /health con respuesta inmediata.
- Exponer GET /ingest?id=NUMERO.
- /ingest debe responder rápido con 202 Accepted.
- El cálculo pesado no debe ejecutarse en el Event Loop del Worker de cluster.
- Delegar el cálculo a un Worker Thread fijo.
- Usar SharedArrayBuffer y Atomics.add() para el contador del Worker Thread.
- Documentar claramente la diferencia entre procesos de cluster e hilos de worker_threads.
- Crear carpeta docs/ con guías de estudio y defensa oral.
- Comentar bien el código, especialmente cluster, worker_threads, SharedArrayBuffer y Atomics.

No escribas todo de golpe sin plan.
Primero revisá la arquitectura existente.
Después proponé pasos pequeños.
Luego implementá por fases.
Al final generá o actualizá documentación y script de evaluación.
```

---

# 14. Checklist final para OpenCode

Antes de dar por terminado el proyecto, verificar:

- [ ] El proyecto corre con `npm start`.
- [ ] El proyecto corre con Node.js 20.
- [ ] Se usa CommonJS.
- [ ] Se usa Express.
- [ ] Existe `GET /health`.
- [ ] `/health` responde JSON con `status` y `pid`.
- [ ] Existe `GET /ingest?id=...`.
- [ ] `/ingest` valida `id`.
- [ ] `/ingest` responde `202 Accepted`.
- [ ] El cálculo pesado no bloquea el Event Loop.
- [ ] Hay Worker Thread fijo.
- [ ] Hay `SharedArrayBuffer`.
- [ ] Hay `Atomics.add()`.
- [ ] Hay cluster con mitad de núcleos.
- [ ] Hay self-healing.
- [ ] Si un Worker muere, se crea otro.
- [ ] Hay script de evaluación en Node.js.
- [ ] El script envía 500 peticiones concurrentes.
- [ ] El script consulta `/health` en paralelo.
- [ ] Se muestran métricas de latencia.
- [ ] Se muestra contador final o agregación global.
- [ ] El código está comentado.
- [ ] Existe carpeta `docs/`.
- [ ] Existe guía de ejecución.
- [ ] Existe guía de defensa oral.
- [ ] Existe explicación de decisiones técnicas.
- [ ] Existe README.
- [ ] Se puede explicar la diferencia entre `cluster` y `worker_threads`.
- [ ] Se puede explicar por qué se usa `Atomics.add()`.
- [ ] Se puede explicar por qué `/health` no se bloquea.

---

# 15. Resumen final

Esta guía debe ser el primer archivo que OpenCode consulte.

La lógica de uso es:

```txt
Tengo una duda técnica
  ↓
Busco el tema en esta guía
  ↓
Abro el archivo recomendado
  ↓
Implemento respetando la consigna
  ↓
Documento la decisión
```

La idea más importante del proyecto es:

> The Guardian debe demostrar que un servidor Node.js puede recibir carga concurrente, mantener una API de monitoreo reactiva, delegar trabajo CPU-bound a hilos secundarios, usar memoria compartida con operaciones atómicas y recuperarse ante fallos de procesos mediante cluster y self-healing.
