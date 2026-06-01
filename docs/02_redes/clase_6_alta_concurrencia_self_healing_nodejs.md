# Clase 6 — Arquitectura de Alta Concurrencia y Self-Healing en Node.js
## IPC, `node:cluster`, procesos Worker, graceful shutdown y el dilema del recolector de evidencia

> **Tema central de la clase:** entender cómo se diseñan sistemas Node.js capaces de soportar alta concurrencia, distribuir carga entre procesos, monitorear workers, recuperarse ante fallos y, al mismo tiempo, reconocer los límites peligrosos de la estrategia de “revivir por revivir”.
>
> **Caso práctico:** un sistema de recolección de evidencia forense que debe procesar escrituras lentas, sobrevivir a caídas de workers y analizar qué ocurre con las peticiones que quedan “en vuelo”.

---

## 1. Resumen general de la clase

La clase 6 se enfoca en **arquitectura de alta concurrencia** en Node.js. Hasta ahora se trabajó con red, UDP, TCP, streams, backpressure y bloqueo del Event Loop. En esta clase el foco se mueve hacia una pregunta de arquitectura:

> ¿Cómo hacemos para que una aplicación Node.js pueda escalar, recuperarse de fallos y mantener el servicio disponible cuando un proceso falla?

La respuesta no es simplemente “levantar otro proceso”. Eso mejora la disponibilidad, pero no garantiza la consistencia de los datos.

Esta clase trabaja tres ideas principales:

1. **Alta concurrencia:** cómo responder muchas conexiones sin bloquear el sistema.
2. **Escalabilidad en Node.js:** cómo usar procesos, workers e IPC para aprovechar varios núcleos.
3. **Self-healing con riesgo de inconsistencia:** cómo revivir procesos caídos, pero entendiendo que las peticiones en curso pueden perderse, duplicarse o quedar en estado incierto.

---

## 2. Objetivos de aprendizaje

Al finalizar esta clase deberías poder explicar y practicar:

- Qué diferencia hay entre una arquitectura basada en hilos y una basada en eventos.
- Por qué Node.js escala bien en tareas I/O-bound, pero necesita estrategias especiales para CPU-bound o alta concurrencia real.
- Qué es IPC y qué mecanismos existen para comunicar procesos.
- Para qué sirve `node:cluster`.
- Qué diferencia hay entre `cluster` y `worker_threads`.
- Cómo Node.js evita el error `EADDRINUSE` cuando varios workers atienden el mismo puerto.
- Qué significa “graceful shutdown”.
- Qué diferencia hay entre `SIGTERM`, `SIGINT` y `SIGKILL`.
- Por qué un Master puede revivir un Worker, pero no puede recuperar mágicamente una petición perdida.
- Cómo analizar los escenarios de fallo de un sistema de recolección de evidencia.
- Por qué hace falta idempotencia, persistencia intermedia o colas para garantizar consistencia.

---

## 3. Relación con las clases anteriores

| Clase | Tema | Relación con esta clase |
|---|---|---|
| Clase 1 | Node.js, Event Loop, POSIX, Buffer, endianness | Se parte del modelo interno de Node.js y del rol del sistema operativo. |
| Clase 2 | TCP, UDP, control de flujo, backpressure | Se retoma el concepto de conexiones, paquetes y pérdida de información. |
| Clase 3 | Streams, chunking, backpressure, eficiencia de datos | Se refuerza la idea de no bloquear ni cargar todo en memoria. |
| Clase 4 | UDP, RUDP, topologías, confiabilidad sobre UDP | Se conecta con la idea de agregar confiabilidad en capas superiores. |
| Clase 5 | Event Loop, CPU-bound, Worker Threads | Se profundiza en cómo proteger el hilo principal y mantener servicios vivos. |
| Clase 6 | Cluster, IPC, procesos, self-healing | Se lleva el problema a nivel de arquitectura de procesos y recuperación ante fallos. |

---

## 4. Arquitectura de alta concurrencia

La primera parte de la clase plantea un escenario de arquitectura web de alta concurrencia. Una aplicación web real no solo recibe una petición y responde. Entre el cliente y el servidor ocurren varias etapas:

1. Apertura de conexión TCP.
2. Handshake de TCP.
3. Recepción de la petición HTTP.
4. Procesamiento del servidor.
5. Respuesta HTML, JSON, CSS, JS u otro recurso.
6. Posible cierre de conexión o reutilización.

En la diapositiva inicial se muestra una línea temporal cliente-servidor donde aparece el costo de TCP y HTTP. La idea principal es que la concurrencia no depende solamente del lenguaje, sino de toda la cadena:

- red,
- kernel,
- sockets,
- proceso servidor,
- cola de eventos,
- CPU,
- memoria,
- modelo de ejecución,
- y estrategia de escalado.

En alta concurrencia, el problema no es únicamente “atender una petición”, sino atender muchas sin que el sistema se quede sin recursos.

---

## 5. Modelos mentales de arquitectura web

La clase compara dos grandes modelos de arquitectura para servidores web:

1. Arquitectura basada en hilos.
2. Arquitectura basada en eventos.

---

## 6. Arquitectura basada en hilos

En una arquitectura basada en hilos, el servidor suele asignar un hilo, proceso o unidad de ejecución por conexión o por petición.

### Características

- Cada conexión puede ocupar un hilo.
- El sistema operativo debe alternar entre hilos mediante cambio de contexto.
- Cada hilo consume memoria.
- Es fácil de razonar porque el flujo parece secuencial.
- Bajo mucha concurrencia, puede volverse costosa.

### Problema principal

Cuando llegan miles de conexiones, el servidor puede terminar con miles de hilos o procesos. Esto genera:

- alto consumo de RAM,
- alto costo de scheduling,
- cambios de contexto frecuentes,
- más presión sobre el sistema operativo,
- menor eficiencia cuando muchas conexiones están esperando I/O.

### Ejemplos mencionados en la clase

- Apache en configuraciones tradicionales.
- Modelos de servidor donde cada conexión consume una unidad pesada de ejecución.

---

## 7. Arquitectura basada en eventos

En una arquitectura basada en eventos, un hilo principal maneja eventos y delega operaciones de entrada/salida al sistema operativo.

### Características

- Un proceso puede atender muchas conexiones.
- No necesita un hilo por conexión.
- Usa una cola de eventos.
- El Event Loop despacha callbacks cuando hay trabajo listo.
- Es muy eficiente en memoria para cargas I/O-bound.
- Puede degradarse si el código bloquea la CPU.

### Ejemplos mencionados en la clase

- Nginx.
- Node.js.

### Ventaja principal

Este modelo es ideal cuando el servidor pasa mucho tiempo esperando:

- red,
- disco,
- base de datos,
- respuestas externas,
- sockets,
- archivos,
- colas.

Mientras una operación espera, el Event Loop puede seguir atendiendo otras conexiones.

### Riesgo principal

Si una petición ejecuta una tarea CPU-bound muy pesada dentro del hilo principal, bloquea el Event Loop y perjudica a todas las conexiones del proceso.

Por eso, Node.js es muy fuerte en I/O no bloqueante, pero no se debe usar el hilo principal para cálculos largos, compresión pesada, hash masivo o procesamiento criptográfico intensivo.

---

## 8. El dilema I/O vs CPU

Una conclusión importante de la clase es:

> Node.js no es lento por ser Node.js. Node.js se vuelve vulnerable cuando se usa mal su modelo de ejecución.

| Tipo de carga | Ejemplos | Node.js en hilo principal |
|---|---|---|
| I/O-bound | HTTP, DB, archivos, sockets | Muy eficiente si se usa asincronía. |
| CPU-bound | Fibonacci pesado, cifrado masivo, compresión, parsing enorme | Puede bloquear el Event Loop. |
| Alta concurrencia I/O | APIs, microservicios, proxies, gateway | Muy buen caso de uso. |
| Alta concurrencia con CPU pesada | procesamiento forense, hashes, IA local, compresión grande | Requiere workers, procesos o servicios separados. |

---

## 9. IPC: comunicación entre procesos

La clase introduce una matriz diagnóstica de mecanismos **IPC**.

IPC significa **Inter-Process Communication**, es decir, comunicación entre procesos independientes.

Esto es necesario porque, cuando se escala una aplicación usando múltiples procesos, esos procesos no comparten automáticamente memoria ni estado.

Un proceso Worker puede necesitar comunicarse con:

- el proceso Master,
- otros Workers,
- un proceso de logging,
- un balanceador,
- un supervisor,
- una cola,
- un servicio de métricas,
- o un proceso encargado de persistir evidencia.

---

## 10. Mecanismos IPC vistos en clase

### 10.1. Unix Domain Sockets

Son sockets locales del sistema operativo.

Características:

- Comunicación bidireccional.
- Funcionan dentro de la misma máquina.
- Usan buffers locales del sistema operativo.
- Son más eficientes que TCP para comunicación local.
- Se pueden usar para que procesos locales intercambien mensajes.

Ejemplo conceptual:

```txt
Proceso A <==== socket local ====> Proceso B
```

---

### 10.2. Message Queues

Las colas de mensajes permiten comunicación asincrónica.

Características:

- Un proceso publica mensajes.
- Otro proceso los consume.
- Ayudan a desacoplar productor y consumidor.
- Pueden permitir recuperación si la cola es persistente.
- Son útiles cuando no queremos perder trabajo si un worker cae.

Ejemplo conceptual:

```txt
Worker HTTP -> Cola de evidencia -> Worker de persistencia
```

Este modelo sería muy importante para mejorar el ejercicio de la clase, porque evita que una petición dependa exclusivamente de la vida del proceso que la recibió.

---

### 10.3. Pipes

Los pipes son tuberías de bytes.

Características:

- Comunicación unidireccional.
- Modelo FIFO.
- Un proceso escribe y otro lee.
- Se usan mucho en sistemas Unix.
- Son útiles para flujos simples de datos.

Ejemplo:

```bash
cat archivo.log | grep ERROR
```

En ese comando, la salida de `cat` fluye hacia la entrada de `grep`.

---

### 10.4. Signals

Las señales son notificaciones del sistema operativo hacia procesos.

Ejemplos:

| Señal | Significado general |
|---|---|
| `SIGINT` | Interrupción desde teclado, normalmente `Ctrl + C`. |
| `SIGTERM` | Pedido amable de terminación. Permite cleanup. |
| `SIGKILL` | Terminación forzada. No permite cleanup. |
| `SIGUSR1` / `SIGUSR2` | Señales definidas para usos personalizados o herramientas. |

La clase usa señales para explicar la diferencia entre un apagado ordenado y una muerte abrupta.

---

### 10.5. Shared Memory

La memoria compartida permite que dos o más procesos o hilos accedan a una misma región de memoria.

Características:

- Puede ser muy rápida.
- Requiere sincronización cuidadosa.
- Si se usa mal, puede generar condiciones de carrera.
- En Node.js aparece especialmente con `worker_threads` y `SharedArrayBuffer`.

Ejemplo conceptual:

```txt
Thread A ----\
              > SharedArrayBuffer
Thread B ----/
```

---

## 11. Escalabilidad nativa en Node.js

La clase presenta dos herramientas nativas importantes para sortear la restricción del “monohilo”:

1. `node:cluster`
2. `worker_threads`

Aunque ambas sirven para escalar, no resuelven el mismo problema.

---

## 12. `node:cluster`

`cluster` permite crear varios procesos Node.js que pueden compartir un mismo puerto de servidor.

### Modelo

```txt
Primary / Master Process
        |
        |-- Worker Process 1
        |-- Worker Process 2
        |-- Worker Process 3
        |-- Worker Process N
```

Cada Worker es un proceso independiente.

### Características

- Multi-proceso.
- Cada proceso tiene su propio Event Loop.
- Cada proceso tiene su propio heap de V8.
- El fallo de un Worker no necesariamente mata a los demás.
- Puede aprovechar varios núcleos de CPU.
- Es útil para APIs HTTP sin estado.
- Permite balanceo interno de conexiones.

### Ventajas

- Aislamiento fuerte.
- Si un Worker colapsa, el Master puede levantar otro.
- Mejora throughput frente a un proceso único.
- Permite explotar varios núcleos.

### Desventajas

- Mayor consumo de memoria.
- Cada Worker duplica parte de la aplicación.
- El estado en memoria no se comparte.
- Si una petición estaba en un Worker que muere, se pierde esa ejecución.
- No resuelve por sí solo la consistencia de datos.

---

## 13. `worker_threads`

`worker_threads` permite crear hilos dentro del mismo proceso Node.js.

### Modelo

```txt
Proceso Node.js
   |
   |-- Main Thread
   |-- Worker Thread 1
   |-- Worker Thread 2
   |-- Worker Thread N
```

### Características

- Multi-hilo dentro del mismo proceso.
- Menor costo que levantar procesos completos.
- Se puede compartir memoria con `SharedArrayBuffer`.
- Útil para tareas CPU-intensive.
- No está pensado principalmente para balancear conexiones HTTP.

### Casos ideales

- Hashing intensivo.
- Compresión.
- Cifrado.
- Procesamiento de imágenes.
- Parsing pesado.
- Validaciones criptográficas.
- Trabajo matemático costoso.

---

## 14. Comparación: `cluster` vs `worker_threads`

| Criterio | `node:cluster` | `worker_threads` |
|---|---|---|
| Unidad de ejecución | Proceso | Hilo |
| Memoria | Separada por proceso | Puede compartir memoria |
| Aislamiento ante fallo | Alto | Menor que procesos separados |
| Uso ideal | Escalar servidores HTTP | CPU-bound dentro de una app |
| Puerto HTTP compartido | Sí, mediante cluster | No es su objetivo principal |
| Consumo de RAM | Alto | Más bajo |
| Comunicación | IPC entre procesos | Mensajes entre hilos / memoria compartida |
| Riesgo | duplicación de memoria | condiciones de carrera si se comparte memoria |

---

## 15. ¿Por qué no aparece `EADDRINUSE` con `cluster`?

El error `EADDRINUSE` aparece cuando dos procesos intentan escuchar el mismo puerto TCP directamente.

Ejemplo problemático:

```js
http.createServer(app).listen(3000);
```

Si dos procesos independientes ejecutan eso al mismo tiempo, ambos intentan tomar el puerto `3000`. El segundo puede fallar con:

```txt
Error: listen EADDRINUSE: address already in use :::3000
```

Pero `cluster` evita esto con una arquitectura especial.

---

## 16. Anatomía del manejo de puerto en `cluster`

En el modelo de `cluster`:

1. El proceso Primary/Master se vincula al puerto real.
2. Los Workers no toman el puerto directamente como procesos totalmente independientes.
3. El Master distribuye conexiones entrantes hacia los Workers.
4. La comunicación se realiza mediante IPC.
5. El sistema puede usar una estrategia de balanceo como Round-Robin.

Representación conceptual:

```txt
Cliente HTTP
    |
    v
Puerto 8090
    |
    v
Primary Process
    |
    |--- Worker 1
    |--- Worker 2
    |--- Worker 3
    |--- Worker 4
```

Esto permite que varios Workers atiendan el mismo servicio sin chocar por el puerto.

---

## 17. Selección de herramientas operativas

La clase incluye un flujograma para decidir qué herramienta usar según el entorno.

### 17.1. Desarrollo local

Para desarrollo local se suelen usar herramientas de reinicio automático:

```bash
node --watch server.js
```

O herramientas como:

```bash
tsx watch
```

Objetivo:

- reiniciar al cambiar archivos,
- mejorar velocidad de desarrollo,
- no resolver necesariamente alta disponibilidad real.

---

### 17.2. Contenedores: Docker / Kubernetes

En contenedores se recomienda no duplicar responsabilidades.

Si Kubernetes ya gestiona:

- reinicios,
- health checks,
- escalado,
- réplicas,
- balanceo,
- lifecycle,

entonces muchas veces alcanza con ejecutar Node.js de forma simple dentro del contenedor.

Ejemplo:

```bash
node server.js
```

La orquestación queda en manos de Kubernetes.

---

### 17.3. Servidor físico o VPS

En un VPS o servidor físico sin Kubernetes, se puede necesitar una herramienta de gestión de procesos.

Opciones:

| Necesidad | Herramienta posible |
|---|---|
| Reinicios automáticos, logs, clustering fácil | PM2 |
| Control manual con pocas dependencias | `node:cluster` + `systemd` |
| Desarrollo local | `node --watch` / `tsx watch` |
| Orquestación de contenedores | Kubernetes / Docker runtime |

---

## 18. Graceful Shutdown

Un punto central de la clase es la diferencia entre apagar bien y matar abruptamente.

**Graceful shutdown** significa apagar un servicio de forma ordenada.

El objetivo es:

1. Dejar de aceptar nuevas conexiones.
2. Terminar las peticiones en curso.
3. Cerrar conexiones a base de datos.
4. Liberar recursos.
5. Salir voluntariamente con `process.exit(0)`.

---

## 19. Secuencia típica de apagado elegante

La clase muestra una cronología aproximada:

```txt
t = 0 ms      llega SIGINT o SIGTERM
t = 10 ms     process.on(...) intercepta la señal
t = 10-1500   se drenan peticiones en curso
t = 1500 ms   cierre seguro con process.exit(0)
```

En Node.js, esto suele implementarse con:

```js
const server = http.createServer(app);

process.on('SIGTERM', () => {
  console.log('Cerrando servidor...');

  server.close(() => {
    console.log('Conexiones cerradas. Saliendo.');
    process.exit(0);
  });
});
```

`server.close()` deja de aceptar nuevas conexiones y espera a que las conexiones existentes finalicen.

---

## 20. Muerte súbita: `SIGKILL`

`SIGKILL` es distinto.

Si se ejecuta:

```bash
kill -9 <PID>
```

el proceso muere inmediatamente.

No tiene oportunidad de:

- ejecutar `finally`,
- cerrar archivos,
- responder peticiones,
- enviar logs pendientes,
- terminar escrituras,
- confirmar transacciones,
- cerrar DB,
- liberar recursos de forma ordenada.

En el contexto de la clase, esto es clave:

> Si matás un Worker con `kill -9`, las peticiones que ese Worker estaba procesando pueden quedar destruidas en vuelo.

---

## 21. Comparativa de servidores web

La clase compara distintas arquitecturas:

### 21.1. Nginx + PHP-FPM

- Arquitectura basada en eventos.
- Muy eficiente para servir contenido estático.
- Modelo Master-Worker.
- Delega procesamiento PHP a PHP-FPM.
- Muy usado en producción.

### 21.2. Apache + PHP-FPM

- Arquitectura híbrida.
- Puede usar procesos o hilos.
- Muy compatible.
- Flexible con módulos dinámicos.
- Puede tener mayor costo bajo concurrencia extrema.

### 21.3. Go HTTP Server

- Modelo multi-hilo virtual.
- Goroutines muy livianas.
- Muy fuerte en concurrencia y CPU.
- Buen rendimiento en pruebas computacionales.
- Menor huella de memoria relativa.

### 21.4. Node.js + Cluster

- Event Loop en cada Worker.
- Un hilo principal por proceso Worker.
- Expansión mediante procesos hijos.
- I/O no bloqueante impulsado por V8/libuv.
- Muy fuerte en APIs asincrónicas.
- Penalización de memoria al escalar por procesos.

---

## 22. Throughput bajo estrés de CPU

La clase presenta una prueba bajo estrés computacional, usando Fibonacci como carga pesada.

La conclusión conceptual es:

- Go domina en cargas CPU-bound por su modelo de goroutines y ejecución eficiente.
- Node.js mejora con `cluster`, pero el escalado por procesos tiene costo de memoria.
- Apache/Nginx con PHP pueden degradarse cuando el backend PHP llega a límites computacionales.

El dato importante no es memorizar números exactos, sino entender el patrón:

> Si la carga es CPU-bound, Node.js necesita paralelizar con procesos, workers o delegar el trabajo a otro servicio.

---

## 23. Costo de escalar: eficiencia vs memoria

Node.js escala procesos con `cluster`, pero cada Worker carga su propia instancia de la aplicación.

Eso implica:

- heap separado,
- módulos cargados por proceso,
- conexiones propias si no se administran bien,
- cachés duplicadas,
- más consumo de RAM.

La clase lo presenta como una penalización:

> Escalar Node.js por procesos puede multiplicar la memoria consumida por cada núcleo lógico utilizado.

Esto no significa que `cluster` sea malo. Significa que hay que saber cuándo usarlo.

---

## 24. Prueba I/O con base de datos

En operaciones I/O-bound, la diferencia entre servidores puede reducirse, porque todos terminan esperando a la base de datos, la red o el disco.

La clase remarca que Node.js puede tener muy buena latencia promedio porque su modelo no bloqueante permite esperar muchas operaciones simultáneamente sin congelar el proceso.

Esto refuerza una idea central:

| Tipo de prueba | Arquitectura que suele destacarse |
|---|---|
| CPU pura | Go o sistemas multi-hilo eficientes |
| I/O asincrónico | Node.js, Nginx, arquitecturas event-driven |
| Contenido estático | Nginx |
| Compatibilidad amplia | Apache/PHP |
| APIs rápidas sin estado | Node.js + cluster puede ser muy efectivo |

---

## 25. Síntesis: el trade-off arquitectónico

No existe una arquitectura perfecta.

Cada opción elige un compromiso distinto:

| Arquitectura | Fortaleza | Precio |
|---|---|---|
| Go | Concurrencia masiva, CPU, eficiencia RAM | Curva de aprendizaje, stack distinto, menos directo para ciertos equipos JS. |
| Node.js | I/O rápido, APIs, ecosistema npm, baja latencia en operaciones asincrónicas | Riesgo de bloquear Event Loop, alto costo de RAM al escalar por procesos. |
| Nginx/Apache + PHP | Ecosistema probado, compatibilidad, despliegue tradicional | Puede degradarse bajo alta concurrencia si el backend bloquea. |

La idea final de la parte teórica es:

> La selección del servidor y del modelo de concurrencia define los cuellos de botella futuros del sistema.

---

# Parte práctica — Ejercicio de clase

## 26. Nombre del ejercicio

> **El Dilema del Recolector de Evidencia**

---

## 27. Objetivo del ejercicio

El objetivo es lograr que el sistema sea capaz de recuperarse de un fallo, pero identificando por qué una estrategia de “revivir por revivir” puede generar:

- inconsistencia de datos,
- pérdida de información en vuelo,
- respuestas ambiguas para el cliente,
- duplicación de evidencia,
- escrituras incompletas,
- y falsa sensación de disponibilidad.

La idea clave es:

> Que el Master levante un nuevo Worker no significa que la operación que estaba ejecutando el Worker muerto se haya completado correctamente.

---

## 28. Punto de partida del laboratorio

El archivo comprimido de la clase contiene una carpeta con tres archivos principales:

```txt
1.SelfHealing/
├── Readme.md
├── server.js
└── stressTest.py
```

El ejemplo base implementa:

- un proceso Master,
- múltiples Workers usando `cluster`,
- telemetría por PID,
- conteo de requests por Worker,
- reinicio automático cuando un Worker muere,
- y un cliente Python para hacer stress test.

---

## 29. Análisis del `server.js` base

El servidor base usa estos módulos:

```js
const cluster = require('cluster');
const http = require('http');
const os = require('os');
```

### 29.1. Rol del Master

El Master ejecuta esta lógica:

1. Detecta la cantidad de CPUs disponibles.
2. Crea un Map llamado `workerStats`.
3. Lanza un Worker por núcleo.
4. Escucha mensajes de telemetría enviados por Workers.
5. Imprime una tabla de estado del cluster.
6. Detecta cuando un Worker muere.
7. Elimina sus estadísticas.
8. Lanza un Worker nuevo.

Conceptualmente:

```txt
Master
  ├── Worker PID 1001
  ├── Worker PID 1002
  ├── Worker PID 1003
  └── Worker PID 1004
```

Si un Worker cae:

```txt
Worker PID 1002 muere
Master detecta exit
Master borra PID 1002 del mapa
Master crea Worker PID 1010
```

---

### 29.2. Telemetría con `process.send()`

Cada Worker envía un mensaje al Master:

```js
process.send({ type: 'HEARTBEAT' });
```

El Master escucha:

```js
worker.on('message', (msg) => {
  if (msg.type === 'HEARTBEAT') {
    const stats = workerStats.get(worker.process.pid);
    if (stats) stats.requests++;
  }
});
```

Esto muestra un uso básico de IPC:

```txt
Worker -> process.send() -> Master
```

No se comparte memoria. Se envían mensajes.

---

### 29.3. Reinicio automático

El Master escucha el evento `exit`:

```js
cluster.on('exit', (worker, code, signal) => {
  console.error(`[ALERTA] Worker ${worker.process.pid} colapsó. Código: ${code} | Señal: ${signal}`);
  workerStats.delete(worker.process.pid);
  spawnWorker();
});
```

Esto implementa la estrategia **self-healing**.

El sistema intenta mantener la cantidad de Workers aunque alguno colapse.

---

## 30. Qué demuestra el ejemplo base

El ejemplo base demuestra tres cosas:

### 30.1. Observabilidad real

El Master no está completamente “ciego”. Tiene un `Map` donde rastrea:

- PID del Worker,
- cantidad de requests,
- tiempo de vida,
- estado estimado.

Esto se parece a lo que hacen herramientas de orquestación o monitoreo, aunque de forma mucho más simple.

---

### 30.2. Manejo del ciclo de vida

Cuando un Worker cae, el Master detecta la caída y crea otro.

Esto permite que el servicio general siga vivo.

Pero hay una aclaración clave:

> El servicio general puede seguir vivo aunque una petición individual se haya perdido.

---

### 30.3. Round-Robin visible

Al correr el cliente Python de stress test, las requests se distribuyen entre Workers.

La tabla del Master permite ver cómo suben los contadores por PID.

Esto ayuda a visualizar el balanceo de carga interno de `cluster`.

---

## 31. Cliente de stress test base

El archivo `stressTest.py` realiza múltiples peticiones concurrentes al servidor.

Parámetros relevantes:

```python
URL = "http://localhost:8090"
THREADS = 10
DURATION = 30
```

Esto simula 10 usuarios concurrentes durante 30 segundos.

Cada hilo cuenta:

- respuestas exitosas,
- errores,
- timeouts,
- o fallos de conexión.

---

## 32. El desafío de la clase

La consigna pide modificar el Worker para crear una nueva ruta:

```http
GET /escribir-evidencia
```

Al recibir esa petición, el Worker debe simular una escritura forense que tarda 3 segundos.

La escritura se simula con:

```js
setTimeout(() => {
  // escritura simulada
}, 3000);
```

Luego se agrega una trampa:

> Hay un 50% de probabilidad de que, justo al terminar la escritura, el proceso ejecute `process.exit(1)`.

Esto simula un crash post-escritura.

---

## 33. Por qué este ejercicio es importante

El ejercicio no busca solamente que el sistema reviva Workers.

Busca que se observe esta contradicción:

```txt
El Master puede revivir el Worker.
Pero el Master no sabe qué estaba haciendo el Worker cuando murió.
```

Si el Worker estaba procesando una escritura de evidencia, pueden pasar varias cosas:

| Momento del fallo | Resultado posible |
|---|---|
| Antes de escribir | La evidencia se pierde. |
| Durante la escritura | La evidencia puede quedar incompleta o corrupta. |
| Después de escribir pero antes de responder | La evidencia existe, pero el cliente cree que falló. |
| Después de responder | El cliente cree que salió bien, pero el Worker murió igual. |
| Durante un `kill -9` | No hay cleanup, no hay respuesta garantizada. |

Este es el verdadero dilema.

---

## 34. Versión modificada del servidor para el ejercicio

A continuación se muestra una versión del `server.js` adaptada al desafío.

Esta versión:

- usa `cluster`,
- crea Workers,
- mantiene telemetría,
- expone `/status`,
- expone `/escribir-evidencia`,
- simula una escritura de 3 segundos,
- escribe una línea en un archivo local,
- y tiene un 50% de probabilidad de morir después de escribir pero antes de responder.

```js
const cluster = require('cluster');
const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');

const PORT = 8090;
const EVIDENCE_LOG = path.join(__dirname, 'evidencias.log');

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  const workerStats = new Map();

  console.log(`[MASTER] PID: ${process.pid} | Iniciando orquestación en ${numCPUs} núcleos...`);

  for (let i = 0; i < numCPUs; i++) {
    spawnWorker();
  }

  function spawnWorker() {
    const worker = cluster.fork();

    workerStats.set(worker.process.pid, {
      requests: 0,
      evidenceRequests: 0,
      startTime: Date.now()
    });

    worker.on('message', (msg) => {
      const stats = workerStats.get(worker.process.pid);
      if (!stats) return;

      if (msg.type === 'HEARTBEAT') {
        stats.requests++;
      }

      if (msg.type === 'EVIDENCE_START') {
        stats.evidenceRequests++;
      }
    });
  }

  setInterval(() => {
    console.clear();
    console.log(`=== CLUSTER TELEMETRY PANEL - ${new Date().toLocaleTimeString()} ===`);
    console.table(Array.from(workerStats.entries()).map(([pid, data]) => ({
      PID: pid,
      'Total Req': data.requests,
      'Evidence Req': data.evidenceRequests,
      Uptime: `${Math.floor((Date.now() - data.startTime) / 1000)}s`,
      Status: 'HEALTHY'
    })));
  }, 5000);

  cluster.on('exit', (worker, code, signal) => {
    console.error(`[ALERTA] Worker ${worker.process.pid} colapsó. Código: ${code} | Señal: ${signal}`);
    workerStats.delete(worker.process.pid);
    spawnWorker();
  });

} else {
  const server = http.createServer((req, res) => {
    process.send?.({ type: 'HEARTBEAT' });

    if (req.url === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'online',
        processedBy: process.pid,
        timestamp: Date.now()
      }));
      return;
    }

    if (req.url === '/escribir-evidencia') {
      const evidenceId = `${Date.now()}-${process.pid}-${Math.random().toString(16).slice(2)}`;

      process.send?.({ type: 'EVIDENCE_START' });

      console.log(`[WORKER ${process.pid}] Iniciando escritura de evidencia ${evidenceId}...`);

      setTimeout(() => {
        const line = JSON.stringify({
          evidenceId,
          workerPid: process.pid,
          writtenAt: new Date().toISOString(),
          status: 'EVIDENCE_WRITTEN'
        }) + '\n';

        fs.appendFileSync(EVIDENCE_LOG, line);

        console.log(`[WORKER ${process.pid}] Escritura finalizada para evidencia ${evidenceId}`);

        const shouldCrash = Math.random() < 0.5;

        if (shouldCrash) {
          console.error(`[WORKER ${process.pid}] Crash post-escritura. El cliente todavía no recibió respuesta.`);
          process.exit(1);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'evidence_written',
          evidenceId,
          processedBy: process.pid
        }));
      }, 3000);

      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not_found' }));
  });

  server.listen(PORT, () => {
    console.log(`[WORKER ${process.pid}] Servidor HTTP escuchando en puerto ${PORT}`);
  });
}
```

---

## 35. Qué observar al ejecutar esta versión

Al hacer:

```bash
node server.js
```

El Master inicia varios Workers.

Luego, en otra terminal:

```bash
curl -i http://localhost:8090/status
```

Debería responder rápidamente:

```json
{
  "status": "online",
  "processedBy": 12345,
  "timestamp": 1710000000000
}
```

Luego probamos la escritura:

```bash
curl -i http://localhost:8090/escribir-evidencia
```

Pueden ocurrir dos resultados.

---

## 36. Resultado posible 1: escritura exitosa con respuesta

Si el Worker no crashea, luego de 3 segundos el cliente recibe algo como:

```json
{
  "status": "evidence_written",
  "evidenceId": "1710000000000-12345-a1b2c3",
  "processedBy": 12345
}
```

El archivo `evidencias.log` tendrá una línea nueva.

---

## 37. Resultado posible 2: escritura realizada, pero cliente recibe error

Si el Worker crashea después de escribir pero antes de responder, el archivo puede tener la evidencia, pero el cliente puede recibir:

```txt
curl: (52) Empty reply from server
```

O:

```txt
curl: (56) Recv failure: Connection reset by peer
```

O un timeout, según el momento exacto y el sistema operativo.

Este es el punto más importante:

> El cliente no puede saber si la evidencia se escribió o no solamente mirando la respuesta HTTP, porque el proceso murió antes de confirmar.

---

## 38. Escenario A de investigación

### Pregunta

> Si el Worker muere mientras está procesando la petición, antes de los 3 segundos, ¿qué recibe el cliente?

### Respuesta esperada

El cliente normalmente recibe un error de conexión, una respuesta vacía o un timeout.

Posibles resultados:

```txt
Empty reply from server
Connection reset by peer
Socket hang up
Timeout
```

### Explicación técnica

La petición HTTP estaba siendo procesada por un Worker específico.

Si ese Worker muere antes de terminar:

1. El socket asociado a esa petición se corta.
2. El callback pendiente se pierde.
3. El `setTimeout` pendiente se pierde.
4. El Master detecta la muerte del Worker.
5. El Master crea un nuevo Worker.
6. El nuevo Worker no continúa la petición anterior.

Representación:

```txt
Cliente ---> Worker 1234 procesa /escribir-evidencia
                    |
                    | Worker muere
                    v
Cliente <--- error / timeout / conexión cerrada

Master ---> crea Worker 5678

Pero Worker 5678 no sabe nada de la petición anterior.
```

### Conclusión del escenario A

El self-healing recupera capacidad de servicio, pero no recupera el trabajo en curso.

---

## 39. Escenario B de investigación

### Pregunta

> Si el Master detecta que un Worker está consumiendo demasiada CPU y se lo mata manualmente con `kill -9`, ¿qué pasa con las peticiones que estaban a mitad de camino?

### Respuesta esperada

Las peticiones a mitad de camino se pierden o quedan en estado indeterminado.

El cliente puede recibir:

```txt
Connection reset by peer
Empty reply from server
Timeout
```

### Explicación técnica

`kill -9` envía `SIGKILL`.

`SIGKILL` no puede ser interceptada por el proceso.

Por lo tanto, el Worker no puede:

- terminar la escritura,
- responder al cliente,
- limpiar recursos,
- cerrar archivos,
- avisar al Master qué estaba haciendo,
- marcar una operación como abortada,
- hacer rollback,
- ni ejecutar un graceful shutdown.

El Master sí puede detectar que el Worker murió y levantar otro, pero eso solo restaura capacidad futura.

No restaura las peticiones destruidas.

---

## 40. Diferencia entre caída antes y después de la escritura

Este ejercicio enseña una diferencia crítica:

| Caso | Archivo de evidencia | Respuesta al cliente | Estado real |
|---|---|---|---|
| Worker muere antes del `setTimeout` | No se escribe | Error / timeout | Evidencia perdida |
| Worker muere durante escritura real | Puede quedar parcial | Error / timeout | Estado corrupto o incierto |
| Worker muere después de escribir pero antes de responder | Sí se escribe | Error / timeout | Evidencia escrita, cliente cree que falló |
| Worker responde y luego muere | Sí se escribe | Éxito | Operación completa, pero Worker cae |

La situación más peligrosa es:

```txt
La evidencia se escribió, pero el cliente no recibió confirmación.
```

Porque si el cliente reintenta, puede duplicar la evidencia.

---

## 41. El problema de la duplicación

Supongamos que el cliente llama:

```http
GET /escribir-evidencia
```

El Worker escribe en `evidencias.log`, pero muere antes de responder.

El cliente ve error y reintenta.

El nuevo Worker recibe otra petición y vuelve a escribir.

Resultado:

```txt
evidencias.log
----------------
EVIDENCIA 123 escrita por Worker 1001
EVIDENCIA 123 escrita por Worker 1008
```

Si no hay un ID único de operación, el sistema no puede saber que ambas escrituras corresponden al mismo intento lógico.

---

## 42. Idempotencia

Para resolver la duplicación se necesita idempotencia.

Una operación idempotente es una operación que puede repetirse sin cambiar el resultado más de una vez.

Ejemplo conceptual:

```http
POST /escribir-evidencia
Idempotency-Key: evidencia-abc-123
```

El servidor debería registrar:

```txt
evidencia-abc-123 -> completada
```

Si el cliente reintenta con la misma clave, el servidor no vuelve a duplicar el trabajo.

Devuelve el resultado ya conocido.

---

## 43. Por qué `GET /escribir-evidencia` es didáctico pero no ideal

En el ejercicio se propone una ruta:

```http
/escribir-evidencia
```

Para probar fácilmente con navegador o `curl`.

Pero desde el punto de vista HTTP, una escritura debería ser normalmente:

```http
POST /evidencias
```

Porque `GET` debería ser seguro y no modificar estado.

Para una API real se recomendaría:

```http
POST /evidencias
Content-Type: application/json
Idempotency-Key: <uuid>
```

---

## 44. Diseño más seguro para evidencia forense

Para un sistema real, no conviene que el Worker HTTP haga todo directamente.

Una arquitectura más segura sería:

```txt
Cliente
  |
  v
API HTTP Worker
  |
  v
Cola persistente / Write-Ahead Log
  |
  v
Worker de persistencia
  |
  v
Almacenamiento durable
```

El Worker HTTP debería confirmar solo cuando la evidencia quedó registrada de forma durable, o devolver un estado `202 Accepted` indicando que la operación fue aceptada para procesamiento.

---

## 45. Patrón 1: Write-Ahead Log

Un **Write-Ahead Log** consiste en registrar la intención de operación antes de ejecutarla completamente.

Flujo:

```txt
1. Recibo petición.
2. Registro en WAL: operación pendiente.
3. Ejecuto escritura real.
4. Marco operación como completada.
5. Respondo al cliente.
```

Si el Worker muere, al reiniciar se puede revisar el WAL:

- operaciones pendientes,
- operaciones completadas,
- operaciones inciertas,
- operaciones para reintentar.

---

## 46. Patrón 2: archivo temporal + rename atómico

Para evitar archivos corruptos, se puede escribir primero en un archivo temporal:

```txt
evidencia-123.tmp
```

Y cuando la escritura termina correctamente, renombrar:

```txt
evidencia-123.final
```

En muchos sistemas de archivos, el `rename` dentro del mismo filesystem es atómico.

Flujo:

```txt
1. Escribir evidencia-123.tmp
2. fsync si corresponde
3. rename evidencia-123.tmp -> evidencia-123.final
4. responder éxito
```

Si el proceso muere, se pueden detectar `.tmp` incompletos.

---

## 47. Patrón 3: cola persistente

Una cola persistente permite desacoplar la recepción HTTP de la escritura final.

Flujo:

```txt
Cliente -> API -> Cola persistente -> Worker escritor -> Archivo/DB
```

Ventajas:

- Si el Worker HTTP muere, la operación ya puede estar en cola.
- Si el Worker escritor muere, otro puede continuar.
- Se puede reintentar.
- Se puede deduplicar.
- Se puede observar el estado.

Ejemplos de tecnologías posibles:

- Redis Streams,
- RabbitMQ,
- Kafka,
- NATS JetStream,
- PostgreSQL como cola simple,
- SQLite con tabla de jobs,
- archivos de spool.

---

## 48. Patrón 4: estados explícitos

La evidencia debería tener estados.

Ejemplo:

| Estado | Significado |
|---|---|
| `RECEIVED` | La petición llegó al sistema. |
| `QUEUED` | La operación fue puesta en cola. |
| `WRITING` | Se está escribiendo evidencia. |
| `WRITTEN` | Escritura completada. |
| `ACKED` | Cliente recibió confirmación. |
| `FAILED` | Fallo definitivo. |
| `UNKNOWN` | Estado incierto tras caída. |

Esto permite auditoría posterior.

---

## 49. Patrón 5: ACK después de persistencia durable

El sistema debe definir cuándo responde éxito.

Mala práctica:

```txt
Responder éxito apenas empieza la escritura.
```

Mejor práctica:

```txt
Responder éxito cuando la evidencia fue persistida de forma durable.
```

O responder:

```http
202 Accepted
```

Cuando solamente se aceptó el trabajo para procesamiento posterior.

---

## 50. Experimentos recomendados

### 50.1. Ejecutar servidor

```bash
node server.js
```

---

### 50.2. Probar status

```bash
curl -i http://localhost:8090/status
```

---

### 50.3. Probar escritura de evidencia

```bash
curl -i http://localhost:8090/escribir-evidencia
```

Repetir varias veces.

Observar:

- algunas respuestas exitosas,
- algunos errores,
- reinicio de Workers,
- cambios de PID,
- líneas en `evidencias.log`.

---

### 50.4. Ver archivo de evidencia

```bash
cat evidencias.log
```

O en tiempo real:

```bash
tail -f evidencias.log
```

---

### 50.5. Identificar PIDs

En la consola del Master se muestran los PIDs.

También se puede usar:

```bash
ps aux | grep node
```

---

### 50.6. Matar un Worker con `kill -9`

```bash
kill -9 <PID_DEL_WORKER>
```

Luego observar:

- el error en el cliente,
- la alerta del Master,
- el nuevo Worker creado,
- si la evidencia llegó o no al log.

---

## 51. Cliente de prueba para evidencia

Se puede crear un cliente Python simple para enviar muchas peticiones a `/escribir-evidencia`.

```python
import threading
import requests
import time

URL = "http://localhost:8090/escribir-evidencia"
THREADS = 5
REQUESTS_PER_THREAD = 10


def hit_server(thread_id):
    success = 0
    errors = 0

    for i in range(REQUESTS_PER_THREAD):
        try:
            start = time.time()
            resp = requests.get(URL, timeout=5)
            elapsed = round((time.time() - start) * 1000, 2)

            if resp.status_code == 200:
                success += 1
                print(f"[T{thread_id}] OK {resp.status_code} en {elapsed}ms -> {resp.text}")
            else:
                errors += 1
                print(f"[T{thread_id}] ERROR HTTP {resp.status_code} en {elapsed}ms")

        except Exception as e:
            errors += 1
            print(f"[T{thread_id}] EXCEPTION -> {type(e).__name__}: {e}")

    print(f"[T{thread_id}] Finalizado | Éxitos: {success} | Errores: {errors}")


if __name__ == "__main__":
    threads = []

    for t_id in range(THREADS):
        t = threading.Thread(target=hit_server, args=(t_id,))
        threads.append(t)
        t.start()

    for t in threads:
        t.join()

    print("Test completado.")
```

---

## 52. Qué debería aparecer en la consola

Durante la prueba se deberían ver mensajes como:

```txt
[WORKER 12345] Iniciando escritura de evidencia...
[WORKER 12345] Escritura finalizada...
[WORKER 12345] Crash post-escritura. El cliente todavía no recibió respuesta.
[ALERTA] Worker 12345 colapsó. Código: 1 | Señal: null
[WORKER 12399] Servidor HTTP escuchando en puerto 8090
```

Esto muestra:

- petición recibida,
- escritura completada,
- caída del Worker,
- detección por el Master,
- reemplazo del Worker.

---

## 53. Lo que NO hace el Master

El Master del ejemplo no hace estas cosas:

- No reintenta peticiones caídas.
- No sabe qué evidencia estaba escribiendo cada Worker.
- No conserva el contexto de la petición HTTP.
- No hace rollback.
- No verifica si el archivo quedó completo.
- No evita duplicados.
- No confirma al cliente por otro canal.

Por eso es una estrategia incompleta para sistemas críticos.

---

## 54. Diferencia entre disponibilidad y consistencia

Este ejercicio permite separar dos conceptos.

### Disponibilidad

El servicio vuelve a estar operativo porque el Master crea un Worker nuevo.

```txt
Worker cae -> Master crea otro -> sistema sigue atendiendo
```

### Consistencia

La operación concreta puede haber quedado en estado incierto.

```txt
¿Se escribió la evidencia?
¿Se escribió completa?
¿El cliente recibió confirmación?
¿Se duplicará si reintenta?
```

Un sistema puede tener buena disponibilidad y mala consistencia.

---

## 55. Estrategia “revivir por revivir”

La estrategia de revivir Workers automáticamente se llama a veces self-healing.

Es útil, pero tiene límites.

### Lo que sí resuelve

- Recupera capacidad de atender nuevas peticiones.
- Evita que todo el servicio caiga por un Worker defectuoso.
- Mantiene el pool de procesos.
- Mejora disponibilidad general.

### Lo que no resuelve

- Pérdida de peticiones en curso.
- Escrituras incompletas.
- Duplicación por reintentos.
- Estado en memoria perdido.
- Transacciones no confirmadas.
- Mensajes no persistidos.
- Consistencia forense.

Conclusión:

> Self-healing sin persistencia y sin idempotencia es solo reinicio automático, no garantía de integridad.

---

## 56. Qué pasaría con una base de datos

Si en vez de escribir en archivo se escribiera en una base de datos, el problema seguiría existiendo.

Depende de cuándo cae el proceso:

| Momento | Posible resultado |
|---|---|
| Antes de `INSERT` | No hay registro. |
| Durante `INSERT` | Depende de la DB y transacción. |
| Después de `COMMIT`, antes de responder | DB tiene el registro, cliente cree que falló. |
| Antes de `COMMIT` | DB puede hacer rollback. |
| Con transacción mal manejada | Estado inconsistente. |

Por eso se usan:

- transacciones,
- claves únicas,
- idempotency keys,
- logs de auditoría,
- confirmaciones durables.

---

## 57. Cómo responder correctamente el desafío

### Escenario A

Si el Worker muere antes de terminar la petición:

- el cliente no recibe una respuesta HTTP válida,
- probablemente ve timeout, conexión cerrada o reset,
- el Master levanta otro Worker,
- la petición original no continúa,
- la evidencia puede haberse perdido si todavía no se había escrito.

### Escenario B

Si se mata el Worker con `kill -9`:

- el proceso muere de forma abrupta,
- no hay graceful shutdown,
- no se ejecutan callbacks pendientes,
- no se ejecuta cleanup,
- las peticiones en vuelo se cortan,
- el cliente ve error o timeout,
- el Master crea otro Worker,
- el trabajo a medio camino queda perdido o incierto.

### Conclusión general

El cluster recupera el proceso, pero no recupera la operación.

---

## 58. Checklist de análisis para entregar el ejercicio

| Punto a verificar | Resultado esperado |
|---|---|
| El servidor usa `cluster` | Sí, Master + Workers. |
| El Master muestra telemetría | Sí, tabla por PID. |
| El Worker expone `/status` | Sí, responde JSON. |
| El Worker expone `/escribir-evidencia` | Sí, inicia escritura simulada. |
| La escritura tarda 3 segundos | Sí, usando `setTimeout`. |
| Existe 50% de crash post-escritura | Sí, usando `Math.random() < 0.5`. |
| El Master revive Workers caídos | Sí, en evento `cluster.on('exit')`. |
| El cliente observa errores | Sí, cuando el Worker muere. |
| El archivo puede tener evidencia aunque el cliente vea error | Sí, si el crash ocurre después de escribir. |
| Se identifica el riesgo de inconsistencia | Sí, explicado en el análisis. |

---

## 59. Preguntas de repaso

### 59.1. ¿Por qué Node.js necesita `cluster`?

Porque un proceso Node.js ejecuta JavaScript principalmente en un hilo. `cluster` permite crear varios procesos para aprovechar múltiples núcleos y aislar fallos.

---

### 59.2. ¿`cluster` comparte memoria entre Workers?

No. Cada Worker es un proceso independiente con su propio heap de V8.

---

### 59.3. ¿Qué mecanismo usa el Master para recibir telemetría?

Usa IPC mediante mensajes, por ejemplo:

```js
process.send({ type: 'HEARTBEAT' });
```

---

### 59.4. ¿Qué pasa si un Worker muere?

El Master recibe el evento `exit` y puede crear un Worker nuevo. Pero la petición que estaba atendiendo el Worker muerto no se recupera automáticamente.

---

### 59.5. ¿Por qué `kill -9` es peligroso?

Porque envía `SIGKILL`, que no puede ser interceptada. El proceso muere sin cleanup y las operaciones en curso se cortan abruptamente.

---

### 59.6. ¿Cuál es la diferencia entre self-healing y consistencia?

Self-healing restaura capacidad de servicio. Consistencia garantiza que los datos queden correctos, completos y sin duplicación. Son problemas diferentes.

---

### 59.7. ¿Cómo se evita duplicar evidencia?

Con idempotency keys, identificadores únicos, constraints de unicidad, logs de operaciones y respuestas basadas en estado persistente.

---

## 60. Mini glosario

| Término | Definición |
|---|---|
| Alta concurrencia | Capacidad de atender muchas operaciones simultáneas. |
| Event Loop | Mecanismo que despacha eventos y callbacks en Node.js. |
| I/O-bound | Carga dominada por espera de entrada/salida. |
| CPU-bound | Carga dominada por cálculo de CPU. |
| IPC | Comunicación entre procesos. |
| Cluster | Módulo de Node.js para crear procesos Workers. |
| Worker | Proceso hijo que atiende trabajo. |
| Master / Primary | Proceso principal que coordina Workers. |
| PID | Identificador de proceso en el sistema operativo. |
| `EADDRINUSE` | Error por intentar usar un puerto ya ocupado. |
| Graceful shutdown | Apagado controlado y ordenado. |
| `SIGTERM` | Señal amable de terminación. |
| `SIGKILL` | Señal de terminación forzada. |
| Self-healing | Capacidad de reiniciar componentes fallidos. |
| Idempotencia | Capacidad de repetir una operación sin duplicar efectos. |
| Write-Ahead Log | Registro previo de intención para recuperar operaciones. |

---

## 61. Conclusión de la clase

La clase 6 muestra que escalar una aplicación no significa solamente “crear más procesos”.

`node:cluster` permite distribuir carga y revivir Workers, pero no resuelve por sí solo los problemas de consistencia.

La enseñanza principal del ejercicio es:

> Un sistema puede estar vivo desde afuera y aun así haber perdido trabajo crítico por dentro.

Para sistemas sensibles, como un recolector de evidencia forense, no alcanza con reiniciar Workers. Hace falta diseñar con:

- idempotencia,
- logs durables,
- colas persistentes,
- estados explícitos,
- ACKs confiables,
- graceful shutdown,
- y recuperación basada en datos, no solo en procesos.

El Master puede revivir un Worker, pero no puede adivinar qué evidencia estaba escribiendo ni reconstruir una petición que murió a mitad de camino.

Por eso, el cierre conceptual de la clase es:

> La alta disponibilidad mantiene el servicio de pie. La arquitectura de datos mantiene la verdad intacta.
