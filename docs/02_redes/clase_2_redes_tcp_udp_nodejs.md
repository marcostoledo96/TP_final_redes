# Clase 2 — Inmersión en Capa de Transporte: TCP y UDP

## Arquitectura, RFCs y flujos en Node.js

> **Tema central de la clase:** comprender cómo funcionan TCP y UDP en la capa de transporte, cómo se comportan a nivel de conexión, estado, confiabilidad, control de flujo y diagnóstico, y cómo se implementan desde Node.js mediante los módulos `net` y `dgram`.

---

## 1. Objetivos de la clase

En esta clase se profundiza en la **capa de transporte**, especialmente en los dos protocolos más importantes para el desarrollo de aplicaciones de red:

- **TCP**, definido actualmente por la **RFC 9293**.
- **UDP**, definido por la **RFC 768**.

El foco no está solamente en conocer sus definiciones teóricas, sino en entender cómo se comportan cuando se programan aplicaciones de red en **Node.js**.

Al finalizar la clase deberías poder:

1. Explicar cómo se establece una conexión TCP mediante el **three-way handshake**.
2. Diferenciar el modelo **stateful** de TCP frente al modelo **stateless** de UDP.
3. Reconocer las diferencias de cabecera, latencia, confiabilidad y control de flujo entre TCP y UDP.
4. Entender cómo Node.js expone TCP mediante el módulo `net` y UDP mediante el módulo `dgram`.
5. Identificar eventos clave como `'data'`, `'message'`, `'error'` y `'drain'`.
6. Comprender el concepto de **backpressure**.
7. Interpretar flags de tráfico con herramientas como `tcpdump` o Wireshark.
8. Relacionar respuestas de red con diagnóstico técnico y de seguridad.

---

## 2. Contexto general: capa de transporte

La **capa de transporte** es la encargada de permitir la comunicación entre procesos que se ejecutan en distintos equipos dentro de una red.

En términos prácticos, cuando una aplicación necesita enviar datos a otra aplicación, no alcanza con saber la dirección IP de la máquina destino. También se necesita identificar **qué proceso o servicio** debe recibir esos datos. Para eso se usan los **puertos**.

Ejemplos:

- Un servidor web puede escuchar en el puerto `80` para HTTP.
- Un servidor HTTPS normalmente escucha en el puerto `443`.
- Una aplicación personalizada en Node.js puede escuchar en el puerto `3000`, `8080` o cualquier otro puerto disponible.

La capa de transporte se ocupa de:

- Multiplexar comunicaciones mediante puertos.
- Dividir o encapsular datos según el protocolo usado.
- Establecer o no una conexión previa, según corresponda.
- Controlar o no la entrega, el orden y la retransmisión.
- Gestionar flujo, errores y estados de conexión.

Los dos protocolos principales vistos en esta clase son:

| Protocolo | Tipo | Característica principal |
|---|---|---|
| TCP | Orientado a conexión | Fiabilidad, orden y control de flujo |
| UDP | No orientado a conexión | Velocidad, simplicidad y bajo overhead |

---

## 3. TCP — Transmission Control Protocol

TCP es un protocolo de transporte **orientado a conexión**. Esto significa que antes de enviar datos de aplicación, cliente y servidor deben establecer una comunicación formal.

TCP se utiliza cuando la aplicación necesita:

- Entrega confiable.
- Orden correcto de los datos.
- Control de errores.
- Control de flujo.
- Retransmisión ante pérdidas.
- Comunicación continua entre dos extremos.

Ejemplos de tecnologías que se apoyan sobre TCP:

- HTTP
- HTTPS
- WebSockets
- SSH
- FTP
- SMTP
- Bases de datos cliente-servidor

---

## 4. Arquitectura de conexión en TCP — RFC 9293

La clase presenta TCP a partir de su arquitectura de conexión definida en la **RFC 9293**.

TCP no empieza a enviar datos inmediatamente. Primero realiza un proceso de sincronización entre cliente y servidor conocido como **three-way handshake**.

---

## 5. Three-Way Handshake

El **three-way handshake** es el mecanismo mediante el cual TCP establece una conexión entre dos extremos.

Se llama “three-way” porque requiere tres pasos:

1. `SYN`
2. `SYN-ACK`
3. `ACK`

Este intercambio permite que ambos extremos sincronicen sus números iniciales de secuencia y confirmen que están listos para comunicarse.

---

## 6. Paso 1 — SYN

El cliente inicia la conexión enviando un segmento TCP con el flag `SYN` activado.

En este momento:

- El cliente parte desde el estado `CLOSED`.
- Luego pasa al estado `SYN-SENT`.
- El cliente envía un **ISN** propio.

### ¿Qué es el ISN?

`ISN` significa **Initial Sequence Number**, o número inicial de secuencia.

TCP usa números de secuencia para:

- Ordenar los bytes enviados.
- Detectar pérdidas.
- Confirmar recepción.
- Coordinar retransmisiones.
- Mantener la integridad lógica del flujo.

El ISN debe ser elegido cuidadosamente porque forma parte de la seguridad y robustez de TCP. En la clase se menciona que el cliente inicia con un **ISN aleatorio**.

Ejemplo conceptual:

```text
Cliente → Servidor: SYN, Seq = 1000
```

Esto significa: “quiero iniciar una conexión y mi secuencia comienza en 1000”.

---

## 7. Paso 2 — SYN-ACK

El servidor responde con un segmento que combina dos acciones:

- `SYN`: sincroniza su propio número inicial de secuencia.
- `ACK`: confirma el número de secuencia del cliente.

Por eso el paquete se llama `SYN-ACK`.

En este paso:

- El servidor recibe el `SYN` del cliente.
- Si el puerto está abierto y el servidor está escuchando, responde.
- El servidor envía su propio ISN.
- El servidor confirma el ISN del cliente.

Ejemplo conceptual:

```text
Servidor → Cliente: SYN-ACK, Seq = 5000, Ack = 1001
```

El `Ack = 1001` indica que el servidor recibió el `Seq = 1000` del cliente y espera el siguiente número.

---

## 8. Paso 3 — ACK

Finalmente, el cliente responde con un `ACK`.

En este paso:

- El cliente confirma el ISN del servidor.
- Ambos extremos pasan al estado `ESTABLISHED`.
- La conexión TCP queda lista para transmitir datos.

Ejemplo conceptual:

```text
Cliente → Servidor: ACK, Seq = 1001, Ack = 5001
```

A partir de este momento, cliente y servidor pueden intercambiar datos de aplicación.

---

## 9. Resumen del three-way handshake

```text
1. Cliente  → Servidor: SYN
2. Servidor → Cliente:  SYN-ACK
3. Cliente  → Servidor: ACK
```

Representación completa:

```text
Cliente                                      Servidor
  |                                             |
  |  SYN, Seq = X                               |
  |-------------------------------------------->|
  |                                             |
  |  SYN-ACK, Seq = Y, Ack = X + 1              |
  |<--------------------------------------------|
  |                                             |
  |  ACK, Ack = Y + 1                           |
  |-------------------------------------------->|
  |                                             |
  |              ESTABLISHED                    |
```

---

## 10. Estados TCP durante el handshake

Durante el establecimiento de conexión, TCP cambia de estado.

Estados mencionados en la clase:

| Estado | Significado |
|---|---|
| `CLOSED` | No existe conexión activa |
| `SYN-SENT` | El cliente envió un `SYN` y espera respuesta |
| `LISTENING` / `LISTEN` | El servidor está escuchando conexiones entrantes |
| `ESTABLISHED` | La conexión fue establecida correctamente |

La presentación indica que un servidor con puerto abierto responde con `SYN-ACK`, lo cual permite inferir que está en estado de escucha.

---

## 11. TCB — Transmission Control Block

TCP mantiene información interna sobre cada conexión mediante una estructura llamada **TCB**, o **Transmission Control Block**.

El TCB contiene datos necesarios para administrar la conexión.

Según la clase, TCP usa el TCB para rastrear:

- Secuencias.
- Ventanas.
- Temporizadores.

De forma ampliada, un TCB puede incluir información como:

- IP y puerto local.
- IP y puerto remoto.
- Estado actual de la conexión.
- Número de secuencia local.
- Número de secuencia remoto.
- Ventana de recepción.
- Ventana de envío.
- Timers de retransmisión.
- Buffers de envío y recepción.

Esto refuerza la idea de que TCP es **stateful**: mantiene estado de cada conexión.

---

## 12. TCP como protocolo stateful

TCP es **stateful** porque cada conexión tiene estado propio.

Eso significa que el sistema debe recordar información sobre cada comunicación activa.

Por ejemplo:

```text
Cliente A conectado al puerto 443
Cliente B conectado al puerto 443
Cliente C conectado al puerto 443
```

Aunque todos se conecten al mismo servicio, cada conexión TCP tiene su propio contexto:

- Secuencias propias.
- Ventanas propias.
- Buffers propios.
- Timers propios.
- Estado propio.

Esto permite fiabilidad, pero también consume más recursos que UDP.

---

## 13. Seguridad y diagnóstico básico en TCP

La clase menciona una idea importante para diagnóstico y seguridad:

- Un `SYN-ACK` indica que el puerto está abierto y escuchando.
- Un `RST` indica que el puerto está cerrado.

Esto se usa en técnicas de análisis de servicios y escaneo de puertos.

### Caso 1: puerto abierto

```text
Cliente → Servidor: SYN
Servidor → Cliente: SYN-ACK
```

Interpretación:

- Hay un servicio escuchando.
- El puerto está abierto.
- El servidor acepta iniciar una conexión.

### Caso 2: puerto cerrado

```text
Cliente → Servidor: SYN
Servidor → Cliente: RST
```

Interpretación:

- No hay servicio escuchando en ese puerto.
- El sistema rechaza la conexión.

---

## 14. RST — Reset

`RST` significa **Reset**.

Es un flag TCP que se utiliza para terminar o rechazar una conexión de forma abrupta.

Puede aparecer cuando:

- Se intenta conectar a un puerto cerrado.
- Una conexión se interrumpe inesperadamente.
- Un host rechaza tráfico no esperado.
- Una aplicación cierra el socket de manera no ordenada.

Desde el punto de vista del diagnóstico:

- `SYN-ACK` frente a `SYN` suele indicar puerto abierto.
- `RST` frente a `SYN` suele indicar puerto cerrado.
- Falta de respuesta puede indicar filtrado, firewall, caída o pérdida.

---

## 15. UDP — User Datagram Protocol

UDP es un protocolo de transporte **minimalista**, definido por la **RFC 768**.

A diferencia de TCP, UDP:

- No establece conexión previa.
- No mantiene estado de conexión.
- No garantiza entrega.
- No garantiza orden.
- No retransmite automáticamente.
- No tiene control de flujo.
- No usa handshake.

Su gran ventaja es que tiene muy poco overhead y permite enviar datos de manera rápida.

---

## 16. UDP como arquitectura stateless

La clase define UDP como una arquitectura **stateless**.

Esto significa que el protocolo no conserva información de sesión entre emisor y receptor.

Cada datagrama UDP es independiente.

Ejemplo:

```text
Datagrama 1 → independiente
Datagrama 2 → independiente
Datagrama 3 → independiente
```

El receptor no necesita haber negociado una conexión previa con el emisor.

Esto permite menor latencia, pero también implica menor confiabilidad.

---

## 17. Entrega de mejor esfuerzo

UDP ofrece entrega de **mejor esfuerzo**.

Esto significa que UDP intenta enviar el datagrama, pero no garantiza que llegue.

Puede ocurrir que:

- El paquete llegue correctamente.
- El paquete se pierda.
- El paquete llegue duplicado.
- El paquete llegue fuera de orden.
- El paquete sea descartado por el kernel.
- El paquete sea descartado por un router intermedio.

UDP no tiene mecanismos propios para corregir estos problemas.

Si una aplicación necesita confiabilidad sobre UDP, debe implementarla por su cuenta.

---

## 18. Cabecera UDP de 8 bytes

Una de las principales características de UDP es su cabecera pequeña.

La clase indica que la cabecera UDP ocupa **8 bytes**.

Está compuesta por cuatro campos principales:

| Campo | Tamaño | Función |
|---|---:|---|
| Puerto origen | 16 bits | Identifica el proceso emisor |
| Puerto destino | 16 bits | Identifica el proceso receptor |
| Longitud | 16 bits | Tamaño total del datagrama UDP |
| Checksum | 16 bits | Verificación de integridad |

Total:

```text
16 bits + 16 bits + 16 bits + 16 bits = 64 bits = 8 bytes
```

---

## 19. Puerto origen y puerto destino

UDP usa puertos igual que TCP.

Los campos de puerto permiten identificar qué proceso envía y qué proceso recibe los datos.

Ejemplo:

```text
IP origen:      192.168.1.10
Puerto origen:  53000
IP destino:     192.168.1.20
Puerto destino: 9999
```

Esto permite que el sistema operativo entregue el datagrama al socket correcto.

---

## 20. Campo longitud en UDP

El campo **longitud** indica el tamaño total del datagrama UDP.

Incluye:

- Cabecera UDP.
- Datos transportados.

Ejemplo:

```text
Cabecera UDP: 8 bytes
Datos:        20 bytes
Longitud:     28 bytes
```

---

## 21. Checksum en UDP

El campo **checksum** permite verificar integridad.

La clase menciona que en IPv4 el checksum UDP es opcional.

Su objetivo es detectar errores en los datos transmitidos.

Importante:

- El checksum ayuda a detectar corrupción.
- No garantiza entrega.
- No corrige errores.
- No retransmite paquetes.

---

## 22. Eficiencia de UDP

UDP es eficiente porque evita el costo de establecer una conexión.

La clase destaca dos ideas:

- UDP no tiene latencia de establecimiento.
- UDP permite un modelo cercano a **0-RTT**.

`0-RTT` significa que el emisor puede enviar datos sin esperar un intercambio previo de handshake.

Comparación:

| Protocolo | ¿Requiere handshake? | Latencia inicial |
|---|---|---|
| TCP | Sí | Mayor |
| UDP | No | Menor |

---

## 23. Overhead de cabecera: TCP vs UDP

La clase compara el tamaño mínimo de cabecera:

| Protocolo | Tamaño mínimo de cabecera |
|---|---:|
| TCP | 20 bytes |
| UDP | 8 bytes |

Esto significa que UDP agrega menos información de control a cada unidad de datos.

TCP, en cambio, necesita más campos porque gestiona:

- Secuencias.
- Acknowledgments.
- Ventanas.
- Flags.
- Opciones.
- Control de flujo.
- Control de conexión.

---

## 24. Tráfico real en UDP

La clase resume el tráfico UDP como:

> Datagramas asíncronos sin intercambio previo de flags de control.

Esto significa que UDP envía mensajes individuales sin establecer antes una sesión formal.

En TCP vemos un intercambio como:

```text
SYN → SYN-ACK → ACK → datos
```

En UDP vemos algo más directo:

```text
Datagrama →
Datagrama →
Datagrama →
```

No hay flags equivalentes a `SYN`, `ACK` o `FIN` para establecer conexión.

---

## 25. TCP vs UDP — comparación conceptual

| Característica | TCP | UDP |
|---|---|---|
| RFC principal | RFC 9293 | RFC 768 |
| Tipo | Orientado a conexión | Sin conexión |
| Estado | Stateful | Stateless |
| Handshake | Sí, three-way handshake | No |
| Garantiza entrega | Sí | No |
| Garantiza orden | Sí | No |
| Control de flujo | Sí | No |
| Backpressure | Sí, observable en Node.js | No a nivel protocolo |
| Cabecera mínima | 20 bytes | 8 bytes |
| Latencia inicial | Mayor | Menor |
| Unidad lógica | Flujo de bytes | Datagrama |
| Uso típico | Web, APIs, SSH, DB, WebSockets | Streaming, juegos, DNS, telemetría |

---

## 26. Implementación de bajo nivel en Node.js

Node.js permite trabajar con TCP y UDP mediante módulos nativos.

Los módulos vistos en la clase son:

| Protocolo | Módulo Node.js | Abstracción principal |
|---|---|---|
| TCP | `net` | `net.Socket`, `net.Server` |
| UDP | `dgram` | Datagram sockets |

---

## 27. Módulo `net` — TCP en Node.js

El módulo `net` permite crear servidores y clientes TCP.

Según la clase:

- El módulo `net` abstrae el protocolo TCP como un **Duplex Stream**.
- Usa `net.Socket` para trabajar con flujos continuos de `Buffer`.

---

## 28. ¿Qué es un Duplex Stream?

Un **Duplex Stream** es un flujo que permite leer y escribir al mismo tiempo.

Esto encaja bien con TCP porque una conexión TCP es bidireccional:

- El cliente puede enviar datos al servidor.
- El servidor puede enviar datos al cliente.
- Ambos pueden hacerlo mientras la conexión esté activa.

En Node.js, un socket TCP se comporta como un stream:

```js
socket.on('data', (chunk) => {
  console.log('Datos recibidos:', chunk);
});

socket.write('Hola desde TCP');
```

---

## 29. TCP como flujo continuo de bytes

Un punto fundamental: TCP no trabaja con “mensajes” de aplicación, sino con un **flujo continuo de bytes**.

Esto significa que si enviamos:

```js
socket.write('Hola');
socket.write('Mundo');
```

El receptor podría recibir:

```text
HolaMundo
```

O podría recibir fragmentos como:

```text
Ho
laMun
do
```

Esto no rompe TCP. Es parte de su naturaleza como stream.

Por eso, cuando usamos TCP, muchas veces necesitamos definir un **protocolo de aplicación** para separar mensajes.

Ejemplos de estrategias:

- Separar por salto de línea `\n`.
- Enviar primero la longitud del mensaje.
- Usar JSON por línea.
- Usar una cabecera propia.

---

## 30. Ejemplo básico de servidor TCP en Node.js

```js
const net = require('node:net');

const server = net.createServer((socket) => {
  console.log('Cliente conectado:', socket.remoteAddress, socket.remotePort);

  socket.on('data', (chunk) => {
    console.log('Datos recibidos:', chunk);
    console.log('Texto:', chunk.toString('utf8'));

    socket.write('Servidor recibió tu mensaje\n');
  });

  socket.on('end', () => {
    console.log('Cliente cerró la conexión');
  });

  socket.on('error', (err) => {
    console.error('Error en socket:', err.message);
  });
});

server.listen(3000, () => {
  console.log('Servidor TCP escuchando en puerto 3000');
});
```

---

## 31. Ejemplo básico de cliente TCP en Node.js

```js
const net = require('node:net');

const client = net.createConnection({ port: 3000, host: '127.0.0.1' }, () => {
  console.log('Conectado al servidor');
  client.write('Hola servidor TCP');
});

client.on('data', (chunk) => {
  console.log('Respuesta:', chunk.toString('utf8'));
  client.end();
});

client.on('end', () => {
  console.log('Desconectado del servidor');
});

client.on('error', (err) => {
  console.error('Error:', err.message);
});
```

---

## 32. `Buffer` en TCP

La clase indica que `net.Socket` trabaja con flujos continuos de `Buffer`.

Un `Buffer` representa datos binarios.

Cuando recibimos datos por TCP:

```js
socket.on('data', (chunk) => {
  console.log(Buffer.isBuffer(chunk)); // true
});
```

El parámetro `chunk` normalmente es un `Buffer`.

Podemos convertirlo a texto:

```js
chunk.toString('utf8')
```

O interpretar bytes manualmente:

```js
const value = chunk.readUInt16BE(0);
```

Esto es importante porque en redes muchas veces se trabaja con protocolos binarios.

---

## 33. Módulo `dgram` — UDP en Node.js

El módulo `dgram` permite crear sockets UDP.

Según la clase:

- UDP usa sockets de datagramas.
- Se crean sockets `udp4` o `udp6`.
- Se envían datos mediante `socket.send()`.
- Las operaciones son atómicas.
- No se garantiza orden ni entrega.

---

## 34. `udp4` y `udp6`

Al crear un socket UDP en Node.js se debe indicar si se usará IPv4 o IPv6.

```js
const dgram = require('node:dgram');

const socketIPv4 = dgram.createSocket('udp4');
const socketIPv6 = dgram.createSocket('udp6');
```

| Tipo | Uso |
|---|---|
| `udp4` | Datagramas UDP sobre IPv4 |
| `udp6` | Datagramas UDP sobre IPv6 |

---

## 35. Ejemplo básico de servidor UDP

```js
const dgram = require('node:dgram');

const server = dgram.createSocket('udp4');

server.on('message', (msg, rinfo) => {
  console.log('Mensaje recibido:', msg.toString('utf8'));
  console.log('Desde:', rinfo.address, rinfo.port);

  const response = Buffer.from('Servidor recibió tu datagrama');
  server.send(response, rinfo.port, rinfo.address);
});

server.on('error', (err) => {
  console.error('Error UDP:', err.message);
  server.close();
});

server.bind(4000, () => {
  console.log('Servidor UDP escuchando en puerto 4000');
});
```

---

## 36. Ejemplo básico de cliente UDP

```js
const dgram = require('node:dgram');

const client = dgram.createSocket('udp4');

const message = Buffer.from('Hola servidor UDP');

client.send(message, 4000, '127.0.0.1', (err) => {
  if (err) {
    console.error('Error al enviar:', err.message);
    client.close();
    return;
  }

  console.log('Datagrama enviado');
});

client.on('message', (msg, rinfo) => {
  console.log('Respuesta:', msg.toString('utf8'));
  console.log('Desde:', rinfo.address, rinfo.port);
  client.close();
});
```

---

## 37. Operaciones atómicas en UDP

La clase menciona que en UDP las operaciones son **atómicas**.

Esto significa que cada llamada a `socket.send()` intenta enviar un datagrama completo como unidad.

Ejemplo:

```js
socket.send(Buffer.from('Mensaje 1'), puerto, host);
socket.send(Buffer.from('Mensaje 2'), puerto, host);
```

Cada envío corresponde a un datagrama separado.

A diferencia de TCP, UDP conserva mejor la idea de “mensaje individual”.

Pero esa atomicidad no implica confiabilidad:

- El datagrama puede perderse.
- Puede llegar después de otro.
- Puede no llegar nunca.
- Puede ser descartado si excede límites de red.

---

## 38. TCP `data` vs UDP `message`

La clase marca una diferencia clave entre eventos:

| Protocolo | Evento | Qué representa |
|---|---|---|
| TCP | `'data'` | Chunk de bytes dentro de un flujo |
| UDP | `'message'` | Datagrama completo recibido |

---

## 39. Evento `'data'` en TCP

En TCP, el evento `'data'` se dispara cuando llega un chunk de bytes.

```js
socket.on('data', (chunk) => {
  console.log(chunk);
});
```

Ese chunk no necesariamente coincide con el mensaje original enviado por la aplicación.

Ejemplo:

Emisor:

```js
socket.write('mensaje-1');
socket.write('mensaje-2');
```

Receptor posible:

```text
mensaje-1mensaje-2
```

O:

```text
mensaje-
1mensaje
-2
```

Por eso, en TCP se necesita una estrategia de delimitación.

---

## 40. Evento `'message'` en UDP

En UDP, el evento `'message'` se dispara cuando llega un datagrama completo.

```js
socket.on('message', (msg, rinfo) => {
  console.log(msg.toString());
  console.log(rinfo.address, rinfo.port);
});
```

El parámetro `msg` contiene el contenido del datagrama recibido.

El parámetro `rinfo` contiene información del remitente, por ejemplo:

- Dirección IP.
- Puerto.
- Familia de dirección.
- Tamaño del mensaje.

---

## 41. Evento `'error'`

La clase menciona el evento `'error'` como parte de las excepciones del stack, relacionadas con el comportamiento esperado por estándares como RFC 1122.

En Node.js, tanto TCP como UDP pueden emitir errores.

Ejemplo TCP:

```js
socket.on('error', (err) => {
  console.error('Error TCP:', err.message);
});
```

Ejemplo UDP:

```js
server.on('error', (err) => {
  console.error('Error UDP:', err.message);
});
```

Siempre conviene escuchar el evento `'error'` porque, si no se maneja, puede provocar que el proceso termine.

---

## 42. Control de flujo y backpressure

Uno de los temas más importantes de la clase es el **control de flujo** y la **backpressure**.

La clase define backpressure como:

> Resistencia del receptor lento sobre el emisor rápido para evitar desbordes.

En otras palabras, backpressure aparece cuando quien recibe datos no puede procesarlos al mismo ritmo al que el emisor los produce.

---

## 43. Problema que resuelve la backpressure

Supongamos este escenario:

```text
Emisor rápido → → → → → Receptor lento
```

Si el emisor escribe datos sin límite, pueden llenarse:

- Buffers de la aplicación.
- Buffers de Node.js.
- Buffers del sistema operativo.
- Ventanas TCP.
- Memoria disponible.

La backpressure permite frenar o pausar temporalmente al emisor para evitar desbordes.

---

## 44. Backpressure en TCP y Node.js

La clase indica que en TCP con Node.js:

- `socket.write()` retorna `false` si el buffer del sistema operativo está lleno.
- El emisor debe esperar al evento `'drain'`.
- El evento `'drain'` indica que se puede volver a escribir.
- En términos TCP, esto se relaciona con la expansión de la ventana de recepción.

Ejemplo:

```js
const ok = socket.write(bufferGrande);

if (!ok) {
  console.log('Backpressure detectada: esperar drain');
  socket.once('drain', () => {
    console.log('Se puede continuar escribiendo');
  });
}
```

---

## 45. `socket.write()` y retorno booleano

En Node.js, `socket.write()` no devuelve `true` o `false` para indicar si el dato “llegó” al destino.

Devuelve un booleano relacionado con la capacidad del buffer local.

| Retorno | Significado práctico |
|---|---|
| `true` | Se puede seguir escribiendo |
| `false` | El buffer está lleno o superó el límite recomendado; conviene esperar `'drain'` |

Esto no significa que haya ocurrido un error, sino que hay presión en el flujo.

---

## 46. Evento `'drain'`

El evento `'drain'` se emite cuando el buffer interno vuelve a estar disponible para recibir más datos.

Ejemplo de uso:

```js
function escribirMucho(socket, datos) {
  let index = 0;

  function escribir() {
    while (index < datos.length) {
      const puedeSeguir = socket.write(datos[index]);
      index++;

      if (!puedeSeguir) {
        socket.once('drain', escribir);
        return;
      }
    }

    socket.end();
  }

  escribir();
}
```

Este patrón evita saturar memoria y respeta el ritmo de consumo del receptor.

---

## 47. Ventana de recepción TCP

La clase relaciona el evento `'drain'` con la expansión de la ventana de recepción TCP.

La **ventana de recepción** indica cuántos bytes está dispuesto a aceptar el receptor.

Si el receptor está saturado, la ventana puede achicarse.

Si el receptor vuelve a tener capacidad, la ventana se expande.

Esto permite que TCP regule el flujo de datos entre ambos extremos.

---

## 48. Backpressure en UDP

La clase es clara:

> En UDP no existe backpressure como en TCP.

UDP no tiene:

- ACKs.
- Sliding windows.
- Control de flujo.
- Confirmación de recepción.
- Mecanismos nativos de retransmisión.

Si se envía demasiado tráfico UDP, el resultado puede ser pérdida silenciosa.

---

## 49. Pérdida silenciosa en UDP

La clase indica que el exceso de tráfico UDP puede terminar en pérdida silenciosa de paquetes en:

- El kernel.
- Routers intermedios.

Esto significa que la aplicación puede enviar datagramas sin recibir un error claro, aunque los paquetes nunca lleguen.

Ejemplo conceptual:

```text
Emisor UDP rápido → Kernel saturado → paquetes descartados
```

O:

```text
Emisor UDP → Router congestionado → paquetes descartados
```

---

## 50. TCP y UDP frente a congestión o lentitud

| Situación | TCP | UDP |
|---|---|---|
| Receptor lento | Aparece control de flujo / backpressure | Puede haber pérdida |
| Red congestionada | TCP ajusta ritmo y retransmite | Datagramas pueden descartarse |
| Paquete perdido | TCP retransmite | UDP no retransmite |
| Orden incorrecto | TCP reordena | La aplicación debe resolverlo |
| Buffer lleno | `socket.write()` puede devolver `false` | Puede perderse el datagrama |

---

## 51. Análisis técnico y diagnóstico

La clase introduce herramientas y criterios para analizar tráfico real.

Se mencionan especialmente:

- `tcpdump`
- Wireshark
- Interpretación de flags TCP
- ICMP frente a puertos UDP cerrados
- Diagnóstico de seguridad
- Seguimiento de números de secuencia y ACK

---

## 52. Interpretación de flags en tcpdump/Wireshark

La clase muestra estos flags:

| Notación | Significado | Descripción |
|---|---|---|
| `[S]` | SYN | Inicio de conexión TCP |
| `[S.]` | SYN-ACK | Respuesta del servidor aceptando sincronización |
| `[P.]` | Push + ACK | Datos enviados con solicitud de entrega a aplicación |
| `[F.]` | FIN + ACK | Cierre ordenado de conexión |

---

## 53. Flag `[S]` — SYN

`[S]` representa un paquete TCP con flag SYN.

Se usa para iniciar una conexión.

Ejemplo en captura:

```text
IP cliente.54321 > servidor.80: Flags [S]
```

Interpretación:

- El cliente quiere iniciar una conexión TCP.
- Todavía no hay conexión establecida.

---

## 54. Flag `[S.]` — SYN-ACK

`[S.]` suele representar `SYN` más `ACK`.

El punto `.` indica ACK en muchas salidas de `tcpdump`.

Ejemplo:

```text
IP servidor.80 > cliente.54321: Flags [S.]
```

Interpretación:

- El servidor recibió el `SYN`.
- El puerto está abierto.
- El servidor acepta sincronizar.
- Falta el ACK final del cliente.

---

## 55. Flag `[P.]` — Push + ACK

`[P.]` representa `PSH` más `ACK`.

Suele aparecer cuando hay datos de aplicación.

Ejemplo:

```text
IP cliente.54321 > servidor.80: Flags [P.]
```

Interpretación:

- Hay datos enviados por la aplicación.
- También se está confirmando recepción de datos previos.

---

## 56. Flag `[F.]` — FIN + ACK

`[F.]` representa `FIN` más `ACK`.

Se usa para cerrar una conexión TCP de manera ordenada.

Ejemplo:

```text
IP cliente.54321 > servidor.80: Flags [F.]
```

Interpretación:

- El cliente quiere cerrar su lado de la conexión.
- La conexión no se corta abruptamente, sino de forma coordinada.

---

## 57. RFC 1122 e ICMP en UDP

La clase menciona:

> Un puerto UDP cerrado debe generar un ICMP Port Unreachable.

Esto es importante porque UDP no tiene conexión ni respuestas propias como TCP.

Cuando se envía un datagrama UDP a un puerto cerrado, el host destino puede responder con un mensaje ICMP indicando que el puerto no está disponible.

Ejemplo conceptual:

```text
Cliente → Servidor: UDP hacia puerto cerrado
Servidor → Cliente: ICMP Port Unreachable
```

---

## 58. Diferencia entre puerto cerrado TCP y UDP

| Protocolo | Consulta a puerto cerrado | Respuesta esperada |
|---|---|---|
| TCP | SYN a puerto cerrado | RST |
| UDP | Datagrama a puerto cerrado | ICMP Port Unreachable |

Esto es muy útil para diagnóstico.

---

## 59. Diagnóstico de seguridad

La clase menciona dos usos de diagnóstico de seguridad:

1. Identificación de servicios mediante análisis de respuestas `RST` frente a `SYN`.
2. Validación de integridad mediante seguimiento de números de secuencia `Seq/Ack`.

---

## 60. Identificación de servicios con SYN, SYN-ACK y RST

Al enviar un `SYN` a un puerto TCP, la respuesta permite inferir estado del puerto.

| Respuesta | Interpretación probable |
|---|---|
| `SYN-ACK` | Puerto abierto |
| `RST` | Puerto cerrado |
| Sin respuesta | Filtrado, firewall, pérdida o host no disponible |

Este razonamiento es usado por herramientas de diagnóstico y escaneo.

---

## 61. Seguimiento de números Seq/Ack

TCP usa números de secuencia y acuse de recibo para validar la comunicación.

- `Seq` indica posición dentro del flujo de bytes enviado.
- `Ack` indica el próximo byte esperado.

Ejemplo:

```text
Cliente → Servidor: Seq = 1000, datos de 50 bytes
Servidor → Cliente: Ack = 1050
```

Interpretación:

- El servidor recibió hasta el byte 1049.
- Ahora espera el byte 1050.

Este seguimiento permite detectar:

- Pérdidas.
- Retransmisiones.
- Desorden.
- Problemas de integridad.
- Comportamientos anómalos.

---

## 62. Relación entre TCP, UDP y Node.js

La clase conecta los conceptos de transporte con la implementación práctica en Node.js.

| Concepto de red | En TCP / Node.js | En UDP / Node.js |
|---|---|---|
| Conexión | `net.createConnection()` / `net.createServer()` | No hay conexión previa obligatoria |
| Unidad recibida | Chunk de bytes | Datagrama completo |
| Evento principal | `'data'` | `'message'` |
| Envío | `socket.write()` | `socket.send()` |
| Control de flujo | Sí, `'drain'` | No equivalente directo |
| Orden | Garantizado por TCP | No garantizado |
| Entrega | Garantizada por TCP, salvo caída de conexión | No garantizada |

---

## 63. Cuándo usar TCP

TCP conviene cuando la aplicación necesita confiabilidad.

Casos típicos:

- APIs HTTP/HTTPS.
- Aplicaciones web tradicionales.
- WebSockets.
- Transferencia de archivos.
- Comunicación con bases de datos.
- SSH.
- Sistemas donde no se tolera pérdida de datos.

Elegimos TCP cuando es más importante que los datos lleguen completos y ordenados que minimizar la latencia inicial.

---

## 64. Cuándo usar UDP

UDP conviene cuando se prioriza velocidad, baja latencia o simplicidad.

Casos típicos:

- Streaming de audio o video.
- Videojuegos en tiempo real.
- DNS.
- Telemetría.
- Métricas.
- Logs no críticos.
- Descubrimiento de servicios en red local.

Elegimos UDP cuando una pérdida ocasional puede ser tolerable o cuando la aplicación implementa su propio mecanismo de control.

---

## 65. Ejemplo comparativo: chat con TCP vs UDP

### Chat con TCP

Ventajas:

- Los mensajes llegan en orden.
- Si se pierde un segmento, TCP retransmite.
- La conexión permite saber si el cliente se desconectó.

Desventajas:

- Hay handshake inicial.
- Mayor overhead.
- Puede haber bloqueo por control de flujo.

### Chat con UDP

Ventajas:

- Menor latencia inicial.
- Simplicidad de envío.
- Cada mensaje puede viajar como datagrama.

Desventajas:

- Puede perder mensajes.
- Puede cambiar el orden.
- La aplicación debe implementar confirmaciones si las necesita.

---

## 66. Ejemplo comparativo: videojuego online

En un videojuego online, UDP puede ser preferible para posiciones en tiempo real.

Ejemplo:

```text
Jugador en X=10,Y=20
Jugador en X=11,Y=21
Jugador en X=12,Y=22
```

Si se pierde una actualización, puede no ser grave porque pronto llegará una nueva.

En cambio, TCP podría generar retrasos si intenta retransmitir información vieja.

---

## 67. Ejemplo comparativo: transferencia de archivo

Para transferir un archivo, TCP suele ser mejor.

Motivo:

- No se puede perder un fragmento del archivo.
- El orden importa.
- La integridad final es crítica.

UDP no sería adecuado salvo que la aplicación implemente encima su propio sistema de confirmaciones, ordenamiento y retransmisión.

---

## 68. Comandos útiles para pruebas locales

### Ver puertos escuchando

En Linux:

```bash
ss -tulpen
```

O:

```bash
netstat -tulpen
```

### Probar conexión TCP con netcat

```bash
nc 127.0.0.1 3000
```

### Enviar UDP con netcat

```bash
echo "hola udp" | nc -u 127.0.0.1 4000
```

### Capturar tráfico con tcpdump

```bash
sudo tcpdump -i lo port 3000 -nn
```

Para UDP:

```bash
sudo tcpdump -i lo udp port 4000 -nn
```

---

## 69. Lectura básica de captura TCP

Ejemplo conceptual:

```text
127.0.0.1.50000 > 127.0.0.1.3000: Flags [S]
127.0.0.1.3000 > 127.0.0.1.50000: Flags [S.]
127.0.0.1.50000 > 127.0.0.1.3000: Flags [.]
127.0.0.1.50000 > 127.0.0.1.3000: Flags [P.]
127.0.0.1.3000 > 127.0.0.1.50000: Flags [.]
```

Interpretación:

1. El cliente envía `SYN`.
2. El servidor responde `SYN-ACK`.
3. El cliente confirma con `ACK`.
4. El cliente envía datos.
5. El servidor confirma recepción.

---

## 70. Lectura básica de captura UDP

Ejemplo conceptual:

```text
127.0.0.1.50000 > 127.0.0.1.4000: UDP, length 8
```

Interpretación:

- Hay un datagrama UDP desde un puerto origen hacia el puerto destino.
- No hay handshake previo.
- No hay ACK de UDP.
- Si hay respuesta, será otro datagrama independiente.

---

## 71. Errores comunes al programar TCP en Node.js

1. Creer que cada `'data'` equivale a un mensaje completo.
2. No manejar el evento `'error'`.
3. Ignorar el retorno de `socket.write()`.
4. No implementar delimitación de mensajes.
5. No cerrar sockets correctamente.
6. No controlar timeouts.
7. Enviar datos infinitamente sin considerar backpressure.

---

## 72. Errores comunes al programar UDP en Node.js

1. Asumir que el datagrama siempre llega.
2. Asumir que llega en orden.
3. Enviar datagramas demasiado grandes.
4. No manejar errores ICMP o errores del socket.
5. Usar UDP para datos que requieren confiabilidad absoluta.
6. No implementar reintentos cuando la aplicación los necesita.
7. No considerar pérdida silenciosa en kernel o routers.

---

## 73. Buenas prácticas con TCP en Node.js

- Manejar siempre `'error'`.
- Usar delimitadores o prefijos de longitud para separar mensajes.
- Respetar backpressure.
- Usar `'drain'` cuando `socket.write()` devuelve `false`.
- Definir timeouts.
- Cerrar conexiones con `socket.end()` cuando corresponda.
- Registrar eventos relevantes para diagnóstico.
- No bloquear el event loop con tareas pesadas.

---

## 74. Buenas prácticas con UDP en Node.js

- Mantener datagramas pequeños.
- Diseñar la aplicación suponiendo pérdida posible.
- Agregar identificadores de mensaje si se necesita rastreo.
- Agregar timestamps si importa la frescura del dato.
- Agregar secuencias propias si importa el orden.
- Implementar ACKs propios si se necesita confirmación.
- Controlar la tasa de envío para evitar saturación.
- Manejar errores del socket.

---

## 75. Glosario de la clase

| Término | Definición |
|---|---|
| TCP | Protocolo de transporte orientado a conexión |
| UDP | Protocolo de transporte sin conexión |
| RFC | Documento técnico que define estándares de Internet |
| SYN | Flag TCP usado para iniciar conexión |
| ACK | Confirmación TCP |
| SYN-ACK | Respuesta del servidor durante el handshake TCP |
| RST | Reset TCP, usado para rechazar o abortar conexión |
| FIN | Flag TCP para cierre ordenado |
| ISN | Initial Sequence Number |
| TCB | Transmission Control Block |
| Stateless | Sin estado de conexión |
| Stateful | Con estado de conexión |
| Datagram | Unidad de envío independiente, típica de UDP |
| Stream | Flujo continuo de bytes, típico de TCP |
| Backpressure | Presión del receptor lento sobre el emisor rápido |
| `net` | Módulo Node.js para TCP |
| `dgram` | Módulo Node.js para UDP |
| `socket.write()` | Método para escribir en un socket TCP |
| `socket.send()` | Método para enviar datagramas UDP |
| `'data'` | Evento TCP para chunks de bytes |
| `'message'` | Evento UDP para datagramas recibidos |
| `'drain'` | Evento que indica alivio de backpressure |
| ICMP Port Unreachable | Mensaje ICMP que indica puerto UDP cerrado |

---

## 76. Resumen final de la clase

La clase 2 profundiza en la capa de transporte comparando TCP y UDP desde una mirada práctica para desarrollo con Node.js.

TCP, definido por la RFC 9293, es un protocolo orientado a conexión. Antes de enviar datos, realiza un three-way handshake compuesto por `SYN`, `SYN-ACK` y `ACK`. Mantiene estado mediante estructuras como el TCB y ofrece confiabilidad, orden, control de flujo y diagnóstico mediante números de secuencia y ACK.

UDP, definido por la RFC 768, es minimalista y stateless. No establece conexión, no garantiza entrega ni orden y posee una cabecera pequeña de 8 bytes. Su ventaja principal es la eficiencia y la baja latencia inicial, pero esa eficiencia implica que la aplicación debe asumir posibles pérdidas.

En Node.js, TCP se implementa con el módulo `net`, donde los sockets funcionan como `Duplex Stream` y emiten eventos como `'data'`, `'error'` y `'drain'`. UDP se implementa con el módulo `dgram`, donde cada datagrama se recibe mediante el evento `'message'` y se envía con `socket.send()`.

La clase también introduce herramientas de diagnóstico como `tcpdump` y Wireshark, la interpretación de flags TCP como `[S]`, `[S.]`, `[P.]` y `[F.]`, y el uso de respuestas como `RST` o `ICMP Port Unreachable` para inferir el estado de puertos y servicios.

---

## 77. Ideas clave para estudiar

- TCP es confiable porque mantiene estado, secuencias, ACKs, ventanas y timers.
- UDP es rápido porque evita conexión, estado y control de flujo.
- TCP trabaja como flujo de bytes, no como mensajes individuales.
- UDP trabaja con datagramas completos e independientes.
- En TCP, `socket.write()` puede devolver `false` y se debe esperar `'drain'`.
- En UDP no hay backpressure de protocolo: si se satura la red o el kernel, puede haber pérdida silenciosa.
- Un `SYN-ACK` suele indicar puerto TCP abierto.
- Un `RST` frente a un `SYN` suele indicar puerto TCP cerrado.
- Un puerto UDP cerrado puede generar `ICMP Port Unreachable`.
- Para analizar tráfico real se pueden usar `tcpdump` y Wireshark.

---

## 78. Preguntas de repaso

1. ¿Qué diferencia hay entre TCP y UDP en cuanto a conexión?
2. ¿Qué pasos componen el three-way handshake?
3. ¿Qué significa `SYN-SENT`?
4. ¿Qué indica una respuesta `SYN-ACK`?
5. ¿Qué indica una respuesta `RST`?
6. ¿Qué información mantiene un TCB?
7. ¿Por qué se dice que UDP es stateless?
8. ¿Cuánto ocupa la cabecera UDP?
9. ¿Cuánto ocupa como mínimo la cabecera TCP?
10. ¿Qué campos componen la cabecera UDP?
11. ¿Qué diferencia hay entre `'data'` y `'message'` en Node.js?
12. ¿Por qué TCP necesita delimitación de mensajes a nivel aplicación?
13. ¿Qué significa que `socket.write()` devuelva `false`?
14. ¿Para qué sirve el evento `'drain'`?
15. ¿Por qué UDP puede perder paquetes silenciosamente?
16. ¿Qué significa `[S]` en una captura de tráfico?
17. ¿Qué significa `[S.]`?
18. ¿Qué significa `[P.]`?
19. ¿Qué significa `[F.]`?
20. ¿Qué indica un ICMP Port Unreachable?

---

## 79. Mini práctica sugerida

### Práctica 1 — Servidor TCP

1. Crear un servidor TCP con `net.createServer()`.
2. Escuchar en el puerto `3000`.
3. Imprimir los datos recibidos en hexadecimal y texto.
4. Responder al cliente con un mensaje.
5. Capturar el tráfico con `tcpdump`.
6. Identificar `SYN`, `SYN-ACK`, `ACK` y `PUSH`.

### Práctica 2 — Servidor UDP

1. Crear un socket UDP con `dgram.createSocket('udp4')`.
2. Escuchar en el puerto `4000`.
3. Recibir datagramas con `'message'`.
4. Responder al remitente con `socket.send()`.
5. Capturar el tráfico con `tcpdump`.
6. Observar que no hay handshake.

### Práctica 3 — Backpressure TCP

1. Crear un servidor TCP que reciba muchos datos.
2. Crear un cliente que envíe buffers grandes.
3. Observar el retorno de `socket.write()`.
4. Si devuelve `false`, esperar `'drain'`.
5. Registrar cuándo aparece backpressure.

---

## 80. Conclusión operativa

La decisión entre TCP y UDP no es solamente teórica. Impacta directamente en el diseño de una aplicación.

Usar TCP implica aceptar más overhead a cambio de confiabilidad, orden y control. Usar UDP implica aceptar posibles pérdidas a cambio de menor latencia y menor complejidad de transporte.

En Node.js, esta diferencia se ve claramente:

- TCP se programa como un flujo continuo mediante `net.Socket`.
- UDP se programa como datagramas independientes mediante `dgram`.

Comprender esta diferencia es fundamental para construir servidores, clientes, herramientas de diagnóstico, protocolos propios y aplicaciones de red eficientes.

