# Clase — Dominando la Arquitectura del Flujo de Datos

**Curso:** Redes con Node.js  
**Tema central:** Flujo de datos, eficiencia, streams, backpressure, HTTP chunked transfer y reconstrucción virtual de datos.  
**Material base:** `Data_Flow_Architecture.pdf`

---

## 1. Idea principal de la clase

La clase presenta una idea transversal: **los sistemas eficientes no procesan grandes volúmenes de datos como bloques monolíticos**, sino como **flujos continuos, fragmentados y controlados**.

Este principio aparece en distintas capas:

- En **TCP**, mediante números de secuencia, ventanas de recepción y control de flujo.
- En **HTTP/1.1**, mediante transferencia por partes con `Transfer-Encoding: chunked`.
- En **Node.js**, mediante `Streams`, `.pipe()`, `pause()`, `resume()` y backpressure.
- En **procesamiento forense AFF4**, mediante reconstrucción virtual, mapas de segmentos y deduplicación.
- En **arquitectura de software**, mediante el abandono del procesamiento “todo en memoria” a favor del procesamiento por fragmentos.

La clase usa una metáfora visual de tuberías, válvulas, estaciones de bombeo y presión para explicar cómo circulan los datos dentro de un sistema.

---

## 2. La trampa de la carga monolítica en memoria

### 2.1. El problema

Una estrategia aparentemente simple para trabajar con archivos grandes es:

1. Leer el archivo completo.
2. Cargarlo entero en memoria RAM.
3. Procesarlo.
4. Guardar el resultado.

Sin embargo, esta estrategia se vuelve peligrosa cuando el archivo es muy grande.

Ejemplo conceptual:

```js
const fs = require("fs");

const data = fs.readFileSync("archivo-gigante.img");
// Procesamiento del archivo entero en memoria
```

Esto puede parecer cómodo, pero obliga a que todo el contenido esté disponible en RAM al mismo tiempo.

---

### 2.2. La intención vs. la realidad

La intención sería cargar un archivo grande, por ejemplo de **~9 GB**, y procesarlo de manera directa.

La realidad es que esa carga puede producir:

- Consumo excesivo de memoria.
- Saturación del heap de JavaScript.
- Estrés del Garbage Collector.
- Bloqueos del proceso.
- Caída del sistema.
- Baja respuesta del servidor.
- Problemas para otros procesos que comparten recursos.

En la diapositiva se representa como un bloque gigante que intenta pasar por una abertura demasiado pequeña: el sistema no está diseñado para absorber toda esa carga de golpe.

---

### 2.3. Por qué esto es grave en Node.js

Node.js trabaja con un modelo eficiente de I/O no bloqueante, pero eso no significa que sea inmune a malos diseños.

Si se carga todo en memoria:

- Se pierde la ventaja del procesamiento asíncrono.
- Se presiona innecesariamente al motor V8.
- Se bloquea el event loop durante operaciones pesadas.
- Se aumenta la probabilidad de errores por falta de memoria.

Por eso, para archivos grandes, tráfico de red, respuestas HTTP extensas o procesamiento continuo, se prefiere trabajar con **streams**.

---

## 3. El flujo continuo como patrón fractal

La clase plantea que el flujo continuo no es solo una técnica de Node.js, sino un **patrón repetido en toda la pila tecnológica**.

Esto significa que el mismo principio aparece en distintas escalas:

| Capa | Tecnología / Protocolo | Idea de flujo |
|---|---|---|
| Transporte | TCP RFC 9293 | Secuencia de bytes, ventana de recepción, ACKs |
| Mensajería | HTTP/1.1 RFC 9112 | Transferencia por chunks |
| Ejecución | Node.js Streams | Readable, Writable, Duplex, Transform |
| Aplicación / Almacenamiento | AFF4 | Segmentación, mapas de datos, reconstrucción virtual |

---

### 3.1. Patrón fractal

La palabra **fractal** se usa porque el mismo principio se repite en varios niveles:

- En TCP, los datos se ordenan y controlan con números de secuencia.
- En HTTP, el cuerpo puede dividirse en fragmentos.
- En Node.js, los datos se procesan por chunks.
- En AFF4, los bloques de datos se reconstruyen virtualmente sin copiar todo.

El patrón general es:

```text
Entrada grande
   ↓
Fragmentación
   ↓
Procesamiento por partes
   ↓
Control de presión / ritmo
   ↓
Salida continua
```

---

## 4. Capa de Transporte: TCP y la primera válvula de contención

TCP no envía simplemente “datos sueltos”. TCP administra un flujo confiable de bytes.

Para lograrlo usa:

- Números de secuencia.
- Números de acuse de recibo.
- Ventanas de recepción.
- Flags de control.
- Retransmisiones.
- Control de congestión.
- Control de flujo.

---

### 4.1. TCP Header

La diapositiva muestra un encabezado TCP basado en RFC 9293, con campos como:

| Campo | Tamaño | Función |
|---|---:|---|
| Source Port | 16 bits | Puerto de origen |
| Destination Port | 16 bits | Puerto de destino |
| Sequence Number | 32 bits | Identifica la posición de los bytes dentro del flujo |
| Acknowledgment Number | 32 bits | Confirma hasta qué byte fue recibido correctamente |
| Data Offset | 4 bits | Indica dónde empiezan los datos |
| Flags | Variable | Controlan el estado de la conexión |
| Window Size | 16 bits | Indica cuántos bytes puede recibir el receptor |
| Checksum | 16 bits | Verifica integridad |
| Urgent Pointer | 16 bits | Señala datos urgentes, si corresponde |
| Options | Variable | Parámetros adicionales |
| Padding | Variable | Relleno para alinear el encabezado |

---

### 4.2. Sequence Number

El **Sequence Number** funciona como un rastreador de fragmentos.

Su objetivo es que el receptor pueda:

- Saber qué parte del flujo recibió.
- Detectar pérdidas.
- Reordenar bytes si llegan fuera de orden.
- Confirmar recepción mediante ACK.
- Pedir retransmisión indirectamente al no confirmar ciertos datos.

TCP no piensa en “mensajes” como UDP. Piensa en un **flujo continuo de bytes**.

---

### 4.3. Window Size

El **Window Size** funciona como una válvula de aceptación.

Indica cuánto espacio disponible tiene el receptor para seguir recibiendo datos.

Si el receptor está saturado:

- Reduce la ventana.
- El emisor baja el ritmo.
- Se evita el desborde del receptor.

Este mecanismo es una forma de **backpressure a nivel de transporte**.

---

### 4.4. TCP como sistema de control

TCP no solo transporta datos. También regula la velocidad del flujo.

Podemos verlo así:

```text
Emisor rápido → TCP observa capacidad del receptor → Ajusta ritmo → Receptor no se desborda
```

Esto es muy parecido a lo que ocurre en Node.js cuando un `Writable Stream` avisa que no puede seguir recibiendo datos.

---

## 5. Mensajería HTTP: Content-Length vs. Transfer-Encoding: chunked

HTTP necesita indicar cómo se transmite el cuerpo de una solicitud o respuesta.

La clase compara dos estrategias:

1. `Content-Length`
2. `Transfer-Encoding: chunked`

---

## 6. Content-Length

`Content-Length` indica de antemano el tamaño total del cuerpo HTTP.

Ejemplo:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 1048576

{ ... cuerpo completo ... }
```

---

### 6.1. Ventaja

El receptor sabe exactamente cuántos bytes debe esperar.

Esto facilita:

- Validación del tamaño.
- Progreso de descarga.
- Manejo simple de buffers.
- Detección de cuerpo incompleto.

---

### 6.2. Desventaja

Requiere conocer el peso total antes de iniciar el envío.

Esto puede ser incómodo o ineficiente cuando:

- El contenido se genera dinámicamente.
- El archivo es muy grande.
- La respuesta se construye en tiempo real.
- Se transmite video, logs o datos progresivos.
- El servidor no quiere esperar a tener todo listo.

En la diapositiva, `Content-Length` se representa como un bloque rígido: primero hay que formar el bloque completo y recién después enviarlo.

---

## 7. Transfer-Encoding: chunked

`Transfer-Encoding: chunked` permite enviar una respuesta HTTP en fragmentos.

Ejemplo:

```http
HTTP/1.1 200 OK
Content-Type: text/plain
Transfer-Encoding: chunked

```

Con este mecanismo, el servidor no necesita conocer el tamaño total del cuerpo desde el inicio.

Puede empezar a enviar datos mientras los produce.

---

### 7.1. Ventajas

`chunked` permite:

- Enviar datos inmediatamente.
- Reducir latencia inicial.
- Trabajar con contenido generado dinámicamente.
- Evitar cargar todo en memoria.
- Procesar grandes volúmenes de datos de forma progresiva.
- Mantener un flujo continuo entre productor y consumidor.

---

### 7.2. Advertencia de seguridad

La diapositiva destaca una advertencia importante:

> HTTP/1.1 RFC 9112 prohíbe usar simultáneamente `Content-Length` y `Transfer-Encoding` para evitar vulnerabilidades de Request Smuggling.

Esto es importante porque si un servidor interpreta el tamaño del cuerpo de una forma y un proxy lo interpreta de otra, un atacante podría manipular solicitudes HTTP ambiguas.

---

## 8. Anatomía de un flujo continuo con Chunked Transfer

En `Transfer-Encoding: chunked`, cada fragmento tiene una estructura propia.

La anatomía general es:

```text
chunk-size CRLF
chunk-data CRLF
```

Donde:

- `chunk-size`: tamaño del chunk en hexadecimal.
- `CRLF`: salto de línea HTTP representado como `\r\n`.
- `chunk-data`: datos útiles del fragmento.

---

### 8.1. Ejemplo conceptual

Supongamos que queremos enviar `Hola`.

La longitud de `Hola` es 4 bytes.

```http
4\r\n
Hola\r\n
0\r\n
\r\n
```

Explicación:

| Parte | Significado |
|---|---|
| `4\r\n` | El próximo chunk tiene 4 bytes |
| `Hola\r\n` | Datos del chunk |
| `0\r\n` | Chunk final, indica fin del cuerpo |
| `\r\n` | Cierre definitivo |

---

### 8.2. El chunk final

El último chunk tiene tamaño `0`.

```http
0\r\n
\r\n
```

Este bloque funciona como el “freno de emergencia” o señal de finalización.

Le indica al receptor que el flujo terminó.

---

### 8.3. Por qué se usa hexadecimal

El tamaño del chunk se escribe en hexadecimal.

Ejemplo:

```text
1A\r\n
```

`1A` en hexadecimal equivale a `26` en decimal.

Eso significa que el receptor debe leer 26 bytes de datos útiles para ese chunk.

---

## 9. Ejecución en Node.js: tipología de streams

Node.js implementa el patrón de flujo continuo mediante **Streams**.

Un stream permite manejar datos pieza por pieza, sin cargar todo en memoria.

---

## 10. Tipos principales de streams en Node.js

La diapositiva muestra cuatro estaciones de bombeo:

| Tipo de stream | Rol | Ejemplo |
|---|---|---|
| Readable | Fuente de datos | `fs.createReadStream()` |
| Writable | Destino de datos | `fs.createWriteStream()` |
| Duplex | Entrada y salida al mismo tiempo | `net.Socket` |
| Transform | Modifica datos en tránsito | `zlib.createGzip()` |

---

### 10.1. Readable Stream

Un `Readable` produce datos.

Ejemplo:

```js
const fs = require("fs");

const readable = fs.createReadStream("entrada.txt");

readable.on("data", (chunk) => {
  console.log("Chunk recibido:", chunk.length);
});
```

Casos típicos:

- Leer archivos.
- Recibir datos desde una conexión TCP.
- Leer entrada estándar.
- Procesar datos generados progresivamente.

---

### 10.2. Writable Stream

Un `Writable` consume datos.

Ejemplo:

```js
const fs = require("fs");

const writable = fs.createWriteStream("salida.txt");

writable.write("Hola mundo\n");
writable.end();
```

Casos típicos:

- Escribir archivos.
- Enviar respuesta HTTP.
- Enviar datos por socket.
- Guardar logs.

---

### 10.3. Duplex Stream

Un `Duplex` puede leer y escribir.

Ejemplo típico:

```js
const net = require("net");

const socket = net.connect(3000, "localhost");

socket.write("Hola servidor");

socket.on("data", (data) => {
  console.log("Respuesta:", data.toString());
});
```

`net.Socket` es un ejemplo de stream dúplex porque permite:

- Enviar datos.
- Recibir datos.
- Mantener una comunicación bidireccional.

---

### 10.4. Transform Stream

Un `Transform` recibe datos, los procesa y emite otros datos.

Ejemplo con compresión:

```js
const fs = require("fs");
const zlib = require("zlib");

fs.createReadStream("entrada.txt")
  .pipe(zlib.createGzip())
  .pipe(fs.createWriteStream("entrada.txt.gz"));
```

Casos típicos:

- Comprimir.
- Descomprimir.
- Cifrar.
- Decodificar.
- Transformar formato.
- Filtrar contenido.

---

## 11. El comando `.pipe()`: ensamblando la línea de montaje

`.pipe()` conecta streams entre sí.

La idea es formar una línea de montaje:

```text
Readable → Transform → Writable
```

Ejemplo:

```js
const fs = require("fs");
const zlib = require("zlib");

fs.createReadStream("archivo.txt")
  .pipe(zlib.createGzip())
  .pipe(fs.createWriteStream("archivo.txt.gz"));
```

---

### 11.1. Qué ocurre en ese pipeline

1. `fs.createReadStream()` lee el archivo por partes.
2. `zlib.createGzip()` comprime cada fragmento.
3. `fs.createWriteStream()` escribe el resultado comprimido.
4. El sistema controla el ritmo para no saturar memoria.

---

### 11.2. Ventajas de `.pipe()`

`.pipe()` permite:

- Evitar cargar archivos completos en memoria.
- Encadenar operaciones.
- Crear flujos legibles y mantenibles.
- Aprovechar backpressure automáticamente.
- Reducir riesgo de fugas de memoria.
- Trabajar con archivos grandes de manera estable.

---

### 11.3. Nota de seguridad: `pipeline()`

La diapositiva recomienda usar `pipeline()` en producción.

`pipeline()` es más seguro que `.pipe()` encadenado manualmente porque centraliza el manejo de errores y cierre de streams.

Ejemplo:

```js
const fs = require("fs");
const zlib = require("zlib");
const { pipeline } = require("stream/promises");

async function comprimir() {
  await pipeline(
    fs.createReadStream("archivo.txt"),
    zlib.createGzip(),
    fs.createWriteStream("archivo.txt.gz")
  );

  console.log("Compresión finalizada");
}

comprimir().catch((err) => {
  console.error("Error en el pipeline:", err);
});
```

---

## 12. Backpressure: previniendo la ruptura de la tubería

Backpressure significa **contrapresión**.

Ocurre cuando un productor genera datos más rápido de lo que el consumidor puede procesarlos.

Ejemplo:

```text
Productor rápido → Buffer intermedio → Consumidor lento
```

Si no hay control, el buffer crece sin límite.

---

### 12.1. Ejemplo de productor rápido y consumidor lento

Un caso típico:

- Lectura desde memoria o red: muy rápida.
- Escritura en disco: más lenta.

Si el sistema lee datos a toda velocidad y escribe despacio, se acumulan datos pendientes en memoria.

---

### 12.2. Consecuencias de ignorar backpressure

Ignorar backpressure puede provocar:

- Uso excesivo de RAM.
- Mayor trabajo del Garbage Collector.
- Pausas largas en V8.
- Latencia alta.
- Pérdida de estabilidad.
- Caída del proceso.
- Bloqueo de otros servicios.

La diapositiva lo representa como una tubería que acumula presión hasta llegar a una zona crítica.

---

## 13. El motor interno de la contrapresión

Node.js implementa backpressure mediante señales y estados.

La diapositiva muestra una máquina de estados de cuatro pasos.

---

### 13.1. Paso 1: Saturación

Un stream tiene un límite interno llamado `highWaterMark`.

Cuando el buffer supera ese umbral, el sistema considera que hay saturación.

Ejemplo visual de la clase:

```text
highWaterMark ≈ 16 KB
```

El valor real puede variar según el tipo de stream y configuración.

---

### 13.2. Paso 2: Señal de alerta

Cuando se escribe en un `Writable`, el método `.write()` puede devolver `false`.

```js
const ok = writable.write(chunk);

if (!ok) {
  // El consumidor está saturado
}
```

`false` no significa que la escritura falló.

Significa:

> “Recibí el dato, pero no sigas enviando por ahora porque el buffer está lleno o cerca del límite.”

---

### 13.3. Paso 3: Pausa automática

Cuando el sistema detecta saturación, debe pausar temporalmente la fuente.

Conceptualmente:

```js
readable.pause();
```

Esto evita seguir acumulando datos.

---

### 13.4. Paso 4: Drenaje y resurrección

Cuando el consumidor procesa datos pendientes, libera espacio.

Entonces emite el evento `drain`.

```js
writable.once("drain", () => {
  readable.resume();
});
```

El flujo se reactiva.

---

### 13.5. Ciclo completo

```text
1. El productor escribe datos.
2. El consumidor se satura.
3. write() devuelve false.
4. El productor pausa.
5. El consumidor drena.
6. Se emite drain.
7. El productor retoma.
```

Este ciclo evita la acumulación descontrolada.

---

## 14. Ejemplo manual de backpressure

```js
const fs = require("fs");

const readable = fs.createReadStream("archivo-grande.dat");
const writable = fs.createWriteStream("copia.dat");

readable.on("data", (chunk) => {
  const puedeSeguir = writable.write(chunk);

  if (!puedeSeguir) {
    readable.pause();

    writable.once("drain", () => {
      readable.resume();
    });
  }
});

readable.on("end", () => {
  writable.end();
});

readable.on("error", console.error);
writable.on("error", console.error);
```

Este ejemplo muestra explícitamente lo que `.pipe()` o `pipeline()` suelen manejar automáticamente.

---

## 15. El impacto en el rendimiento: datos empíricos

La clase compara el rendimiento de un sistema con y sin control de flujo.

---

### 15.1. Sin control de flujo

Según la diapositiva, sin backpressure:

- La memoria puede escalar hasta aproximadamente **1.52 GB de RAM**.
- El Garbage Collector trabaja bajo estrés.
- El sistema mantiene una carga mayor.
- El procesamiento se vuelve inestable.
- Se incrementa el riesgo de fugas y bloqueos.

---

### 15.2. Con backpressure

Con uso correcto de streams y backpressure:

- La memoria se mantiene alrededor de **87.81 MB de RAM**.
- El Garbage Collector se mantiene estable.
- La memoria usada es fija y constante.
- El proceso se vuelve más predecible.
- El sistema escala mejor.

---

### 15.3. Interpretación

La diferencia no es menor.

Procesar con backpressure no solo ahorra memoria, también protege al runtime.

El objetivo no es terminar “a cualquier costo”, sino mantener un flujo estable:

```text
Más importante que procesar rápido es procesar de forma sostenida.
```

---

## 16. Reglas de oro para implementar flujos personalizados

La clase resume tres reglas importantes.

---

## 17. Regla 1: Readable

> Jamás hagas `.push()` si no te lo piden.

En un `Readable`, no conviene emitir datos indiscriminadamente.

El consumidor debe marcar el ritmo.

---

### 17.1. Idea clave

Un `Readable` responsable produce datos cuando hay demanda.

No debe inundar al consumidor.

---

### 17.2. Ejemplo conceptual

Mal enfoque:

```js
// Produce sin considerar demanda
this.push(chunk1);
this.push(chunk2);
this.push(chunk3);
```

Mejor enfoque:

```js
_read() {
  // Producir solo cuando Node.js pide más datos
}
```

---

## 18. Regla 2: Writable

> Si `.write()` devuelve `false`, respetá la luz roja.

Cuando `.write()` devuelve `false`, el código debe esperar `drain`.

---

### 18.1. Ejemplo

```js
if (!writable.write(chunk)) {
  await new Promise((resolve) => writable.once("drain", resolve));
}
```

Esto evita escribir más rápido de lo que el destino puede aceptar.

---

## 19. Regla 3: Pipeline

> Cuidado con la asincronía.

Una lectura asíncrona sin retornos explícitos puede disparar llamadas múltiples e imprevisibles.

En producción, se recomienda `pipeline()` porque:

- Propaga errores.
- Cierra streams correctamente.
- Evita recursos colgados.
- Reduce fugas de memoria.
- Mejora la mantenibilidad.

---

## 20. Ejemplo recomendado con `pipeline()`

```js
const fs = require("fs");
const zlib = require("zlib");
const { pipeline } = require("stream/promises");

async function ejecutarPipeline() {
  await pipeline(
    fs.createReadStream("input.log"),
    zlib.createGzip(),
    fs.createWriteStream("input.log.gz")
  );
}

ejecutarPipeline()
  .then(() => console.log("Pipeline completado"))
  .catch((error) => console.error("Fallo el pipeline:", error));
```

---

## 21. Ingesta masiva de datos y forense digital AFF4

La clase conecta el patrón de flujos con el análisis forense digital.

AFF4 se presenta como un formato eficiente para trabajar con imágenes de disco.

---

## 22. Problema en imágenes forenses

Una imagen de disco puede ser enorme.

Copiar el disco bit a bit de forma directa puede ser ineficiente porque:

- Hay sectores vacíos.
- Hay bloques repetidos.
- Hay zonas no asignadas.
- Hay archivos fragmentados.
- Hay datos que pueden representarse de manera virtual.

---

## 23. Mapa de segmentos de datos

La diapositiva muestra un mapa de segmentos extraídos de una imagen.

En lugar de copiar todo el disco como un bloque único, AFF4 segmenta la imagen en secuencias de flujos de bytes.

Ejemplo conceptual:

```text
Disco físico:
[Bloque 100][Bloque 200][Bloque 300][Bloque 400]

Mapa AFF4:
Segmento A → Bloque 100
Segmento B → Bloque 200
Segmento C → Bloque 300
Segmento D → Bloque 400
```

Esto permite reconstruir la información sin depender necesariamente de una copia lineal completa.

---

## 24. Reconstrucción virtual

La reconstrucción virtual permite representar datos sin duplicarlos físicamente.

En vez de guardar todo muchas veces, se guarda:

- Un mapa.
- Referencias.
- Hashes.
- Fragmentos únicos.
- Relaciones entre segmentos.

Esto se parece al concepto de streams porque el sistema trabaja con partes ordenadas y direccionables.

---

## 25. Deduplicación matemática mediante flujos de bytes

La clase presenta la deduplicación como una “trituradora matemática”.

La idea es que bloques repetidos pueden detectarse mediante funciones hash.

Ejemplo conceptual:

```text
Fragmento A → hash 123
Fragmento B → hash 456
Fragmento C → hash 123
```

Si dos fragmentos tienen el mismo hash y el contenido coincide, pueden apuntar al mismo almacenamiento lógico.

---

### 25.1. Beneficio

La deduplicación permite:

- Ahorrar espacio.
- Evitar copias innecesarias.
- Comprimir material duplicado.
- Representar datos repetidos con referencias.
- Mejorar eficiencia de almacenamiento.
- Facilitar análisis forense sobre grandes volúmenes.

---

### 25.2. Relación con AFF4

En la diapositiva se menciona `aff4://sha1_hash`.

Esto representa la idea de direccionar contenido mediante un identificador derivado del hash.

En lugar de duplicar bytes, distintas regiones pueden apuntar a la misma entidad de datos.

---

## 26. La tríada universal de la eficiencia de datos

La última diapositiva resume el principio general en tres ideas.

---

## 27. Fragmentación dinámica

La fragmentación dinámica consiste en dividir datos grandes en partes manejables.

Aparece en:

- HTTP chunking.
- Streams de Node.js.
- Lectura por buffers.
- Segmentación AFF4.
- Paquetes y ventanas TCP.

---

## 28. Control de flujo

El control de flujo evita que un productor rápido destruya a un consumidor lento.

Aparece en:

- Windowing de TCP.
- Backpressure en V8 / Node.js.
- `.write() === false`.
- Evento `drain`.
- Pausas y reanudaciones de streams.

---

## 29. Reconstrucción virtual

La reconstrucción virtual permite representar una estructura completa a partir de fragmentos.

Aparece en:

- Hash maps.
- Deduplicación.
- AFF4.
- Mapas de segmentos.
- Sistemas de almacenamiento eficientes.

---

## 30. Principio final

El mensaje central de la clase es:

> Independientemente de la capa de abstracción —red, aplicación o almacenamiento— los sistemas resilientes abandonan el procesamiento monolítico y adoptan fragmentos delegados, controlados por señales de contrapresión.

En otras palabras:

```text
No proceses todo de golpe.
Dividí.
Controlá el ritmo.
Reconstruí cuando sea necesario.
```

---

# Resumen conceptual rápido

## Procesamiento monolítico

```text
Archivo enorme → RAM → Procesamiento → Salida
```

Problema:

- Alto consumo de memoria.
- Riesgo de bloqueo.
- Mal escalado.
- GC saturado.

---

## Procesamiento por flujo

```text
Archivo enorme → Chunk 1 → Procesar → Escribir
              → Chunk 2 → Procesar → Escribir
              → Chunk 3 → Procesar → Escribir
```

Ventajas:

- Menor memoria.
- Mejor estabilidad.
- Escalabilidad.
- Control de presión.
- Procesamiento progresivo.

---

# Comparación general

| Tema | Enfoque incorrecto | Enfoque correcto |
|---|---|---|
| Archivos grandes | Cargar todo en RAM | Usar streams |
| HTTP dinámico | Esperar a saber `Content-Length` | Usar chunked transfer |
| Escritura lenta | Ignorar `.write(false)` | Esperar `drain` |
| Transformaciones | Procesar todo junto | Usar `Transform` |
| Producción de datos | Emitir sin control | Respetar demanda |
| Forense digital | Copia lineal completa | Mapas, hashes y segmentos |
| Escalabilidad | Memoria creciente | Memoria estable |

---

# Vocabulario clave

## Stream

Flujo de datos que se procesa por partes.

---

## Chunk

Fragmento de datos. Puede ser un bloque leído desde disco, recibido por red o enviado por HTTP.

---

## Backpressure

Mecanismo por el cual un consumidor lento le indica al productor que debe reducir el ritmo.

---

## highWaterMark

Umbral interno que indica cuántos datos puede acumular un stream antes de considerarse saturado.

---

## drain

Evento que indica que un `Writable` volvió a tener capacidad disponible.

---

## pipe

Método que conecta la salida de un stream con la entrada de otro.

---

## pipeline

Función recomendada para conectar streams de forma segura, con manejo correcto de errores y cierre.

---

## Content-Length

Encabezado HTTP que indica el tamaño exacto del cuerpo.

---

## Transfer-Encoding: chunked

Modo de transferencia HTTP donde el cuerpo se envía en fragmentos de tamaño indicado.

---

## Sequence Number

Campo de TCP que identifica la posición de los bytes dentro del flujo.

---

## Window Size

Campo de TCP que indica la cantidad de datos que el receptor puede aceptar.

---

## AFF4

Formato usado en informática forense para representar imágenes y datos de manera eficiente mediante segmentos, flujos y referencias.

---

# Ejercicios prácticos sugeridos

## Ejercicio 1: Copiar un archivo grande con streams

Crear un script que copie un archivo usando `createReadStream` y `createWriteStream`.

```js
const fs = require("fs");
const { pipeline } = require("stream/promises");

async function copiar() {
  await pipeline(
    fs.createReadStream("origen.dat"),
    fs.createWriteStream("destino.dat")
  );

  console.log("Copia finalizada");
}

copiar().catch(console.error);
```

---

## Ejercicio 2: Comprimir un archivo grande

```js
const fs = require("fs");
const zlib = require("zlib");
const { pipeline } = require("stream/promises");

async function comprimir() {
  await pipeline(
    fs.createReadStream("archivo.log"),
    zlib.createGzip(),
    fs.createWriteStream("archivo.log.gz")
  );

  console.log("Archivo comprimido");
}

comprimir().catch(console.error);
```

---

## Ejercicio 3: Servidor HTTP con respuesta por chunks

```js
const http = require("http");

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain",
    "Transfer-Encoding": "chunked"
  });

  let contador = 0;

  const intervalo = setInterval(() => {
    contador++;

    res.write(`Chunk ${contador}\n`);

    if (contador === 5) {
      clearInterval(intervalo);
      res.end("Fin del flujo\n");
    }
  }, 1000);
});

server.listen(3000, () => {
  console.log("Servidor escuchando en http://localhost:3000");
});
```

---

## Ejercicio 4: Observar backpressure manualmente

```js
const fs = require("fs");

const readable = fs.createReadStream("archivo-grande.dat");
const writable = fs.createWriteStream("salida.dat");

readable.on("data", (chunk) => {
  const ok = writable.write(chunk);

  if (!ok) {
    console.log("Backpressure detectada. Pausando lectura.");
    readable.pause();

    writable.once("drain", () => {
      console.log("Buffer drenado. Reanudando lectura.");
      readable.resume();
    });
  }
});

readable.on("end", () => {
  writable.end();
  console.log("Proceso finalizado.");
});
```

---

# Preguntas de repaso

1. ¿Por qué cargar un archivo grande completo en memoria puede ser peligroso?
2. ¿Qué ventaja tiene trabajar con streams?
3. ¿Qué significa que el flujo continuo sea un patrón fractal?
4. ¿Qué función cumple el `Sequence Number` en TCP?
5. ¿Qué función cumple el `Window Size`?
6. ¿Qué diferencia hay entre `Content-Length` y `Transfer-Encoding: chunked`?
7. ¿Por qué no se deben usar `Content-Length` y `Transfer-Encoding` al mismo tiempo?
8. ¿Cómo se estructura un chunk HTTP?
9. ¿Qué indica el chunk de tamaño `0`?
10. ¿Qué es un `Readable Stream`?
11. ¿Qué es un `Writable Stream`?
12. ¿Qué es un `Duplex Stream`?
13. ¿Qué es un `Transform Stream`?
14. ¿Para qué sirve `.pipe()`?
15. ¿Por qué `pipeline()` es más seguro?
16. ¿Qué es backpressure?
17. ¿Qué significa que `.write()` devuelva `false`?
18. ¿Qué indica el evento `drain`?
19. ¿Qué problema se produce si se ignora el backpressure?
20. ¿Cómo se relaciona AFF4 con la arquitectura de flujos?
21. ¿Qué es la deduplicación mediante hashes?
22. ¿Cuál es la tríada universal de la eficiencia de datos?

---

# Conclusión

Esta clase muestra que la eficiencia no depende solamente de elegir una tecnología rápida, sino de diseñar correctamente el flujo de datos.

La idea central se puede resumir así:

```text
Los datos grandes no se cargan: fluyen.
Los sistemas eficientes no empujan sin control: escuchan señales.
Los sistemas escalables no duplican: referencian, fragmentan y reconstruyen.
```

En Node.js, esta filosofía se implementa principalmente con:

- `Readable`
- `Writable`
- `Duplex`
- `Transform`
- `.pipe()`
- `pipeline()`
- `backpressure`
- `drain`
- `highWaterMark`

Y a nivel de red y protocolos, la misma lógica aparece en:

- TCP Window Size.
- Sequence Numbers.
- HTTP chunked transfer.
- Segmentación de datos.
- Reconstrucción virtual.

La arquitectura del flujo de datos es, por lo tanto, una forma de pensar sistemas robustos, eficientes y escalables.
