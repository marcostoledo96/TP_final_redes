# Clase 5 Backend — HTTP Nativo, Headers, Favicon, HTML, JSON y Fetch

**Curso:** Desarrollo Web Backend  
**Tecnología:** Node.js / JavaScript  
**Material base:** `Clase5.zip`  
**Proyecto incluido:** `Clase5`

---

## 1. Objetivo general de la clase

La clase 5 profundiza el trabajo con servidores HTTP nativos en Node.js.

En la clase anterior se había construido una API simple con:

- `http.createServer()`,
- rutas básicas,
- respuestas JSON,
- promesas,
- `async/await`,
- `try/catch`,
- una base de datos simulada.

En esta clase se amplía esa idea para trabajar con distintos tipos de respuesta y con información más completa de la petición.

Los temas centrales son:

- creación de servidores HTTP nativos,
- análisis del objeto `request`,
- uso de `request.method`,
- uso de `request.url`,
- lectura de `request.headers`,
- manejo de `User-Agent`,
- respuestas HTML directas,
- respuestas JSON,
- rutas dinámicas básicas,
- uso de `fs.createReadStream()` para servir favicon,
- uso de `fs.readFile()` para servir un archivo HTML,
- consumo de una API desde el navegador con `fetch`,
- separación entre backend y frontend simple.

---

## 2. Estructura del material de clase

El ZIP contiene la siguiente estructura:

```txt
Clase5/
├── server.js
├── snorlax.ico
├── public/
│   └── index.html
└── server-productos/
    ├── dataBase.js
    ├── server-productos.js
    └── server-headers.js
```

Cada archivo cumple una función distinta.

| Archivo | Función |
|---|---|
| `server.js` | Ejemplos progresivos de servidor HTTP nativo |
| `snorlax.ico` | Ícono usado como favicon |
| `public/index.html` | Página HTML que consume productos con `fetch` |
| `server-productos/dataBase.js` | Base de datos simulada de productos |
| `server-productos/server-productos.js` | API simple de productos en JSON |
| `server-productos/server-headers.js` | Servidor más completo con headers, HTML, JSON y archivo estático |

---

# Parte 1 — Repaso: servidor HTTP básico

## 3. Servidor mínimo con Node.js

El archivo `server.js` comienza con ejemplos comentados.

Un servidor básico en Node.js puede escribirse así:

```js
const http = require('http');

http.createServer(function(request, response) {
    response.write('Hola mundo');
    response.end();
}).listen(3000);

console.log('Server operando en puerto 3000');
```

Este código hace tres cosas:

1. Importa el módulo nativo `http`.
2. Crea un servidor.
3. Escucha peticiones en el puerto `3000`.

---

## 4. `http.createServer()`

`http.createServer()` recibe una función callback.

```js
http.createServer((request, response) => {
    ...
});
```

Esa función se ejecuta cada vez que llega una petición HTTP.

Recibe dos objetos:

| Objeto | Descripción |
|---|---|
| `request` o `req` | Contiene información sobre la petición recibida |
| `response` o `res` | Permite construir y enviar la respuesta |

---

## 5. Responder al cliente

Para responder al cliente se usan principalmente:

```js
response.write('Contenido');
response.end();
```

### `response.write()`

Escribe contenido en la respuesta.

```js
response.write('Hola mundo');
```

### `response.end()`

Finaliza la respuesta.

```js
response.end();
```

Si no se llama a `end()`, el navegador o cliente puede quedar esperando indefinidamente.

---

## 6. Versión con arrow function

El mismo servidor puede escribirse con función flecha:

```js
const http = require('http');

http.createServer((request, response) => {
    response.write('Hola mundo');
    response.end();
}).listen(3000);
```

También se puede escribir de forma muy compacta, aunque no es lo más recomendable para estudiar:

```js
http.createServer((request, response) => {
    response.write('Hola mundo');
    response.end();
}).listen(3000);
```

Para código real conviene priorizar claridad.

---

# Parte 2 — Elementos del objeto `request`

## 7. Información disponible en `request`

El archivo `server.js` incluye una lista de elementos importantes del objeto `request`.

```js
request.method
request.url
request.headers
request.httpVersion
request.socket
request.rawHeaders
```

Estos datos permiten saber:

- qué método HTTP usó el cliente,
- qué URL pidió,
- qué headers envió,
- qué versión HTTP usa,
- desde qué socket se conectó,
- cómo llegaron los headers originales.

---

## 8. `request.method`

Indica el método HTTP usado por el cliente.

Ejemplos:

```txt
GET
POST
PUT
PATCH
DELETE
```

Código:

```js
console.log(req.method);
```

Si entramos a una ruta desde el navegador, normalmente veremos:

```txt
GET
```

---

## 9. `request.url`

Indica la URL solicitada.

```js
console.log(req.url);
```

Ejemplos:

```txt
/
./home
/about
/productos/json
/productos?id=silla
/favicon.ico
```

Esto permite hacer ruteo manual.

---

## 10. `request.headers`

Contiene los encabezados HTTP enviados por el cliente.

```js
console.log(req.headers);
```

Ejemplo aproximado:

```js
{
  host: 'localhost:5000',
  connection: 'keep-alive',
  'user-agent': 'Mozilla/5.0 ...',
  accept: 'text/html,...'
}
```

Los headers sirven para conocer más información del cliente o de la petición.

---

## 11. `request.httpVersion`

Indica la versión del protocolo HTTP utilizada.

```js
console.log(req.httpVersion);
```

Ejemplo:

```txt
1.1
```

---

## 12. `request.socket`

Contiene información de la conexión TCP subyacente.

Por ejemplo:

```js
console.log(req.socket.remoteAddress);
```

Esto puede mostrar la dirección IP remota del cliente.

---

## 13. `request.rawHeaders`

Devuelve los headers en formato de array, conservando el orden y la forma más cercana a como llegaron.

```js
console.log(req.rawHeaders);
```

Ejemplo:

```js
[
  'Host',
  'localhost:5000',
  'User-Agent',
  'Mozilla/5.0 ...'
]
```

---

# Parte 3 — Servidor de inspección de requests

## 14. Ejemplo para inspeccionar la petición

El material incluye este ejemplo:

```js
const http = require('http');

http.createServer((req, res) => {
    console.log(req.method);
    console.log(req.url);
    console.log(req.headers);
    console.log(req.httpVersion);
    console.log(req.rawHeaders);

    res.end();
}).listen(5000);

console.info("Server running on 5000");
```

Este servidor no devuelve contenido importante, sino que sirve para observar en consola qué envía el cliente.

---

## 15. Diferencia entre navegador y herramientas como Postman

Una idea importante de la clase es que no todos los clientes envían los mismos headers.

Por ejemplo:

- un navegador envía `User-Agent`, `Accept`, `Accept-Language`, cookies, etc.;
- Postman envía su propio `User-Agent`;
- `curl` envía otro identificador;
- `fetch` desde el navegador puede enviar headers distintos;
- una app móvil también puede enviar headers diferentes.

Por eso, en backend se puede tomar decisiones según headers.

---

# Parte 4 — Ruteo manual con condicionales

## 16. ¿Qué es ruteo?

El **ruteo** consiste en responder distinto según la URL solicitada.

Ejemplo:

```txt
/       → página raíz
/home   → página principal
/about  → acerca de
```

Con HTTP nativo, el ruteo se hace manualmente con condicionales.

---

## 17. Ejemplo de rutas básicas

```js
http.createServer((request, response) => {
    console.log(request.url);

    if (request.url === '/') {
        response.write('Root page');
    } else if (request.url === '/home') {
        response.write('Main page');
    } else if (request.url === '/about') {
        response.write('acerca de');
    } else {
        response.write('<h1>Pagina no encontrada</h1>');
    }

    response.end();
}).listen(8000);
```

---

## 18. Importancia de usar `else if`

En una versión del código se usan varios `if` separados y luego un `else`.

Eso puede generar comportamientos inesperados.

Ejemplo problemático:

```js
if (request.url === '/') {
    response.write('Root page');
}
if (request.url === '/home') {
    response.write('Main page');
}
if (request.url === '/about') {
    response.write('acerca de');
}
else {
    response.write('No encontrado');
}
```

El `else` solo queda asociado al último `if`, no a todos.

La versión más clara es:

```js
if (request.url === '/') {
    response.write('Root page');
} else if (request.url === '/home') {
    response.write('Main page');
} else if (request.url === '/about') {
    response.write('acerca de');
} else {
    response.write('No encontrado');
}
```

---

# Parte 5 — Respuestas HTML

## 19. Enviar HTML desde Node.js

El servidor puede devolver texto HTML.

```js
response.write('<h1>Pagina no encontrada</h1>');
response.end();
```

El navegador interpreta ese texto como HTML si el contenido corresponde o si se configura correctamente el header.

---

## 20. HTML multilínea con template literals

Se pueden usar backticks para enviar HTML más largo:

```js
response.write(`
    <h1>No encontrada</h1>
    <p>Algo de contenido aca</p>
`);
response.end();
```

Esto permite escribir HTML en varias líneas.

---

## 21. HTML con enlaces

Ejemplo:

```js
response.write(`
    <h1>No encontrada</h1>
    <p>Algo de contenido aca</p>
    <a href="https://www.google.com">Back to main page</a>
`);
```

Esto genera una página HTML simple con un enlace.

---

# Parte 6 — Manejo de favicon

## 22. ¿Qué es el favicon?

El **favicon** es el pequeño ícono que aparece en la pestaña del navegador.

Cuando un navegador entra a una página, suele pedir automáticamente:

```txt
/favicon.ico
```

Por eso, aunque el usuario no lo escriba, el servidor puede recibir una petición a esa ruta.

---

## 23. Servir favicon con `fs.createReadStream()`

El archivo `server.js` muestra este concepto:

```js
if (request.url === '/favicon.ico') {
    response.writeHead(200, { 'Content-Type': 'image/x-icon' });

    fs.createReadStream('snorlax.ico').pipe(response);
}
```

### Explicación

```js
response.writeHead(200, { 'Content-Type': 'image/x-icon' });
```

Indica que se está enviando un ícono.

```js
fs.createReadStream('snorlax.ico').pipe(response);
```

Lee el archivo como stream y lo conecta directamente con la respuesta HTTP.

---

## 24. ¿Por qué usar streams?

Un stream permite enviar el archivo por partes.

Esto evita cargar todo el archivo completo en memoria antes de responder.

Para archivos pequeños no es tan crítico, pero es una buena práctica para entender cómo se sirven archivos estáticos.

---

# Parte 7 — Base de datos simulada

## 25. Archivo `dataBase.js`

El proyecto `server-productos` incluye una base de datos simulada:

```js
const baseDeDatos = [
    { id: "silla", nombre: "Silla", precio: 1500 },
    { id: "sillon", nombre: "Sillon", precio: 2500 },
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

## 26. Qué representa `baseDeDatos`

Aunque no hay una base de datos real, el array simula una tabla de productos.

| id | nombre | precio |
|---|---|---:|
| silla | Silla | 1500 |
| sillon | Sillon | 2500 |
| puerta | Puerta | 3500 |
| ventana | Ventana | 4500 |

---

## 27. Función `pedirProductos`

```js
const pedirProductos = () => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(baseDeDatos);
        }, 2000);
    });
};
```

Esta función simula una consulta asincrónica.

Cuando se ejecuta:

```js
const productos = await pedirProductos();
```

el servidor espera 2 segundos y recibe el array de productos.

---

## 28. Relación con bases de datos reales

En un proyecto real, esta función podría ser reemplazada por una consulta a PostgreSQL, MySQL o MongoDB.

Ejemplo conceptual:

```js
const pedirProductos = async () => {
    const result = await db.query('SELECT * FROM productos');
    return result.rows;
};
```

La estructura del backend sería parecida:

```txt
Ruta HTTP → función de datos → respuesta JSON
```

---

# Parte 8 — API simple de productos

## 29. Archivo `server-productos.js`

Este archivo crea un servidor en el puerto `3000` y expone la ruta:

```txt
GET /productos
```

Código principal:

```js
const http = require('http');
const url = require('url');
const pedirProductos = require('./dataBase');

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

## 30. Uso de `url.parse`

```js
const parsedUrl = url.parse(req.url, true);
```

Permite separar la URL en partes.

Ejemplo:

```txt
/productos?id=silla
```

Produce:

```js
parsedUrl.pathname // "/productos"
parsedUrl.query    // { id: "silla" }
```

---

## 31. Validación de método y ruta

```js
if (req.method === 'GET' && parsedUrl.pathname === '/productos') {
```

Se responde solo si:

- el método es `GET`,
- la ruta es `/productos`.

Esto evita que cualquier ruta reciba la misma respuesta.

---

## 32. Respuesta JSON exitosa

```js
res.writeHead(200, { 'Content-Type': 'application/json' });
res.end(JSON.stringify({ ok: true, data: productos }));
```

Respuesta esperada:

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
      "nombre": "Sillon",
      "precio": 2500
    }
  ]
}
```

---

## 33. Manejo de errores

Si falla `pedirProductos()`, el servidor responde:

```js
res.writeHead(500, { 'Content-Type': 'application/json' });
res.end(JSON.stringify({ ok: false, mensaje: 'Error al obtener productos' }));
```

Código `500` significa error interno del servidor.

---

## 34. Ruta no encontrada

Si la ruta no coincide, responde:

```js
res.writeHead(404, { 'Content-Type': 'application/json' });
res.end(JSON.stringify({ ok: false, mensaje: 'Ruta no encontrada' }));
```

Código `404` significa recurso no encontrado.

---

## 35. Observación técnica sobre el favicon en `server-productos.js`

El archivo contiene este bloque:

```js
if (parsedUrl.pathname === '../snorlax.ico') {
    res.writeHead(200, { 'Content-Type': 'image/x-icon' });
    fs.createReadStream('../snorlax.ico').pipe(res);
    return;
}
```

Hay dos detalles a corregir:

1. No se importó `fs`.
2. La ruta que normalmente pide el navegador es `/favicon.ico`, no `../snorlax.ico`.

Una versión corregida sería:

```js
const fs = require('fs');
const path = require('path');

if (parsedUrl.pathname === '/favicon.ico') {
    res.writeHead(200, { 'Content-Type': 'image/x-icon' });
    fs.createReadStream(path.join(__dirname, '../snorlax.ico')).pipe(res);
    return;
}
```

---

# Parte 9 — Servidor con headers, HTML y JSON

## 36. Archivo `server-headers.js`

Este es el servidor más completo de la clase.

Usa:

```js
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const pedirProductos = require('./dataBase');
```

Y escucha en el puerto:

```js
const PORT = 5000;
```

---

## 37. Rutas principales

El servidor expone varias rutas:

| Ruta | Respuesta |
|---|---|
| `/productos/json` | Devuelve productos en JSON |
| `/productos/web` | Devuelve una página HTML generada desde Node.js |
| `/productos/html` | Devuelve el archivo `public/index.html` |
| `/favicon.ico` | Devuelve el favicon |
| cualquier otra | Devuelve 404 |

---

# Parte 10 — Uso de headers y User-Agent

## 38. Leer el User-Agent

```js
const userAgent = req.headers['user-agent'] || '';
```

El header `User-Agent` identifica el cliente que hace la petición.

Ejemplos:

```txt
Mozilla/5.0 ...
PostmanRuntime/...
curl/8.0.0
```

---

## 39. Mostrar User-Agent en consola

```js
console.log('User-Agent:', userAgent);
```

Esto permite observar desde dónde llega la petición.

---

## 40. Bloquear Postman

El servidor incluye esta regla:

```js
if (userAgent.toLowerCase().includes('postman')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, mensaje: 'Postman no permitido' }));
    return;
}
```

Si el header contiene la palabra `postman`, se responde:

```json
{
  "ok": false,
  "mensaje": "Postman no permitido"
}
```

---

## 41. Qué demuestra este ejemplo

Este ejemplo demuestra que el backend puede tomar decisiones según los headers.

Sin embargo, es importante aclarar:

> El User-Agent no es una medida de seguridad fuerte.

Un cliente puede modificar el User-Agent fácilmente. Sirve para prácticas, estadísticas, compatibilidad o lógica simple, pero no debe usarse como única protección real.

---

# Parte 11 — Ruta `/productos/json`

## 42. Respuesta en formato JSON

Código:

```js
if (req.method === 'GET' && parsedUrl.pathname === '/productos/json') {
    try {
        const productos = await pedirProductos();
        console.log("CHECK: ", productos);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, data: productos }));
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, mensaje: 'Error al obtener productos' }));
    }
}
```

Esta ruta es ideal para clientes que esperan datos estructurados.

Ejemplo:

```txt
http://localhost:5000/productos/json
```

Respuesta:

```json
{
  "ok": true,
  "data": [
    { "id": "silla", "nombre": "Silla", "precio": 1500 },
    { "id": "sillon", "nombre": "Sillon", "precio": 2500 },
    { "id": "puerta", "nombre": "Puerta", "precio": 3500 },
    { "id": "ventana", "nombre": "Ventana", "precio": 4500 }
  ]
}
```

---

# Parte 12 — Ruta `/productos/web`

## 43. Respuesta HTML generada desde Node.js

La ruta:

```txt
/productos/web
```

genera una página HTML directamente desde el servidor.

Código resumido:

```js
} else if (req.method === 'GET' && parsedUrl.pathname === '/productos/web') {
    const productos = await pedirProductos();

    res.write(`
        <h1>PRODUCTOS</h1>
        <p>Extraidos desde la base de productos</p>
        <a href="https://www.google.com">Revisa en Google</a>
        <table border="1" cellpadding="5" cellspacing="0">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Precio</th>
                </tr>
            </thead>
            <tbody>
    `);

    productos.forEach(producto => {
        res.write(`
            <tr>
                <td>${producto.id}</td>
                <td>${producto.nombre}</td>
                <td>${producto.precio}</td>
            </tr>
        `);
    });

    res.write(`
            </tbody>
        </table>
    `);

    res.end();
}
```

---

## 44. Qué hace esta ruta

1. Pide productos con `await pedirProductos()`.
2. Escribe el inicio del HTML.
3. Crea una tabla.
4. Recorre los productos con `forEach`.
5. Por cada producto escribe una fila.
6. Cierra la tabla.
7. Finaliza la respuesta.

---

## 45. Uso de `forEach` para generar HTML

```js
productos.forEach(producto => {
    res.write(`
        <tr>
            <td>${producto.id}</td>
            <td>${producto.nombre}</td>
            <td>${producto.precio}</td>
        </tr>
    `);
});
```

Esto transforma cada producto en una fila de tabla.

---

## 46. Diferencia entre devolver HTML y devolver JSON

| Tipo de respuesta | Ruta | Cliente típico |
|---|---|---|
| JSON | `/productos/json` | Frontend, app móvil, Postman, fetch |
| HTML | `/productos/web` | Navegador directamente |

JSON es mejor cuando el frontend va a decidir cómo mostrar los datos.

HTML es mejor cuando el servidor ya arma la vista completa.

---

## 47. Mejora recomendada

La ruta `/productos/web` debería indicar explícitamente que devuelve HTML:

```js
res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
```

Ejemplo:

```js
res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
res.write(`
    <h1>PRODUCTOS</h1>
`);
```

---

# Parte 13 — Ruta `/productos/html`

## 48. Servir un archivo HTML

La ruta:

```txt
/productos/html
```

lee y devuelve el archivo:

```txt
public/index.html
```

Código:

```js
} else if (req.method === 'GET' && parsedUrl.pathname === '/productos/html') {
    fs.readFile(path.join(__dirname, '../public', 'index.html'), 'utf8', (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, mensaje: 'Error al leer el archivo HTML' }));
        } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        }
    });
}
```

---

## 49. `path.join`

```js
path.join(__dirname, '../public', 'index.html')
```

Construye una ruta segura al archivo HTML.

`__dirname` representa la carpeta donde está el archivo actual.

Si `server-headers.js` está en:

```txt
Clase5/server-productos/
```

entonces:

```js
path.join(__dirname, '../public', 'index.html')
```

apunta a:

```txt
Clase5/public/index.html
```

---

## 50. `fs.readFile`

```js
fs.readFile(ruta, 'utf8', (err, data) => {
    ...
});
```

Lee un archivo de forma asincrónica.

Parámetros:

| Parámetro | Función |
|---|---|
| `ruta` | Ubicación del archivo |
| `'utf8'` | Codificación de texto |
| callback | Función que recibe error o contenido |

---

## 51. Manejo de error al leer HTML

Si ocurre un error:

```js
if (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, mensaje: 'Error al leer el archivo HTML' }));
}
```

El servidor responde código `500`.

---

## 52. Respuesta exitosa con HTML

Si la lectura sale bien:

```js
res.writeHead(200, { 'Content-Type': 'text/html' });
res.end(data);
```

El navegador recibe el HTML y lo renderiza.

---

# Parte 14 — Archivo `public/index.html`

## 53. Código del HTML

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Fetch de Productos</title>
</head>
<body>
  <h1>Obtener productos</h1>
  <button onclick="pedirProductos()">Cargar</button>
  <pre id="salida"></pre>

  <script>
    function pedirProductos() {
      fetch('http://localhost:5000/productos/json')
        .then(response => response.json())
        .then(data => {
          document.getElementById('salida').textContent = JSON.stringify(data, null, 2);
        })
        .catch(error => {
          document.getElementById('salida').textContent = 'Error: ' + error;
        });
    }
  </script>
</body>
</html>
```

---

## 54. Qué hace esta página

La página muestra:

- un título,
- un botón,
- un bloque `<pre>` para mostrar el resultado,
- un script que llama a `/productos/json`.

Cuando el usuario presiona el botón, se ejecuta:

```js
pedirProductos()
```

---

## 55. Uso de `fetch`

```js
fetch('http://localhost:5000/productos/json')
```

`fetch` realiza una petición HTTP desde el navegador.

En este caso, pide los productos al backend.

---

## 56. Convertir la respuesta a JSON

```js
.then(response => response.json())
```

La respuesta HTTP se convierte a objeto JavaScript.

---

## 57. Mostrar JSON en pantalla

```js
document.getElementById('salida').textContent = JSON.stringify(data, null, 2);
```

Esto muestra el JSON formateado.

El parámetro `null, 2` sirve para indentar el JSON con 2 espacios.

---

## 58. Manejo de errores en el frontend

```js
.catch(error => {
  document.getElementById('salida').textContent = 'Error: ' + error;
});
```

Si falla la petición, se muestra el error en pantalla.

---

## 59. Importante sobre cómo abrir el HTML

Lo ideal es abrir la página desde el servidor:

```txt
http://localhost:5000/productos/html
```

Si se abre el archivo directamente como `file://`, pueden aparecer problemas de origen o rutas.

Al servirlo desde el mismo servidor y puerto, el frontend puede consumir:

```txt
http://localhost:5000/productos/json
```

sin conflicto de origen.

---

# Parte 15 — Ruta `/favicon.ico`

## 60. Manejo correcto del favicon en `server-headers.js`

```js
if (parsedUrl.pathname === '/favicon.ico') {
    res.writeHead(200, { 'Content-Type': 'image/x-icon' });
    fs.createReadStream('../snorlax.ico').pipe(res);
    return;
}
```

Esta ruta responde al pedido automático del navegador.

---

## 61. Mejora recomendada para la ruta del favicon

El código usa:

```js
fs.createReadStream('../snorlax.ico')
```

Esto depende de desde dónde se ejecute el proceso.

Una forma más robusta es:

```js
fs.createReadStream(path.join(__dirname, '../snorlax.ico')).pipe(res);
```

Así la ruta se resuelve desde la ubicación real del archivo JS.

---

# Parte 16 — Comparación entre rutas de la clase

## 62. Tabla general

| Ruta | Método | Respuesta | Descripción |
|---|---|---|---|
| `/productos/json` | GET | JSON | Devuelve productos como datos |
| `/productos/web` | GET | HTML generado | Devuelve tabla HTML creada desde Node |
| `/productos/html` | GET | HTML estático | Devuelve archivo `index.html` |
| `/favicon.ico` | GET | Ícono | Devuelve `snorlax.ico` |
| otra ruta | cualquiera | JSON 404 | Ruta no encontrada |

---

# Parte 17 — Códigos HTTP usados

## 63. Código `200`

Significa que la petición fue exitosa.

Ejemplo:

```js
res.writeHead(200, { 'Content-Type': 'application/json' });
```

---

## 64. Código `404`

Significa que el recurso no fue encontrado.

Ejemplo:

```js
res.writeHead(404, { 'Content-Type': 'application/json' });
```

---

## 65. Código `500`

Significa que ocurrió un error interno del servidor.

Ejemplo:

```js
res.writeHead(500, { 'Content-Type': 'application/json' });
```

---

# Parte 18 — Headers importantes

## 66. `Content-Type`

Indica el tipo de contenido que se devuelve.

| Content-Type | Uso |
|---|---|
| `application/json` | Respuestas JSON |
| `text/html` | Páginas HTML |
| `image/x-icon` | Favicon |
| `text/plain` | Texto plano |

---

## 67. `User-Agent`

Identifica el cliente que realiza la petición.

Se obtiene con:

```js
req.headers['user-agent']
```

Puede usarse para:

- registrar estadísticas,
- detectar navegador o herramienta,
- hacer prácticas de condicionales,
- adaptar respuestas,
- depurar diferencias entre clientes.

No debe usarse como seguridad real.

---

# Parte 19 — Versión equivalente con Express

Aunque la clase usa HTTP nativo, estos conceptos después se trasladan muy bien a Express.

```js
const express = require('express');
const path = require('path');
const pedirProductos = require('./dataBase');

const app = express();
const PORT = 5000;

app.use((req, res, next) => {
  const userAgent = req.headers['user-agent'] || '';

  if (userAgent.toLowerCase().includes('postman')) {
    return res.status(404).json({ ok: false, mensaje: 'Postman no permitido' });
  }

  next();
});

app.get('/productos/json', async (req, res) => {
  try {
    const productos = await pedirProductos();
    res.json({ ok: true, data: productos });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: 'Error al obtener productos' });
  }
});

app.get('/productos/web', async (req, res) => {
  const productos = await pedirProductos();

  const filas = productos.map((producto) => `
    <tr>
      <td>${producto.id}</td>
      <td>${producto.nombre}</td>
      <td>${producto.precio}</td>
    </tr>
  `).join('');

  res.send(`
    <h1>PRODUCTOS</h1>
    <table border="1" cellpadding="5" cellspacing="0">
      <thead>
        <tr>
          <th>ID</th>
          <th>Nombre</th>
          <th>Precio</th>
        </tr>
      </thead>
      <tbody>
        ${filas}
      </tbody>
    </table>
  `);
});

app.get('/productos/html', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.use((req, res) => {
  res.status(404).json({ ok: false, mensaje: 'Ruta no encontrada' });
});

app.listen(PORT, () => {
  console.log(`Servidor Express escuchando en http://localhost:${PORT}`);
});
```

---

## 68. Comparación HTTP nativo vs Express

| Operación | HTTP nativo | Express |
|---|---|---|
| Crear servidor | `http.createServer()` | `express()` |
| Ruta GET | `if (req.method === 'GET' && pathname === ...)` | `app.get('/ruta', callback)` |
| Respuesta JSON | `res.writeHead()` + `JSON.stringify()` | `res.json()` |
| Respuesta HTML | `res.write()` / `res.end()` | `res.send()` |
| Archivo HTML | `fs.readFile()` | `res.sendFile()` |
| Middleware | Manual | `app.use()` |
| Headers | `req.headers` | `req.headers` |

---

# Parte 20 — Relación con clases anteriores

## 69. Relación con Clase 1

Se aplican conceptos de:

- Node.js como entorno de ejecución,
- backend,
- APIs,
- Event Loop,
- módulos nativos.

---

## 70. Relación con Clase 2

Se aplican:

- `require`,
- `module.exports`,
- módulos nativos,
- `fs`,
- `path`,
- timers,
- asincronía.

---

## 71. Relación con Clase 3

Se usan:

- arrays,
- objetos,
- `forEach`,
- funciones,
- callbacks,
- promesas,
- template literals.

---

## 72. Relación con Clase 4

La clase 5 amplía lo visto en clase 4.

Clase 4:

```txt
GET /productos → JSON
```

Clase 5:

```txt
GET /productos/json → JSON
GET /productos/web  → HTML generado
GET /productos/html → archivo HTML con fetch
```

---

# Parte 21 — Relación con el TP “The Guardian”

Esta clase aporta ideas útiles para el TP:

## 73. Lectura de headers

En el TP se puede usar headers para observar clientes o agregar información de monitoreo.

Ejemplo:

```js
const userAgent = req.headers['user-agent'];
```

---

## 74. Rutas HTTP

El TP requiere rutas como:

```txt
/health
/ingest?id=4500
```

En esta clase se practica el ruteo con:

```txt
/productos/json
/productos/web
/productos/html
```

---

## 75. Respuestas JSON consistentes

El TP debería responder JSON de forma clara.

Ejemplo:

```json
{
  "ok": true,
  "status": "accepted",
  "id": 4500
}
```

---

## 76. Separación de responsabilidades

La clase separa:

```txt
server-headers.js → servidor
dataBase.js       → datos
index.html        → frontend simple
```

En el TP conviene separar:

```txt
src/
├── primary.js
├── app.js
├── routes/
├── workers/
├── services/
└── utils/
```

---

## 77. No bloquear el servidor

Aunque `pedirProductos()` tarda 2 segundos, no bloquea el Event Loop porque usa promesas y `setTimeout`.

En el TP, el cálculo pesado sí sería CPU-bound, por eso debe delegarse a `worker_threads`.

---

# Parte 22 — Errores y mejoras detectadas en el código

## 78. Falta de `return` después de responder favicon

Cuando se usa:

```js
fs.createReadStream(...).pipe(res);
```

conviene hacer:

```js
return;
```

para evitar que el código siga ejecutándose.

---

## 79. Importar módulos usados

Si se usa `fs`, debe importarse:

```js
const fs = require('fs');
```

Si se usa `path`, debe importarse:

```js
const path = require('path');
```

---

## 80. Usar `path.join` para rutas de archivos

Evitar rutas relativas frágiles como:

```js
'../snorlax.ico'
```

Preferir:

```js
path.join(__dirname, '../snorlax.ico')
```

---

## 81. Indicar `Content-Type` correcto

Para HTML:

```js
res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
```

Para JSON:

```js
res.writeHead(200, { 'Content-Type': 'application/json' });
```

Para favicon:

```js
res.writeHead(200, { 'Content-Type': 'image/x-icon' });
```

---

## 82. Usar respuestas consistentes

Ejemplo recomendado:

```js
{
  "ok": true,
  "data": []
}
```

y en error:

```js
{
  "ok": false,
  "mensaje": "Ruta no encontrada"
}
```

---

# Parte 23 — Preguntas posibles para defender la clase

## 83. ¿Qué hace `req.headers`?

Contiene los encabezados HTTP enviados por el cliente.

---

## 84. ¿Qué es el `User-Agent`?

Es un header que identifica el cliente que realiza la petición, por ejemplo un navegador, Postman o curl.

---

## 85. ¿Se puede usar `User-Agent` como seguridad?

No como seguridad fuerte, porque el cliente puede modificarlo.

---

## 86. ¿Qué es `/favicon.ico`?

Es la ruta que el navegador suele pedir automáticamente para obtener el ícono de la pestaña.

---

## 87. ¿Qué hace `fs.createReadStream().pipe(res)`?

Lee un archivo como flujo y lo envía directamente en la respuesta HTTP.

---

## 88. ¿Qué diferencia hay entre `/productos/json` y `/productos/web`?

- `/productos/json` devuelve datos en JSON.
- `/productos/web` devuelve HTML generado desde el servidor.

---

## 89. ¿Qué hace `/productos/html`?

Lee y devuelve el archivo `public/index.html`.

---

## 90. ¿Qué hace `fetch` en el HTML?

Hace una petición HTTP desde el navegador al backend.

---

## 91. ¿Qué hace `response.json()` en el frontend?

Convierte la respuesta HTTP en un objeto JavaScript a partir del JSON recibido.

---

## 92. ¿Qué hace `JSON.stringify(data, null, 2)`?

Convierte un objeto JavaScript en texto JSON formateado con indentación.

---

## 93. ¿Por qué se usa `path.join`?

Para construir rutas de archivos de forma más segura y compatible entre sistemas operativos.

---

## 94. ¿Qué significa `Content-Type: application/json`?

Indica que la respuesta está en formato JSON.

---

## 95. ¿Qué significa `Content-Type: text/html`?

Indica que la respuesta es HTML y debe ser interpretada por el navegador.

---

# Parte 24 — Práctica sugerida

## 96. Ejercicio 1 — Agregar ruta `/health`

Crear una ruta:

```txt
GET /health
```

Respuesta:

```json
{
  "ok": true,
  "status": "online"
}
```

---

## 97. Ejercicio 2 — Agregar ruta `/productos/carros`

Crear una ruta que devuelva productos con precio mayor a `3000`.

```txt
GET /productos/caros
```

---

## 98. Ejercicio 3 — Agregar filtro por query string

Permitir:

```txt
GET /productos/json?id=silla
```

Si existe, devolver solo ese producto.

---

## 99. Ejercicio 4 — Mostrar productos con estilos

Modificar `/productos/web` para agregar CSS básico a la tabla.

---

## 100. Ejercicio 5 — Crear una página frontend mejorada

Modificar `index.html` para:

- agregar botón de cargar productos,
- mostrar estado de carga,
- mostrar errores,
- mostrar productos en tabla.

---

# Parte 25 — Checklist de estudio

- [ ] Entiendo cómo crear un servidor HTTP nativo.
- [ ] Sé qué son `req` y `res`.
- [ ] Sé leer `req.method`.
- [ ] Sé leer `req.url`.
- [ ] Sé leer `req.headers`.
- [ ] Entiendo qué es `User-Agent`.
- [ ] Sé qué es `/favicon.ico`.
- [ ] Sé servir un favicon con stream.
- [ ] Sé devolver JSON.
- [ ] Sé devolver HTML generado desde Node.js.
- [ ] Sé leer un archivo HTML con `fs.readFile`.
- [ ] Sé usar `path.join`.
- [ ] Sé usar `fetch` desde el navegador.
- [ ] Sé convertir una respuesta en JSON con `response.json()`.
- [ ] Sé mostrar JSON en HTML.
- [ ] Sé diferenciar `/productos/json`, `/productos/web` y `/productos/html`.
- [ ] Sé explicar por qué `User-Agent` no es seguridad fuerte.
- [ ] Puedo relacionar esta clase con rutas del TP como `/health` e `/ingest`.

---

# Parte 26 — Resumen final

La clase 5 consolida la construcción de servidores HTTP en Node.js y agrega conceptos clave para backend:

- inspección de requests,
- lectura de headers,
- detección de User-Agent,
- ruteo manual,
- respuestas HTML,
- respuestas JSON,
- favicon,
- lectura de archivos,
- uso de streams,
- uso de `fetch` desde el frontend,
- separación entre datos, servidor y vista,
- manejo de errores,
- códigos HTTP.

Es una clase importante porque muestra que un backend no solo devuelve datos: también puede decidir cómo responder según la ruta, el método, los headers y el tipo de cliente.
