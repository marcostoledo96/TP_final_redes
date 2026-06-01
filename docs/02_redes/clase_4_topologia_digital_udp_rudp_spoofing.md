# Clase 4 — Topología Digital: evolución del transporte de datos

**Tema central:** de la base de UDP a la implementación en Node.js y la optimización híbrida con RUDP.  
**Material trabajado:** presentación `Digital_Topology_Evolution.pdf` y práctica `spoofing.zip`.

---

## 1. Objetivo de la clase

La clase analiza cómo evolucionan las decisiones de transporte de datos cuando una aplicación necesita elegir entre **velocidad**, **confiabilidad**, **orden**, **estado**, **baja latencia** y **carga del servidor**.

El eje principal es entender que, en redes, no siempre conviene elegir simplemente entre TCP o UDP. Muchas aplicaciones modernas construyen soluciones híbridas sobre UDP, agregando desde la capa de aplicación mecanismos selectivos de confiabilidad. A ese enfoque se lo suele llamar **RUDP**: *Reliable User Datagram Protocol*.

La idea principal de la clase es:

> La arquitectura de red ya no es una elección binaria entre velocidad y fiabilidad. Con tecnologías como RUDP en Node.js, se pueden construir proporciones híbridas exactas, ajustando el comportamiento de la red a nivel de aplicación según las necesidades físicas del usuario.

---

## 2. El dilema fundamental de la red

La clase comienza planteando una tensión clásica:

| Extremo | Protocolo asociado | Ventaja principal | Costo principal |
|---|---|---|---|
| Velocidad | UDP | Baja latencia, transmisión simple, sin conexión | No garantiza entrega, orden ni retransmisión |
| Fiabilidad | TCP | Conexión estable, orden garantizado, retransmisión | Mayor latencia y más control interno |

### 2.1. UDP como extremo de velocidad

UDP se caracteriza por:

- Transmisión sin estado.
- Ausencia de conexión previa.
- Sin garantías de entrega.
- Sin control de congestión propio.
- Diseño orientado al rendimiento en tiempo real.

Esto lo hace útil para situaciones donde **llegar rápido es más importante que llegar perfecto**.

Ejemplos típicos:

- Voz sobre IP.
- Video en vivo.
- Juegos multijugador.
- Telemetría de dispositivos IoT.
- DNS.

### 2.2. TCP como extremo de fiabilidad

TCP se caracteriza por:

- Orientación a conexión.
- Handshake inicial.
- Entrega confiable.
- Orden garantizado.
- Retransmisión de paquetes perdidos.
- Control de flujo y congestión.

Esto lo hace útil cuando **la integridad completa de los datos es más importante que la latencia mínima**.

Ejemplos típicos:

- Navegación web tradicional.
- HTTPS.
- Transferencia de archivos.
- Emails.
- Sistemas transaccionales.

### 2.3. La decisión arquitectónica

La arquitectura de red exige decidir en qué punto del espectro conviene operar:

- Máxima velocidad con poco o ningún estado.
- Máxima integridad con estado completo.
- Un compromiso intermedio diseñado desde la aplicación.

Ese compromiso intermedio es donde aparece RUDP.

---

## 3. Anatomía del protocolo UDP

UDP significa **User Datagram Protocol**. Es un protocolo de la capa de transporte diseñado para enviar mensajes llamados **datagramas**.

A diferencia de TCP, UDP no crea una conexión persistente entre cliente y servidor. Cada datagrama se envía de forma independiente.

### 3.1. Estructura del encabezado UDP

La cabecera UDP tiene solo **8 bytes**, distribuidos en cuatro campos principales:

| Campo | Tamaño | Función |
|---|---:|---|
| Puerto de origen | 16 bits | Identifica el puerto del remitente. En IPv4 puede ser opcional. |
| Puerto de destino | 16 bits | Identifica el puerto de la aplicación receptora. |
| Longitud | 16 bits | Indica el tamaño total del datagrama: cabecera + datos. |
| Checksum | 16 bits | Permite verificar errores en cabecera y datos. |

Después de esos campos se encuentra el bloque de **datos**, que tiene tamaño variable.

### 3.2. Límite teórico del datagrama

Como el campo **Longitud** tiene 16 bits, el tamaño máximo teórico representable es:

```text
2^16 - 1 = 65.535 bytes
```

Ese valor incluye:

- 8 bytes de cabecera UDP.
- Datos transportados por el datagrama.

En la práctica, no siempre conviene enviar datagramas tan grandes porque pueden fragmentarse a nivel IP, aumentando el riesgo de pérdida.

### 3.3. Por qué UDP es tan liviano

UDP reduce su cabecera a 8 bytes porque elimina:

- Handshake.
- Estado de conexión.
- Secuenciación obligatoria.
- Confirmaciones de entrega.
- Retransmisión automática.
- Control de congestión.

Esto prioriza una transmisión muy rápida, pero deja más responsabilidad a la aplicación.

---

## 4. TCP vs UDP en la capa de transporte

La presentación compara ambos protocolos a partir de varias dimensiones arquitectónicas.

| Dimensión | TCP | UDP |
|---|---|---|
| Estado de conexión | Orientado a conexión | Sin conexión / stateless |
| Inicio | Requiere handshake de 3 vías | No requiere handshake |
| Ordenamiento | Reensambla los paquetes en secuencia | No garantiza orden de llegada |
| Fiabilidad | Alta, con reconocimiento y retransmisión | Nula por defecto; los paquetes perdidos se ignoran |
| Control de congestión | Ajuste dinámico según estado de red | Envío continuo sin límite propio de tasa |
| Tamaño mínimo de cabecera | 20 bytes | 8 bytes |
| Latencia | Mayor | Menor |
| Carga de control | Mayor | Menor |

### 4.1. Diferencia conceptual

TCP se comporta como una conversación formal:

1. Primero establece una conexión.
2. Luego envía datos ordenados.
3. Verifica recepción.
4. Retransmite lo perdido.
5. Cierra la conexión.

UDP se comporta como enviar mensajes sueltos:

1. Se arma un datagrama.
2. Se envía al destino.
3. No se espera confirmación obligatoria.
4. No se mantiene estado de conexión.

---

## 5. Implementación práctica con `node:dgram`

En Node.js, la implementación nativa de sockets UDP se realiza con el módulo `dgram`.

```js
const dgram = require('dgram');
const socket = dgram.createSocket('udp4');
```

El módulo `dgram` permite crear sockets de datagramas UDP para IPv4 o IPv6.

### 5.1. Tipos de socket

| Tipo | Descripción |
|---|---|
| `udp4` | Socket UDP sobre IPv4 |
| `udp6` | Socket UDP sobre IPv6 |

Ejemplo:

```js
const socket4 = dgram.createSocket('udp4');
const socket6 = dgram.createSocket('udp6');
```

### 5.2. Operaciones principales

| Operación | Uso |
|---|---|
| `createSocket()` | Crea una instancia de `dgram.Socket`. |
| `bind(port, address)` | Asocia el socket a un puerto y dirección. |
| Evento `listening` | Se dispara cuando el socket queda listo para recibir. |
| Evento `message` | Se dispara cuando llega un datagrama. |
| `send()` | Envía un datagrama. |
| `close()` | Cierra el socket y libera recursos. |

---

## 6. Ciclo de vida de un socket UDP

La presentación muestra el ciclo de vida del socket UDP en cinco etapas.

### 6.1. Creación

Se instancia un objeto `dgram.Socket`.

```js
const socket = dgram.createSocket('udp4');
```

### 6.2. Asociación con un puerto

El socket se asocia a un puerto mediante `bind()`.

```js
socket.bind(7000);
```

También se puede indicar una dirección específica:

```js
socket.bind(7000, '127.0.0.1');
```

### 6.3. Evento `listening`

Cuando el socket ya está escuchando, se emite el evento `listening`.

```js
socket.on('listening', () => {
  const address = socket.address();
  console.log(`Servidor UDP escuchando en ${address.address}:${address.port}`);
});
```

### 6.4. Flujo de datos

La recepción ocurre con el evento `message`.

```js
socket.on('message', (msg, rinfo) => {
  console.log(`Mensaje recibido: ${msg.toString()}`);
  console.log(`Origen: ${rinfo.address}:${rinfo.port}`);
});
```

El envío se realiza con `send()`.

```js
const message = Buffer.from('Hola por UDP');
socket.send(message, 7000, 'localhost');
```

### 6.5. Cierre

Cuando el socket ya no se necesita, se libera con `close()`.

```js
socket.close();
```

---

## 7. Ejemplo básico de servidor UDP en Node.js

```js
const dgram = require('dgram');
const server = dgram.createSocket('udp4');

server.on('listening', () => {
  const address = server.address();
  console.log(`Servidor UDP escuchando en ${address.address}:${address.port}`);
});

server.on('message', (msg, rinfo) => {
  console.log(`Mensaje recibido desde ${rinfo.address}:${rinfo.port}`);
  console.log(`Contenido: ${msg.toString()}`);
});

server.on('error', (err) => {
  console.error(`Error del servidor UDP: ${err.message}`);
  server.close();
});

server.bind(7000);
```

---

## 8. Ejemplo básico de cliente UDP en Node.js

```js
const dgram = require('dgram');
const client = dgram.createSocket('udp4');

const message = Buffer.from('Mensaje de prueba por UDP');

client.send(message, 7000, 'localhost', (err) => {
  if (err) {
    console.error('Error al enviar:', err);
  } else {
    console.log('Mensaje enviado correctamente');
  }

  client.close();
});
```

---

## 9. Topologías de transmisión

La clase introduce distintas formas de enviar datos en una red.

### 9.1. Unicast

En **unicast**, un emisor envía datos a un único receptor.

```text
Servidor ─────> Cliente A
```

Características:

- Comunicación punto a punto.
- Es simple de razonar.
- Cada receptor requiere su propio envío.

Ejemplo:

- Cliente consultando una API.
- Envío de un mensaje privado.
- Comunicación directa entre dos procesos.

### 9.2. Broadcast

En **broadcast**, un emisor envía datos a todos los nodos de una red o segmento.

```text
Servidor ─────> Todos los clientes de la red
```

Características:

- Llega a todos los dispositivos del segmento.
- Puede desperdiciar ancho de banda.
- Puede generar ruido innecesario.
- No siempre está permitido por routers o configuraciones modernas.

Ejemplo:

- Descubrimiento de dispositivos en red local.
- Mensajes de anuncio en una LAN.

### 9.3. Multicast

En **multicast**, un emisor envía datos a un grupo específico de receptores suscriptos.

```text
Servidor ─────> Grupo multicast
```

Características:

- Solo reciben quienes se unieron al grupo.
- Optimiza el ancho de banda frente a broadcast.
- Sirve para distribuir el mismo contenido a múltiples receptores.

En Node.js, la presentación menciona el uso de `socket.addMembership()`.

```js
socket.addMembership('239.255.0.1');
```

La idea es que el socket se una a un grupo multicast para recibir datagramas dirigidos a ese grupo.

---

## 10. Multicast en Node.js

Ejemplo conceptual de receptor multicast:

```js
const dgram = require('dgram');
const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

const MULTICAST_ADDR = '239.255.0.1';
const PORT = 5000;

socket.on('listening', () => {
  socket.addMembership(MULTICAST_ADDR);
  console.log(`Escuchando grupo multicast ${MULTICAST_ADDR}:${PORT}`);
});

socket.on('message', (msg, rinfo) => {
  console.log(`Mensaje multicast desde ${rinfo.address}:${rinfo.port}`);
  console.log(msg.toString());
});

socket.bind(PORT);
```

Ejemplo conceptual de emisor multicast:

```js
const dgram = require('dgram');
const socket = dgram.createSocket('udp4');

const MULTICAST_ADDR = '239.255.0.1';
const PORT = 5000;

const message = Buffer.from('Mensaje para el grupo multicast');

socket.send(message, PORT, MULTICAST_ADDR, () => {
  console.log('Mensaje multicast enviado');
  socket.close();
});
```

---

## 11. El límite físico: latencia en videojuegos

La presentación usa el caso de videojuegos para explicar por qué TCP y UDP tienen comportamientos problemáticos cuando se necesita sincronización en tiempo real.

En juegos de combate o multijugador, la sincronización se calcula por fotograma o **frame**. Un retraso de pocos milisegundos puede afectar directamente la respuesta del jugador.

La diapositiva menciona un ejemplo:

```text
Un retraso de 40 ms afecta directamente la respuesta del jugador.
```

### 11.1. Problema de TCP en videojuegos

Si se pierde un paquete en TCP:

- TCP detecta la pérdida.
- Detiene el avance ordenado del flujo.
- Solicita o espera retransmisión.
- Los datos posteriores quedan bloqueados hasta recuperar el dato faltante.

Esto se conoce como bloqueo por ordenamiento estricto. En aplicaciones interactivas puede sentirse como:

- Lag.
- Congelamiento momentáneo.
- Respuesta tardía.
- Saltos o demoras en la acción.

TCP protege la integridad, pero esa protección puede ser demasiado costosa para tiempo real.

### 11.2. Problema de UDP en videojuegos

Si se pierde un paquete en UDP:

- No se retransmite automáticamente.
- No hay confirmación obligatoria.
- El juego puede perder una actualización de estado.
- Puede comprometerse la consistencia del mundo del juego.

Esto puede producir:

- Teletransportes visuales.
- Posiciones inconsistentes.
- Acciones que no llegan.
- Diferencias entre el estado del cliente y el servidor.

UDP es rápido, pero la aplicación debe decidir cómo manejar la pérdida.

---

## 12. La evolución: RUDP

RUDP significa **Reliable User Datagram Protocol**.

No debe entenderse necesariamente como un protocolo estándar universal, sino como una **arquitectura personalizada implementada en la capa de aplicación sobre UDP**.

La idea es tomar UDP como base por su velocidad y agregar mecanismos puntuales de confiabilidad solo donde sean necesarios.

### 12.1. Qué busca RUDP

RUDP busca combinar:

- La velocidad extrema de UDP.
- Confirmaciones de entrega similares a TCP.
- Entrega garantizada solo para mensajes críticos.
- Descarte de paquetes no críticos cuando ya no son útiles.
- Menor bloqueo que TCP.

### 12.2. Qué agrega RUDP sobre UDP

| Mecanismo | Finalidad |
|---|---|
| ACKs selectivos | Confirmar solo ciertos paquetes importantes. |
| Números de secuencia | Identificar orden, duplicados y pérdidas. |
| Timeouts | Detectar paquetes que no fueron confirmados. |
| Retransmisión selectiva | Reenviar solo paquetes críticos perdidos. |
| Buffer confiable | Mantener temporalmente comandos importantes. |
| Buffer no confiable | Descartar datos efímeros como partículas o frames viejos. |

---

## 13. Ingeniería RUDP: bucle de repetición selectiva

La presentación muestra una arquitectura de repetición selectiva.

### 13.1. Paso 1: transmisión

El emisor manda paquetes de manera secuencial y rápida.

```text
Paquete 0 → Paquete 1 → Paquete 2 → Paquete 3 → Paquete 4
```

Cada paquete puede tener:

- Número de secuencia.
- Tipo de mensaje.
- Marca de confiabilidad.
- Payload.
- Timestamp.

### 13.2. Paso 2: ACK selectivo

El receptor confirma solo los paquetes que requieren confirmación.

```text
ACK 0
ACK 1
ACK 3
ACK 4
```

Si el paquete 2 se perdió, no se confirma.

### 13.3. Paso 3: detección de pérdida

Si no llega el ACK dentro de un tiempo definido, se asume pérdida.

```text
if Date.now() - packet.sentAt > TIMEOUT:
    retransmit(packet)
```

### 13.4. Paso 4: retransmisión selectiva

Solo se retransmiten los paquetes importantes.

Ejemplo:

| Tipo de dato | ¿Se retransmite? | Motivo |
|---|---|---|
| Comando de compra | Sí | Cambia el estado del juego. |
| Disparo confirmado | Sí | Tiene efecto persistente. |
| Posición vieja | No | Ya fue reemplazada por posiciones nuevas. |
| Partícula gráfica | No | Es visual y efímera. |
| Chat del jugador | Sí | Debe llegar completo. |

---

## 14. Buffer confiable y buffer no confiable

RUDP suele separar datos en dos categorías.

### 14.1. Reliable buffer

Almacena paquetes que deben llegar sí o sí.

Ejemplos:

- Comandos del jugador.
- Cambios de inventario.
- Eventos de daño.
- Confirmaciones de compra.
- Mensajes de chat.

Estos paquetes permanecen en memoria hasta recibir ACK.

### 14.2. Unreliable buffer

Contiene datos que pueden descartarse si ya no son actuales.

Ejemplos:

- Posiciones intermedias.
- Animaciones efímeras.
- Partículas gráficas.
- Información de cámara.
- Estados visuales rápidamente reemplazables.

Esto permite evitar acumulación innecesaria y bajar la latencia.

---

## 15. Ejemplo conceptual de paquete RUDP

```js
const packet = {
  seq: 42,
  reliable: true,
  type: 'PLAYER_COMMAND',
  payload: {
    playerId: 'p1',
    command: 'ATTACK',
    targetId: 'enemy_7'
  },
  sentAt: Date.now()
};
```

### Explicación

| Campo | Función |
|---|---|
| `seq` | Número de secuencia. |
| `reliable` | Indica si requiere ACK y posible retransmisión. |
| `type` | Clasifica el tipo de evento. |
| `payload` | Datos útiles del paquete. |
| `sentAt` | Permite calcular timeout. |

---

## 16. Ejemplo simplificado de ACK selectivo

```js
function handlePacket(packet, rinfo) {
  if (packet.reliable) {
    sendAck(packet.seq, rinfo);
  }

  processPayload(packet.payload);
}

function sendAck(seq, rinfo) {
  const ack = Buffer.from(JSON.stringify({
    type: 'ACK',
    seq
  }));

  socket.send(ack, rinfo.port, rinfo.address);
}
```

---

## 17. Ejemplo simplificado de retransmisión

```js
const pending = new Map();
const TIMEOUT_MS = 100;

function sendReliable(packet, port, address) {
  const buffer = Buffer.from(JSON.stringify(packet));

  socket.send(buffer, port, address);

  pending.set(packet.seq, {
    packet,
    port,
    address,
    sentAt: Date.now()
  });
}

setInterval(() => {
  const now = Date.now();

  for (const [seq, item] of pending.entries()) {
    if (now - item.sentAt > TIMEOUT_MS) {
      const buffer = Buffer.from(JSON.stringify(item.packet));
      socket.send(buffer, item.port, item.address);
      item.sentAt = now;
    }
  }
}, 20);
```

Este ejemplo no es una implementación completa de RUDP, pero muestra el patrón central:

1. Guardar paquetes confiables pendientes.
2. Esperar ACK.
3. Reenviar si vence el timeout.
4. Eliminar del buffer cuando llega el ACK.

---

## 18. Resultados de simulación de red

La presentación incluye resultados comparativos de una simulación de red tipo OPNET.

### 18.1. Delay extremo a extremo

| Protocolo | Delay aproximado mostrado | Interpretación |
|---|---:|---|
| TCP | Alto | Mayor latencia por control de fiabilidad y retransmisión. |
| RUDP | 0.020 s | Equilibrio entre latencia y confiabilidad. |
| UDP | 0.0047 s | Latencia mínima. |

### 18.2. Tasa de éxito de paquetes

| Protocolo | Packet Success Rate | Interpretación |
|---|---:|---|
| TCP | 100% | Máxima confiabilidad. |
| RUDP | 99.8% | Muy alta confiabilidad con menor latencia que TCP. |
| UDP | 98.5% | Buena velocidad, pero menor garantía de entrega. |

### 18.3. Conclusión de la simulación

RUDP aparece como un equilibrio arquitectónico:

- Multiplica la velocidad frente a TCP.
- Evita retrasos por congestión y retransmisión global.
- Reduce la brecha de confiabilidad frente a UDP puro.
- Alcanza una tasa de entrega muy cercana a TCP.

---

## 19. Matriz de decisión arquitectónica

La clase presenta una matriz comparativa entre TCP, UDP y RUDP.

| Criterio | TCP | UDP | RUDP |
|---|---|---|---|
| Velocidad pura | Lenta | Extrema | Muy alta |
| Pérdida de paquetes | 0% | ~1.5% | ~0.2% |
| Carga del servidor | Alta | Baja | Moderada / alta |
| Caso ideal | Web, emails | Voz, video | Juegos multijugador, MMORPGs |

### 19.1. Cuándo elegir TCP

Conviene TCP cuando:

- La integridad completa es obligatoria.
- El orden de los datos es fundamental.
- La pérdida de datos no es aceptable.
- La latencia extra es tolerable.

Ejemplos:

- Login.
- Pagos.
- Transferencia de archivos.
- Sistemas administrativos.
- APIs REST tradicionales.

### 19.2. Cuándo elegir UDP

Conviene UDP cuando:

- La latencia mínima es prioritaria.
- Se tolera pérdida parcial.
- Los datos viejos pierden valor rápidamente.
- Se necesita bajo overhead.

Ejemplos:

- Voz en tiempo real.
- Video en vivo.
- DNS.
- Telemetría IoT.
- Sensores enviando mediciones frecuentes.

### 19.3. Cuándo elegir RUDP

Conviene RUDP cuando:

- Se necesita baja latencia.
- Algunos datos deben llegar sí o sí.
- Otros datos pueden descartarse.
- La aplicación puede administrar su propia confiabilidad.

Ejemplos:

- Juegos multijugador.
- Simulaciones en tiempo real.
- Entornos colaborativos interactivos.
- Sistemas de control remoto con eventos críticos y no críticos.

---

## 20. El espectro de transporte

La última parte de la presentación ubica distintas aplicaciones en un espectro.

```text
Máxima velocidad / cero estado       Zona híbrida              Máxima integridad / estado completo
DNS, IoT, VoIP                  Gaming RUDP                  HTTPS, transferencia de archivos
```

### 20.1. Extremo izquierdo: velocidad máxima

Características:

- Poca o nula persistencia de estado.
- Baja latencia.
- Poco overhead.
- Tolerancia a pérdida.

Ejemplos:

- DNS.
- Telemetría IoT.
- Voz sobre IP.

### 20.2. Centro: transporte híbrido

Características:

- Se usa UDP como base.
- Se agregan ACKs donde hace falta.
- Se priorizan paquetes críticos.
- Se descartan datos obsoletos.

Ejemplo:

- Gaming multijugador con RUDP.

### 20.3. Extremo derecho: integridad máxima

Características:

- Estado completo.
- Orden garantizado.
- Retransmisión.
- Control de flujo.

Ejemplos:

- HTTPS web.
- Transferencia de archivos.

---

## 21. Práctica incluida: spoofing con UDP y HMAC

El archivo `spoofing.zip` contiene dos scripts:

```text
spoofing/
├── logsHMAC.js
└── atacante.js
```

La práctica trabaja sobre una problemática típica de UDP: al ser un protocolo sin conexión y sin autenticación propia, un servidor puede recibir datagramas de cualquier origen. Por eso se agrega una validación de integridad y autenticidad a nivel de aplicación usando **HMAC-SHA256**.

---

## 22. Script `logsHMAC.js`

Este archivo crea un servidor UDP que escucha en el puerto `7000`.

### 22.1. Dependencias utilizadas

```js
const dgram = require('dgram');
const crypto = require('crypto');
```

| Módulo | Uso |
|---|---|
| `dgram` | Crear socket UDP. |
| `crypto` | Generar y verificar firmas HMAC. |

### 22.2. Creación del socket

```js
const server = dgram.createSocket('udp4');
```

Se crea un socket UDP sobre IPv4.

### 22.3. Clave secreta compartida

```js
const SECRET_KEY = 'ifts16_forensics_key';
```

La clave secreta sirve para firmar y verificar los mensajes. Tanto el emisor legítimo como el receptor deben conocerla.

> Importante: en un proyecto real, una clave de este tipo no debería quedar escrita directamente en el código. Debería estar en una variable de entorno o en un sistema seguro de secretos.

### 22.4. Recepción de mensajes

```js
server.on('message', (msg, rinfo) => {
  // Validación del paquete recibido
});
```

Cuando llega un datagrama:

- `msg` contiene los bytes recibidos.
- `rinfo` contiene información del remitente, como IP y puerto.

### 22.5. Formato esperado del mensaje

El servidor espera un JSON con esta forma:

```json
{
  "payload": {
    "user": "alan",
    "action": "login_success"
  },
  "signature": "firma_hmac_en_hexadecimal"
}
```

### 22.6. Verificación de firma

El servidor recalcula la firma esperada:

```js
const expectedSignature = crypto
  .createHmac('sha256', SECRET_KEY)
  .update(JSON.stringify(payload))
  .digest('hex');
```

Luego compara:

```js
if (signature !== expectedSignature) {
  return console.error(`[ALERTA] Firma inválida de ${rinfo.address}. Posible ataque de Spoofing.`);
}
```

Si la firma recibida no coincide con la firma esperada, el paquete se rechaza.

### 22.7. Resultado de un paquete válido

Si la firma coincide:

```js
console.log(`[SECURE LOG] Origen verificado:`, payload);
```

Esto indica que el mensaje fue generado por alguien que conoce la clave secreta y que el contenido no fue alterado.

---

## 23. Script `atacante.js`

Este archivo simula tres escenarios:

1. Envío legítimo.
2. Alteración del contenido sin clave válida.
3. Envío con clave incorrecta.

### 23.1. Escenario 1: envío legítimo

```js
console.log('✅ Enviando log legítimo...');
sendSignedLog({ user: 'alan', action: 'login_success' });
```

El cliente genera una firma HMAC correcta usando la misma clave que el servidor.

Resultado esperado:

```text
[SECURE LOG] Origen verificado: { user: 'alan', action: 'login_success' }
```

### 23.2. Escenario 2: alteración del contenido

El atacante intenta enviar:

```js
const dataAlterada = { user: 'alan', action: 'DELETE_DATABASE' };
const firmaFalsa = '8b93ac...';
```

El payload fue alterado, pero la firma no es válida.

Resultado esperado:

```text
[ALERTA] Firma inválida de 127.0.0.1. Posible ataque de Spoofing.
```

### 23.3. Escenario 3: clave incorrecta

El cliente firma el mensaje con una clave equivocada:

```js
const signature = crypto.createHmac('sha256', 'CLAVE_EQUIVOCADA')
  .update(JSON.stringify(data))
  .digest('hex');
```

Como el servidor usa otra clave, la firma no coincide.

Resultado esperado:

```text
[ALERTA] Firma inválida de 127.0.0.1. Posible ataque de Spoofing.
```

---

## 24. Cómo ejecutar la práctica

Primero descomprimir el archivo:

```bash
unzip spoofing.zip
cd spoofing
```

En una terminal, ejecutar el servidor:

```bash
node logsHMAC.js
```

En otra terminal, ejecutar el simulador de ataque:

```bash
node atacante.js
```

### Resultado esperado en el cliente

```text
✅ Enviando log legítimo...
Simulando ataque: Alterando datos sin conocer la clave...
Simulando envío con clave incorrecta...
```

### Resultado esperado en el servidor

```text
[SECURE LOG] Origen verificado: { user: 'alan', action: 'login_success' }
[ALERTA] Firma inválida de 127.0.0.1. Posible ataque de Spoofing.
[ALERTA] Firma inválida de 127.0.0.1. Posible ataque de Spoofing.
```

---

## 25. Qué demuestra la práctica de spoofing

La práctica muestra que UDP por sí solo no valida:

- Quién envía el mensaje.
- Si el contenido fue alterado.
- Si el origen es confiable.
- Si el mensaje fue reenviado por un atacante.

Al agregar HMAC:

- Se protege la integridad del payload.
- Se verifica que el emisor conoce la clave compartida.
- Se rechazan mensajes modificados.
- Se mitigan ataques de falsificación a nivel de aplicación.

### 25.1. Importante: HMAC no soluciona todo

HMAC ayuda a validar el mensaje, pero no elimina todos los riesgos.

No garantiza por sí solo:

- Que la IP de origen no haya sido falsificada a nivel de red.
- Que no exista un ataque de replay.
- Que la clave secreta no haya sido filtrada.
- Que el JSON serializado sea siempre idéntico entre plataformas.

Por eso, para sistemas reales conviene agregar:

- Timestamp.
- Nonce.
- Identificador único de mensaje.
- Ventana de tolerancia temporal.
- Rechazo de mensajes repetidos.
- Comparación segura de firmas.
- Claves fuera del código fuente.

---

## 26. Mejora recomendada: evitar ataques de timing

La comparación directa:

```js
signature !== expectedSignature
```

es simple, pero en sistemas sensibles conviene usar `crypto.timingSafeEqual()` para reducir riesgos de ataques de tiempo.

Ejemplo:

```js
function safeCompareHex(a, b) {
  const bufferA = Buffer.from(a, 'hex');
  const bufferB = Buffer.from(b, 'hex');

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufferA, bufferB);
}
```

Uso:

```js
if (!safeCompareHex(signature, expectedSignature)) {
  return console.error('Firma inválida');
}
```

---

## 27. Mejora recomendada: usar timestamp y nonce

Para evitar replay attacks, el payload podría incluir:

```json
{
  "user": "alan",
  "action": "login_success",
  "timestamp": 1713720000000,
  "nonce": "550e8400-e29b-41d4-a716-446655440000"
}
```

El servidor debería validar:

1. Que la firma sea correcta.
2. Que el timestamp esté dentro de una ventana válida.
3. Que el nonce no haya sido usado antes.

Ejemplo conceptual:

```js
const usedNonces = new Set();
const MAX_SKEW_MS = 30_000;

function validateFreshness(payload) {
  const now = Date.now();

  if (Math.abs(now - payload.timestamp) > MAX_SKEW_MS) {
    return false;
  }

  if (usedNonces.has(payload.nonce)) {
    return false;
  }

  usedNonces.add(payload.nonce);
  return true;
}
```

---

## 28. Relación entre UDP, RUDP y seguridad

UDP entrega velocidad, pero no entrega seguridad de aplicación.

RUDP puede agregar confiabilidad, pero eso tampoco equivale automáticamente a seguridad.

Una arquitectura completa debería pensar por separado:

| Necesidad | Mecanismo posible |
|---|---|
| Baja latencia | UDP |
| Reenvío selectivo | RUDP |
| Confirmación de entrega | ACKs de aplicación |
| Integridad | HMAC |
| Autenticidad | HMAC con clave secreta o firmas asimétricas |
| Confidencialidad | Cifrado |
| Anti-replay | Nonce + timestamp |
| Control de abuso | Rate limiting |

---

## 29. Conexión con clases anteriores

Esta clase continúa los conceptos vistos anteriormente.

### 29.1. Relación con TCP y UDP

En clases previas se vio que:

- TCP garantiza orden, entrega y control.
- UDP prioriza velocidad y simplicidad.
- Node.js permite trabajar con ambos desde módulos nativos.

En esta clase se profundiza en UDP y se muestra cómo extenderlo.

### 29.2. Relación con Buffers

UDP trabaja con datagramas que en Node.js llegan como `Buffer`.

```js
socket.on('message', (msg) => {
  console.log(Buffer.isBuffer(msg)); // true
});
```

El buffer representa bytes crudos recibidos desde la red.

### 29.3. Relación con arquitectura de flujo

Aunque UDP no es un stream como TCP, la lógica de flujo sigue siendo importante:

- Controlar cantidad de mensajes enviados.
- Evitar saturar al receptor.
- Diferenciar datos críticos y no críticos.
- Diseñar buffers propios de aplicación.

---

## 30. Glosario de la clase

| Término | Definición |
|---|---|
| UDP | Protocolo de transporte sin conexión, rápido y sin garantías de entrega. |
| TCP | Protocolo de transporte orientado a conexión, confiable y ordenado. |
| Datagram | Unidad de datos independiente enviada por UDP. |
| Socket | Punto de comunicación entre procesos a través de red. |
| `dgram` | Módulo de Node.js para sockets UDP. |
| Unicast | Envío de uno a uno. |
| Broadcast | Envío de uno a todos dentro de una red. |
| Multicast | Envío de uno a un grupo de receptores suscriptos. |
| RUDP | Arquitectura confiable implementada sobre UDP. |
| ACK | Mensaje de confirmación de recepción. |
| Timeout | Tiempo máximo de espera antes de considerar perdido un paquete. |
| Retransmisión selectiva | Reenvío solo de paquetes necesarios. |
| HMAC | Código de autenticación basado en hash y clave secreta. |
| Spoofing | Falsificación de identidad u origen. |
| Replay attack | Reenvío malicioso de un mensaje válido capturado previamente. |

---

## 31. Resumen técnico final

La clase muestra que el transporte de datos debe diseñarse según las necesidades concretas de la aplicación.

TCP ofrece:

- Fiabilidad.
- Orden.
- Control de congestión.
- Estado completo.

UDP ofrece:

- Velocidad.
- Baja latencia.
- Baja sobrecarga.
- Simplicidad.

RUDP permite:

- Usar UDP como base rápida.
- Agregar confiabilidad selectiva.
- Confirmar solo lo importante.
- Descartar datos obsoletos.
- Evitar bloqueos globales como los de TCP.

La práctica de spoofing complementa el tema mostrando que, cuando se trabaja sobre UDP, también hay que diseñar mecanismos de seguridad a nivel de aplicación, como HMAC, timestamps, nonces y validaciones de integridad.

---

## 32. Preguntas de repaso

1. ¿Por qué UDP tiene menor latencia que TCP?
2. ¿Qué campos componen la cabecera UDP?
3. ¿Cuál es el tamaño mínimo de la cabecera UDP?
4. ¿Por qué TCP puede ser problemático en videojuegos?
5. ¿Qué problema aparece en UDP cuando se pierde un paquete importante?
6. ¿Qué significa que UDP sea stateless?
7. ¿Para qué sirve `dgram.createSocket('udp4')`?
8. ¿Qué evento se usa para recibir mensajes UDP en Node.js?
9. ¿Qué diferencia hay entre unicast, broadcast y multicast?
10. ¿Para qué sirve `socket.addMembership()`?
11. ¿Qué es RUDP?
12. ¿Por qué RUDP no se considera necesariamente un protocolo universal estándar?
13. ¿Qué es un ACK selectivo?
14. ¿Por qué algunos paquetes pueden descartarse en un juego multijugador?
15. ¿Qué datos deberían ir en un buffer confiable?
16. ¿Qué datos podrían ir en un buffer no confiable?
17. ¿Qué demuestra la práctica con HMAC?
18. ¿Por qué una firma HMAC inválida puede indicar manipulación?
19. ¿Qué limitaciones tiene HMAC frente al spoofing?
20. ¿Qué mejoras agregarías para evitar ataques de replay?

---

## 33. Ejercicios prácticos sugeridos

### Ejercicio 1: servidor UDP básico

Crear un servidor UDP que escuche en el puerto `7000` y muestre por consola:

- IP del cliente.
- Puerto del cliente.
- Mensaje recibido.

### Ejercicio 2: cliente UDP básico

Crear un cliente que envíe tres mensajes al servidor:

```text
PING 1
PING 2
PING 3
```

### Ejercicio 3: agregar ACK manual

Modificar el servidor para que responda:

```text
ACK: PING 1
ACK: PING 2
ACK: PING 3
```

### Ejercicio 4: simular pérdida

Modificar el servidor para ignorar aleatoriamente algunos paquetes.

Ejemplo:

```js
if (Math.random() < 0.3) {
  return; // Simula pérdida
}
```

### Ejercicio 5: retransmisión simple

Modificar el cliente para reenviar un mensaje si no recibe ACK en 100 ms.

### Ejercicio 6: mensaje firmado con HMAC

Extender el cliente para enviar:

```json
{
  "payload": {
    "type": "PING",
    "seq": 1
  },
  "signature": "..."
}
```

El servidor debe aceptar solo mensajes con firma válida.

---

## 34. Checklist de comprensión

Al terminar esta clase deberías poder explicar:

- [ ] Qué diferencia a TCP de UDP.
- [ ] Por qué UDP usa una cabecera de solo 8 bytes.
- [ ] Qué campos tiene un datagrama UDP.
- [ ] Cómo crear un socket UDP en Node.js.
- [ ] Cómo recibir mensajes con el evento `message`.
- [ ] Cómo enviar datagramas con `socket.send()`.
- [ ] Qué es multicast y cómo se usa `addMembership()`.
- [ ] Por qué los videojuegos suelen evitar TCP para datos en tiempo real.
- [ ] Qué problema intenta resolver RUDP.
- [ ] Cómo funciona una retransmisión selectiva.
- [ ] Qué diferencia hay entre datos confiables y no confiables.
- [ ] Cómo HMAC ayuda a validar integridad y autenticidad.
- [ ] Qué limitaciones sigue teniendo UDP aunque se use HMAC.

