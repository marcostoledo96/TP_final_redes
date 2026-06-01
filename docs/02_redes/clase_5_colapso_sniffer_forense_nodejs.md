# Clase 5 — El Colapso del Sniffer Forense  
## Node.js Internals, UDP, Event Loop y procesamiento CPU-Intensive

> **Tema central de la clase:** comprender por qué Node.js puede manejar muy bien operaciones de red y E/S asincrónica, pero puede colapsar cuando se ejecutan tareas pesadas de CPU dentro del hilo principal.  
> **Caso práctico:** un sniffer forense UDP que recibe ráfagas masivas de paquetes y debe seguir respondiendo una API HTTP de monitoreo.

---

## 1. Contexto general del laboratorio

En esta clase no se trabaja con diapositivas, sino con un ejercicio práctico llamado:

> **“El Colapso del Sniffer Forense (Node.js Internals)”**

El escenario plantea una situación de análisis forense digital y monitoreo de red:

Una unidad de delitos complejos necesita capturar logs de auditoría enviados por un servidor que está bajo un ataque de denegación de servicio (**DoS**). Ese servidor envía ráfagas masivas de paquetes **UDP** al puerto `7000`.

La misión es desarrollar un **Sniffer de Evidencia** que sea capaz de:

1. Escuchar paquetes UDP entrantes.
2. Procesar cada paquete recibido.
3. Validar su integridad mediante una operación pesada.
4. Mantener activa una API HTTP de monitoreo.
5. Responder el endpoint `/status` en menos de **100 ms**, incluso durante la ráfaga de tráfico.

---

## 2. Objetivo técnico de la clase

El objetivo principal no es solamente programar un servidor UDP, sino entender el comportamiento interno de Node.js cuando conviven:

- tráfico de red,
- tareas asincrónicas,
- callbacks,
- procesamiento intensivo de CPU,
- Event Loop,
- Call Stack,
- API HTTP,
- y pérdida potencial de paquetes UDP.

La clase busca demostrar que:

> Node.js es eficiente para I/O no bloqueante, pero no es inmune al bloqueo si el código JavaScript ejecuta tareas síncronas muy pesadas en el hilo principal.

---

## 3. Relación con clases anteriores

Este ejercicio conecta directamente con los temas vistos previamente:

| Clase | Tema trabajado | Relación con este laboratorio |
|---|---|---|
| Clase 1 | Node.js, Event Loop, I/O no bloqueante, buffers y octetos | El laboratorio muestra qué pasa cuando el Event Loop se bloquea. |
| Clase 2 | TCP, UDP, backpressure y diagnóstico | Se usa UDP y se analiza por qué no existe control de flujo como en TCP. |
| Clase 3 | Flujo de datos, streams, backpressure y eficiencia | Se refuerza la idea de no cargar todo en memoria ni bloquear el flujo. |
| Clase 4 | UDP, dgram, RUDP, spoofing y validación | Se trabaja sobre UDP y la necesidad de validar integridad de mensajes. |
| Clase 5 | Node.js Internals y CPU-bound work | Se analiza cómo aislar tareas pesadas para proteger el Event Loop. |

---

## 4. Planteo del problema

El servidor debe escuchar paquetes UDP en el puerto:

```txt
7000
```

Y también debe exponer un servicio HTTP de monitoreo en:

```txt
8080
```

Con el endpoint:

```http
GET /status
```

Que debe responder:

```json
{ "status": "online" }
```

La dificultad está en que cada paquete UDP recibido requiere ejecutar una validación criptográfica pesada. En el ejercicio esa validación se simula con un bucle síncrono de:

```js
500_000_000
```

iteraciones.

---

## 5. El problema real: bloqueo del hilo principal

Node.js ejecuta el código JavaScript principal en un solo hilo.

Esto significa que si dentro de un callback se ejecuta una operación síncrona muy pesada, como:

```js
let i = 0;
while (i < 500_000_000) {
  i++;
}
```

el hilo principal queda ocupado hasta que el bucle termina.

Mientras ese bucle se está ejecutando:

- el Event Loop no avanza,
- no se procesan nuevos eventos UDP,
- no se responden peticiones HTTP,
- no se ejecutan timers,
- no se atienden callbacks pendientes,
- no se vacían colas de eventos,
- y la aplicación parece estar “congelada”.

---

## 6. Conceptos clave de Node.js Internals

### 6.1. Call Stack

El **Call Stack** es la pila de ejecución donde Node.js va colocando las funciones que se están ejecutando.

Cuando una función comienza, entra al stack.  
Cuando termina, sale del stack.

Ejemplo simple:

```js
function a() {
  b();
}

function b() {
  c();
}

function c() {
  console.log('Procesando...');
}

a();
```

El flujo sería:

```txt
a() entra al stack
b() entra al stack
c() entra al stack
console.log() entra y sale
c() sale
b() sale
a() sale
```

Mientras el stack está ocupado con una operación larga, el Event Loop no puede continuar con otros eventos.

---

### 6.2. Event Loop

El **Event Loop** es el mecanismo que permite a Node.js coordinar operaciones asincrónicas.

Node.js puede recibir eventos de red, timers, operaciones de archivos y callbacks gracias a este ciclo.

Pero el Event Loop solo puede avanzar cuando el Call Stack está libre.

Por eso:

> Si el Call Stack está ocupado con un cálculo síncrono pesado, el Event Loop queda bloqueado.

---

### 6.3. I/O-bound vs CPU-bound

Una diferencia central de la clase es distinguir entre tareas de entrada/salida y tareas de CPU.

| Tipo de tarea | Característica | Ejemplo | Node.js la maneja bien en el hilo principal |
|---|---|---|---|
| I/O-bound | Espera respuesta externa | red, disco, base de datos, HTTP | Sí, si se usa asincronía |
| CPU-bound | Consume procesador | cifrado pesado, compresión, hash intensivo, bucles grandes | No, puede bloquear |

Node.js es excelente para I/O no bloqueante, pero una tarea CPU-bound larga en JavaScript puede bloquear todo el proceso.

---

## 7. UDP en este laboratorio

UDP es un protocolo sin conexión, rápido y sin garantías de entrega.

En este laboratorio se usa UDP porque representa bien un escenario de alto volumen de datos, donde pueden llegar ráfagas muy rápidas de paquetes.

Características relevantes:

- no hay handshake,
- no hay conexión persistente,
- no hay retransmisión automática,
- no hay orden garantizado,
- no hay backpressure real como en TCP,
- los paquetes pueden perderse,
- el receptor puede saturarse,
- si la aplicación no lee a tiempo, el sistema operativo puede descartar datagramas.

---

## 8. Por qué UDP agrava el problema

En TCP, si el receptor se vuelve lento, el protocolo puede aplicar control de flujo mediante ventanas de recepción. Esto reduce la velocidad efectiva del emisor.

En UDP, no ocurre eso.

Si el emisor manda demasiado rápido y el receptor no procesa a tiempo, los paquetes pueden perderse silenciosamente.

Por eso, en este ejercicio, si el servidor Node.js queda bloqueado procesando un paquete, los demás datagramas pueden acumularse en buffers del sistema operativo o descartarse.

---

## 9. Arquitectura inicial del ejercicio

El código base tiene dos partes:

1. Servidor HTTP de monitoreo.
2. Servidor UDP que recibe paquetes.

```js
const dgram = require('dgram');
const http = require('http');

// 1. Monitoreo HTTP
http.createServer((req, res) => {
  if (req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'online' }));
  }
}).listen(8080, () => console.log('Monitor HTTP listo en puerto 8080'));

// 2. Sniffer UDP
const server = dgram.createSocket('udp4');

server.on('message', (msg, rinfo) => {
  // BLOQUEO CATASTRÓFICO: Secuestro del hilo principal
  let i = 0;
  while (i < 500_000_000) { i++; }

  console.log(`[PROCESADO] Paquete de ${rinfo.address}`);
});

server.bind(7000);
```

---

## 10. Qué hace mal esta implementación

La implementación inicial procesa el paquete UDP directamente dentro del callback:

```js
server.on('message', (msg, rinfo) => {
  let i = 0;
  while (i < 500_000_000) { i++; }
});
```

Esto es problemático porque el callback del evento `message` se ejecuta en el hilo principal.

Por lo tanto, cada paquete recibido secuestra el Event Loop durante el tiempo que dure la validación pesada.

---

## 11. Consecuencias del bloqueo

Cuando el bucle pesado se ejecuta dentro del hilo principal, pueden ocurrir varios problemas:

### 11.1. Caída del monitoreo HTTP

El endpoint `/status` no puede responder a tiempo porque el servidor HTTP también depende del mismo Event Loop.

Aunque el servidor HTTP esté “levantado”, no puede procesar nuevas solicitudes mientras el hilo principal esté ocupado.

Resultado probable:

```txt
curl: timeout
```

o una respuesta muy lenta.

---

### 11.2. Pérdida de paquetes UDP

UDP no espera al receptor. Si el proceso Node.js no alcanza a consumir los mensajes, pueden perderse paquetes.

Esto rompe el objetivo forense del sistema, porque un sniffer de evidencia debe intentar conservar la mayor cantidad posible de información.

---

### 11.3. Métricas engañosas

El sistema puede imprimir logs como:

```txt
[PROCESADO] Paquete de 127.0.0.1
```

Pero eso no significa que esté funcionando correctamente.

Puede estar procesando algunos paquetes mientras pierde muchos otros y deja caída la API de monitoreo.

---

## 12. Herramienta de laboratorio: inyector UDP

El ejercicio incluye un script en Python que envía paquetes UDP a máxima velocidad.

```python
import socket

UDP_IP = "127.0.0.1"
UDP_PORT = 7000
MESSAGE = b"EVIDENCIA_CRITICA_NRO_"

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
print(f"Inyectando ráfagas en {UDP_IP}:{UDP_PORT}...")

count = 0
try:
    while True:
        count += 1
        msg = MESSAGE + str(count).encode()
        sock.sendto(msg, (UDP_IP, UDP_PORT))
        if count % 100 == 0:
            print(f"Enviados {count} paquetes...")
except KeyboardInterrupt:
    print("\nInyección detenida.")
```

---

## 13. Corrección de indentación del inyector

En el enunciado original, el script aparece sin indentación por el formato del texto. En Python, la indentación es obligatoria.

Versión corregida:

```python
import socket

UDP_IP = "127.0.0.1"
UDP_PORT = 7000
MESSAGE = b"EVIDENCIA_CRITICA_NRO_"

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
print(f"Inyectando ráfagas en {UDP_IP}:{UDP_PORT}...")

count = 0

try:
    while True:
        count += 1
        msg = MESSAGE + str(count).encode()
        sock.sendto(msg, (UDP_IP, UDP_PORT))

        if count % 100 == 0:
            print(f"Enviados {count} paquetes...")

except KeyboardInterrupt:
    print("\nInyección detenida.")
```

---

## 14. Métrica de éxito

La consigna define una métrica clara:

> El comando `curl` al puerto `8080` debe responder en menos de **100 ms**, incluso durante el bombardeo UDP.

Comando de prueba:

```bash
curl http://localhost:8080/status
```

Respuesta esperada:

```json
{ "status": "online" }
```

Para medir el tiempo de respuesta:

```bash
curl -w "\nTiempo total: %{time_total}s\n" http://localhost:8080/status
```

Ejemplo de resultado aceptable:

```txt
{"status":"online"}
Tiempo total: 0.012345s
```

---

## 15. Por qué no alcanza con “hacerlo asincrónico” superficialmente

Una idea común sería envolver el procesamiento pesado en `setTimeout` o `setImmediate`.

Ejemplo:

```js
server.on('message', (msg, rinfo) => {
  setImmediate(() => {
    let i = 0;
    while (i < 500_000_000) { i++; }
  });
});
```

Esto puede liberar momentáneamente el callback del evento `message`, pero no resuelve el problema central.

El bucle pesado sigue ejecutándose en el mismo hilo principal. Cuando finalmente se ejecute, volverá a bloquear el Event Loop.

`setImmediate` posterga la ejecución, pero no la paraleliza.

---

## 16. Solución arquitectónica correcta

La solución más sólida es separar el trabajo de red y monitoreo del trabajo pesado de CPU.

La arquitectura recomendada es:

```txt
┌─────────────────────────────┐
│ Hilo principal Node.js       │
│                             │
│ - HTTP /status              │
│ - Socket UDP puerto 7000    │
│ - Cola de trabajos          │
│ - Métricas                  │
└──────────────┬──────────────┘
               │
               │ envía trabajos
               ▼
┌─────────────────────────────┐
│ Worker Threads              │
│                             │
│ - Validación pesada         │
│ - CPU-intensive loop        │
│ - Resultado al main thread  │
└─────────────────────────────┘
```

El hilo principal debe quedar liviano para poder:

- recibir paquetes,
- aceptar conexiones HTTP,
- responder `/status`,
- registrar métricas,
- administrar colas,
- delegar tareas pesadas.

---

## 17. Worker Threads

Node.js ofrece el módulo `worker_threads`, que permite ejecutar JavaScript en hilos separados.

Esto es útil para tareas CPU-bound.

Los workers no comparten directamente el Call Stack principal. Por eso, si un worker ejecuta una tarea pesada, el Event Loop del hilo principal puede seguir atendiendo la API HTTP.

---

## 18. Solución simple con Worker Thread

### 18.1. Archivo `worker.js`

```js
const { parentPort } = require('worker_threads');

parentPort.on('message', (job) => {
  const { id, payload } = job;

  // Simulación de validación criptográfica pesada
  let i = 0;
  while (i < 500_000_000) {
    i++;
  }

  parentPort.postMessage({
    id,
    ok: true,
    length: payload.length
  });
});
```

---

### 18.2. Archivo `server-worker-simple.js`

```js
const dgram = require('dgram');
const http = require('http');
const { Worker } = require('worker_threads');

let received = 0;
let processed = 0;
let dropped = 0;

const worker = new Worker('./worker.js');

worker.on('message', (result) => {
  processed++;
  console.log(`[WORKER] Procesado job ${result.id}`);
});

worker.on('error', (err) => {
  console.error('[WORKER ERROR]', err);
});

http.createServer((req, res) => {
  if (req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      received,
      processed,
      dropped
    }));
    return;
  }

  res.writeHead(404);
  res.end();
}).listen(8080, () => {
  console.log('Monitor HTTP listo en puerto 8080');
});

const server = dgram.createSocket('udp4');

server.on('message', (msg, rinfo) => {
  received++;

  worker.postMessage({
    id: received,
    payload: msg.toString('utf8'),
    remote: {
      address: rinfo.address,
      port: rinfo.port
    }
  });
});

server.bind(7000, () => {
  console.log('Sniffer UDP escuchando en puerto 7000');
});
```

---

## 19. Limitación de la solución simple

La solución con un único worker evita bloquear el Event Loop principal, pero tiene una limitación:

Si llegan miles de paquetes muy rápido, se enviarán demasiados trabajos al worker.

Eso puede generar:

- crecimiento descontrolado de memoria,
- cola interna demasiado grande,
- latencia de procesamiento muy alta,
- resultados atrasados,
- presión sobre el proceso.

Por eso, para una solución más profesional, conviene implementar un **worker pool** con cola limitada.

---

## 20. Solución recomendada: Worker Pool con cola acotada

Un worker pool permite tener varios workers procesando tareas en paralelo, hasta cierto límite.

Además, una cola acotada evita que el sistema consuma memoria indefinidamente.

### Arquitectura

```txt
UDP message
    │
    ▼
Main Thread
    │
    ├── si hay worker libre → asigna trabajo
    │
    ├── si no hay worker libre → manda a cola
    │
    └── si la cola está llena → descarta o registra drop
```

---

## 21. Política de descarte

En sistemas UDP de alta carga, puede ser necesario descartar paquetes cuando el sistema no puede procesarlos.

Esto no es ideal, pero es mejor que permitir que el proceso colapse.

Posibles políticas:

| Política | Descripción | Ventaja | Desventaja |
|---|---|---|---|
| Drop newest | Se descarta el paquete recién llegado si la cola está llena | Protege memoria | Puede perder evidencia nueva |
| Drop oldest | Se descarta el paquete más viejo y se guarda el nuevo | Mantiene datos recientes | Pierde histórico |
| Muestreo | Se procesa solo un porcentaje | Mantiene sistema vivo | No conserva todo |
| Priorización | Se procesan mensajes críticos primero | Útil en producción | Requiere clasificar paquetes |

Para el laboratorio, se recomienda usar `drop newest` porque es simple y protege la estabilidad.

---

## 22. Implementación con Worker Pool

### 22.1. Archivo `heavy-worker.js`

```js
const { parentPort } = require('worker_threads');

parentPort.on('message', (job) => {
  const startedAt = Date.now();

  // Simulación de validación pesada CPU-bound
  let i = 0;
  while (i < 500_000_000) {
    i++;
  }

  const finishedAt = Date.now();

  parentPort.postMessage({
    id: job.id,
    ok: true,
    bytes: job.bytes,
    durationMs: finishedAt - startedAt
  });
});
```

---

### 22.2. Archivo `server-worker-pool.js`

```js
const dgram = require('dgram');
const http = require('http');
const os = require('os');
const { Worker } = require('worker_threads');

const UDP_PORT = 7000;
const HTTP_PORT = 8080;

const WORKER_COUNT = Math.max(1, Math.min(os.cpus().length - 1, 4));
const MAX_QUEUE_SIZE = 1000;

let jobId = 0;

const metrics = {
  status: 'online',
  received: 0,
  queued: 0,
  processing: 0,
  processed: 0,
  dropped: 0,
  workerErrors: 0,
  lastProcessedDurationMs: 0,
  workers: WORKER_COUNT
};

const queue = [];
const workers = [];

function createWorker(index) {
  const worker = new Worker('./heavy-worker.js');

  const wrapper = {
    index,
    worker,
    busy: false,
    currentJob: null
  };

  worker.on('message', (result) => {
    wrapper.busy = false;
    wrapper.currentJob = null;

    metrics.processing--;
    metrics.processed++;
    metrics.lastProcessedDurationMs = result.durationMs;

    dispatch();
  });

  worker.on('error', (err) => {
    wrapper.busy = false;
    wrapper.currentJob = null;

    metrics.processing = Math.max(0, metrics.processing - 1);
    metrics.workerErrors++;

    console.error(`[WORKER ${index}] Error:`, err);
    dispatch();
  });

  worker.on('exit', (code) => {
    if (code !== 0) {
      console.error(`[WORKER ${index}] Salió con código ${code}`);
    }
  });

  return wrapper;
}

function dispatch() {
  for (const wrapper of workers) {
    if (wrapper.busy) continue;
    if (queue.length === 0) break;

    const job = queue.shift();

    wrapper.busy = true;
    wrapper.currentJob = job;

    metrics.queued = queue.length;
    metrics.processing++;

    wrapper.worker.postMessage(job);
  }
}

for (let i = 0; i < WORKER_COUNT; i++) {
  workers.push(createWorker(i + 1));
}

// Servidor HTTP de monitoreo
http.createServer((req, res) => {
  if (req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(metrics));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not_found' }));
}).listen(HTTP_PORT, () => {
  console.log(`Monitor HTTP listo en puerto ${HTTP_PORT}`);
});

// Sniffer UDP
const server = dgram.createSocket('udp4');

server.on('message', (msg, rinfo) => {
  metrics.received++;

  if (queue.length >= MAX_QUEUE_SIZE) {
    metrics.dropped++;
    return;
  }

  const job = {
    id: ++jobId,
    bytes: msg.length,
    payload: msg.toString('utf8'),
    remote: {
      address: rinfo.address,
      port: rinfo.port
    },
    receivedAt: Date.now()
  };

  queue.push(job);
  metrics.queued = queue.length;

  dispatch();
});

server.on('error', (err) => {
  console.error('[UDP ERROR]', err);
  server.close();
});

server.bind(UDP_PORT, () => {
  console.log(`Sniffer UDP escuchando en puerto ${UDP_PORT}`);
  console.log(`Workers activos: ${WORKER_COUNT}`);
  console.log(`Tamaño máximo de cola: ${MAX_QUEUE_SIZE}`);
});
```

---

## 23. Cómo ejecutar el laboratorio

### 23.1. Crear los archivos

Estructura recomendada:

```txt
clase-5-sniffer/
├── inyector.py
├── server-bloqueante.js
├── server-worker-simple.js
├── server-worker-pool.js
└── heavy-worker.js
```

---

### 23.2. Ejecutar la versión bloqueante

Terminal 1:

```bash
node server-bloqueante.js
```

Terminal 2:

```bash
python3 inyector.py
```

Terminal 3:

```bash
curl -w "\nTiempo total: %{time_total}s\n" http://localhost:8080/status
```

Resultado esperado:

- respuesta lenta,
- posible timeout,
- Event Loop bloqueado,
- poca capacidad de monitoreo.

---

### 23.3. Ejecutar la versión con workers

Terminal 1:

```bash
node server-worker-pool.js
```

Terminal 2:

```bash
python3 inyector.py
```

Terminal 3:

```bash
curl -w "\nTiempo total: %{time_total}s\n" http://localhost:8080/status
```

Resultado esperado:

- `/status` responde rápido,
- el Event Loop principal sigue activo,
- la validación pesada se procesa fuera del hilo principal,
- se registran métricas de paquetes recibidos, procesados y descartados.

---

## 24. Prueba de latencia automática

Para medir varias respuestas seguidas:

```bash
for i in {1..10}; do
  curl -s -w " | tiempo=%{time_total}s\n" http://localhost:8080/status
done
```

La consigna pide menos de 100 ms:

```txt
0.100s
```

Por lo tanto, los valores deberían ser menores a:

```txt
tiempo=0.100000s
```

---

## 25. Endpoint `/status` sugerido

La consigna mínima pide:

```json
{ "status": "online" }
```

Pero para un laboratorio más útil conviene responder métricas:

```json
{
  "status": "online",
  "received": 14200,
  "queued": 1000,
  "processing": 4,
  "processed": 87,
  "dropped": 13109,
  "workerErrors": 0,
  "lastProcessedDurationMs": 850,
  "workers": 4
}
```

Estas métricas permiten analizar:

- si el sniffer sigue vivo,
- si la cola está saturada,
- si se pierden paquetes,
- cuántos workers están activos,
- cuánto tarda la validación pesada,
- si hay errores internos.

---

## 26. Interpretación de métricas

| Métrica | Significado |
|---|---|
| `received` | Cantidad total de paquetes UDP recibidos por Node.js. |
| `queued` | Cantidad de trabajos esperando procesamiento. |
| `processing` | Cantidad de paquetes actualmente procesándose en workers. |
| `processed` | Cantidad de paquetes ya validados. |
| `dropped` | Cantidad de paquetes descartados por cola llena. |
| `workerErrors` | Errores ocurridos en los workers. |
| `lastProcessedDurationMs` | Duración del último procesamiento pesado. |
| `workers` | Cantidad de workers configurados. |

---

## 27. Por qué el endpoint puede responder rápido con workers

El endpoint `/status` responde desde el hilo principal.

Si el hilo principal no ejecuta el bucle pesado, entonces puede atender HTTP rápidamente.

Aunque los workers estén ocupados, el Event Loop principal sigue disponible.

Eso permite cumplir la métrica:

```txt
curl al puerto 8080 < 100 ms
```

---

## 28. ¿Se pierden paquetes con la solución?

Sí, todavía pueden perderse paquetes.

Esto es importante:

> Worker Threads evitan que caiga el monitoreo HTTP, pero no convierten UDP en un protocolo confiable.

UDP puede perder paquetes por:

- saturación del emisor,
- saturación del receptor,
- buffers del sistema operativo llenos,
- cola de aplicación llena,
- CPU insuficiente,
- red congestionada,
- política de descarte del servidor.

La solución mejora la resiliencia, pero no garantiza entrega total.

---

## 29. Relación con backpressure

En clases anteriores se habló de **backpressure**.

En TCP y streams, el receptor puede aplicar presión hacia atrás para evitar que el emisor lo sature.

En UDP, esto no existe de manera nativa.

Por eso, en este laboratorio se implementa una forma de backpressure a nivel de aplicación:

- cola limitada,
- workers limitados,
- contador de descartes,
- endpoint de monitoreo,
- posible política de sampling.

Esto no frena al emisor UDP, pero protege al proceso receptor.

---

## 30. Diferencia entre bloquear, diferir y paralelizar

| Técnica | Qué hace | ¿Evita el bloqueo real? |
|---|---|---|
| `while` directo | Ejecuta CPU pesado en el callback | No |
| `setTimeout` | Posterga la ejecución | No completamente |
| `setImmediate` | Mueve la ejecución a otra fase del Event Loop | No completamente |
| `Promise` | Organiza asincronía, pero no paraleliza CPU | No |
| `worker_threads` | Ejecuta CPU en otro hilo | Sí |
| `child_process` | Ejecuta CPU en otro proceso | Sí |
| Servicio externo | Delegación fuera del proceso Node.js | Sí |

---

## 31. Por qué una Promise no resuelve el problema

Una Promise no convierte código CPU-bound en paralelo.

Ejemplo incorrecto:

```js
server.on('message', async (msg) => {
  await Promise.resolve();

  let i = 0;
  while (i < 500_000_000) {
    i++;
  }
});
```

Aunque se use `async/await`, el bucle sigue ejecutándose en el hilo principal.

`async/await` sirve para esperar tareas asincrónicas, pero no para transformar una tarea pesada síncrona en no bloqueante.

---

## 32. Riesgo de crear un worker por paquete

Otra mala solución sería crear un worker nuevo por cada paquete UDP.

Ejemplo problemático:

```js
server.on('message', (msg) => {
  const worker = new Worker('./heavy-worker.js');
  worker.postMessage({ payload: msg.toString() });
});
```

Esto puede destruir el rendimiento porque crear hilos tiene costo.

Problemas:

- demasiados workers,
- consumo excesivo de RAM,
- overhead de inicialización,
- saturación del sistema operativo,
- posible crash del proceso.

Por eso se usa un **pool fijo** de workers.

---

## 33. Seguridad e integridad de evidencia

El caso habla de un sniffer de evidencia. En un escenario real, además del rendimiento, importa la integridad.

Algunos aspectos que deberían contemplarse:

- timestamp de recepción,
- IP y puerto de origen,
- hash del contenido recibido,
- firma HMAC si existe secreto compartido,
- contador de paquetes,
- detección de duplicados,
- registro append-only,
- logs resistentes a manipulación,
- almacenamiento seguro,
- rotación de archivos,
- trazabilidad de errores.

---

## 34. Ejemplo de validación HMAC real

En la clase se simula validación criptográfica con un bucle, pero en un caso real podría usarse HMAC.

Ejemplo conceptual:

```js
const crypto = require('crypto');

function verifyHmac(payload, receivedSignature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(receivedSignature, 'hex')
  );
}
```

El uso de `timingSafeEqual` ayuda a evitar comparaciones vulnerables a ataques de timing.

---

## 35. Importante: validación criptográfica también puede ser CPU-bound

Aunque Node.js tenga funciones criptográficas optimizadas, algunas operaciones pueden consumir CPU de manera significativa.

Ejemplos:

- hashing masivo,
- compresión,
- cifrado,
- derivación de claves,
- verificación de firmas,
- análisis de archivos grandes,
- procesamiento forense.

Cuando estas tareas son pesadas, conviene evaluar:

- worker threads,
- procesos separados,
- colas,
- microservicios especializados,
- procesamiento batch,
- límites de tasa,
- priorización de eventos.

---

## 36. Variante con `child_process`

Otra alternativa es usar procesos separados.

Ventajas:

- aislamiento más fuerte,
- si un proceso se cae, no necesariamente cae el principal,
- útil para tareas muy pesadas o inseguras.

Desventajas:

- mayor consumo de recursos,
- comunicación más costosa que con workers,
- más complejidad operativa.

Para este laboratorio, `worker_threads` es una solución adecuada.

---

## 37. Qué se busca aprender con el colapso

Este ejercicio está diseñado para provocar una falla controlada.

No se trata solamente de “hacer que funcione”, sino de observar qué pasa cuando una aplicación Node.js mezcla:

```txt
red + UDP + ráfagas + CPU pesada + HTTP de monitoreo
```

El resultado muestra una regla muy importante:

> El rendimiento de Node.js depende de mantener libre el hilo principal.

---

## 38. Anti-patrón principal

El anti-patrón de la clase es:

```js
server.on('message', (msg) => {
  realizarTrabajoPesadoSincronico();
});
```

Esto debe evitarse cuando el evento puede dispararse muchas veces por segundo.

---

## 39. Patrón recomendado

El patrón recomendado es:

```js
server.on('message', (msg) => {
  registrarRecepcionRapida();
  encolarTrabajo();
  delegarAWorker();
});
```

El callback de red debe ser corto y rápido.

---

## 40. Regla práctica

Una buena regla para servidores Node.js:

> Todo callback de red debe hacer lo mínimo indispensable y devolver el control al Event Loop lo antes posible.

En el contexto de este laboratorio, el callback UDP debería:

1. recibir el mensaje,
2. copiar o referenciar los datos necesarios,
3. actualizar métricas simples,
4. encolar el trabajo,
5. terminar rápidamente.

---

## 41. Diagnóstico del Event Loop bloqueado

Síntomas típicos:

- `/status` tarda mucho o da timeout,
- los logs salen de golpe y no continuamente,
- aumenta la pérdida de paquetes,
- la CPU se va al 100% en un núcleo,
- los timers se ejecutan tarde,
- el proceso parece vivo pero no responde.

---

## 42. Medición del retraso del Event Loop

Se puede medir el retraso del Event Loop con `perf_hooks`.

Ejemplo:

```js
const { monitorEventLoopDelay } = require('perf_hooks');

const histogram = monitorEventLoopDelay({ resolution: 20 });
histogram.enable();

setInterval(() => {
  console.log({
    meanMs: histogram.mean / 1e6,
    maxMs: histogram.max / 1e6
  });

  histogram.reset();
}, 1000);
```

Si el Event Loop se bloquea, `maxMs` puede crecer mucho.

---

## 43. Endpoint `/status` con latencia del Event Loop

Una mejora del endpoint sería incluir métricas del Event Loop.

Ejemplo:

```js
const { monitorEventLoopDelay } = require('perf_hooks');

const histogram = monitorEventLoopDelay({ resolution: 20 });
histogram.enable();

http.createServer((req, res) => {
  if (req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });

    res.end(JSON.stringify({
      status: 'online',
      eventLoopDelayMaxMs: histogram.max / 1e6,
      eventLoopDelayMeanMs: histogram.mean / 1e6
    }));

    histogram.reset();
    return;
  }

  res.writeHead(404);
  res.end();
}).listen(8080);
```

Esto permite detectar si el servidor está técnicamente vivo, pero internamente saturado.

---

## 44. Posible salida esperada de `/status`

Con el worker pool funcionando, una salida posible sería:

```json
{
  "status": "online",
  "received": 32000,
  "queued": 1000,
  "processing": 4,
  "processed": 96,
  "dropped": 30900,
  "workerErrors": 0,
  "lastProcessedDurationMs": 1200,
  "workers": 4
}
```

Esto muestra una realidad importante:

- el servidor sigue respondiendo,
- los workers están trabajando,
- la cola está llena,
- se están descartando paquetes,
- el sistema se mantiene estable.

---

## 45. Discusión: estabilidad vs completitud

En un sistema forense ideal, no se debería perder evidencia.

Pero si el tráfico supera la capacidad de procesamiento, hay que decidir entre:

1. intentar procesar todo y colapsar,
2. descartar controladamente y mantener monitoreo,
3. escalar horizontalmente,
4. mover el procesamiento pesado a otro sistema,
5. persistir crudo y procesar después.

La mejor arquitectura real podría ser:

```txt
UDP Receiver liviano
    ↓
Buffer o cola rápida
    ↓
Persistencia append-only
    ↓
Workers de análisis
    ↓
Almacenamiento de evidencia validada
```

---

## 46. Arquitectura forense más robusta

Una arquitectura más realista podría separar ingesta, almacenamiento y procesamiento:

```txt
┌──────────────┐
│ Emisor UDP   │
└──────┬───────┘
       │
       ▼
┌─────────────────────┐
│ Ingesta liviana      │
│ - recibe rápido      │
│ - timestamp          │
│ - guarda crudo       │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Cola / Buffer        │
│ - Redis, NATS, Kafka │
│ - archivos append    │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Procesamiento pesado │
│ - workers            │
│ - HMAC/hash          │
│ - deduplicación      │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Evidencia validada   │
└─────────────────────┘
```

---

## 47. Conclusiones principales

1. Node.js puede manejar muchas conexiones y eventos de red porque su modelo de I/O es no bloqueante.
2. Ese beneficio se pierde si el código JavaScript bloquea el hilo principal.
3. UDP es rápido, pero no ofrece garantías de entrega ni backpressure.
4. Un callback UDP con CPU pesada puede provocar pérdida de paquetes y caída del monitoreo HTTP.
5. `setTimeout`, `setImmediate`, Promises o `async/await` no solucionan por sí solos una tarea CPU-bound.
6. Para CPU-bound real, conviene usar `worker_threads`, procesos separados o servicios externos.
7. El hilo principal debe quedar reservado para coordinar I/O, métricas y monitoreo.
8. En sistemas de alta carga, una cola sin límite puede ser tan peligrosa como el bloqueo.
9. La estabilidad del sistema puede requerir descarte controlado.
10. La métrica de éxito del laboratorio es que `/status` responda en menos de 100 ms durante la ráfaga UDP.

---

## 48. Preguntas de repaso

1. ¿Por qué el servidor HTTP deja de responder si el bucle pesado está dentro del callback UDP?
2. ¿Qué diferencia hay entre una tarea I/O-bound y una tarea CPU-bound?
3. ¿Por qué `async/await` no resuelve automáticamente el bloqueo de CPU?
4. ¿Qué ventaja tienen los Worker Threads en este laboratorio?
5. ¿Por qué no conviene crear un worker nuevo por cada paquete?
6. ¿Qué ocurre con UDP cuando el receptor no puede procesar a la velocidad necesaria?
7. ¿Qué métrica permite comprobar si el Event Loop está bloqueado?
8. ¿Qué diferencia hay entre backpressure en TCP y una cola limitada en UDP?
9. ¿Qué significa que el endpoint `/status` responda rápido pero haya paquetes descartados?
10. ¿Cómo mejorarías la arquitectura para un caso forense real?

---

## 49. Actividad sugerida

Implementar tres versiones del sniffer:

### Versión 1: Bloqueante

- Procesa el bucle directamente en el callback UDP.
- Observar caída o lentitud de `/status`.

### Versión 2: Worker único

- Envía la tarea pesada a un worker.
- Observar mejora en `/status`.
- Analizar acumulación de trabajos.

### Versión 3: Worker pool con cola limitada

- Usa varios workers.
- Controla cola máxima.
- Expone métricas.
- Mantiene `/status` por debajo de 100 ms.

---

## 50. Checklist de entrega

| Ítem | Cumple |
|---|---|
| Servidor UDP escucha en puerto `7000` | ☐ |
| Servidor HTTP escucha en puerto `8080` | ☐ |
| Endpoint `/status` responde JSON válido | ☐ |
| Se simula validación pesada por paquete | ☐ |
| La validación pesada no bloquea el hilo principal | ☐ |
| Se usa `worker_threads` o arquitectura equivalente | ☐ |
| `/status` responde en menos de 100 ms bajo carga | ☐ |
| Se registran paquetes recibidos | ☐ |
| Se registran paquetes procesados | ☐ |
| Se registran paquetes descartados | ☐ |
| Se documenta la diferencia entre versión bloqueante y optimizada | ☐ |

---

## 51. Resumen final de la clase

Esta clase demuestra uno de los límites más importantes de Node.js:

> Node.js no se bloquea por esperar red o disco, pero sí se bloquea si el propio JavaScript monopoliza la CPU.

El laboratorio del Sniffer Forense muestra que la arquitectura correcta no consiste en “hacer todo dentro del callback”, sino en separar responsabilidades:

- hilo principal para I/O,
- workers para CPU,
- métricas para monitoreo,
- colas limitadas para estabilidad,
- descarte controlado cuando la carga supera la capacidad.

La enseñanza central es que una aplicación de red eficiente no depende solo del protocolo usado, sino también de cómo se organiza internamente el flujo de trabajo dentro del runtime.
