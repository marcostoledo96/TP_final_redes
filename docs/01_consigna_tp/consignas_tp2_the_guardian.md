# Trabajo Práctico 2 — “The Guardian”

## Micro-Orquestador de Ingesta y Monitoreo Reactivo

**Materia:** Programación sobre Redes  
**Instituto:** Instituto de Formación Técnica Superior N.° 16 — Ciudad de Buenos Aires  
**Trabajo práctico:** “The Guardian”  
**Tema central:** alta concurrencia, resiliencia, Event Loop limpio, Worker Threads, memoria compartida y operaciones atómicas.

---

## 1. Objetivo general del proyecto

El objetivo del TP es desarrollar un **prototipo simplificado de un agente de seguridad** capaz de:

1. Recibir ráfagas de logs o eventos.
2. Procesar tareas matemáticamente pesadas sin congelar la API HTTP.
3. Mantener el sistema disponible incluso si un proceso falla.
4. Llevar un conteo exacto de eventos usando **memoria compartida por hardware**.
5. Evitar condiciones de carrera usando operaciones atómicas.

El sistema debe demostrar que puede trabajar bajo carga concurrente sin bloquear el endpoint de monitoreo y sin perder precisión en el contador final.

---

## 2. Idea general del sistema

El proyecto se llama **“The Guardian”** porque representa un agente de monitoreo/seguridad que debe permanecer activo mientras recibe múltiples eventos.

La arquitectura debe combinar tres conceptos vistos en la unidad:

| Eje | Clase relacionada | Concepto principal |
|---|---:|---|
| Balanceo y resiliencia | Clase 6 | Uso de `cluster`, procesos Worker y estrategia Self-Healing |
| Event Loop limpio | Clase 5 | Evitar tareas CPU-bound en el hilo principal |
| Paralelismo y sincronización | Clase 7 | `worker_threads`, `SharedArrayBuffer` y `Atomics.add()` |

---

## 3. Requisitos de arquitectura

El TP debe implementarse como un flujo único que combine cluster, API HTTP, Worker Threads y memoria compartida.

---

# Parte 1 — Balanceo y resiliencia

## 3.1. Uso obligatorio de `cluster`

El archivo principal del proyecto debe levantar un **Cluster de Node.js**.

El proceso principal, también llamado **Master** o **Primary Process**, debe encargarse de:

- Detectar cuántos núcleos tiene disponible la máquina.
- Usar solo la **mitad de los núcleos disponibles**.
- Crear procesos Worker usando `cluster.fork()`.
- Mantener la API disponible aunque un Worker falle.

### Requisito específico

El sistema debe aprovechar:

```js
Math.floor(os.cpus().length / 2)
```

o una lógica equivalente para determinar la cantidad de procesos Worker.

### Ejemplo conceptual

Si la máquina tiene 8 núcleos:

```txt
Núcleos disponibles: 8
Workers a levantar: 4
```

Si la máquina tiene 4 núcleos:

```txt
Núcleos disponibles: 4
Workers a levantar: 2
```

---

## 3.2. Estrategia Self-Healing

El sistema debe implementar una estrategia de **auto-recuperación**.

Esto significa que si un Worker muere por:

- Un error simulado.
- Un cierre inesperado.
- Un comando manual.
- Un fallo del proceso.

el proceso Master debe detectar el evento y crear inmediatamente un nuevo Worker.

### Requisito obligatorio

Debe usarse el evento:

```js
cluster.on('exit', ...)
```

Dentro de ese evento, el Master debe ejecutar:

```js
cluster.fork();
```

### Comportamiento esperado

```txt
Worker 12345 murió.
Master crea un nuevo Worker.
Nuevo Worker 12399 online.
La API sigue disponible.
```

---

## 3.3. Qué se evalúa en esta parte

Se debe poder comprobar que:

- El Master levanta varios Workers.
- Los Workers comparten el mismo puerto HTTP gracias al módulo `cluster`.
- Si un Worker muere, el Master lo reemplaza.
- La API no queda caída permanentemente.

---

# Parte 2 — Event Loop limpio

## 4.1. Servidor HTTP en cada Worker

Cada Worker del cluster debe levantar un servidor HTTP en el puerto:

```txt
8080
```

Aunque varios Workers usen el mismo puerto, Node.js puede distribuir las conexiones mediante el módulo `cluster`.

---

## 4.2. Rutas obligatorias

Cada Worker debe exponer dos rutas principales:

| Ruta | Método sugerido | Propósito |
|---|---|---|
| `/health` | GET | Verificar que la API esté viva |
| `/ingest?id=4500` | GET o POST | Recibir un evento/log para procesar |

---

## 4.3. Endpoint `/health`

La ruta `/health` debe responder de forma inmediata.

### Respuesta esperada

```json
{
  "status": "ok",
  "pid": 12345
}
```

Donde `pid` debe ser el identificador real del proceso Worker que respondió.

### Requisito de latencia

La latencia de `/health` debe ser cercana a:

```txt
5 ms
```

Lo importante no es que siempre dé exactamente 5 ms, sino que responda de manera rápida y no quede bloqueado mientras se procesan tareas pesadas.

---

## 4.4. Endpoint `/ingest`

La ruta `/ingest` debe recibir un identificador numérico mediante Query String.

### Ejemplo

```txt
/ingest?id=4500
```

El parámetro `id` representa el identificador del log, evento o paquete ingerido.

### Validaciones mínimas sugeridas

El endpoint debería verificar que:

- El parámetro `id` exista.
- El valor sea numérico.
- La petición no rompa el servidor si llega mal formada.

Ejemplo de error esperado:

```json
{
  "error": "id inválido o ausente"
}
```

---

## 4.5. Regla central del Event Loop

El Worker del cluster **no debe procesar el cálculo pesado directamente en su Event Loop**.

Esto significa que dentro del endpoint `/ingest` no debería haber tareas como:

```js
while (i < 500_000_000) {
  i++;
}
```

ni cálculos intensivos que bloqueen el hilo principal.

La tarea pesada debe delegarse a un **Worker Thread fijo**.

---

# Parte 3 — Paralelismo y sincronización por hardware

## 5.1. Uso obligatorio de `worker_threads`

Al recibir una petición en `/ingest`, el Worker del cluster debe delegar la tarea a un **Worker Thread**.

El Worker Thread debe estar corriendo en paralelo y encargarse del procesamiento pesado.

### Arquitectura esperada

```txt
Master / Primary Process
│
├── Cluster Worker 1 ── HTTP Server :8080 ── Worker Thread fijo
├── Cluster Worker 2 ── HTTP Server :8080 ── Worker Thread fijo
├── Cluster Worker 3 ── HTTP Server :8080 ── Worker Thread fijo
└── Cluster Worker N ── HTTP Server :8080 ── Worker Thread fijo
```

---

## 5.2. Diferencia entre Cluster Worker y Worker Thread

Es importante distinguir ambos conceptos:

| Concepto | Qué es | Para qué se usa en este TP |
|---|---|---|
| Cluster Worker | Proceso separado creado con `cluster.fork()` | Escalar la API HTTP y tolerar fallos |
| Worker Thread | Hilo dentro de un proceso Node.js | Ejecutar cálculos pesados sin bloquear el Event Loop |

---

## 5.3. SharedArrayBuffer obligatorio

El Worker del cluster y su Worker Thread deben compartir un bloque de memoria usando:

```js
SharedArrayBuffer
```

El buffer compartido debe ser de:

```txt
4 bytes
```

Esto equivale a un entero de 32 bits.

### Estructura esperada

```js
const sharedBuffer = new SharedArrayBuffer(4);
const counter = new Int32Array(sharedBuffer);
```

---

## 5.4. Contador global de paquetes ingeridos

El `SharedArrayBuffer` debe utilizarse para llevar un conteo global de los paquetes/eventos ingeridos.

Cada vez que llegue una petición válida a `/ingest`, el sistema debe incrementar el contador.

---

## 5.5. Uso obligatorio de `Atomics.add()`

Para evitar condiciones de carrera en la memoria compartida, el incremento del contador debe realizarse obligatoriamente con:

```js
Atomics.add()
```

### Ejemplo conceptual

```js
Atomics.add(counter, 0, 1);
```

Esto incrementa de forma atómica el valor ubicado en la posición `0` del arreglo compartido.

---

## 5.6. Por qué no alcanza con `counter[0]++`

No se debe usar una operación normal como:

```js
counter[0]++;
```

porque esa operación no es realmente indivisible.

Internamente implica tres pasos:

1. Leer el valor actual.
2. Sumar 1.
3. Escribir el nuevo valor.

Si varias peticiones ocurren al mismo tiempo, dos hilos podrían leer el mismo valor antes de que alguno lo actualice, generando pérdida de incrementos.

### Ejemplo de condición de carrera

```txt
Valor inicial: 100
Hilo A lee 100
Hilo B lee 100
Hilo A escribe 101
Hilo B escribe 101
Resultado final: 101
Resultado correcto: 102
```

Con `Atomics.add()`, el incremento se realiza como una operación indivisible.

---

# 6. Script de evaluación

## 6.1. Requisito obligatorio

El proyecto debe incluir un script de prueba.

Puede estar escrito en:

- Python.
- Bash.
- JavaScript.

La consigna indica explícitamente que puede ser en **Python o Bash**.

---

## 6.2. Qué debe hacer el script

El script debe enviar de forma simultánea:

1. Una ráfaga masiva de **500 peticiones concurrentes** a la ruta `/ingest`.
2. Consultas en paralelo a la ruta `/health`.

---

## 6.3. Objetivo de la prueba

La prueba debe demostrar dos cosas al mismo tiempo:

### A. Que `/health` sigue respondiendo rápido

Durante la ráfaga de `/ingest`, el endpoint `/health` debe seguir respondiendo de forma casi instantánea.

Esto demuestra que el cálculo pesado fue movido a un hilo secundario y no bloquea el Event Loop del servidor HTTP.

### B. Que el contador final llega exactamente a 500

Después de las 500 peticiones concurrentes, el contador compartido debe terminar en:

```txt
500
```

No debería haber pérdida de datos ni diferencia de conteo.

---

## 6.4. Qué significa “sin drift”

La consigna menciona que el contador debe llegar exactamente a 500 sin pérdida de datos o **drift**.

En este contexto, drift significa una diferencia entre:

- La cantidad real de peticiones enviadas.
- La cantidad final registrada por el contador.

### Ejemplo incorrecto

```txt
Peticiones enviadas: 500
Contador final: 493
Drift: 7 eventos perdidos
```

### Ejemplo correcto

```txt
Peticiones enviadas: 500
Contador final: 500
Drift: 0
```

---

# 7. Criterios de evaluación

## 7.1. Nota 4 a 6 — Aprobado

Para aprobar, el proyecto debe cumplir con los requisitos principales:

- El cluster funciona.
- El sistema levanta varios Workers.
- Las tareas de `/ingest` se redirigen a un Worker Thread.
- El endpoint `/health` no se bloquea durante la carga.
- El contador final es exacto.
- El contador usa `Atomics.add()`.

---

## 7.2. Nota 7 a 10 — Buen desempeño / destacado

Además de cumplir lo anterior, para una nota más alta se espera:

- Código modularizado.
- Separación clara de responsabilidades.
- Control de errores limpio.
- Buen manejo de Workers y Worker Threads.
- Logs claros para demostrar qué está pasando.
- Validación de parámetros.
- Respuestas HTTP consistentes.
- Buenas prácticas de programación.
- Script de evaluación claro y reproducible.

---

# 8. Entregables sugeridos

Aunque la consigna no enumera una estructura exacta de entrega, se recomienda entregar el proyecto con una organización similar a la siguiente:

```txt
the-guardian/
│
├── package.json
├── README.md
│
├── src/
│   ├── index.js              # Master / Primary Process con cluster
│   ├── server.js             # Lógica HTTP de cada Cluster Worker
│   ├── ingest-worker.js      # Worker Thread para procesamiento pesado
│   └── shared-state.js       # SharedArrayBuffer / contador compartido
│
└── test/
    ├── load-test.py          # Script de evaluación en Python
    └── load-test.sh          # Opcional: versión Bash
```

También se puede usar una estructura más simple si el código sigue siendo claro.

---

# 9. Checklist de cumplimiento

## Arquitectura cluster

- [ ] El archivo principal usa `cluster`.
- [ ] El Master detecta la cantidad de núcleos.
- [ ] Se usa la mitad de los núcleos disponibles.
- [ ] Se crean Workers con `cluster.fork()`.
- [ ] El Master escucha el evento `exit`.
- [ ] Si un Worker muere, el Master crea otro Worker automáticamente.

## API HTTP

- [ ] Cada Worker levanta un servidor HTTP en el puerto `8080`.
- [ ] Existe la ruta `/health`.
- [ ] `/health` responde JSON con `status` y `pid`.
- [ ] `/health` responde rápidamente durante la carga.
- [ ] Existe la ruta `/ingest`.
- [ ] `/ingest` recibe un parámetro `id` por Query String.
- [ ] `/ingest` valida que el `id` sea correcto.

## Worker Threads

- [ ] El cálculo pesado no se ejecuta directamente en el Event Loop del servidor HTTP.
- [ ] Cada Worker del cluster delega la tarea a un Worker Thread fijo.
- [ ] El Worker Thread procesa las tareas de ingesta.
- [ ] El servidor HTTP queda libre para responder `/health`.

## Memoria compartida y Atomics

- [ ] Se usa `SharedArrayBuffer`.
- [ ] El buffer compartido tiene 4 bytes.
- [ ] Se crea una vista `Int32Array` sobre el buffer.
- [ ] El contador se incrementa con `Atomics.add()`.
- [ ] No se usa `counter[0]++` para el conteo compartido.
- [ ] El conteo final llega exactamente a 500.

## Script de evaluación

- [ ] Existe un script de prueba.
- [ ] El script envía 500 peticiones concurrentes a `/ingest`.
- [ ] El script consulta `/health` en paralelo.
- [ ] El script muestra latencias de `/health`.
- [ ] El script muestra el contador final.
- [ ] El script permite comprobar que no hubo drift.

## Buenas prácticas

- [ ] El código está modularizado.
- [ ] Hay manejo de errores.
- [ ] Hay logs claros.
- [ ] Hay instrucciones de ejecución.
- [ ] El README explica cómo correr el servidor.
- [ ] El README explica cómo correr el test.

---

# 10. Comandos esperados de ejecución

## Instalar dependencias

Si el proyecto usa dependencias externas:

```bash
npm install
```

Si solo usa módulos nativos de Node.js, este paso puede no ser necesario.

---

## Levantar el servidor

```bash
node src/index.js
```

Salida esperada aproximada:

```txt
Master 12000 iniciado
Núcleos detectados: 8
Workers a levantar: 4
Worker 12001 online
Worker 12002 online
Worker 12003 online
Worker 12004 online
Servidor HTTP escuchando en puerto 8080
```

---

## Probar `/health`

```bash
curl http://localhost:8080/health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "pid": 12001
}
```

---

## Probar `/ingest`

```bash
curl http://localhost:8080/ingest?id=4500
```

Respuesta esperada aproximada:

```json
{
  "received": true,
  "id": 4500,
  "pid": 12001
}
```

---

## Ejecutar prueba de carga

Ejemplo con Python:

```bash
python test/load-test.py
```

Salida esperada aproximada:

```txt
Enviando 500 peticiones concurrentes a /ingest...
Consultando /health en paralelo...
Health OK - 4 ms
Health OK - 6 ms
Health OK - 5 ms
Peticiones /ingest completadas: 500
Contador final: 500
Drift: 0
Prueba exitosa
```

---

# 11. Riesgos técnicos que hay que evitar

## 11.1. Bloquear el Event Loop

No ejecutar tareas pesadas directamente dentro del callback HTTP.

Incorrecto:

```js
server.on('request', (req, res) => {
  while (heavyTask) {
    // bloqueo
  }
});
```

Correcto:

```js
// Delegar la tarea pesada a un Worker Thread
worker.postMessage({ type: 'ingest', id });
```

---

## 11.2. Crear un Worker Thread nuevo por cada request

La consigna pide delegar a un **Worker Thread fijo**.

Crear un hilo nuevo por cada petición puede generar overhead excesivo y empeorar el rendimiento.

Incorrecto:

```js
// No recomendado para este TP
new Worker('./ingest-worker.js');
```

por cada request.

Correcto:

```js
// Crear el Worker Thread una vez y reutilizarlo
const ingestWorker = new Worker('./ingest-worker.js', {
  workerData: { sharedBuffer }
});
```

---

## 11.3. Usar incremento no atómico

Incorrecto:

```js
counter[0]++;
```

Correcto:

```js
Atomics.add(counter, 0, 1);
```

---

## 11.4. No manejar errores del Worker Thread

Se recomienda escuchar eventos como:

```js
worker.on('error', ...);
worker.on('exit', ...);
```

Esto ayuda a diagnosticar fallos y mejora la calidad del trabajo.

---

## 11.5. No demostrar el resultado final

El TP no solo debe funcionar: también debe poder demostrarse.

El script de evaluación y los logs deben dejar claro que:

- `/health` responde durante la carga.
- Se enviaron 500 peticiones.
- El contador terminó exactamente en 500.
- No hubo drift.

---

# 12. Resumen final de la consigna

El TP consiste en construir un sistema Node.js llamado **“The Guardian”** que combine:

1. **Cluster** para levantar varios procesos HTTP y mantener disponibilidad.
2. **Self-Healing** para reemplazar automáticamente Workers caídos.
3. **Worker Threads** para mover el procesamiento pesado fuera del Event Loop.
4. **SharedArrayBuffer** para compartir un contador entre hilos.
5. **Atomics.add()** para incrementar el contador sin condiciones de carrera.
6. **Script de prueba** para bombardear `/ingest` con 500 peticiones concurrentes mientras `/health` sigue respondiendo rápido.

El resultado esperado es un prototipo concurrente, resiliente y medible, donde la API no se congela y el contador final coincide exactamente con la cantidad de eventos enviados.
