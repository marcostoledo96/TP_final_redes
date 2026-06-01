# Redes con Node.js — Clase 1

## Tema central

**El arte de programar el cable: redes con Node.js**

Esta clase introduce cómo Node.js permite trabajar con redes desde una perspectiva de desarrollo, conectando conceptos de sistemas operativos, asincronía, modelos de red, protocolos de transporte y manejo de datos binarios.

La idea principal es entender que programar redes no es solamente “usar HTTP”, sino comprender cómo viajan los datos, cómo Node.js se comunica con el sistema operativo y cómo se representan los datos en memoria antes de enviarlos por la red.

---

## 1. Node.js y la eficiencia del I/O no bloqueante

### 1.1. Problema del modelo tradicional

En modelos tradicionales de servidor, como el enfoque clásico asociado a servidores tipo Apache, se suele trabajar con la idea de:

> **Un hilo por conexión.**

Esto significa que cada cliente conectado puede requerir un hilo de ejecución propio o un recurso similar para atender su solicitud.

### Problemas de este modelo

Cuando hay muchas conexiones simultáneas, este enfoque puede generar:

- Alto consumo de **RAM**.
- Alto consumo de **CPU**.
- Mayor costo por **cambio de contexto**.
- Menor eficiencia cuando muchas conexiones están esperando operaciones de entrada/salida.
- Escalabilidad más difícil cuando aumenta la cantidad de clientes conectados.

### ¿Qué es el cambio de contexto?

Un **cambio de contexto** ocurre cuando el sistema operativo deja de ejecutar un hilo o proceso para ejecutar otro.

Ese cambio no es gratis: el sistema tiene que guardar el estado actual, cargar el estado del siguiente hilo y continuar desde allí. Si hay muchos hilos compitiendo, el sistema puede gastar mucho tiempo administrando hilos en vez de procesar trabajo útil.

---

## 2. Modelo de Node.js: un hilo principal + I/O asíncrono

Node.js propone un modelo distinto:

> **Un único hilo principal para ejecutar JavaScript + operaciones de I/O asíncronas.**

Esto no significa que Node.js “hace todo con un solo hilo” en sentido absoluto. Lo importante es distinguir:

- El código JavaScript del usuario corre principalmente en un hilo.
- Las operaciones de entrada/salida pueden delegarse al sistema operativo o a componentes internos.
- Node.js no se queda detenido esperando que una operación termine.
- Cuando la operación finaliza, el resultado vuelve mediante callbacks, promesas o eventos.

### 2.1. ¿Qué significa I/O?

**I/O** significa **Input/Output**, es decir, entrada y salida.

Ejemplos de I/O:

- Leer un archivo.
- Escribir un archivo.
- Consultar una base de datos.
- Recibir datos desde un socket.
- Enviar una respuesta HTTP.
- Esperar paquetes de red.
- Leer desde disco.
- Escribir en disco.

Muchas operaciones de I/O son lentas comparadas con la velocidad de la CPU. Por eso, si el programa se queda bloqueado esperando, desperdicia tiempo.

### 2.2. ¿Qué significa “no bloqueante”?

Una operación **bloqueante** detiene la ejecución hasta obtener el resultado.

Una operación **no bloqueante** permite iniciar una tarea y continuar ejecutando otras instrucciones mientras esa tarea se completa.

Ejemplo conceptual:

```js
// Operación asíncrona: Node.js no bloquea todo el programa esperando.
fs.readFile("archivo.txt", (err, data) => {
  if (err) throw err;
  console.log(data.toString());
});

console.log("Esto puede ejecutarse antes de terminar la lectura.");
```

En este ejemplo, Node.js puede continuar procesando mientras espera que el sistema operativo devuelva el contenido del archivo.

---

## 3. El Event Loop

El **Event Loop** es una pieza central de Node.js. Es el mecanismo que permite coordinar tareas pendientes, callbacks, timers, operaciones de I/O y otros eventos asíncronos.

Según la documentación de Node.js, el Event Loop es lo que permite que Node.js realice operaciones de I/O no bloqueantes, aunque JavaScript se ejecute en un único hilo principal, delegando operaciones al kernel del sistema cuando es posible.

### 3.1. Idea básica

El Event Loop funciona como un ciclo que revisa constantemente:

- Si hay callbacks listos para ejecutar.
- Si terminó alguna operación de I/O.
- Si hay timers vencidos.
- Si hay eventos pendientes.
- Si hay tareas programadas para la próxima vuelta del ciclo.

### 3.2. Fases simplificadas del Event Loop

Aunque internamente tiene varias fases, para esta clase alcanza con entender:

1. JavaScript ejecuta código en el hilo principal.
2. Una operación lenta se delega.
3. Node.js continúa procesando otras tareas.
4. Cuando la operación termina, se encola un callback.
5. El Event Loop toma ese callback cuando corresponde.
6. Se ejecuta el callback en el hilo principal.

### 3.3. Por qué importa en redes

En redes, un servidor suele tener muchas conexiones esperando datos. Si cada conexión bloqueara el programa, el servidor sería poco eficiente.

Con Event Loop e I/O no bloqueante:

- Node.js puede aceptar muchas conexiones.
- Puede esperar datos sin detener todo el proceso.
- Puede responder cuando llegan eventos de red.
- Puede manejar servidores HTTP, TCP, UDP y WebSocket de forma eficiente.

---

## 4. Debajo del capó: libuv y POSIX

Node.js no trabaja directamente “solo” con JavaScript. Debajo existe una arquitectura que conecta el código JS con el sistema operativo.

La clase presenta esta cadena conceptual:

```text
Código JavaScript del usuario
        ↓
API de Node.js / bindings
        ↓
libuv / Event Loop
        ↓
Kernel del sistema operativo / capa POSIX
        ↓
Recursos reales: red, archivos, sockets, timers, etc.
```

---

## 5. libuv

**libuv** es una biblioteca escrita en C que Node.js utiliza para manejar asincronía, eventos, operaciones de I/O, timers, sockets y abstracciones del sistema operativo.

En la clase se menciona como el “motor C++” que gestiona la asincronía. Técnicamente, libuv está implementada principalmente en C, pero forma parte de la arquitectura nativa sobre la que Node.js se apoya.

### 5.1. Funciones principales de libuv

libuv permite:

- Implementar el Event Loop.
- Manejar sockets TCP y UDP.
- Trabajar con operaciones de archivos.
- Gestionar timers.
- Delegar ciertas operaciones a un pool de hilos.
- Unificar diferencias entre sistemas operativos.
- Usar mecanismos eficientes del kernel.

### 5.2. Por qué es importante

Gracias a libuv, el desarrollador puede escribir código JavaScript de alto nivel sin tener que programar directamente contra APIs complejas de cada sistema operativo.

Ejemplo:

```js
const net = require("node:net");

const server = net.createServer((socket) => {
  socket.write("Hola desde TCP\n");
  socket.end();
});

server.listen(3000);
```

El desarrollador usa `net`, pero por debajo Node.js, libuv y el sistema operativo se encargan de abrir sockets, escuchar conexiones y notificar eventos.

---

## 6. POSIX y la adaptación al sistema operativo

La clase menciona **POSIX** como una interfaz estándar para interactuar con sistemas operativos tipo Unix.

### 6.1. ¿Qué es POSIX?

**POSIX** es una familia de estándares que define APIs e interfaces para sistemas operativos. Su objetivo es facilitar compatibilidad entre sistemas similares a Unix.

Node.js no usa exactamente el mismo mecanismo interno en todos los sistemas. En cambio, se adapta al kernel de cada sistema operativo.

### 6.2. Mecanismos usados según el sistema

La clase menciona tres mecanismos importantes:

| Sistema operativo | Mecanismo | Uso general |
|---|---|---|
| Linux | `epoll` | Notificación eficiente de eventos de I/O |
| macOS / BSD | `kqueue` | Notificación de eventos del kernel |
| Windows | `IOCP` | I/O Completion Ports para operaciones asíncronas |

### 6.3. Idea importante

Node.js ofrece una API relativamente uniforme para el programador, pero por debajo puede usar mecanismos distintos según el sistema operativo.

Es decir:

```text
Tu código JS puede ser casi igual en Linux, macOS o Windows,
pero el mecanismo interno que escucha eventos de red puede cambiar.
```

---

## 7. Arquitectura conceptual de Node.js para I/O

Según los diagramas de la clase, la arquitectura puede entenderse así:

```text
Usuarios / conexiones
        ↓
JavaScript thread / V8
        ↓
Event Loop
        ↓
Delegación de I/O a libuv
        ↓
Sistema operativo
        ↓
Disco, red, base de datos, sistema de archivos
        ↓
Resultado devuelto al Event Loop
        ↓
Callback / evento / promesa
```

### 7.1. V8

**V8** es el motor de JavaScript desarrollado por Google. Node.js lo utiliza para ejecutar código JavaScript fuera del navegador.

V8 ejecuta el código JS, pero no se encarga por sí solo de la red, archivos o sockets. Para eso Node.js incorpora APIs propias y se apoya en libuv.

### 7.2. Thread principal

El thread principal ejecuta:

- Código JavaScript.
- Callbacks.
- Resolución de promesas.
- Manejo de eventos.
- Lógica de aplicación.

### 7.3. Thread pool

Algunas operaciones se delegan a un pool de hilos, por ejemplo ciertas operaciones de archivos, DNS o criptografía. Esto permite evitar que el hilo principal quede bloqueado.

---

## 8. Modelos de red desde la perspectiva del desarrollador

La clase introduce dos modelos importantes:

1. **Modelo OSI**
2. **Modelo TCP/IP**

---

## 9. Modelo OSI

El modelo **OSI** es un marco teórico de 7 capas definido por ISO/IEC 7498-1.

Sirve para entender cómo se divide conceptualmente la comunicación de red.

### 9.1. Capas del modelo OSI

| Capa | Nombre | Función general |
|---|---|---|
| 7 | Aplicación | Servicios visibles para aplicaciones: HTTP, FTP, SMTP, DNS, etc. |
| 6 | Presentación | Formato, codificación, compresión, cifrado |
| 5 | Sesión | Administración de sesiones entre sistemas |
| 4 | Transporte | Comunicación extremo a extremo: TCP, UDP |
| 3 | Red | Direccionamiento y ruteo: IP |
| 2 | Enlace de datos | Comunicación en red local: Ethernet, MAC |
| 1 | Física | Señales eléctricas, ópticas o radio |

### 9.2. Utilidad del modelo OSI

El modelo OSI ayuda a:

- Ordenar conceptos.
- Diagnosticar problemas.
- Separar responsabilidades.
- Entender en qué nivel trabaja cada protocolo.
- Ubicar dónde interviene una aplicación.

Ejemplo:

- Si falla el cable, el problema está en capa física.
- Si falla la IP, puede estar en capa de red.
- Si se pierden conexiones TCP, puede estar en transporte.
- Si una API responde error 500, suele estar en aplicación.

---

## 10. Modelo TCP/IP

El modelo **TCP/IP** es el modelo práctico usado en Internet.

A diferencia de OSI, suele representarse con menos capas:

| Capa TCP/IP | Equivalencia aproximada con OSI | Ejemplos |
|---|---|---|
| Aplicación | OSI 5, 6 y 7 | HTTP, HTTPS, WebSocket, DNS |
| Transporte | OSI 4 | TCP, UDP |
| Internet | OSI 3 | IP |
| Acceso a la red | OSI 1 y 2 | Ethernet, Wi-Fi |

### 10.1. Diferencia entre OSI y TCP/IP

- **OSI**: modelo teórico, útil para estudiar y razonar.
- **TCP/IP**: modelo real y práctico usado en Internet.

### 10.2. Foco de la materia

La clase indica que el foco estará en hablar principalmente con:

- **Capa de Transporte**: TCP y UDP.
- **Capa de Aplicación**: HTTP y WebSocket.

En Node.js esto se relaciona con módulos como:

- `net` para TCP.
- `dgram` para UDP.
- `http` / `https` para HTTP y HTTPS.
- Librerías externas para WebSocket, como `ws`.

---

## 11. Protocolos de transporte: RFC 768 y RFC 9293

La red se rige por estándares llamados **RFCs**, publicados por la IETF.

### 11.1. ¿Qué es una RFC?

Una **RFC** (*Request for Comments*) es un documento técnico que define estándares, protocolos, prácticas o especificaciones relacionadas con Internet.

En redes, las RFCs son fundamentales porque permiten que sistemas distintos se comuniquen siguiendo reglas comunes.

---

## 12. UDP — RFC 768

**UDP** significa **User Datagram Protocol**.

La clase lo describe como:

> Minimalista, rápido y sin conexión.

En Node.js, UDP se trabaja mediante el módulo:

```js
const dgram = require("node:dgram");
```

### 12.1. Características principales de UDP

UDP es:

- Sin conexión.
- Rápido.
- Ligero.
- Basado en datagramas.
- No garantiza entrega.
- No garantiza orden.
- No retransmite automáticamente.
- No establece handshake.
- Tiene menos sobrecarga que TCP.

### 12.2. ¿Qué es un datagrama?

Un **datagrama** es una unidad independiente de datos enviada por la red. Cada datagrama se trata como un mensaje separado.

En UDP, enviar un mensaje no requiere establecer una conexión previa.

### 12.3. Ventajas de UDP

UDP puede ser útil cuando importa más la velocidad que la confiabilidad total.

Ejemplos:

- Streaming de audio o video.
- Juegos en tiempo real.
- Transmisiones en vivo.
- VoIP.
- Sistemas donde perder un paquete ocasional es aceptable.
- Descubrimiento de servicios en red local.

### 12.4. Desventajas de UDP

UDP no garantiza:

- Que el mensaje llegue.
- Que llegue una sola vez.
- Que llegue en orden.
- Que el receptor esté disponible.
- Que se retransmita si se pierde.

Por eso, si una aplicación necesita confiabilidad sobre UDP, debe implementarla por su cuenta.

### 12.5. Ejemplo simple de servidor UDP en Node.js

```js
const dgram = require("node:dgram");

const server = dgram.createSocket("udp4");

server.on("message", (msg, rinfo) => {
  console.log(`Mensaje recibido: ${msg}`);
  console.log(`Desde ${rinfo.address}:${rinfo.port}`);
});

server.bind(41234);
```

### 12.6. Ejemplo simple de cliente UDP

```js
const dgram = require("node:dgram");

const client = dgram.createSocket("udp4");

const message = Buffer.from("Hola por UDP");

client.send(message, 41234, "localhost", (err) => {
  if (err) throw err;
  client.close();
});
```

---

## 13. TCP — RFC 9293

**TCP** significa **Transmission Control Protocol**.

La clase lo describe como:

> Fiabilidad, orden y control de flujo garantizados.

En Node.js, TCP se trabaja mediante el módulo:

```js
const net = require("node:net");
```

### 13.1. Características principales de TCP

TCP es:

- Orientado a conexión.
- Confiable.
- Ordenado.
- Basado en flujo de bytes.
- Tiene control de flujo.
- Tiene control de congestión.
- Usa confirmaciones.
- Reenvía segmentos perdidos.
- Requiere establecer conexión antes de enviar datos.

### 13.2. Three-way handshake

Antes de transmitir datos, TCP establece una conexión mediante un proceso conocido como **three-way handshake**.

De forma simplificada:

```text
Cliente → Servidor: SYN
Servidor → Cliente: SYN-ACK
Cliente → Servidor: ACK
```

Después de este intercambio, la conexión queda establecida.

### 13.3. Ventajas de TCP

TCP es ideal cuando se necesita:

- Que los datos lleguen.
- Que lleguen en orden.
- Que no haya pérdidas silenciosas.
- Que la comunicación sea confiable.
- Que se controle la velocidad de envío.

Ejemplos:

- HTTP.
- HTTPS.
- APIs REST.
- WebSockets.
- Transferencia de archivos.
- Bases de datos.
- SSH.

### 13.4. Desventajas de TCP

TCP tiene más sobrecarga que UDP porque incluye mecanismos de:

- Conexión.
- Confirmación.
- Retransmisión.
- Ordenamiento.
- Control de flujo.
- Control de congestión.

Por eso puede ser menos conveniente cuando se prioriza latencia mínima y se tolera pérdida de paquetes.

### 13.5. Ejemplo simple de servidor TCP en Node.js

```js
const net = require("node:net");

const server = net.createServer((socket) => {
  console.log("Cliente conectado");

  socket.on("data", (data) => {
    console.log(`Recibido: ${data.toString()}`);
    socket.write("Mensaje recibido\n");
  });

  socket.on("end", () => {
    console.log("Cliente desconectado");
  });
});

server.listen(3000, () => {
  console.log("Servidor TCP escuchando en puerto 3000");
});
```

### 13.6. Ejemplo simple de cliente TCP

```js
const net = require("node:net");

const client = net.createConnection({ port: 3000 }, () => {
  client.write("Hola por TCP");
});

client.on("data", (data) => {
  console.log(data.toString());
  client.end();
});
```

---

## 14. Comparación entre UDP y TCP

| Característica | UDP | TCP |
|---|---|---|
| RFC | RFC 768 | RFC 9293 |
| Tipo | Sin conexión | Orientado a conexión |
| Unidad de datos | Datagramas | Flujo de bytes |
| Velocidad | Mayor velocidad y menor sobrecarga | Mayor confiabilidad |
| Entrega garantizada | No | Sí |
| Orden garantizado | No | Sí |
| Retransmisión | No automática | Sí |
| Control de flujo | No | Sí |
| Uso típico | Streaming, juegos, tiempo real | HTTP, HTTPS, WebSocket, APIs |
| Módulo Node.js | `dgram` | `net` |

---

## 15. El lenguaje de la red: buffers y octetos

La clase introduce una idea fundamental:

> La red son flujos de unos y ceros. JavaScript necesita ayuda para trabajar con datos binarios puros.

JavaScript trabaja cómodamente con strings, objetos, arrays y números, pero la red transmite bytes. Para controlar realmente lo que se envía, Node.js usa **Buffer**.

---

## 16. Octeto

Un **octeto** es una unidad de 8 bits.

La clase aclara que “octeto” es el término formal usado por la IETF para referirse estrictamente a 8 bits.

### 16.1. Bit, byte y octeto

| Término | Significado |
|---|---|
| Bit | Unidad mínima: 0 o 1 |
| Byte | Unidad común de almacenamiento |
| Octeto | Grupo de exactamente 8 bits |

En la práctica moderna, byte y octeto suelen usarse como equivalentes, pero en protocolos de red se prefiere “octeto” para evitar ambigüedades históricas.

---

## 17. Buffer en Node.js

Un **Buffer** es una clase de Node.js diseñada para manejar datos binarios.

La documentación de Node.js explica que `Buffer` se usa para representar secuencias de bytes de longitud fija.

### 17.1. ¿Para qué sirve Buffer?

Sirve para trabajar con:

- Datos binarios.
- Paquetes de red.
- Archivos.
- Streams.
- Protocolos.
- Codificaciones.
- Datos que no necesariamente son texto.

### 17.2. Buffer y memoria

La clase menciona un punto importante:

> Buffer usa memoria fija fuera del motor V8.

Esto significa que el contenido binario del Buffer puede estar asignado fuera del heap normal de V8. Por eso es especialmente útil para manejar datos de red o archivos de forma eficiente.

### 17.3. Crear un Buffer desde texto

```js
const buf = Buffer.from("Hola");

console.log(buf);
// <Buffer 48 6f 6c 61>
```

La palabra `"Hola"` queda representada en hexadecimal como:

| Carácter | Hexadecimal |
|---|---|
| H | `0x48` |
| o | `0x6F` |
| l | `0x6C` |
| a | `0x61` |

Esto coincide con el ejemplo visual de la clase, donde el Buffer de Node.js contiene 4 octetos:

```text
'H'  'o'  'l'  'a'
0x48 0x6F 0x6C 0x61
```

### 17.4. Crear un Buffer con tamaño fijo

```js
const buf = Buffer.alloc(4);

buf[0] = 0x48;
buf[1] = 0x6f;
buf[2] = 0x6c;
buf[3] = 0x61;

console.log(buf.toString()); // Hola
```

### 17.5. Leer bytes individuales

```js
const buf = Buffer.from("Hola");

console.log(buf[0]); // 72 decimal
console.log(buf[0].toString(16)); // 48 hexadecimal
```

### 17.6. Convertir Buffer a string

```js
const buf = Buffer.from([0x48, 0x6f, 0x6c, 0x61]);

console.log(buf.toString("utf8")); // Hola
```

---

## 18. Arquitectura de datos: Endianness y Network Byte Order

La clase introduce el problema del orden de bytes cuando se representan números de más de un byte.

### 18.1. ¿Qué es Endianness?

**Endianness** describe el orden en que una computadora almacena los bytes que forman un número.

Esto importa cuando un valor ocupa más de un byte.

Ejemplo: el número hexadecimal de 32 bits:

```text
0x12345678
```

Este número ocupa 4 bytes:

```text
0x12 0x34 0x56 0x78
```

La pregunta es: ¿en qué orden se guardan esos bytes en memoria?

---

## 19. Little-Endian

La clase indica:

> Little-Endian (x86): guardamos el byte menos significativo primero.

En Little-Endian, el byte menos significativo se guarda en la dirección más baja de memoria.

Ejemplo para `0x12345678`:

```text
0x78 0x56 0x34 0x12
```

### 19.1. Dónde se usa

Little-Endian es común en arquitecturas x86 y en procesadores Intel modernos.

---

## 20. Big-Endian

La clase indica:

> Big-Endian (red): los protocolos TCP/IP exigen este orden.

En Big-Endian, el byte más significativo se guarda primero.

Ejemplo para `0x12345678`:

```text
0x12 0x34 0x56 0x78
```

### 20.1. Network Byte Order

En redes, Big-Endian también se conoce como:

> **Network Byte Order**

Esto es importante porque muchos protocolos de Internet esperan que los números multibyte viajen en Big-Endian.

---

## 21. Por qué Endianness importa en redes

Cuando enviamos texto simple, como `"Hola"`, cada carácter puede representarse como bytes y el problema parece simple.

Pero cuando enviamos números, por ejemplo:

- Un puerto.
- Un tamaño de paquete.
- Un identificador.
- Una longitud.
- Un timestamp.
- Un número de secuencia.
- Un código de operación.

El receptor necesita interpretar los bytes en el mismo orden que el emisor.

Si un sistema envía un número en Little-Endian y el otro lo interpreta como Big-Endian, el valor leído será incorrecto.

---

## 22. Uso explícito de métodos BE y LE en Buffer

La clase destaca que hay que usar métodos explícitos como:

```js
buffer.writeUInt32BE()
```

En Node.js, los métodos suelen indicar el orden de bytes:

| Método | Significado |
|---|---|
| `writeUInt16BE` | Escribe entero sin signo de 16 bits en Big-Endian |
| `writeUInt16LE` | Escribe entero sin signo de 16 bits en Little-Endian |
| `writeUInt32BE` | Escribe entero sin signo de 32 bits en Big-Endian |
| `writeUInt32LE` | Escribe entero sin signo de 32 bits en Little-Endian |
| `readUInt16BE` | Lee entero sin signo de 16 bits en Big-Endian |
| `readUInt16LE` | Lee entero sin signo de 16 bits en Little-Endian |
| `readUInt32BE` | Lee entero sin signo de 32 bits en Big-Endian |
| `readUInt32LE` | Lee entero sin signo de 32 bits en Little-Endian |

---

## 23. Ejemplo práctico de Endianness en Node.js

```js
const bufBE = Buffer.alloc(4);
const bufLE = Buffer.alloc(4);

bufBE.writeUInt32BE(0x12345678);
bufLE.writeUInt32LE(0x12345678);

console.log(bufBE);
// <Buffer 12 34 56 78>

console.log(bufLE);
// <Buffer 78 56 34 12>
```

### Interpretación

```text
Big-Endian:
0x12 0x34 0x56 0x78

Little-Endian:
0x78 0x56 0x34 0x12
```

En protocolos de red, normalmente se debe usar Big-Endian.

---

## 24. Ejemplo aplicado a un protocolo propio

Supongamos que queremos enviar un mensaje binario con esta estructura:

```text
[ tipo de mensaje: 1 byte ][ longitud: 4 bytes ][ contenido ]
```

Podríamos construirlo así:

```js
const payload = Buffer.from("Hola");
const header = Buffer.alloc(5);

header.writeUInt8(1, 0); // tipo de mensaje
header.writeUInt32BE(payload.length, 1); // longitud en Network Byte Order

const packet = Buffer.concat([header, payload]);

console.log(packet);
```

Resultado conceptual:

```text
01 00 00 00 04 48 6f 6c 61
```

Donde:

- `01` es el tipo de mensaje.
- `00 00 00 04` es la longitud 4 en Big-Endian.
- `48 6f 6c 61` es `"Hola"`.

---

## 25. Node.js y las capas de red

La clase muestra que Node.js permite interactuar directamente con capas de red relevantes para el desarrollador.

### 25.1. Capa de transporte

Node.js permite trabajar con transporte usando:

```js
node:net     // TCP
node:dgram   // UDP
```

### 25.2. Capa de aplicación

Node.js permite trabajar con aplicación usando:

```js
node:http
node:https
```

También puede trabajar con WebSocket mediante librerías como:

```bash
npm install ws
```

### 25.3. Relación conceptual

```text
HTTP / WebSocket
        ↓
TCP
        ↓
IP
        ↓
Red física o inalámbrica
```

UDP no usa TCP, sino que se ubica también en transporte:

```text
Aplicación propia / streaming / juego
        ↓
UDP
        ↓
IP
        ↓
Red física o inalámbrica
```

---

## 26. Resumen visual conceptual de la clase

```text
JavaScript del usuario
        ↓
Node.js API
        ↓
libuv
        ↓
Event Loop
        ↓
Sistema operativo
        ↓
epoll / kqueue / IOCP
        ↓
Sockets / red / archivos
```

Y a nivel de red:

```text
Aplicación: HTTP, WebSocket, protocolos propios
Transporte: TCP o UDP
Internet: IP
Acceso a red: Ethernet, Wi-Fi
```

Y a nivel de datos:

```text
Datos reales de red = octetos = bytes = secuencias de bits
Node.js los maneja con Buffer
Los números multibyte deben respetar endianness
En red se usa Big-Endian / Network Byte Order
```

---

## 27. Conceptos clave de la clase

| Concepto | Definición breve |
|---|---|
| Node.js | Entorno de ejecución de JavaScript fuera del navegador |
| V8 | Motor que ejecuta JavaScript |
| I/O | Entrada/salida: red, archivos, base de datos, etc. |
| No bloqueante | Permite continuar mientras una operación espera resultado |
| Event Loop | Ciclo que coordina callbacks y eventos asíncronos |
| libuv | Biblioteca que implementa el Event Loop y abstracciones de I/O |
| POSIX | Estándar de interfaces de sistema operativo tipo Unix |
| epoll | Mecanismo de Linux para eventos de I/O |
| kqueue | Mecanismo de BSD/macOS para eventos del kernel |
| IOCP | Mecanismo de Windows para I/O asíncrono |
| OSI | Modelo teórico de red de 7 capas |
| TCP/IP | Modelo práctico usado en Internet |
| RFC | Documento técnico de estandarización de Internet |
| UDP | Protocolo rápido, sin conexión y no confiable |
| TCP | Protocolo confiable, ordenado y orientado a conexión |
| Buffer | Clase de Node.js para manejar bytes |
| Octeto | Grupo de exactamente 8 bits |
| Endianness | Orden de bytes de un número multibyte |
| Little-Endian | Byte menos significativo primero |
| Big-Endian | Byte más significativo primero |
| Network Byte Order | Orden Big-Endian usado en redes |

---

## 28. Puntos importantes para estudiar

### Node.js

- Node.js usa un modelo de I/O no bloqueante.
- El código JS corre principalmente en un hilo.
- El Event Loop permite manejar múltiples operaciones asíncronas.
- libuv conecta Node.js con mecanismos del sistema operativo.
- Node.js se adapta a Linux, macOS y Windows mediante distintas APIs internas.

### Redes

- OSI sirve para entender capas de forma teórica.
- TCP/IP es el modelo real de Internet.
- TCP y UDP pertenecen a la capa de transporte.
- HTTP y WebSocket pertenecen a la capa de aplicación.
- Las redes se basan en estándares definidos en RFCs.

### Protocolos

- UDP es rápido, simple y sin conexión.
- TCP es confiable, ordenado y orientado a conexión.
- UDP se usa cuando se prioriza velocidad.
- TCP se usa cuando se prioriza confiabilidad.

### Datos binarios

- La red transmite bytes, no objetos JavaScript.
- Buffer permite manipular datos binarios.
- Un octeto equivale a 8 bits.
- Endianness define cómo se ordenan los bytes de un número.
- En red se utiliza Big-Endian o Network Byte Order.

---

## 29. Preguntas de repaso

1. ¿Qué problema tiene el modelo tradicional de un hilo por conexión?
2. ¿Por qué Node.js puede manejar muchas conexiones simultáneas de forma eficiente?
3. ¿Qué es el Event Loop?
4. ¿Qué rol cumple libuv dentro de Node.js?
5. ¿Qué diferencia hay entre V8 y libuv?
6. ¿Qué significa POSIX?
7. ¿Qué mecanismos usa Node.js en Linux, macOS y Windows para eventos de I/O?
8. ¿Cuál es la diferencia entre OSI y TCP/IP?
9. ¿En qué capa se ubican TCP y UDP?
10. ¿En qué capa se ubican HTTP y WebSocket?
11. ¿Qué es una RFC?
12. ¿Qué define UDP?
13. ¿Qué define TCP?
14. ¿Cuándo conviene usar UDP?
15. ¿Cuándo conviene usar TCP?
16. ¿Qué es un Buffer?
17. ¿Por qué JavaScript necesita Buffer para redes?
18. ¿Qué es un octeto?
19. ¿Qué es Endianness?
20. ¿Cuál es la diferencia entre Little-Endian y Big-Endian?
21. ¿Por qué Big-Endian se llama Network Byte Order?
22. ¿Por qué conviene usar `writeUInt32BE()` al armar datos de red?
23. ¿Qué puede pasar si emisor y receptor interpretan distinto el orden de bytes?
24. ¿Qué módulo de Node.js se usa para TCP?
25. ¿Qué módulo de Node.js se usa para UDP?

---

## 30. Ejercicios sugeridos

### Ejercicio 1: Buffer de texto

Crear un Buffer con el texto `"Redes"` e imprimir:

- El Buffer completo.
- Cada byte en decimal.
- Cada byte en hexadecimal.
- El texto reconstruido con `toString()`.

```js
const buf = Buffer.from("Redes");

console.log(buf);

for (const byte of buf) {
  console.log(byte, byte.toString(16));
}

console.log(buf.toString("utf8"));
```

---

### Ejercicio 2: Big-Endian vs Little-Endian

Crear dos buffers de 4 bytes y escribir el número `0x12345678` en ambos órdenes.

```js
const be = Buffer.alloc(4);
const le = Buffer.alloc(4);

be.writeUInt32BE(0x12345678);
le.writeUInt32LE(0x12345678);

console.log("BE:", be);
console.log("LE:", le);
```

---

### Ejercicio 3: Servidor TCP básico

Crear un servidor TCP que responda “Hola cliente”.

```js
const net = require("node:net");

const server = net.createServer((socket) => {
  socket.write("Hola cliente\n");
  socket.end();
});

server.listen(3000, () => {
  console.log("Servidor TCP escuchando en puerto 3000");
});
```

---

### Ejercicio 4: Servidor UDP básico

Crear un servidor UDP que imprima los mensajes recibidos.

```js
const dgram = require("node:dgram");

const server = dgram.createSocket("udp4");

server.on("message", (msg, rinfo) => {
  console.log(`Mensaje: ${msg.toString()}`);
  console.log(`Origen: ${rinfo.address}:${rinfo.port}`);
});

server.bind(41234);
```

---

## 31. Enlaces incluidos para esta clase

### MDN — Endianness

Enlace:

```text
https://developer.mozilla.org/en-US/docs/Glossary/Endianness
```

Resumen:

- Explica que endianness describe cómo las computadoras organizan los bytes que forman números.
- Little-Endian guarda primero el byte menos significativo.
- Big-Endian guarda primero el byte más significativo.
- Big-Endian suele llamarse Network Byte Order porque los estándares de Internet normalmente requieren ese orden.

---

### Node.js — Buffer

Enlace:

```text
https://nodejs.org/api/buffer.html
```

Resumen:

- Documenta la clase `Buffer`.
- Explica cómo Node.js representa secuencias de bytes.
- Incluye métodos para crear, leer y escribir datos binarios.
- Incluye métodos explícitos para Big-Endian y Little-Endian.

---

### Node.js — Event Loop, Timers and `nextTick`

Enlace:

```text
https://nodejs.org/learn/asynchronous-work/event-loop-timers-and-nexttick
```

Resumen:

- Explica cómo funciona el Event Loop en Node.js.
- Relaciona el Event Loop con operaciones de I/O no bloqueantes.
- Describe cómo Node.js delega operaciones al sistema cuando es posible.
- Ayuda a entender por qué Node.js puede manejar muchas operaciones concurrentes sin crear un hilo por cada conexión.

---

## 32. Conclusiones de la clase

La clase cierra con tres ideas principales:

1. **Node.js como abstracción del sistema operativo y POSIX.**  
   Node.js permite programar redes desde JavaScript, pero por debajo se apoya en V8, libuv y mecanismos del sistema operativo como epoll, kqueue o IOCP.

2. **Importancia de los estándares RFC y los octetos.**  
   Las redes funcionan porque existen estándares compartidos. TCP, UDP, el orden de bytes y la representación de datos siguen reglas que permiten interoperabilidad entre sistemas.

3. **Dominio de Buffer para control total.**  
   Para programar redes a bajo nivel, no alcanza con manejar strings u objetos. Es necesario entender bytes, octetos, buffers y endianness.

---

## 33. Resumen final ultra corto

Node.js permite crear aplicaciones de red eficientes porque usa un modelo de I/O no bloqueante basado en Event Loop y libuv. Para comunicarse por red, es necesario entender los modelos OSI y TCP/IP, los protocolos TCP y UDP, y los estándares definidos por RFCs. Como la red transmite bytes, Node.js utiliza Buffer para manipular datos binarios. Cuando se envían números por red, hay que respetar el orden Big-Endian o Network Byte Order usando métodos explícitos como `writeUInt32BE()`.

