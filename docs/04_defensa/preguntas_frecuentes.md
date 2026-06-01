# Preguntas frecuentes — The Guardian

## 1. ¿Por qué usaste Express?

Express permite organizar el backend en rutas, controladores, servicios y middlewares, evitando el ruteo manual con `http.createServer`. Facilita la defensa porque el código es modular y mantenible.

## 2. ¿Por qué usaste Cluster?

`cluster` permite crear varios procesos Node.js usando el mismo puerto. Distribuye la carga HTTP, aprovecha múltiples núcleos y permite self-healing si un Worker muere.

## 3. ¿Por qué la mitad de los núcleos?

La consigna lo pide explícitamente mediante una lógica equivalente a `Math.max(1, Math.floor(os.cpus().length / 2))`. Esto escala sin ocupar toda la máquina y garantiza que, incluso con solo 2 CPUs, haya al menos 1 Worker levantado.

## 4. ¿Qué hace self-healing?

Si un Worker del cluster muere, el Primary detecta el evento y crea otro automáticamente usando `cluster.fork()`. Esto mantiene la API disponible.

## 5. ¿Qué pasa si un Worker muere con tareas en vuelo?

El sistema recupera disponibilidad creando otro Worker, pero las tareas en vuelo pueden perderse si no hay cola persistente. Esto se documenta como limitación intencional del TP.

## 6. ¿Por qué usaste Worker Thread?

Para ejecutar tareas CPU-bound sin bloquear el Event Loop del servidor HTTP. Si el cálculo pesado corría en el hilo principal, `/health` dejaría de responder rápido.

## 7. ¿Qué es CPU-bound?

Es una tarea que consume principalmente CPU (cálculos, bucles, procesamiento de datos) en lugar de esperar por I/O (red, disco, base de datos). En Node.js, el CPU-bound bloquea el Event Loop si no se delega.

## 8. ¿Por qué `/health` no se bloquea?

Porque no ejecuta trabajo pesado, no consulta SQLite, no espera al Worker Thread y responde inmediatamente con el estado del proceso.

## 9. ¿Qué es `SharedArrayBuffer`?

Es un bloque de memoria compartido entre hilos dentro del mismo proceso. En este TP, cada Cluster Worker comparte un buffer de 4 bytes con su Worker Thread fijo para contar eventos.

## 10. ¿Qué hace `Atomics.add()`?

Incrementa un valor en memoria compartida de forma atómica, haciendo la operación indivisible. Evita race conditions cuando múltiples hilos intentan incrementar el mismo contador.

## 11. ¿Por qué el contador global usa IPC?

`SharedArrayBuffer` comparte memoria entre hilos del mismo proceso, pero `cluster` crea procesos separados que no comparten memoria directamente. Por eso el Primary agrega totales mediante mensajes IPC.

## 12. ¿Por qué SQLite escribe desde el Primary?

SQLite permite múltiples lecturas, pero las escrituras concurrentes desde varios procesos pueden generar bloqueos. Centralizar escrituras en el Primary evita condiciones de carrera en la base de datos.

Los Workers **solo leen SQLite** para mostrar el dashboard (`/dashboard`). Cada Worker abre su propia conexión de lectura cuando necesita datos de las tablas.

## 13. ¿Qué muestra el dashboard?

El dashboard muestra estado del sistema, PID que respondió, eventos aceptados, eventos completados, eventos fallidos, reinicios de Workers, últimos eventos, últimos reinicios y accesos a `/health` y `/metrics`.

## 14. ¿Por qué no implementaste autenticación?

El foco del TP es redes, concurrencia, Event Loop, cluster, Worker Threads, memoria compartida y Atomics. Implementar autenticación completa desviaría tiempo y riesgo del objetivo principal. Se documenta como mejora futura.

## 15. ¿Por qué `GET /ingest` en lugar de `POST /ingest`?

La consigna muestra el ejemplo como `/ingest?id=4500` y menciona GET o POST. Se eligió GET con query string para mantener simplicidad y alinearse con el ejemplo oficial.

## 16. ¿Por qué se usa `202 Accepted`?

El endpoint acepta el evento, lo delega al Worker Thread y responde inmediatamente. No espera a que termine el cálculo pesado, manteniendo la API reactiva.
