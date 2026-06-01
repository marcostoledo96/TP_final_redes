# Clase 7 — JavaScript de Alto Rendimiento: Concurrencia, Memoria Compartida y Atomics

**Tema central:** Del Event Loop a la caché L1 de la CPU.  
**Eje práctico:** `worker_threads`, transferencia de buffers, `SharedArrayBuffer`, condiciones de carrera, `Atomics` y pools de hilos.  
**Material base:** PDF de la clase, códigos de laboratorio `CodigosClase7.zip` y documentación de MDN sobre `Atomics`.

---

## 1. Idea general de la clase

Esta clase cierra el recorrido del curso llevando el análisis de Node.js desde el nivel de red, sockets y procesos hacia el nivel más bajo de concurrencia disponible en JavaScript moderno: **memoria compartida y operaciones atómicas**.

Hasta ahora, el curso fue avanzando por capas:

1. **Red y transporte:** TCP, UDP, datagramas, flujos y backpressure.
2. **Arquitecturas de datos:** streaming, `Buffer`, `pipe()`, fragmentación dinámica.
3. **Escalabilidad en Node.js:** procesos, `cluster`, IPC, `worker_threads`, self-healing y graceful shutdown.
4. **Concurrencia real:** uso de múltiples hilos, coordinación entre workers, memoria compartida y sincronización explícita.

La clase 7 se centra en una pregunta clave:

> ¿Qué pasa cuando el problema ya no es esperar red, disco o base de datos, sino usar todos los núcleos de la CPU sin romper la consistencia de los datos?

Node.js es excelente para **I/O asíncrono**, pero no puede resolver por sí solo los problemas **CPU-bound** si todo se ejecuta dentro del hilo principal. Para eso se necesitan arquitecturas multihilo, separación de responsabilidades y, en casos extremos, memoria compartida con primitivas atómicas.

---

## 2. El límite del hilo único

Node.js trabaja principalmente sobre un modelo de **Event Loop**. Esto significa que un único hilo principal coordina eventos, callbacks, timers, operaciones de red, entrada/salida y respuestas HTTP.

Este modelo es muy eficiente cuando las tareas son de tipo **I/O-bound**, es decir, cuando el programa espera respuestas externas:

- red,
- archivos,
- base de datos,
- sockets,
- APIs externas,
- timers,
- colas de eventos.

En esos casos, Node.js no se queda bloqueado esperando. Registra la operación, libera el hilo principal y continúa procesando otros eventos.

El problema aparece cuando la tarea es **CPU-bound**.

Una tarea CPU-bound no está esperando una operación externa. Está consumiendo procesador activamente. Ejemplos:

- cálculo criptográfico intenso,
- hashing masivo,
- compresión pesada,
- análisis de archivos binarios enormes,
- procesamiento de imágenes,
- parsing de grandes volúmenes de datos,
- simulaciones matemáticas,
- validaciones forenses costosas,
- loops síncronos largos.

Cuando una tarea CPU-bound corre en el hilo principal, el Event Loop queda ocupado y deja de atender otras solicitudes.

### 2.1. Diferencia entre I/O-bound y CPU-bound

| Tipo de tarea | Qué espera | Riesgo principal | Solución típica |
|---|---|---|---|
| I/O-bound | Red, disco, DB, socket, sistema operativo | Latencia externa | Asincronismo, callbacks, promesas, streams |
| CPU-bound | Procesador | Bloqueo del Event Loop | Worker threads, procesos, pool de hilos |

### 2.2. Ejemplo conceptual

```js
const http = require('http');

http.createServer((req, res) => {
  if (req.url === '/pesado') {
    let i = 0;
    while (i < 500_000_000) i++;
    res.end('terminado');
    return;
  }

  if (req.url === '/health') {
    res.end('online');
    return;
  }
}).listen(3000);
```

Mientras `/pesado` está ejecutando el `while`, el endpoint `/health` también queda bloqueado. No porque HTTP falle, sino porque el hilo que debe responder está ocupado.

La conclusión de la diapositiva 2 es directa:

> Node.js brilla con operaciones de entrada/salida asíncronas, pero su arquitectura de un solo hilo colapsa ante carga computacional intensiva si no se delega el trabajo.

---

## 3. Ecosistema multihilo en Node.js

La clase presenta tres mecanismos principales para salir del límite del hilo único:

1. `child_process`
2. `cluster`
3. `worker_threads`

Cada uno resuelve un problema distinto.

---

## 4. `child_process`

`child_process` permite lanzar procesos externos desde Node.js.

Se usa cuando se necesita ejecutar otro programa, comando o script separado del proceso principal.

Ejemplos:

- ejecutar un script Python,
- llamar a `ffmpeg`,
- ejecutar una herramienta del sistema,
- correr un proceso externo de análisis,
- aislar tareas que no pertenecen directamente al runtime de Node.

### 4.1. Características

| Aspecto | Descripción |
|---|---|
| Aislamiento | Alto. Cada proceso tiene memoria separada. |
| Comunicación | IPC relativamente más lento. |
| Costo | Mayor que un hilo, porque se crea otro proceso. |
| Caso ideal | Scripts externos o herramientas del sistema. |

### 4.2. Ventaja

Si el proceso hijo falla, no necesariamente destruye el proceso principal.

### 4.3. Desventaja

La comunicación suele requerir serialización, pipes, stdout/stderr o mensajes IPC. No es la opción más liviana para coordinación fina entre tareas.

---

## 5. `cluster`

`cluster` permite crear múltiples procesos Node.js que comparten un mismo puerto HTTP.

Se usa principalmente para escalar servidores web aprovechando varios núcleos de CPU.

### 5.1. Características

| Aspecto | Descripción |
|---|---|
| Aislamiento | Múltiples procesos. Cada worker tiene su propia memoria. |
| Comunicación | IPC entre proceso maestro y workers. |
| Uso principal | Escalabilidad web. |
| Ventaja | Permite usar varios núcleos para atender HTTP. |
| Limitación | No comparte memoria directamente entre workers. |

### 5.2. Relación con clases anteriores

En la clase 6 se trabajó con `cluster`, telemetría, reinicio de workers y self-healing. La clase 7 cambia el foco: ya no se trata solo de escalar HTTP, sino de coordinar trabajo paralelo más fino usando hilos.

---

## 6. `worker_threads`

`worker_threads` permite crear hilos dentro del mismo proceso Node.js.

A diferencia de `cluster`, los workers no son procesos completamente separados. Cada worker tiene su propia instancia de V8, su propio Event Loop y su propio contexto de ejecución, pero puede comunicarse con el hilo principal de manera más directa.

### 6.1. Características

| Aspecto | Descripción |
|---|---|
| Aislamiento | Menor que `cluster`, pero cada worker tiene su propio contexto V8. |
| Comunicación | `postMessage`, `MessagePort`, transferencia de objetos y memoria compartida. |
| Uso principal | Tareas CPU-bound intensivas. |
| Ventaja | Permite paralelismo real en varios núcleos. |
| Riesgo | Si se usa memoria compartida sin sincronización, aparecen race conditions. |

### 6.2. Cuándo conviene usar `worker_threads`

Conviene usarlo cuando:

- una tarea tarda mucho por CPU,
- el Event Loop principal debe seguir respondiendo,
- se necesita paralelizar cómputo,
- se procesan buffers grandes,
- se hacen cálculos criptográficos,
- se procesa evidencia digital,
- se comprimen o transforman grandes volúmenes de datos.

No conviene usarlo para operaciones normales de I/O. Para I/O, Node.js ya tiene un modelo no bloqueante muy eficiente.

---

## 7. El cuello de botella de la comunicación

Crear workers no alcanza. También importa **cómo se les envían los datos**.

La clase muestra dos formas generales de comunicación:

1. **Paso de mensajes con clonación estructurada.**
2. **Memoria compartida con `SharedArrayBuffer`.**

---

## 8. Paso de mensajes y clonación estructurada

Cuando se usa `worker.postMessage(data)`, Node.js puede copiar los datos desde el hilo principal hacia el worker.

Esto es seguro, porque cada hilo trabaja con su propia copia, pero tiene un costo importante:

- duplicación de memoria,
- uso adicional de CPU,
- latencia por serialización,
- peor rendimiento con buffers grandes.

Este mecanismo se conoce como **Structured Clone Algorithm**.

### 8.1. Problema

Si se envía un buffer de 40 MB a un worker mediante copia, el sistema debe duplicar el contenido. En tareas forenses, multimedia o científicas, esto se vuelve costoso.

### 8.2. Caso forense

Supongamos que se analiza un volcado de memoria, una imagen de disco, un archivo de evidencia o un gran bloque binario. Si cada worker recibe una copia completa, el consumo de RAM se dispara.

---

## 9. Transferable Objects

Una alternativa es transferir la propiedad de un `ArrayBuffer` al worker.

Cuando se transfiere, no se hace una copia profunda. Se mueve el control del bloque de memoria hacia el worker.

En el código de laboratorio se ve así:

```js
worker.postMessage({ mode, data: rawArrayBuffer }, [rawArrayBuffer]);
```

El segundo parámetro indica la lista de objetos transferibles.

Después de transferirlo, el buffer original queda **detached** en el hilo principal.

Esto significa que:

```js
rawArrayBuffer.byteLength === 0
```

### 9.1. Ventaja

La transferencia evita copias innecesarias y mejora el rendimiento con datos grandes.

### 9.2. Desventaja

El hilo principal pierde acceso al buffer transferido. Es una transferencia de dominio de memoria, no una copia compartida.

---

## 10. `SharedArrayBuffer`

`SharedArrayBuffer` permite que varios hilos accedan al mismo bloque de memoria.

A diferencia de la transferencia, en este caso no se mueve la propiedad del buffer. Varios workers pueden leer y escribir sobre el mismo espacio físico de memoria.

Esto permite comunicación extremadamente rápida, porque no hay copias.

Pero también introduce un problema muy serio:

> Si dos hilos modifican la misma dirección de memoria al mismo tiempo, el resultado puede ser incorrecto.

---

## 11. Condiciones de carrera

Una **condición de carrera** ocurre cuando el resultado de un programa depende del orden exacto en que se ejecutan operaciones concurrentes.

En un sistema multihilo, dos workers pueden intentar modificar el mismo valor al mismo tiempo.

Ejemplo conceptual:

```js
sharedArray[0]++;
```

Parece una sola operación, pero en realidad se compone de tres pasos:

1. leer el valor actual,
2. sumar 1,
3. escribir el nuevo valor.

Si dos hilos hacen esto al mismo tiempo, puede pasar lo siguiente:

| Tiempo | Worker 1 | Worker 2 | Valor en memoria |
|---|---|---|---|
| t1 | lee 0 |  | 0 |
| t2 |  | lee 0 | 0 |
| t3 | calcula 1 | calcula 1 | 0 |
| t4 | escribe 1 |  | 1 |
| t5 |  | escribe 1 | 1 |

El valor final debería ser 2, pero termina siendo 1.

Esto se llama **actualización perdida**.

La diapositiva 5 lo ejemplifica con un balance inicial de 0: dos hilos suman 50, pero el resultado final puede quedar en 50 cuando debería ser 100.

---

## 12. Reordenamiento de instrucciones

El problema no termina en la condición de carrera lógica. También existe el reordenamiento de instrucciones a nivel de compilador y hardware.

Los compiladores modernos y las CPUs pueden ejecutar operaciones fuera del orden escrito para mejorar el rendimiento.

Ejemplo:

```js
let flag = false;
let data = 0;

data = 42;
flag = true;
```

En un solo hilo esto normalmente no genera problemas observables, porque el resultado respeta las dependencias internas.

Pero en múltiples hilos, otro worker podría ver `flag === true` antes de que `data` esté efectivamente visible como `42`.

### 12.1. Por qué pasa

El hardware intenta ocultar la latencia de la memoria RAM. Para eso utiliza:

- cachés,
- buffers de escritura,
- ejecución especulativa,
- pipelines,
- reordenamiento,
- optimizaciones del compilador JIT.

Esto mejora el rendimiento, pero complica la sincronización.

### 12.2. Conclusión

En programación concurrente no alcanza con escribir operaciones en orden. Hay que usar primitivas que establezcan garantías explícitas de visibilidad y orden.

Ahí aparece `Atomics`.

---

## 13. Motor V8 y optimización

La clase muestra una anatomía simplificada del motor V8:

1. **Parser**
2. **Ignition**
3. **Sparkplug y Maglev**
4. **TurboFan**

### 13.1. Parser

Convierte el código JavaScript en un AST, es decir, un árbol de sintaxis abstracta.

### 13.2. Ignition

Genera bytecode. Es rápido para iniciar y adecuado para ejecución general.

### 13.3. Sparkplug y Maglev

Son compiladores intermedios que equilibran velocidad de compilación y optimización.

### 13.4. TurboFan

Es el compilador JIT de mayor optimización. Genera código máquina nativo y aplica optimizaciones agresivas.

### 13.5. Relación con concurrencia

El código JavaScript termina ejecutándose sobre hardware real. Por eso, en contextos de memoria compartida, las reglas del compilador y de la CPU importan.

La diapositiva 7 resume esta idea:

> TurboFan es donde el código JavaScript colisiona con las reglas de reordenamiento del hardware subyacente.

---

## 14. `Atomics` en JavaScript

`Atomics` es un objeto global que contiene métodos estáticos para realizar operaciones atómicas sobre memoria compartida.

Se usa principalmente junto con:

- `SharedArrayBuffer`,
- vistas tipadas como `Int32Array`, `Uint8Array`, etc.

Una operación atómica garantiza que una secuencia crítica se ejecute de forma indivisible.

Por ejemplo:

```js
Atomics.add(sharedArray, 1, 1);
```

Esto suma 1 en la posición 1 de forma segura frente a otros hilos.

---

## 15. Qué garantiza una operación atómica

Una operación atómica permite:

1. leer,
2. modificar,
3. escribir,

sin que otro hilo pueda interrumpir el proceso en el medio.

En vez de quedar expuesto a:

```txt
leer → calcular → escribir
```

la operación se encapsula como una unidad indivisible:

```txt
[leer + calcular + escribir]
```

---

## 16. Memory fences o barreras de memoria

Las operaciones atómicas no solo evitan intercalados destructivos. También introducen garantías de orden y visibilidad.

Una **memory fence** es una barrera que impide que ciertas operaciones de memoria sean reordenadas a través de ella.

Ejemplo conceptual:

```js
Atomics.store(sharedArray, 0, 42);
const value = Atomics.load(sharedArray, 0);
```

`Atomics.store` y `Atomics.load` no son simples escrituras y lecturas comunes. Establecen reglas más estrictas sobre cuándo los datos deben ser visibles para otros hilos.

### 16.1. Costo

La seguridad tiene costo. Las fences pueden obligar a la CPU a drenar buffers internos, sincronizar cachés o detener optimizaciones.

Por eso, `Atomics` debe usarse con criterio.

---

## 17. Métodos principales de `Atomics`

| Método | Uso |
|---|---|
| `Atomics.add()` | Suma un valor de forma atómica y devuelve el valor anterior. |
| `Atomics.sub()` | Resta un valor de forma atómica y devuelve el valor anterior. |
| `Atomics.load()` | Lee un valor con garantías de sincronización. |
| `Atomics.store()` | Escribe un valor con garantías de sincronización. |
| `Atomics.exchange()` | Reemplaza un valor y devuelve el anterior. |
| `Atomics.compareExchange()` | Compara y cambia solo si el valor actual coincide con el esperado. |
| `Atomics.wait()` | Bloquea el hilo hasta que cambie una condición o hasta un timeout. |
| `Atomics.notify()` | Despierta hilos que estaban esperando. |
| `Atomics.waitAsync()` | Espera de manera asíncrona sobre una ubicación compartida. |
| `Atomics.isLockFree()` | Indica si una operación atómica de cierto tamaño puede implementarse sin lock interno. |
| `Atomics.pause()` | Indica una microespera en ciclos de spinning sobre recursos compartidos. |
| `Atomics.and()` | Operación AND bit a bit atómica. |
| `Atomics.or()` | Operación OR bit a bit atómica. |
| `Atomics.xor()` | Operación XOR bit a bit atómica. |

---

## 18. `Atomics` no es un constructor

`Atomics` no se instancia.

Esto es incorrecto:

```js
const a = new Atomics();
```

Esto también es incorrecto:

```js
Atomics();
```

Se usa directamente como espacio de nombres:

```js
Atomics.add(array, index, value);
Atomics.load(array, index);
Atomics.store(array, index, value);
```

---

## 19. Ejemplo básico con `SharedArrayBuffer` y `Atomics`

```js
const sharedBuffer = new SharedArrayBuffer(4);
const sharedArray = new Int32Array(sharedBuffer);

sharedArray[0] = 0;

Atomics.add(sharedArray, 0, 1);
console.log(Atomics.load(sharedArray, 0)); // 1
```

En este caso se reserva un bloque compartido de 4 bytes. Como `Int32Array` usa enteros de 32 bits, hay espacio para un entero.

---

## 20. Patrón 1 — Mutex basado en Promesas

El primer patrón de sincronización presentado en la clase es un mutex lógico basado en promesas.

Este patrón sirve dentro del modelo asíncrono de JavaScript.

No bloquea el hilo de hardware. Ordena el acceso a una zona crítica encadenando promesas.

### 20.1. Idea

1. Una tarea llama a `mutex.acquire()`.
2. Si el candado está libre, entra a la zona crítica.
3. Si está ocupado, espera en una cola de promesas.
4. Al terminar, llama a `mutex.release()`.
5. La siguiente tarea en cola entra automáticamente.

### 20.2. Ejemplo conceptual

```js
class Mutex {
  constructor() {
    this.queue = [];
    this.locked = false;
  }

  acquire() {
    return new Promise(resolve => {
      if (!this.locked) {
        this.locked = true;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  release() {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.locked = false;
    }
  }
}
```

### 20.3. Ventaja

No requiere dependencias externas y aprovecha la naturaleza del Event Loop para serializar transacciones de manera asincrónica.

### 20.4. Limitación

No resuelve memoria compartida real entre workers. Es útil para coordinar tareas dentro del mismo hilo o dentro de una abstracción de concurrencia basada en promesas.

---

## 21. Patrón 2 — Mutex estricto con `Atomics`

El segundo patrón es más bajo nivel. Usa `Atomics.compareExchange`, `Atomics.wait` y `Atomics.notify`.

Este patrón permite crear un candado sobre memoria compartida.

### 21.1. Estados del mutex

| Estado | Valor posible |
|---|---|
| Desbloqueado | `0` |
| Bloqueado | `1` |

### 21.2. `Atomics.compareExchange()`

Este método compara el valor actual con un valor esperado. Si coincide, lo reemplaza.

Ejemplo:

```js
const oldValue = Atomics.compareExchange(sharedArray, 0, 0, 1);
```

Significa:

> Si `sharedArray[0]` vale `0`, cambiarlo a `1`. Devolver el valor anterior.

Si devuelve `0`, el hilo logró adquirir el lock. Si devuelve otro valor, el lock estaba ocupado.

### 21.3. `Atomics.wait()`

Permite dormir un hilo mientras una posición de memoria tenga cierto valor.

Ejemplo:

```js
Atomics.wait(sharedArray, 0, 1);
```

Significa:

> Dormir mientras `sharedArray[0]` siga valiendo `1`.

### 21.4. `Atomics.notify()`

Despierta hilos que estaban esperando.

```js
Atomics.notify(sharedArray, 0, 1);
```

Significa:

> Despertar un hilo que estaba esperando sobre la posición 0.

### 21.5. Implementación conceptual

```js
function acquire(lock) {
  while (true) {
    const oldValue = Atomics.compareExchange(lock, 0, 0, 1);

    if (oldValue === 0) {
      return;
    }

    Atomics.wait(lock, 0, 1);
  }
}

function release(lock) {
  Atomics.store(lock, 0, 0);
  Atomics.notify(lock, 0, 1);
}
```

### 21.6. Advertencia

`Atomics.wait()` bloquea el hilo que lo ejecuta. En Node.js puede ser razonable dentro de un worker, pero no debe usarse para bloquear el hilo principal de una aplicación web.

---

## 22. Patrón 3 — WaitGroups

Un WaitGroup permite esperar a que un conjunto de workers termine su trabajo.

La idea es usar un contador compartido.

### 22.1. Flujo

1. El hilo principal inicializa un contador con la cantidad de workers.
2. Cada worker procesa su fragmento de datos.
3. Al terminar, cada worker decrementa el contador con `Atomics.add(..., -1)` o `Atomics.sub(...)`.
4. El hilo principal espera hasta que el contador llegue a 0.
5. Cuando llega a 0, se considera que todos terminaron.

### 22.2. Caso ideal

Procesamiento paralelo de:

- arrays masivos,
- chunks de archivos,
- bloques de evidencia,
- renderizado por cuadrantes,
- análisis de imágenes,
- procesamiento matemático por segmentos.

### 22.3. Ejemplo conceptual

```js
// shared[0] = cantidad de workers pendientes
const sab = new SharedArrayBuffer(4);
const shared = new Int32Array(sab);
shared[0] = 4;

// En cada worker, al terminar:
const remaining = Atomics.sub(shared, 0, 1) - 1;

if (remaining === 0) {
  Atomics.notify(shared, 0, 1);
}
```

---

## 23. El nuevo cuello de botella: el costo del hardware

Las operaciones atómicas son seguras, pero no son gratuitas.

Las diapositivas 12, 13 y 14 muestran que el cuello de botella puede moverse desde JavaScript hacia la microarquitectura del procesador.

### 23.1. Drain Store Buffer

Cuando la CPU ejecuta ciertas operaciones atómicas, puede necesitar vaciar o sincronizar buffers internos de escritura.

Esto puede ser mucho más costoso que la operación aritmética en sí.

En cargas intensivas, la parte costosa no siempre es el `add`, sino la sincronización necesaria para garantizar que el resultado sea visible correctamente.

### 23.2. Free Atomics

El concepto de **Free Atomics** apunta a reducir el costo de las fences, permitiendo operaciones atómicas más fluidas cuando la microarquitectura puede garantizar seguridad sin bloquear tanto el pipeline.

La clase lo presenta como frontera de hardware, no como algo que el desarrollador JS controle directamente desde código común.

### 23.3. Store-to-Load Forwarding

Es un mecanismo donde una escritura puede reenviar su dato directamente a una lectura posterior sin esperar a que toda la jerarquía de caché complete el ciclo.

Esto mejora localidad y rendimiento, pero también exige reglas de consistencia.

### 23.4. Prevención de deadlocks

El hardware puede usar mecanismos de watchdog o reinicio de pipeline para evitar esperas circulares o livelocks en operaciones especulativas.

---

## 24. Síntesis: el espectro de la concurrencia

La clase resume la concurrencia en tres niveles:

### 24.1. Nivel aplicación

Incluye:

- `worker_threads`,
- mutex con promesas,
- WaitGroups,
- pools de workers,
- lógica de negocio.

Este nivel decide qué se paraleliza y cómo se organiza el trabajo.

### 24.2. Nivel runtime

Incluye:

- V8,
- `SharedArrayBuffer`,
- `Atomics`,
- memory fences,
- colas internas,
- serialización o transferencia de memoria.

Este nivel implementa las garantías que JavaScript necesita para coordinar memoria compartida.

### 24.3. Nivel silicio

Incluye:

- CPU,
- caché L1,
- store buffers,
- locks de línea de caché,
- ejecución especulativa,
- pipelines,
- memory ordering.

Este nivel determina el costo real de la sincronización.

---

## 25. Reglas de oro de la clase

1. **Aislar tareas computacionales, no operaciones de I/O.**

   Si la tarea solo espera red, disco o base de datos, el modelo asíncrono de Node.js suele ser suficiente. Si consume CPU intensivamente, debe salir del hilo principal.

2. **Evitar usar `SharedArrayBuffer` y `Atomics` directamente salvo que sea necesario.**

   Son herramientas poderosas, pero peligrosas. Conviene utilizarlas mediante abstracciones probadas: colas, pools, mutexes, waitgroups o librerías confiables.

3. **Respetar el reordenamiento del hardware.**

   En concurrencia no se puede asumir causalidad cronológica solo porque el código está escrito en cierto orden. Si hay memoria compartida, el estado debe sincronizarse explícitamente.

4. **Medir antes de optimizar.**

   Transferir buffers puede ser más rápido que clonar, pero también cambia la propiedad del dato. La memoria compartida puede evitar copias, pero obliga a sincronizar.

5. **Separar disponibilidad de consistencia.**

   Que el servidor responda rápido no significa que los datos compartidos sean correctos. Hay que validar ambas cosas.

---

# Laboratorio 1 — Serialización vs. Transferencia de Buffers

Carpeta del ZIP:

```txt
1.Serializacion/
├── Explicacion.md
├── orquestador_server.js
├── buffer_worker.js
└── stress_buffer.py
```

## 26. Objetivo del laboratorio

Demostrar la diferencia de rendimiento entre:

1. **Structured Clone Algorithm**
2. **Transferable Objects**

El contexto propuesto es forense: procesamiento de volcados de memoria o archivos de evidencia masivos.

---

## 27. Arquitectura del laboratorio

El servidor principal recibe un payload HTTP y lo transforma en un `ArrayBuffer`.

Luego lo envía a un worker de dos formas posibles:

```txt
Cliente Python
   ↓ POST 40 MB
Servidor Node.js /analyze
   ↓ clone o transfer
Worker thread
   ↓ checksum
Respuesta JSON con métricas
```

---

## 28. Servidor orquestador

Archivo:

```txt
1.Serializacion/orquestador_server.js
```

Puntos importantes:

```js
const { Worker } = require('worker_threads');
```

El servidor usa workers para procesar el buffer fuera del hilo principal.

Endpoint:

```txt
POST /analyze?mode=clone
POST /analyze?mode=transfer
```

Modo por defecto:

```js
const mode = url.searchParams.get('mode') || 'clone';
```

El cuerpo HTTP se acumula así:

```js
let body = [];

req.on('data', chunk => body.push(chunk));
req.on('end', () => {
  const bufferPayload = Buffer.concat(body);
});
```

Luego se crea un `ArrayBuffer`:

```js
const rawArrayBuffer = new Uint8Array(bufferPayload).buffer;
```

---

## 29. Modo clone

En modo `clone`, el buffer se envía así:

```js
worker.postMessage({ mode, data: rawArrayBuffer });
```

Esto implica clonación estructurada.

### 29.1. Consecuencia

El worker recibe una copia del buffer.

Ventajas:

- el hilo principal conserva su buffer,
- no hay problemas de propiedad,
- es más simple de razonar.

Desventajas:

- consume más memoria,
- tarda más con datos grandes,
- duplica información.

---

## 30. Modo transfer

En modo `transfer`, el buffer se envía así:

```js
worker.postMessage({ mode, data: rawArrayBuffer }, [rawArrayBuffer]);
```

Esto transfiere la propiedad del buffer al worker.

El servidor luego informa:

```js
mainBufferDetached: rawArrayBuffer.byteLength === 0
```

Si `mainBufferDetached` es `true`, significa que el buffer fue transferido y el hilo principal ya no puede usarlo.

---

## 31. Worker de análisis

Archivo:

```txt
1.Serializacion/buffer_worker.js
```

El worker recibe el mensaje:

```js
parentPort.on('message', (msg) => {
  const view = new Uint8Array(msg.data);
});
```

Luego recorre el buffer y calcula un checksum simple:

```js
let checksum = 0;
for (let i = 0; i < view.length; i++) {
  checksum = (checksum + view[i]) ^ 0xFF;
}
```

Finalmente responde:

```js
parentPort.postMessage({
  mode: msg.mode,
  executionTimeMs,
  checksum
});
```

---

## 32. Cliente de estrés

Archivo:

```txt
1.Serializacion/stress_buffer.py
```

El cliente genera un payload de 40 MB:

```python
payload = os.urandom(40 * 1024 * 1024)
```

Luego prueba ambos modos:

```python
URL_CLONE = "http://localhost:8090/analyze?mode=clone"
URL_TRANSFER = "http://localhost:8090/analyze?mode=transfer"
```

---

## 33. Cómo ejecutar el laboratorio 1

Terminal 1:

```bash
cd 1.Serializacion
node orquestador_server.js
```

Terminal 2:

```bash
python stress_buffer.py
```

Dependencia Python:

```bash
pip install requests
```

---

## 34. Qué observar

La respuesta JSON incluye:

```json
{
  "mode": "transfer",
  "executionTimeMs": 123.45,
  "totalPipelineTimeMs": 150.67,
  "checksum": 123,
  "mainBufferDetached": true
}
```

### 34.1. Campos importantes

| Campo | Significado |
|---|---|
| `mode` | Modo usado: `clone` o `transfer`. |
| `executionTimeMs` | Tiempo dentro del worker. |
| `totalPipelineTimeMs` | Tiempo total desde envío al worker hasta respuesta. |
| `checksum` | Resultado del procesamiento del buffer. |
| `mainBufferDetached` | Indica si el buffer original fue transferido y quedó inutilizable en el hilo principal. |

---

## 35. Conclusión del laboratorio 1

La transferencia de buffers permite evitar copias costosas en escenarios con datos masivos.

Pero tiene una consecuencia arquitectónica importante:

> El dato ya no pertenece al hilo principal.

Por eso, transferir no es simplemente una optimización. Es una decisión de diseño sobre propiedad de memoria.

---

# Laboratorio 2 — Memoria Compartida, Race Conditions y Atomics

Carpeta del ZIP:

```txt
2.SharedMemory/
├── Explicacion.md
├── atomic_cluster.js
└── race_detection.py
```

## 36. Objetivo del laboratorio

Demostrar físicamente una condición de carrera cuando dos workers modifican la misma dirección de memoria compartida.

Luego se compara el resultado con una operación protegida mediante `Atomics.add()`.

---

## 37. Arquitectura del laboratorio

```txt
Cliente Python
   ↓ GET /race-condition
Servidor Node.js principal
   ↓ crea SharedArrayBuffer
Worker 1 ─┐
          ├─ modifican memoria compartida
Worker 2 ─┘
   ↓
Respuesta JSON con contador inseguro y contador atómico
```

---

## 38. Memoria compartida usada

Archivo:

```txt
2.SharedMemory/atomic_cluster.js
```

El hilo principal crea:

```js
const sharedBuffer = new SharedArrayBuffer(8);
const sharedArray = new Int32Array(sharedBuffer);
```

Se reservan 8 bytes. Como `Int32Array` usa 4 bytes por entero, hay espacio para dos enteros:

| Índice | Uso |
|---|---|
| `sharedArray[0]` | Contador inseguro |
| `sharedArray[1]` | Contador atómico |

Inicialización:

```js
sharedArray[0] = 0;
sharedArray[1] = 0;
```

---

## 39. Endpoint de prueba

```txt
GET /race-condition
```

Cuando se llama al endpoint, se crean dos workers:

```js
const w1 = new Worker(__filename, { workerData: { sharedBuffer } });
const w2 = new Worker(__filename, { workerData: { sharedBuffer } });
```

Ambos reciben el mismo `SharedArrayBuffer`.

---

## 40. Código inseguro

Dentro de cada worker:

```js
sharedArray[0]++;
```

Este incremento no es atómico.

Aunque parece una sola instrucción, se descompone en:

```txt
leer → sumar → escribir
```

Dos workers pueden intercalarse y perder incrementos.

---

## 41. Código seguro

Dentro de cada worker también se ejecuta:

```js
Atomics.add(sharedArray, 1, 1);
```

Este incremento sí es atómico.

La operación se protege frente a interrupciones concurrentes.

---

## 42. Cantidad esperada

Cada worker hace:

```js
for (let i = 0; i < 1000000; i++) {
  sharedArray[0]++;
  Atomics.add(sharedArray, 1, 1);
}
```

Como hay dos workers, el valor esperado es:

```txt
2,000,000
```

---

## 43. Respuesta esperada

El servidor responde algo así:

```json
{
  "expextedValue": 2000000,
  "unsafeCounter": 1678231,
  "atomicCounter": 2000000,
  "drift": 321769
}
```

Nota: en el código aparece `expextedValue` con error de tipeo. Lo correcto sería `expectedValue`.

---

## 44. Interpretación

| Campo | Interpretación |
|---|---|
| `expextedValue` | Valor esperado total. |
| `unsafeCounter` | Resultado del contador sin protección. |
| `atomicCounter` | Resultado del contador protegido con `Atomics.add`. |
| `drift` | Cantidad de operaciones perdidas por condición de carrera. |

Si `unsafeCounter` es menor que `2,000,000`, se comprobó la race condition.

Si `atomicCounter` da exactamente `2,000,000`, se comprobó que `Atomics.add()` protege la operación.

---

## 45. Cliente de prueba

Archivo:

```txt
2.SharedMemory/race_detection.py
```

Ejecuta:

```python
response = requests.get("http://localhost:8090/race-condition")
```

Luego muestra:

- iteraciones esperadas,
- contador inseguro,
- contador atómico,
- pérdida por race condition.

---

## 46. Cómo ejecutar el laboratorio 2

Terminal 1:

```bash
cd 2.SharedMemory
node atomic_cluster.js
```

Terminal 2:

```bash
python race_detection.py
```

---

## 47. Conclusión del laboratorio 2

`SharedArrayBuffer` permite compartir memoria real entre hilos, pero no protege automáticamente contra corrupción lógica.

La seguridad depende de usar primitivas atómicas cuando varios hilos leen y escriben sobre las mismas posiciones.

Conclusión fuerte:

> Compartir memoria sin sincronización es rápido, pero incorrecto.

---

# Laboratorio 3 — Pool de Hilos Criptográficos No Bloqueante

Carpeta del ZIP:

```txt
3.ThreatPool/
├── Explicacion.md
├── crypto_pool_server.js
├── crypto_task_worker.js
└── pool_stress_test.py
```

Nota: la carpeta se llama `ThreatPool`, aunque por el contenido corresponde a un **Thread Pool** criptográfico.

---

## 48. Objetivo del laboratorio

Crear un pool dinámico de workers para ejecutar tareas criptográficas pesadas sin bloquear el Event Loop del hilo principal.

Mientras los workers trabajan al 100% de CPU, el endpoint `/health` debe seguir respondiendo.

---

## 49. Arquitectura

```txt
Cliente de estrés
   ├─ GET /hash-heavy ──> Pool de workers ──> crypto_task_worker.js
   └─ GET /health ─────> Hilo principal responde de inmediato
```

---

## 50. Clase `CryptoThreadPool`

Archivo:

```txt
3.ThreatPool/crypto_pool_server.js
```

La clase administra:

- cantidad de workers,
- workers libres y ocupados,
- cola de tareas,
- callbacks de finalización,
- cantidad de workers activos.

Fragmento principal:

```js
class CryptoThreadPool {
  constructor(size) {
    this.size = size;
    this.workers = [];
    this.queue = [];
    this.activeWorkers = 0;

    for (let i = 0; i < size; i++) {
      this.workers.push({
        worker: new Worker(path.resolve(__dirname, 'crypto_task_worker.js')),
        isBusy: false
      });
    }
  }
}
```

---

## 51. Tamaño del pool

```js
const cryptoPool = new CryptoThreadPool(os.cpus().length - 1);
```

Se usa la cantidad de CPUs menos uno.

La idea es dejar al menos un núcleo disponible para el hilo principal y el sistema operativo.

---

## 52. Ejecución de tareas

```js
execute(data, callback) {
  const freeWorker = this.workers.find(w => !w.isBusy);

  if (!freeWorker) {
    this.queue.push({ data, callback });
    return;
  }

  freeWorker.isBusy = true;
  this.activeWorkers++;
  freeWorker.worker.postMessage(data);
}
```

Si hay un worker libre, se usa. Si no hay workers libres, la tarea queda en cola.

---

## 53. Procesamiento de cola

Cuando el worker termina:

```js
if (this.queue.length > 0) {
  const nextTask = this.queue.shift();
  this.execute(nextTask.data, nextTask.callback);
}
```

Esto mantiene el sistema estable bajo carga. En vez de crear infinitos workers, se encolan tareas.

---

## 54. Endpoint `/hash-heavy`

```txt
GET /hash-heavy
```

Envía una tarea pesada al pool:

```js
cryptoPool.execute({ iterations: 2e8 }, (err, result) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'computed', ...result }));
});
```

---

## 55. Worker criptográfico

Archivo:

```txt
3.ThreatPool/crypto_task_worker.js
```

El worker ejecuta HMAC repetidamente:

```js
let secret = 'evidencia_forense_key';

for (let i = 0; i < iterations; i++) {
  secret = crypto
    .createHmac('sha256', secret)
    .update(`data_${i}`)
    .digest('hex');
}
```

Esto simula una tarea CPU-bound de criptografía intensiva.

---

## 56. Endpoint `/health`

```txt
GET /health
```

Responde desde el hilo principal:

```js
res.end(`[MAIN EVENT LOOP] Operativo. Hilos activos en el pool: ${cryptoPool.activeWorkers}`);
```

Este endpoint es la métrica de salud.

Si responde rápido mientras `/hash-heavy` está saturando CPU, significa que la arquitectura funcionó.

---

## 57. Cliente de estrés

Archivo:

```txt
3.ThreatPool/pool_stress_test.py
```

El cliente lanza:

- 3 peticiones pesadas a `/hash-heavy`,
- monitoreo periódico a `/health`.

```python
threads = [threading.Thread(target=send_heavy_request) for _ in range(3)]
monitor = threading.Thread(target=monitor_health)
```

---

## 58. Cómo ejecutar el laboratorio 3

Terminal 1:

```bash
cd 3.ThreatPool
node crypto_pool_server.js
```

Terminal 2:

```bash
python pool_stress_test.py
```

---

## 59. Qué observar

Durante la ejecución, deberían aparecer respuestas de `/health` incluso mientras las tareas criptográficas siguen procesando.

Ejemplo esperado:

```txt
[HEALTH CHECK] Latencia: 4.20ms | Status: [MAIN EVENT LOOP] Operativo. Hilos activos en el pool: 3
```

Esto demuestra que el hilo principal no está bloqueado.

---

## 60. Conclusión del laboratorio 3

El patrón de pool de workers permite separar:

- coordinación HTTP,
- monitoreo,
- asignación de tareas,
- procesamiento CPU-bound.

El hilo principal queda libre para responder, mientras los workers consumen CPU.

Conclusión clave:

> No se trata solo de crear hilos, sino de controlar cuántos existen, cómo se reutilizan y cómo se encola el trabajo.

---

# 61. Relación entre los tres laboratorios

| Laboratorio | Problema | Solución trabajada | Riesgo aprendido |
|---|---|---|---|
| Serialización | Copiar buffers grandes es costoso | Transferable Objects | Pérdida de propiedad del buffer en el hilo principal |
| Shared Memory | Compartir memoria puede corromper datos | `SharedArrayBuffer` + `Atomics` | Race conditions si no se sincroniza |
| Thread Pool | CPU-bound bloquea el Event Loop | Pool de `worker_threads` | Saturar CPU si no se limita la concurrencia |

---

# 62. Preguntas de repaso

## 62.1. Conceptuales

1. ¿Por qué Node.js puede manejar muchas conexiones I/O, pero bloquearse con una sola tarea CPU-bound?
2. ¿Cuál es la diferencia entre `cluster` y `worker_threads`?
3. ¿Qué problema resuelve `SharedArrayBuffer`?
4. ¿Por qué `SharedArrayBuffer` puede ser peligroso?
5. ¿Qué es una race condition?
6. ¿Por qué `sharedArray[0]++` no es una operación atómica?
7. ¿Qué garantiza `Atomics.add()`?
8. ¿Qué diferencia hay entre transferir un `ArrayBuffer` y compartir un `SharedArrayBuffer`?
9. ¿Por qué `Atomics.wait()` no debería bloquear el hilo principal?
10. ¿Qué ventaja tiene un pool de workers frente a crear un worker nuevo por cada request?

## 62.2. Prácticas

1. Ejecutar el laboratorio de serialización y comparar `clone` vs `transfer`.
2. Ejecutar varias veces el laboratorio de race condition y observar si el `unsafeCounter` cambia.
3. Corregir el typo `expextedValue` por `expectedValue`.
4. Agregar métricas de tiempo al laboratorio de memoria compartida.
5. Agregar endpoint `/metrics` al pool criptográfico.
6. Probar qué pasa si el pool usa `os.cpus().length` en vez de `os.cpus().length - 1`.
7. Implementar un límite máximo de cola en `CryptoThreadPool`.
8. Devolver HTTP 503 cuando la cola esté saturada.
9. Agregar timeout por tarea.
10. Agregar reinicio controlado de workers si uno falla.

---

# 63. Posibles mejoras al código de clase

## 63.1. Mejoras en laboratorio 1

- Validar método HTTP.
- Limitar tamaño máximo del body.
- Manejar errores del worker.
- Terminar el worker si tarda demasiado.
- Agregar comparación promedio de varias corridas.
- Registrar consumo de memoria antes y después.

## 63.2. Mejoras en laboratorio 2

- Corregir `expextedValue` por `expectedValue`.
- Agregar cantidad configurable de workers.
- Agregar cantidad configurable de iteraciones.
- Medir tiempo total de ejecución.
- Separar el código worker en otro archivo.
- Comparar `Atomics.add` con mutex manual.

## 63.3. Mejoras en laboratorio 3

- Manejar errores de workers.
- Agregar cola con límite.
- Agregar prioridad de tareas.
- Agregar timeout.
- Reemplazar workers caídos.
- Exponer métricas JSON.
- Agregar endpoint `/queue`.
- Agregar backpressure a nivel HTTP.

---

# 64. Checklist de comprensión

Al finalizar esta clase deberías poder explicar:

- [ ] Por qué el Event Loop no resuelve tareas CPU-bound.
- [ ] Qué diferencia hay entre proceso e hilo.
- [ ] Cuándo usar `child_process`.
- [ ] Cuándo usar `cluster`.
- [ ] Cuándo usar `worker_threads`.
- [ ] Qué es el Structured Clone Algorithm.
- [ ] Qué es un Transferable Object.
- [ ] Qué significa que un buffer quede detached.
- [ ] Qué es `SharedArrayBuffer`.
- [ ] Qué es una race condition.
- [ ] Por qué un incremento común no es atómico.
- [ ] Cómo usar `Atomics.add`.
- [ ] Cómo funcionan `Atomics.wait` y `Atomics.notify`.
- [ ] Qué es un mutex basado en promesas.
- [ ] Qué es un mutex estricto con `Atomics`.
- [ ] Qué es un WaitGroup.
- [ ] Por qué las memory fences tienen costo.
- [ ] Por qué un pool de workers es más estable que crear hilos ilimitados.

---

# 65. Glosario

## Event Loop

Mecanismo central de Node.js para procesar eventos, callbacks y operaciones asíncronas.

## CPU-bound

Tarea limitada por capacidad de procesamiento de CPU.

## I/O-bound

Tarea limitada por espera de entrada/salida.

## Worker thread

Hilo de ejecución paralelo dentro de Node.js, útil para tareas CPU-bound.

## Structured Clone Algorithm

Algoritmo usado para clonar datos al enviarlos entre contextos.

## Transferable Object

Objeto cuya propiedad puede transferirse a otro hilo sin copiar su contenido.

## Detached buffer

Buffer que perdió su contenido en el hilo original porque fue transferido.

## SharedArrayBuffer

Buffer de memoria compartida entre hilos.

## Atomics

Objeto global con operaciones atómicas para sincronizar acceso a memoria compartida.

## Race condition

Error de concurrencia donde el resultado depende del orden impredecible de ejecución entre hilos.

## Mutex

Mecanismo de exclusión mutua para proteger una sección crítica.

## WaitGroup

Patrón para esperar a que un conjunto de tareas paralelas termine.

## Memory fence

Barrera de memoria que impide ciertos reordenamientos y garantiza visibilidad entre hilos.

## Store Buffer

Buffer interno de CPU donde pueden quedar escrituras pendientes antes de ser visibles globalmente.

## Caché L1

Nivel de caché más cercano al núcleo de CPU, extremadamente rápido.

---

# 66. Resumen final de la clase

La clase 7 muestra que el rendimiento en JavaScript no termina en escribir código asíncrono.

Node.js puede manejar alta concurrencia de red gracias al Event Loop, pero cuando aparecen tareas CPU-bound se necesita paralelismo real mediante `worker_threads`.

Ese paralelismo introduce nuevos desafíos:

- cómo transferir datos grandes sin copiarlos,
- cómo compartir memoria sin corromperla,
- cómo coordinar hilos sin bloquear el sistema,
- cómo evitar race conditions,
- cómo usar `Atomics` para asegurar operaciones críticas,
- cómo diseñar pools de workers que mantengan vivo el servidor.

La idea más importante es que cada capa agrega poder y también responsabilidad:

```txt
Event Loop → Worker Threads → SharedArrayBuffer → Atomics → CPU Cache
```

A mayor cercanía con el hardware, mayor rendimiento potencial, pero también mayor riesgo de errores difíciles de detectar.

La conclusión arquitectónica es:

> El alto rendimiento no consiste en paralelizar todo, sino en aislar correctamente el trabajo pesado, minimizar copias, sincronizar solo lo necesario y proteger la capacidad de respuesta del sistema.

---

# 67. Fuentes usadas

- PDF de clase: **High Performance JavaScript Concurrency**.
- ZIP de práctica: **CodigosClase7**.
- Documentación MDN: **Atomics — JavaScript Reference**.

