# Clase 4 Backend — Servidor HTTP Nativo, Rutas, Promesas y API de Productos

**Curso:** Desarrollo Web Backend  
**Tecnología:** JavaScript / Node.js  
**Material base:** `CodigoClase4.zip`  
**Proyecto incluido:** `ejemplo-completo`  
**Archivos trabajados:**

```txt
ejemplo-completo/
├── app.js
└── baseDeDatos.js
```

---

## 1. Objetivo general de la clase

La clase 4 introduce un concepto central del backend:

> Crear un servidor HTTP con Node.js capaz de responder rutas y devolver datos en formato JSON.

Hasta las clases anteriores se trabajaron conceptos base de JavaScript y Node.js:

- variables,
- funciones,
- arrays,
- objetos,
- módulos CommonJS,
- `require`,
- `module.exports`,
- timers,
- callbacks,
- promesas,
- módulos nativos como `fs`, `os` y `path`.

En esta clase esos conceptos empiezan a unirse para construir una pequeña **API backend**.

El ejemplo principal crea un servidor HTTP que expone una ruta:

```http
GET /productos
```

y devuelve una lista de productos simulando una consulta a base de datos.

---

## 2. Estructura del proyecto

El proyecto está organizado en dos archivos:

```txt
ejemplo-completo/
├── app.js
└── baseDeDatos.js
```

### 2.1. `baseDeDatos.js`

Este archivo simula una base de datos.

Contiene:

- un array de productos,
- una función `pedirProductos`,
- una promesa,
- un `setTimeout` para simular demora,
- una exportación con `module.exports`.

---

### 2.2. `app.js`

Este archivo contiene el servidor HTTP.

Se encarga de:

- importar módulos nativos,
- importar la función `pedirProductos`,
- crear el servidor,
- escuchar peticiones,
- analizar la URL,
- validar la ruta,
- responder JSON,
- manejar errores,
- levantar el servidor en el puerto `3000`.

---

# Parte 1 — Archivo `baseDeDatos.js`

## 3. Código base

```js
// baseDeDatos.js
const baseDeDatos = [
    { id: "silla", nombre: "Silla", precio: 1500 },
    { id: "sillon", nombre: "Sillón", precio: 2500 },
    { id: "puerta", nombre: "Puerta", precio: 3500 },
    { id: "ventana", nombre: "Ventana", precio: 4500 }
];

const pedirProductos = () => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(baseDeDatos);
        }, 2000);
    });
};

module.exports = pedirProductos;
```

---

## 4. Simulación de base de datos

La variable `baseDeDatos` es un array de objetos.

```js
const baseDeDatos = [
    { id: "silla", nombre: "Silla", precio: 1500 },
    { id: "sillon", nombre: "Sillón", precio: 2500 },
    { id: "puerta", nombre: "Puerta", precio: 3500 },
    { id: "ventana", nombre: "Ventana", precio: 4500 }
];
```

Cada objeto representa un producto.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador único del producto |
| `nombre` | string | Nombre visible del producto |
| `precio` | number | Precio del producto |

Ejemplo:

```js
{ id: "silla", nombre: "Silla", precio: 1500 }
```

Este objeto representa un producto llamado `Silla`, con identificador `silla` y precio `1500`.

---

## 5. ¿Por qué se usa un array de objetos?

En backend es muy común trabajar con listas de objetos.

Por ejemplo:

- productos,
- usuarios,
- turnos,
- pedidos,
- logs,
- publicaciones,
- tareas,
- eventos,
- registros de base de datos.

Una respuesta típica de una API suele tener este formato:

```json
[
  {
    "id": "silla",
    "nombre": "Silla",
    "precio": 1500
  },
  {
    "id": "sillon",
    "nombre": "Sillón",
    "precio": 2500
  }
]
```

Por eso, aunque este archivo no usa una base de datos real, sirve para practicar una estructura similar a la que después podría venir de MySQL, PostgreSQL, MongoDB u otro sistema.

---

## 6. Función `pedirProductos`

```js
const pedirProductos = () => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(baseDeDatos);
        }, 2000);
    });
};
```

Esta función simula una operación asincrónica.

Cuando se llama a `pedirProductos()`, no devuelve inmediatamente los productos, sino que devuelve una **promesa**.

---

## 7. ¿Qué es una promesa?

Una **Promise** representa un valor que puede estar disponible ahora, en el futuro o nunca.

Una promesa puede estar en tres estados:

| Estado | Significado |
|---|---|
| `pending` | Pendiente, todavía no terminó |
| `fulfilled` | Resuelta correctamente |
| `rejected` | Rechazada por un error |

En este caso:

```js
return new Promise((resolve, reject) => {
    setTimeout(() => {
        resolve(baseDeDatos);
    }, 2000);
});
```

La promesa se resuelve después de 2 segundos con el array `baseDeDatos`.

---

## 8. ¿Para qué sirve `resolve`?

`resolve` se usa cuando la operación terminó correctamente.

```js
resolve(baseDeDatos);
```

Significa:

> La operación terminó bien y el resultado es `baseDeDatos`.

---

## 9. ¿Para qué sirve `reject`?

`reject` se usa cuando la operación falla.

En este ejemplo, `reject` está declarado pero no se usa:

```js
new Promise((resolve, reject) => {
    ...
});
```

Podría usarse así:

```js
const pedirProductos = () => {
    return new Promise((resolve, reject) => {
        const huboError = false;

        setTimeout(() => {
            if (huboError) {
                reject(new Error("No se pudieron obtener los productos"));
            } else {
                resolve(baseDeDatos);
            }
        }, 2000);
    });
};
```

---

## 10. Uso de `setTimeout`

```js
setTimeout(() => {
    resolve(baseDeDatos);
}, 2000);
```

`setTimeout` ejecuta una función después de cierto tiempo.

En este caso:

```txt
2000 milisegundos = 2 segundos
```

Esto simula el tiempo que podría tardar una consulta real a una base de datos o a una API externa.

---

## 11. Exportación con CommonJS

```js
module.exports = pedirProductos;
```

Esta línea exporta la función `pedirProductos` para que pueda usarse desde otro archivo.

En Node.js con CommonJS, para exportar usamos:

```js
module.exports = algo;
```

Y para importar usamos:

```js
const algo = require("./archivo");
```

---

# Parte 2 — Archivo `app.js`

## 12. Código base

```js
// app.js
const http = require('http');
const url = require('url');
const pedirProductos = require('./baseDeDatos');

const PORT = 3000;

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);

    if (req.method === 'GET' && parsedUrl.pathname === '/productos') {
        try {
            const productos = await pedirProductos();

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, data: productos }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, mensaje: 'Error al obtener productos' }));
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, mensaje: 'Ruta no encontrada' }));
    }
});

server.listen(PORT, () => {
    console.log(`Servidor HTTP escuchando en http://localhost:${PORT}`);
});
```

---

## 13. Importación de módulos

```js
const http = require('http');
const url = require('url');
const pedirProductos = require('./baseDeDatos');
```

El archivo importa tres cosas:

| Importación | Tipo | Uso |
|---|---|---|
| `http` | Módulo nativo de Node.js | Crear servidor HTTP |
| `url` | Módulo nativo de Node.js | Analizar la URL de la petición |
| `pedirProductos` | Módulo propio | Obtener productos simulados |

---

## 14. Módulo `http`

`http` es un módulo nativo de Node.js.

Permite crear servidores web sin instalar dependencias externas.

```js
const http = require('http');
```

Con este módulo podemos usar:

```js
http.createServer()
```

para crear un servidor.

---

## 15. Módulo `url`

`url` permite analizar URLs.

```js
const url = require('url');
```

En este ejemplo se usa:

```js
const parsedUrl = url.parse(req.url, true);
```

Esto convierte una URL como:

```txt
/productos?categoria=muebles
```

en un objeto con información útil:

```js
{
  pathname: "/productos",
  query: {
    categoria: "muebles"
  }
}
```

---

## 16. Importación de `pedirProductos`

```js
const pedirProductos = require('./baseDeDatos');
```

Esto trae la función exportada desde `baseDeDatos.js`.

Como en `baseDeDatos.js` se hizo:

```js
module.exports = pedirProductos;
```

en `app.js` se puede importar así:

```js
const pedirProductos = require('./baseDeDatos');
```

---

## 17. Puerto del servidor

```js
const PORT = 3000;
```

El puerto define dónde va a escuchar el servidor.

En este caso, el servidor queda disponible en:

```txt
http://localhost:3000
```

---

# Parte 3 — Creación del servidor HTTP

## 18. `http.createServer`

```js
const server = http.createServer(async (req, res) => {
    ...
});
```

`createServer` recibe una función callback que se ejecuta cada vez que llega una petición.

Esa función recibe dos objetos principales:

| Parámetro | Significado |
|---|---|
| `req` | Request, representa la petición del cliente |
| `res` | Response, representa la respuesta del servidor |

---

## 19. Objeto `req`

`req` contiene información de la petición.

Ejemplos:

```js
req.method
req.url
req.headers
```

En el código se usan:

```js
req.method
req.url
```

---

## 20. Objeto `res`

`res` permite construir la respuesta.

En el código se usan:

```js
res.writeHead()
res.end()
```

---

## 21. Uso de `async` en el servidor

```js
const server = http.createServer(async (req, res) => {
```

La función es `async` porque adentro se usa `await`.

```js
const productos = await pedirProductos();
```

Esto permite escribir código asincrónico de manera más clara.

---

# Parte 4 — Análisis de la URL

## 22. `url.parse`

```js
const parsedUrl = url.parse(req.url, true);
```

Esta línea analiza la URL de la petición.

Si llega:

```txt
/productos
```

entonces:

```js
parsedUrl.pathname
```

vale:

```txt
/productos
```

Si llega:

```txt
/productos?id=silla
```

entonces:

```js
parsedUrl.pathname
```

vale:

```txt
/productos
```

y:

```js
parsedUrl.query
```

vale:

```js
{ id: "silla" }
```

---

## 23. Segundo parámetro `true`

```js
url.parse(req.url, true)
```

El segundo parámetro en `true` indica que la query string se convierta en un objeto.

Ejemplo:

```txt
/productos?categoria=muebles&orden=asc
```

Resultado:

```js
parsedUrl.query
```

```js
{
  categoria: "muebles",
  orden: "asc"
}
```

---

# Parte 5 — Ruteo manual

## 24. ¿Qué es el ruteo?

El **ruteo** es el proceso de decidir qué hacer según la ruta y el método HTTP de una petición.

En Express, esto se hace de forma simple:

```js
app.get("/productos", controlador);
```

Pero con HTTP nativo hay que hacerlo manualmente.

---

## 25. Validación de método y ruta

```js
if (req.method === 'GET' && parsedUrl.pathname === '/productos') {
```

Esta condición verifica dos cosas:

1. Que el método sea `GET`.
2. Que la ruta sea `/productos`.

Solo si ambas condiciones se cumplen, el servidor responde con los productos.

---

## 26. Método HTTP `GET`

`GET` se usa para pedir información.

Ejemplos:

```http
GET /productos
GET /usuarios
GET /health
GET /status
```

En este caso:

```http
GET /productos
```

significa:

> Cliente pide la lista de productos.

---

## 27. Ruta `/productos`

La ruta `/productos` es un endpoint de la API.

```txt
http://localhost:3000/productos
```

Cuando el cliente entra a esa URL, el servidor responde con JSON.

---

# Parte 6 — Respuesta exitosa

## 28. Obtener productos con `await`

```js
const productos = await pedirProductos();
```

Como `pedirProductos()` devuelve una promesa, se usa `await`.

Esto significa:

> Esperá hasta que la promesa se resuelva y guardá el resultado en `productos`.

Como `pedirProductos` tiene un `setTimeout` de 2 segundos, la respuesta tarda aproximadamente 2 segundos.

---

## 29. `try/catch`

```js
try {
    const productos = await pedirProductos();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, data: productos }));
} catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, mensaje: 'Error al obtener productos' }));
}
```

`try/catch` permite manejar errores.

- En el `try` va el código que puede salir bien.
- En el `catch` va el código que se ejecuta si ocurre un error.

---

## 30. Código de estado `200`

```js
res.writeHead(200, { 'Content-Type': 'application/json' });
```

El estado `200` significa:

```txt
OK
```

La petición fue exitosa.

---

## 31. Header `Content-Type`

```js
{ 'Content-Type': 'application/json' }
```

Este encabezado le dice al cliente que la respuesta está en formato JSON.

Sin este encabezado, el cliente podría no interpretar correctamente la respuesta.

---

## 32. `JSON.stringify`

```js
res.end(JSON.stringify({ ok: true, data: productos }));
```

`res.end()` necesita enviar texto o bytes.

Como un objeto JavaScript no puede enviarse directamente por HTTP, se convierte a JSON string con:

```js
JSON.stringify()
```

Objeto JavaScript:

```js
{ ok: true, data: productos }
```

JSON enviado:

```json
{
  "ok": true,
  "data": [
    {
      "id": "silla",
      "nombre": "Silla",
      "precio": 1500
    }
  ]
}
```

---

## 33. Estructura de respuesta exitosa

La respuesta tiene esta forma:

```json
{
  "ok": true,
  "data": [
    {
      "id": "silla",
      "nombre": "Silla",
      "precio": 1500
    },
    {
      "id": "sillon",
      "nombre": "Sillón",
      "precio": 2500
    },
    {
      "id": "puerta",
      "nombre": "Puerta",
      "precio": 3500
    },
    {
      "id": "ventana",
      "nombre": "Ventana",
      "precio": 4500
    }
  ]
}
```

---

# Parte 7 — Manejo de errores

## 34. Respuesta con error `500`

```js
res.writeHead(500, { 'Content-Type': 'application/json' });
res.end(JSON.stringify({ ok: false, mensaje: 'Error al obtener productos' }));
```

El estado `500` significa:

```txt
Internal Server Error
```

Se usa cuando el problema ocurre en el servidor.

Ejemplo:

- falla la consulta a la base de datos,
- se rompe una promesa,
- ocurre una excepción,
- no se puede obtener la información.

---

## 35. Simular un error

Podríamos modificar `baseDeDatos.js` para simular un error:

```js
const pedirProductos = () => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            reject(new Error("Error simulado en base de datos"));
        }, 2000);
    });
};
```

En ese caso, el `catch` de `app.js` respondería:

```json
{
  "ok": false,
  "mensaje": "Error al obtener productos"
}
```

---

# Parte 8 — Ruta no encontrada

## 36. Respuesta `404`

```js
res.writeHead(404, { 'Content-Type': 'application/json' });
res.end(JSON.stringify({ ok: false, mensaje: 'Ruta no encontrada' }));
```

El estado `404` significa:

```txt
Not Found
```

Se usa cuando la ruta solicitada no existe.

Ejemplo:

```txt
http://localhost:3000/usuarios
```

Como el servidor solo tiene `/productos`, responderá:

```json
{
  "ok": false,
  "mensaje": "Ruta no encontrada"
}
```

---

# Parte 9 — Levantar el servidor

## 37. `server.listen`

```js
server.listen(PORT, () => {
    console.log(`Servidor HTTP escuchando en http://localhost:${PORT}`);
});
```

`listen` hace que el servidor empiece a escuchar peticiones.

En este caso:

```txt
Puerto: 3000
URL: http://localhost:3000
```

Cuando el servidor arranca correctamente, muestra:

```txt
Servidor HTTP escuchando en http://localhost:3000
```

---

## 38. Cómo ejecutar el proyecto

Desde la carpeta donde está `app.js`:

```bash
node app.js
```

Luego abrir en el navegador:

```txt
http://localhost:3000/productos
```

O probar con curl:

```bash
curl http://localhost:3000/productos
```

Respuesta esperada:

```json
{
  "ok": true,
  "data": [
    { "id": "silla", "nombre": "Silla", "precio": 1500 },
    { "id": "sillon", "nombre": "Sillón", "precio": 2500 },
    { "id": "puerta", "nombre": "Puerta", "precio": 3500 },
    { "id": "ventana", "nombre": "Ventana", "precio": 4500 }
  ]
}
```

---

# Parte 10 — Conceptos importantes de backend

## 39. ¿Qué es una API?

Una **API** es una interfaz que permite que dos sistemas se comuniquen.

En este caso, el servidor expone una API HTTP.

El cliente puede pedir:

```http
GET /productos
```

y el servidor devuelve productos en JSON.

---

## 40. ¿Qué es un endpoint?

Un **endpoint** es una ruta específica de una API.

Ejemplo:

```txt
/productos
```

Otros ejemplos posibles:

```txt
/usuarios
/pedidos
/health
/status
/ingest
```

---

## 41. ¿Qué es JSON?

JSON significa **JavaScript Object Notation**.

Es un formato de intercambio de datos muy usado en APIs.

Ejemplo:

```json
{
  "ok": true,
  "mensaje": "Servidor funcionando"
}
```

Aunque se parece a un objeto JavaScript, JSON es texto. Por eso usamos:

```js
JSON.stringify()
```

para convertir un objeto a texto JSON.

---

## 42. ¿Qué son los códigos HTTP?

Los códigos HTTP indican el resultado de una petición.

| Código | Significado | Uso |
|---:|---|---|
| `200` | OK | Petición exitosa |
| `201` | Created | Recurso creado |
| `202` | Accepted | Petición aceptada para procesamiento |
| `400` | Bad Request | Error del cliente |
| `404` | Not Found | Ruta no encontrada |
| `500` | Internal Server Error | Error interno del servidor |

En esta clase se usan:

- `200`,
- `404`,
- `500`.

---

# Parte 11 — Versión mejorada del ejemplo

## 43. Agregar ruta `/health`

Una buena práctica en backend es tener una ruta de estado.

```js
if (req.method === 'GET' && parsedUrl.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, status: 'online' }));
    return;
}
```

Respuesta:

```json
{
  "ok": true,
  "status": "online"
}
```

---

## 44. Agregar filtro por ID

Podemos permitir buscar un producto por query string.

Ejemplo:

```txt
/productos?id=silla
```

Código:

```js
if (req.method === 'GET' && parsedUrl.pathname === '/productos') {
    try {
        const productos = await pedirProductos();
        const { id } = parsedUrl.query;

        if (id) {
            const producto = productos.find((item) => item.id === id);

            if (!producto) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, mensaje: 'Producto no encontrado' }));
                return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, data: producto }));
            return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, data: productos }));
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, mensaje: 'Error al obtener productos' }));
    }
}
```

---

# Parte 12 — Versión equivalente con Express

Aunque la clase usa HTTP nativo, el mismo concepto en Express sería más simple.

```js
const express = require('express');
const pedirProductos = require('./baseDeDatos');

const app = express();
const PORT = 3000;

app.get('/health', (req, res) => {
    res.json({ ok: true, status: 'online' });
});

app.get('/productos', async (req, res) => {
    try {
        const productos = await pedirProductos();
        res.json({ ok: true, data: productos });
    } catch (error) {
        res.status(500).json({ ok: false, mensaje: 'Error al obtener productos' });
    }
});

app.use((req, res) => {
    res.status(404).json({ ok: false, mensaje: 'Ruta no encontrada' });
});

app.listen(PORT, () => {
    console.log(`Servidor Express escuchando en http://localhost:${PORT}`);
});
```

## 45. Comparación HTTP nativo vs Express

| Tema | HTTP nativo | Express |
|---|---|---|
| Crear servidor | `http.createServer()` | `express()` |
| Rutas | Manual con `if` | `app.get()`, `app.post()` |
| JSON | `res.writeHead()` + `JSON.stringify()` | `res.json()` |
| Status | `res.writeHead(404)` | `res.status(404)` |
| Query params | `url.parse(req.url, true)` | `req.query` |
| Middleware | Manual | Integrado |

---

# Parte 13 — Relación con clases anteriores

## 46. Relación con Clase 1

La clase 1 introdujo Node.js, V8, libuv, Event Loop, módulos y APIs nativas.

En esta clase se aplican esos conceptos porque:

- se usa Node.js en servidor,
- se trabaja con el módulo nativo `http`,
- se usan APIs nativas,
- se responde a solicitudes web,
- se aplica asincronía.

---

## 47. Relación con Clase 2

La clase 2 trabajó módulos, timers, FS, OS y PATH.

En esta clase se usan:

- módulos CommonJS,
- `require`,
- `module.exports`,
- `setTimeout`,
- asincronía,
- organización en varios archivos.

---

## 48. Relación con Clase 3

La clase 3 trabajó arrays, métodos, funciones y objetos.

En esta clase se usan:

- array de productos,
- objetos con `id`, `nombre` y `precio`,
- arrow function `pedirProductos`,
- promesas,
- callbacks,
- posible uso de `find`, `filter` o `map`.

---

# Parte 14 — Relación con el TP “The Guardian”

Este ejemplo es muy importante para el TP porque muestra la base de una API HTTP.

En “The Guardian” también habrá rutas HTTP, por ejemplo:

```txt
/health
/ingest?id=4500
```

La clase 4 ayuda a entender:

- cómo levantar un servidor,
- cómo leer una URL,
- cómo responder JSON,
- cómo manejar rutas,
- cómo trabajar con asincronía,
- cómo separar módulos,
- cómo usar `try/catch`,
- cómo devolver códigos HTTP.

## 49. Diferencia con el TP

En este ejemplo:

```txt
GET /productos
```

espera 2 segundos y devuelve datos.

En el TP:

```txt
GET /ingest?id=4500
```

debe recibir un evento y delegar el trabajo pesado a un Worker Thread para no bloquear `/health`.

Pero la estructura general es parecida:

```txt
Cliente → Endpoint HTTP → Validación → Procesamiento → Respuesta JSON
```

---

# Parte 15 — Preguntas posibles para defender la clase

## 50. ¿Qué hace `http.createServer()`?

Crea un servidor HTTP que puede recibir peticiones y enviar respuestas.

---

## 51. ¿Qué representan `req` y `res`?

- `req` representa la petición del cliente.
- `res` representa la respuesta del servidor.

---

## 52. ¿Qué hace `url.parse(req.url, true)`?

Analiza la URL de la petición y permite obtener:

- la ruta mediante `pathname`,
- los parámetros mediante `query`.

---

## 53. ¿Qué significa `GET /productos`?

Significa que el cliente está pidiendo información de productos.

---

## 54. ¿Por qué se usa `JSON.stringify()`?

Porque HTTP envía texto o bytes, no objetos JavaScript directamente. `JSON.stringify()` convierte un objeto JavaScript en texto JSON.

---

## 55. ¿Para qué sirve `Content-Type: application/json`?

Sirve para indicarle al cliente que la respuesta está en formato JSON.

---

## 56. ¿Qué significa el código `200`?

Significa que la petición fue exitosa.

---

## 57. ¿Qué significa el código `404`?

Significa que la ruta solicitada no existe.

---

## 58. ¿Qué significa el código `500`?

Significa que ocurrió un error interno en el servidor.

---

## 59. ¿Por qué `pedirProductos()` devuelve una promesa?

Porque simula una operación asincrónica, como una consulta a una base de datos.

---

## 60. ¿Qué hace `await pedirProductos()`?

Espera a que la promesa se resuelva y guarda el resultado.

---

## 61. ¿Por qué se usa `try/catch`?

Para capturar errores durante operaciones asincrónicas y responder correctamente al cliente.

---

## 62. ¿Qué es un endpoint?

Es una ruta específica de una API que permite realizar una acción o consultar información.

---

## 63. ¿Qué diferencia hay entre HTTP nativo y Express?

HTTP nativo requiere manejar rutas, headers y respuestas manualmente. Express simplifica esas tareas con métodos como `app.get`, `res.json` y `res.status`.

---

# Parte 16 — Práctica sugerida

## 64. Ejercicio 1 — Agregar `/health`

Agregar una ruta:

```txt
GET /health
```

Respuesta esperada:

```json
{
  "ok": true,
  "status": "online"
}
```

---

## 65. Ejercicio 2 — Buscar producto por ID

Agregar soporte para:

```txt
GET /productos?id=silla
```

Si existe:

```json
{
  "ok": true,
  "data": {
    "id": "silla",
    "nombre": "Silla",
    "precio": 1500
  }
}
```

Si no existe:

```json
{
  "ok": false,
  "mensaje": "Producto no encontrado"
}
```

---

## 66. Ejercicio 3 — Agregar ruta de productos caros

Crear:

```txt
GET /productos-caros
```

Que devuelva productos con precio mayor a `3000`.

---

## 67. Ejercicio 4 — Agregar contador de requests

Crear una variable:

```js
let totalRequests = 0;
```

Incrementarla por cada petición recibida y devolverla en `/health`.

```json
{
  "ok": true,
  "status": "online",
  "totalRequests": 5
}
```

---

# Parte 17 — Buenas prácticas

## 68. Separar responsabilidades

El archivo `baseDeDatos.js` se encarga de los datos.

El archivo `app.js` se encarga del servidor.

Esto es una buena práctica porque evita tener todo mezclado.

---

## 69. Usar nombres claros

Buenos nombres:

```js
pedirProductos
baseDeDatos
productos
parsedUrl
```

Malos nombres:

```js
x
data1
cosas
abc
```

---

## 70. Responder siempre con JSON consistente

Ejemplo exitoso:

```json
{
  "ok": true,
  "data": []
}
```

Ejemplo con error:

```json
{
  "ok": false,
  "mensaje": "Ruta no encontrada"
}
```

---

## 71. Usar códigos HTTP correctos

No responder todo con `200`.

Ejemplos:

- éxito: `200`,
- recurso no encontrado: `404`,
- error interno: `500`,
- error de datos del cliente: `400`.

---

## 72. Manejar errores

Toda operación asincrónica importante debería estar protegida con `try/catch`.

```js
try {
  const productos = await pedirProductos();
} catch (error) {
  // responder error
}
```

---

# Parte 18 — Resumen final

En esta clase se construyó una primera API con Node.js usando HTTP nativo.

Los conceptos principales fueron:

- servidor HTTP,
- módulo `http`,
- módulo `url`,
- `req`,
- `res`,
- ruteo manual,
- método `GET`,
- endpoint `/productos`,
- promesas,
- `setTimeout`,
- `async/await`,
- `try/catch`,
- códigos HTTP,
- respuestas JSON,
- `Content-Type`,
- `JSON.stringify`,
- módulos CommonJS,
- separación entre servidor y datos.

Esta clase es una base directa para construir APIs más complejas con Express y para desarrollar el TP “The Guardian”.

---

# Parte 19 — Checklist de estudio

- [ ] Entiendo qué hace `http.createServer`.
- [ ] Sé qué son `req` y `res`.
- [ ] Puedo explicar qué es un endpoint.
- [ ] Sé qué significa `GET`.
- [ ] Sé usar `url.parse`.
- [ ] Entiendo `pathname`.
- [ ] Entiendo `query`.
- [ ] Sé responder JSON con `JSON.stringify`.
- [ ] Sé configurar `Content-Type: application/json`.
- [ ] Sé usar códigos `200`, `404` y `500`.
- [ ] Entiendo qué hace `pedirProductos`.
- [ ] Entiendo por qué se usa una promesa.
- [ ] Entiendo qué hace `setTimeout`.
- [ ] Sé usar `async/await`.
- [ ] Sé usar `try/catch`.
- [ ] Puedo explicar la diferencia entre HTTP nativo y Express.
- [ ] Puedo relacionar esta clase con `/health` y `/ingest` del TP.
