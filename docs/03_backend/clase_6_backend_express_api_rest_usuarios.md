# Clase 6 Backend — Express, Router, EJS, Arquitectura MVC y API REST de Usuarios

**Curso:** Desarrollo Web Backend  
**Tecnología:** Node.js / Express  
**Material base:** `CodigosClase6.zip`

---

## 1. Objetivo general de la clase

La clase 6 marca un salto importante dentro del recorrido de Backend: se empieza a dejar atrás el manejo manual del servidor HTTP nativo y se comienza a trabajar con **Express**, uno de los frameworks más usados en Node.js para crear aplicaciones web y APIs.

En las clases anteriores se trabajó con:

- servidores HTTP nativos con `http.createServer`,
- rutas hechas con `if` y `else if`,
- respuestas JSON,
- respuestas HTML,
- headers,
- `fetch`,
- módulos CommonJS,
- arrays y objetos,
- promesas,
- separación básica entre archivos.

En esta clase se avanza hacia una estructura más profesional:

- uso de Express,
- uso de `express.Router`,
- separación por carpetas,
- controladores,
- modelos,
- servicios,
- middlewares,
- API REST,
- operaciones CRUD,
- uso de `nodemon`,
- uso de `package.json`,
- proyecto generado automáticamente con Express Generator,
- motor de vistas EJS.

La idea principal de la clase es entender cómo organizar una aplicación backend de manera más mantenible.

---

# Parte 1 — Estructura general del material

El ZIP contiene dos proyectos principales:

```txt
CodigosClase6/
├── express-autogenerado/
│   └── ejs/
│       ├── app.js
│       ├── bin/
│       │   └── www
│       ├── package.json
│       ├── public/
│       │   └── stylesheets/
│       │       └── style.css
│       ├── routes/
│       │   ├── index.js
│       │   └── users.js
│       └── views/
│           ├── error.ejs
│           └── index.ejs
│
└── gestion-usuarios/
    ├── app.js
    ├── package.json
    ├── Readme.md
    ├── TestingEndpoints.md
    ├── estructura-basica.txt
    ├── controllers/
    │   └── user.controller.js
    ├── middlewares/
    │   └── error.middleware.js
    ├── models/
    │   └── user.model.js
    ├── routes/
    │   └── user.routes.js
    └── services/
        └── user.service.js
```

## 1.1. Proyecto `express-autogenerado/ejs`

Este proyecto muestra una aplicación creada con una estructura típica de Express Generator.

Incluye:

- `app.js`,
- carpeta `bin`,
- carpeta `routes`,
- carpeta `views`,
- carpeta `public`,
- motor de vistas `EJS`,
- middlewares comunes,
- manejo de errores,
- ruta principal,
- ruta de usuarios.

---

## 1.2. Proyecto `gestion-usuarios`

Este proyecto representa una API REST simple de usuarios.

Incluye:

- servidor Express,
- rutas REST,
- controladores,
- modelo en memoria,
- middleware de errores,
- estructura modular,
- instrucciones de ejecución,
- endpoints para probar.

Es el proyecto más importante para aplicar a backend práctico.

---

# Parte 2 — Express como framework backend

## 2. ¿Qué es Express?

**Express** es un framework para Node.js que simplifica la creación de servidores web y APIs.

Con HTTP nativo, una ruta se maneja así:

```js
if (req.method === 'GET' && parsedUrl.pathname === '/productos') {
  // responder productos
}
```

Con Express, la misma idea se escribe así:

```js
app.get('/productos', (req, res) => {
  res.json({ ok: true });
});
```

Express permite escribir código más limpio, modular y mantenible.

---

## 3. Ventajas de Express

Express simplifica tareas comunes del backend:

| Tarea | HTTP nativo | Express |
|---|---|---|
| Crear servidor | `http.createServer()` | `express()` |
| Rutas | condicionales manuales | `app.get`, `app.post`, `router.get` |
| JSON en request | procesar body manualmente | `express.json()` |
| JSON en response | `JSON.stringify()` | `res.json()` |
| Status HTTP | `res.writeHead()` | `res.status()` |
| Archivos estáticos | `fs` manual | `express.static()` |
| Middlewares | manual | `app.use()` |
| Modularización | manual | routers, controllers, services |

---

## 4. Instalación de Express

Según el `Readme.md` del proyecto `gestion-usuarios`, la instalación se realiza con:

```bash
npm install express
```

Para desarrollo, también se usa `nodemon`:

```bash
npm install --save-dev nodemon
```

---

## 5. Uso de `nodemon`

`nodemon` reinicia automáticamente el servidor cuando detecta cambios en los archivos.

Esto evita tener que hacer manualmente:

```bash
Ctrl + C
node app.js
```

cada vez que se modifica el código.

---

## 6. Scripts del `package.json`

El proyecto `gestion-usuarios` define estos scripts:

```json
{
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js"
  }
}
```

## 6.1. Modo producción

```bash
npm start
```

Ejecuta:

```bash
node app.js
```

## 6.2. Modo desarrollo

```bash
npm run dev
```

Ejecuta:

```bash
nodemon app.js
```

---

# Parte 3 — Proyecto `express-autogenerado/ejs`

## 7. ¿Qué muestra este proyecto?

El proyecto `express-autogenerado/ejs` parece generado con una plantilla de Express usando EJS como motor de vistas.

Su objetivo es mostrar una estructura más completa de aplicación web:

```txt
app.js
bin/www
routes/
views/
public/
```

A diferencia de una API pura, este proyecto también renderiza vistas HTML desde el servidor.

---

## 8. `package.json` del proyecto EJS

```json
{
  "name": "ejs",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "start": "node ./bin/www"
  },
  "dependencies": {
    "cookie-parser": "~1.4.4",
    "debug": "~2.6.9",
    "ejs": "~2.6.1",
    "express": "~4.16.1",
    "http-errors": "~1.6.3",
    "morgan": "~1.9.1"
  }
}
```

### Dependencias principales

| Dependencia | Función |
|---|---|
| `express` | Framework backend |
| `ejs` | Motor de plantillas |
| `morgan` | Logger de requests HTTP |
| `cookie-parser` | Parser de cookies |
| `http-errors` | Creación de errores HTTP |
| `debug` | Utilidad de depuración |

---

## 9. Archivo `app.js` del proyecto EJS

Código principal:

```js
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();
```

Este bloque importa dependencias y routers.

---

## 10. Configuración del motor de vistas

```js
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
```

Esto le indica a Express:

1. que las vistas están en la carpeta `views`,
2. que el motor de plantillas será `ejs`.

---

## 11. ¿Qué es EJS?

**EJS** significa **Embedded JavaScript**.

Permite generar HTML dinámico mezclando HTML con expresiones de JavaScript.

Ejemplo:

```ejs
<h1><%= title %></h1>
```

Si desde el servidor se pasa:

```js
{ title: 'Express' }
```

entonces en HTML se renderiza:

```html
<h1>Express</h1>
```

---

## 12. Middlewares del proyecto EJS

```js
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
```

### Explicación

| Middleware | Función |
|---|---|
| `logger('dev')` | Muestra logs de requests en consola |
| `express.json()` | Permite recibir JSON en el body |
| `express.urlencoded()` | Permite recibir formularios HTML |
| `cookieParser()` | Permite leer cookies |
| `express.static()` | Sirve archivos estáticos desde `public` |

---

## 13. Rutas del proyecto EJS

```js
app.use('/', indexRouter);
app.use('/users', usersRouter);
```

Esto significa:

| Base path | Router |
|---|---|
| `/` | `routes/index.js` |
| `/users` | `routes/users.js` |

---

## 14. Ruta principal `routes/index.js`

```js
var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
```

Esta ruta responde a:

```http
GET /
```

y renderiza la vista:

```txt
views/index.ejs
```

pasándole el valor:

```js
{ title: 'Express' }
```

---

## 15. Vista `views/index.ejs`

```ejs
<!DOCTYPE html>
<html>
  <head>
    <title><%= title %></title>
    <link rel='stylesheet' href='/stylesheets/style.css' />
  </head>
  <body>
    <h1><%= title %></h1>
    <p>Welcome to <%= title %></p>
  </body>
</html>
```

Esta vista genera una página HTML donde `title` se reemplaza por el valor enviado desde el controlador.

Si `title` vale `"Express"`, el navegador muestra:

```html
<h1>Express</h1>
<p>Welcome to Express</p>
```

---

## 16. Ruta de usuarios `routes/users.js`

```js
var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.get('/usuario/', function(req, res){
  res.send('{"Nombre" : "pepito"}')
});

module.exports = router;
```

Como este router está montado en:

```js
app.use('/users', usersRouter);
```

las rutas finales son:

```txt
GET /users
GET /users/usuario/
```

---

## 17. Observación sobre `res.send` con JSON manual

La ruta:

```js
res.send('{"Nombre" : "pepito"}')
```

envía un string con formato JSON.

Una versión más correcta en Express sería:

```js
res.json({ Nombre: "pepito" });
```

Ventajas de `res.json()`:

- convierte automáticamente el objeto a JSON,
- configura el `Content-Type`,
- evita errores de formato manual.

---

## 18. Manejo de 404 en proyecto EJS

```js
app.use(function(req, res, next) {
  next(createError(404));
});
```

Este middleware se ejecuta si ninguna ruta anterior respondió.

Crea un error 404 y lo envía al manejador de errores.

---

## 19. Middleware de errores del proyecto EJS

```js
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});
```

Este middleware:

1. recibe el error,
2. guarda información en `res.locals`,
3. define el status HTTP,
4. renderiza la vista `error.ejs`.

---

## 20. Vista `views/error.ejs`

```ejs
<h1><%= message %></h1>
<h2><%= error.status %></h2>
<pre><%= error.stack %></pre>
```

Muestra:

- mensaje del error,
- status,
- stack trace.

En producción, normalmente no conviene mostrar el stack completo al usuario.

---

## 21. Archivo `bin/www`

El archivo `bin/www` es el encargado de crear y levantar el servidor HTTP.

Parte principal:

```js
var app = require('../app');
var debug = require('debug')('ejs:server');
var http = require('http');

var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

var server = http.createServer(app);

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);
```

Esto muestra una separación importante:

- `app.js` configura Express,
- `bin/www` crea el servidor HTTP real y lo pone a escuchar.

---

## 22. Normalización de puerto

```js
function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    return val;
  }

  if (port >= 0) {
    return port;
  }

  return false;
}
```

Esta función permite aceptar:

- número de puerto,
- named pipe,
- valor inválido.

---

## 23. Manejo de errores del servidor

```js
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}
```

Errores importantes:

| Error | Significado |
|---|---|
| `EACCES` | El puerto requiere permisos elevados |
| `EADDRINUSE` | El puerto ya está en uso |

---

# Parte 4 — Proyecto `gestion-usuarios`

## 24. Objetivo del proyecto

El proyecto `gestion-usuarios` implementa una API REST simple para administrar usuarios en memoria.

Permite:

- listar usuarios,
- crear usuarios,
- obtener usuario por ID,
- actualizar usuario por ID,
- eliminar usuario por ID.

Esto corresponde a un CRUD básico.

---

## 25. ¿Qué es CRUD?

CRUD es un acrónimo de:

| Letra | Operación | Método HTTP típico |
|---|---|---|
| C | Create | `POST` |
| R | Read | `GET` |
| U | Update | `PUT` o `PATCH` |
| D | Delete | `DELETE` |

En esta clase se implementan las cuatro operaciones.

---

## 26. Estructura del proyecto `gestion-usuarios`

Según `estructura-basica.txt`, la organización propuesta es:

```txt
/api-rest/
│
├── controllers/
│   └── user.controller.js
├── models/
│   └── user.model.js
├── routes/
│   └── user.routes.js
├── services/
│   └── user.service.js
├── middlewares/
│   └── error.middleware.js
├── app.js
```

En el ZIP, el proyecto real tiene:

```txt
gestion-usuarios/
├── app.js
├── controllers/
│   └── user.controller.js
├── middlewares/
│   └── error.middleware.js
├── models/
│   └── user.model.js
├── routes/
│   └── user.routes.js
├── services/
│   └── user.service.js
├── package.json
├── Readme.md
└── TestingEndpoints.md
```

---

# Parte 5 — Arquitectura por capas

## 27. ¿Por qué separar carpetas?

Separar por carpetas ayuda a que cada parte tenga una responsabilidad clara.

| Carpeta | Responsabilidad |
|---|---|
| `routes` | Define endpoints y métodos HTTP |
| `controllers` | Recibe request y arma response |
| `models` | Maneja acceso a datos |
| `services` | Contiene lógica de negocio |
| `middlewares` | Funciones intermedias para requests, errores o validaciones |

---

## 28. Flujo de una petición

Ejemplo:

```http
GET /api/users/1
```

Flujo esperado:

```txt
Cliente
  ↓
app.js
  ↓
routes/user.routes.js
  ↓
controllers/user.controller.js
  ↓
models/user.model.js
  ↓
controllers/user.controller.js
  ↓
Respuesta JSON
```

---

## 29. Separación ideal de responsabilidades

En una arquitectura más limpia, el flujo puede incluir servicios:

```txt
Ruta → Controlador → Servicio → Modelo → Servicio → Controlador → Respuesta
```

- La ruta decide qué controlador ejecutar.
- El controlador interpreta `req` y responde con `res`.
- El servicio contiene reglas de negocio.
- El modelo accede a los datos.

En el código de esta clase, el controlador usa directamente el modelo. El archivo `user.service.js` existe, pero no está conectado al controlador.

---

# Parte 6 — Archivo `app.js`

## 30. Código principal

```js
// app.js
const express = require('express');
const app = express();
const userRoutes = require('./routes/user.routes');
const errorHandler = require('./middlewares/error.middleware');

app.use(express.json());
app.use('/api/users', userRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

module.exports = app;
```

---

## 31. Importación de Express

```js
const express = require('express');
const app = express();
```

Primero se importa Express y luego se crea una instancia de aplicación.

`app` representa la aplicación backend.

---

## 32. Importación de rutas

```js
const userRoutes = require('./routes/user.routes');
```

Esto importa el router de usuarios.

El router contiene las rutas específicas:

- `GET /`,
- `POST /`,
- `GET /:id`,
- `PUT /:id`,
- `DELETE /:id`.

---

## 33. Importación del middleware de errores

```js
const errorHandler = require('./middlewares/error.middleware');
```

Este middleware se usa para capturar errores internos.

---

## 34. Middleware `express.json()`

```js
app.use(express.json());
```

Este middleware permite que Express lea cuerpos JSON.

Sin esta línea, `req.body` estaría vacío o `undefined` cuando llega una petición `POST` o `PUT` con JSON.

Ejemplo de body:

```json
{
  "name": "Juan Pérez",
  "email": "juan@empresa.com",
  "position": "Developer"
}
```

Express lo transforma en:

```js
req.body
```

---

## 35. Montaje de rutas

```js
app.use('/api/users', userRoutes);
```

Esto significa que todas las rutas del router quedan bajo el prefijo:

```txt
/api/users
```

Si en el router existe:

```js
router.get('/', controller.getAllUsers);
```

la ruta final es:

```txt
GET /api/users
```

Si en el router existe:

```js
router.get('/:id', controller.getUserById);
```

la ruta final es:

```txt
GET /api/users/:id
```

---

## 36. Middleware de errores al final

```js
app.use(errorHandler);
```

Los middlewares de error deben ir después de las rutas para poder capturar errores que ocurran durante el procesamiento.

---

## 37. Puerto del servidor

```js
const PORT = process.env.PORT || 3000;
```

Esto permite usar:

- el puerto definido en una variable de entorno,
- o el puerto `3000` por defecto.

---

## 38. Arranque del servidor

```js
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
```

Esto inicia la aplicación en el puerto indicado.

---

# Parte 7 — Archivo `routes/user.routes.js`

## 39. Código

```js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/user.controller');

router.get('/', controller.getAllUsers);
router.post('/', controller.createUser);
router.get('/:id', controller.getUserById);
router.put('/:id', controller.updateUser);
router.delete('/:id', controller.deleteUser);

module.exports = router;
```

---

## 40. ¿Qué es `express.Router()`?

`express.Router()` permite crear un conjunto de rutas separado del archivo principal.

Esto ayuda a modularizar la aplicación.

En vez de poner todo en `app.js`, se crea un archivo específico para usuarios.

---

## 41. Rutas definidas

| Método | Ruta en router | Ruta final | Controlador |
|---|---|---|---|
| `GET` | `/` | `/api/users` | `getAllUsers` |
| `POST` | `/` | `/api/users` | `createUser` |
| `GET` | `/:id` | `/api/users/:id` | `getUserById` |
| `PUT` | `/:id` | `/api/users/:id` | `updateUser` |
| `DELETE` | `/:id` | `/api/users/:id` | `deleteUser` |

---

## 42. Parámetros dinámicos

La ruta:

```js
router.get('/:id', controller.getUserById);
```

permite capturar valores como:

```txt
/api/users/1
/api/users/2
/api/users/10
```

Dentro del controlador se accede con:

```js
req.params.id
```

---

# Parte 8 — Archivo `controllers/user.controller.js`

## 43. Código completo

```js
const userModel = require('../models/user.model');

exports.getAllUsers = (req, res) => {
    res.json(userModel.getAll());
};

exports.createUser = (req, res) => {
    const newUser = userModel.create(req.body);
    res.status(201).json(newUser);
};

exports.getUserById = (req, res) => {
    const user = userModel.getById(parseInt(req.params.id));
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(user);
};

exports.updateUser = (req, res) => {
    const updatedUser = userModel.update(parseInt(req.params.id), req.body);
    if (!updatedUser) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(updatedUser);
};

exports.deleteUser = (req, res) => {
    const deleted = userModel.delete(parseInt(req.params.id));
    if (!deleted) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(deleted);
};
```

---

## 44. Responsabilidad del controlador

El controlador se encarga de:

- recibir `req`,
- leer parámetros,
- leer body,
- llamar al modelo,
- decidir el status HTTP,
- devolver JSON.

---

## 45. `getAllUsers`

```js
exports.getAllUsers = (req, res) => {
    res.json(userModel.getAll());
};
```

Devuelve todos los usuarios.

Ruta:

```http
GET /api/users
```

Respuesta inicial, si no hay usuarios:

```json
[]
```

---

## 46. `createUser`

```js
exports.createUser = (req, res) => {
    const newUser = userModel.create(req.body);
    res.status(201).json(newUser);
};
```

Crea un usuario nuevo a partir de `req.body`.

Ruta:

```http
POST /api/users
```

Body de ejemplo:

```json
{
  "name": "Juan Pérez",
  "email": "juan@empresa.com",
  "position": "Developer"
}
```

Respuesta esperada:

```json
{
  "name": "Juan Pérez",
  "email": "juan@empresa.com",
  "position": "Developer",
  "id": 1
}
```

---

## 47. Código HTTP `201`

```js
res.status(201).json(newUser);
```

El código `201 Created` indica que se creó un recurso nuevo.

Es más correcto que responder `200` cuando una creación fue exitosa.

---

## 48. `getUserById`

```js
exports.getUserById = (req, res) => {
    const user = userModel.getById(parseInt(req.params.id));
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(user);
};
```

Busca un usuario por ID.

Ruta:

```http
GET /api/users/:id
```

Ejemplo:

```http
GET /api/users/1
```

---

## 49. `parseInt(req.params.id)`

`req.params.id` llega como string.

Ejemplo:

```js
req.params.id // "1"
```

El modelo guarda IDs numéricos, por eso se convierte:

```js
parseInt(req.params.id)
```

Resultado:

```js
1
```

---

## 50. Respuesta 404

Si no se encuentra el usuario:

```js
return res.status(404).json({ message: 'Usuario no encontrado' });
```

Se usa `return` para evitar que el controlador siga ejecutándose.

---

## 51. `updateUser`

```js
exports.updateUser = (req, res) => {
    const updatedUser = userModel.update(parseInt(req.params.id), req.body);
    if (!updatedUser) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(updatedUser);
};
```

Actualiza un usuario existente.

Ruta:

```http
PUT /api/users/:id
```

Ejemplo:

```http
PUT /api/users/1
```

Body:

```json
{
  "position": "Backend Developer"
}
```

---

## 52. `deleteUser`

```js
exports.deleteUser = (req, res) => {
    const deleted = userModel.delete(parseInt(req.params.id));
    if (!deleted) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(deleted);
};
```

Elimina un usuario por ID.

Ruta:

```http
DELETE /api/users/:id
```

---

# Parte 9 — Archivo `models/user.model.js`

## 53. Código completo

```js
// Simulación de base de datos en memoria
const users = [];

module.exports = {
    getAll: () => users,

    create: (user) => {
        user.id = users.length + 1;
        users.push(user);
        return user;
    },

    getById: (id) => users.find(u => u.id === id),

    update: (id, newData) => {
        const index = users.findIndex(u => u.id === id);
        if (index !== -1) {
            users[index] = { ...users[index], ...newData };
            return users[index];
        }
        return null;
    },

    delete: (id) => {
        const index = users.findIndex(u => u.id === id);
        if (index !== -1) {
            return users.splice(index, 1)[0];
        }
        return null;
    }
};
```

---

## 54. Base de datos en memoria

```js
const users = [];
```

Este array simula una base de datos.

Importante:

> Los datos se pierden cuando se reinicia el servidor.

Esto es normal en una práctica introductoria, pero en un proyecto real se usaría una base de datos como PostgreSQL, MySQL, MongoDB, SQLite, etc.

---

## 55. `getAll`

```js
getAll: () => users
```

Devuelve todos los usuarios.

---

## 56. `create`

```js
create: (user) => {
    user.id = users.length + 1;
    users.push(user);
    return user;
}
```

Agrega un usuario al array.

Pasos:

1. recibe el objeto `user`,
2. le asigna un ID,
3. lo agrega al array,
4. devuelve el usuario creado.

---

## 57. Observación sobre generación de IDs

La generación:

```js
user.id = users.length + 1;
```

funciona en una práctica simple, pero puede generar IDs repetidos si se eliminan usuarios.

Ejemplo:

1. Crear usuario 1.
2. Crear usuario 2.
3. Eliminar usuario 2.
4. Crear otro usuario.
5. El nuevo usuario vuelve a recibir ID 2.

Una mejora sería usar un contador separado:

```js
let nextId = 1;

create: (user) => {
  const newUser = { id: nextId++, ...user };
  users.push(newUser);
  return newUser;
}
```

---

## 58. `getById`

```js
getById: (id) => users.find(u => u.id === id)
```

Busca el primer usuario cuyo ID coincida.

Usa `find`, que devuelve:

- el elemento encontrado,
- o `undefined` si no existe.

---

## 59. `update`

```js
update: (id, newData) => {
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
        users[index] = { ...users[index], ...newData };
        return users[index];
    }
    return null;
}
```

Actualiza un usuario.

Pasos:

1. busca el índice con `findIndex`,
2. si existe, combina datos anteriores y nuevos,
3. devuelve el usuario actualizado,
4. si no existe, devuelve `null`.

---

## 60. Uso del spread operator

```js
users[index] = { ...users[index], ...newData };
```

Esto significa:

- copiar las propiedades actuales,
- sobrescribir con las propiedades nuevas.

Ejemplo:

Usuario original:

```js
{
  id: 1,
  name: "Juan",
  position: "Developer"
}
```

Datos nuevos:

```js
{
  position: "Backend Developer"
}
```

Resultado:

```js
{
  id: 1,
  name: "Juan",
  position: "Backend Developer"
}
```

---

## 61. `delete`

```js
delete: (id) => {
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
        return users.splice(index, 1)[0];
    }
    return null;
}
```

Elimina un usuario.

`splice(index, 1)` elimina un elemento desde la posición encontrada.

Como `splice` devuelve un array de elementos eliminados, se usa `[0]` para obtener el objeto eliminado.

---

# Parte 10 — Archivo `middlewares/error.middleware.js`

## 62. Código

```js
// middlewares/error.middleware.js
module.exports = (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Error interno del servidor' });
};
```

---

## 63. ¿Qué es un middleware?

Un middleware es una función que se ejecuta durante el ciclo de vida de una petición.

Puede:

- leer datos de la request,
- modificar la request,
- validar permisos,
- registrar logs,
- transformar datos,
- responder directamente,
- pasar al siguiente middleware con `next()`.

---

## 64. Middleware normal vs middleware de error

Un middleware normal tiene esta firma:

```js
(req, res, next) => {
  ...
}
```

Un middleware de error tiene cuatro parámetros:

```js
(err, req, res, next) => {
  ...
}
```

Express reconoce los middlewares de error porque reciben `err` como primer parámetro.

---

## 65. Qué hace este middleware

```js
console.error(err.stack);
res.status(500).json({ message: 'Error interno del servidor' });
```

Muestra el error en consola y responde al cliente con código `500`.

---

# Parte 11 — Archivo `services/user.service.js`

## 66. Código del service

```js
const db = require('../models/user.model');

exports.getUsers = () => {
    return db.users;
};

exports.saveUser = (user) => {
    user.id = db.nextId++;
    db.users.push(user);
    return user;
};

exports.getUserById = (id) => {
    return db.users.find(u => u.id === id);
};

exports.updateUser = (id, data) => {
    const index = db.users.findIndex(u => u.id === id);
    if (index === -1) return null;
    db.users[index] = { ...db.users[index], ...data };
    return db.users[index];
};

exports.deleteUser = (id) => {
    const index = db.users.findIndex(u => u.id === id);
    if (index === -1) return false;
    db.users.splice(index, 1);
    return true;
};
```

---

## 67. Observación importante sobre este archivo

Este service intenta usar:

```js
db.users
db.nextId
```

Pero el modelo `user.model.js` no exporta directamente `users` ni `nextId`.

El modelo exporta métodos:

```js
getAll
create
getById
update
delete
```

Por eso, tal como está, `user.service.js` no funcionaría correctamente si se lo conectara directamente al controlador.

Actualmente no genera error porque el controlador no lo está usando.

---

## 68. Dos formas correctas de arreglarlo

### Opción A — Usar el modelo actual desde el service

```js
const userModel = require('../models/user.model');

exports.getUsers = () => {
  return userModel.getAll();
};

exports.saveUser = (user) => {
  return userModel.create(user);
};

exports.getUserById = (id) => {
  return userModel.getById(id);
};

exports.updateUser = (id, data) => {
  return userModel.update(id, data);
};

exports.deleteUser = (id) => {
  return userModel.delete(id);
};
```

Luego el controlador debería importar el service en vez del modelo.

---

### Opción B — Modificar el modelo para exportar estado interno

No es la opción recomendada para empezar, pero podría hacerse así:

```js
const db = {
  users: [],
  nextId: 1
};

module.exports = db;
```

En ese caso el service podría manipular `db.users`.

Sin embargo, esta opción expone demasiado el estado interno.

---

## 69. Recomendación

Para una arquitectura más ordenada:

```txt
controller → service → model
```

El controlador no debería hablar directamente con el modelo.

---

# Parte 12 — Testing de endpoints

## 70. Archivo `TestingEndpoints.md`

El archivo incluye ejemplos de prueba:

```md
# Testing de endpoints

## Obtencion de los usuarios
GET http://localhost:3000/api/employees/users

## Crear un usuario
POST http://localhost:3000/api/employees/users
Content-Type: application/json

{
  "name": "Juan Pérez",
  "email": "juan@empresa.com",
  "position": "Developer"
}
```

---

## 71. Observación sobre la ruta de testing

En el código real, las rutas se montan así:

```js
app.use('/api/users', userRoutes);
```

Por lo tanto, la ruta real es:

```txt
http://localhost:3000/api/users
```

Pero en `TestingEndpoints.md` aparece:

```txt
http://localhost:3000/api/employees/users
```

Eso no coincide con el código.

---

## 72. Endpoints correctos según el código

| Acción | Método | Endpoint correcto |
|---|---|---|
| Obtener usuarios | `GET` | `http://localhost:3000/api/users` |
| Crear usuario | `POST` | `http://localhost:3000/api/users` |
| Obtener usuario por ID | `GET` | `http://localhost:3000/api/users/1` |
| Actualizar usuario por ID | `PUT` | `http://localhost:3000/api/users/1` |
| Eliminar usuario por ID | `DELETE` | `http://localhost:3000/api/users/1` |

---

# Parte 13 — Pruebas con curl

## 73. Levantar el servidor

Desde la carpeta `gestion-usuarios`:

```bash
npm install
npm run dev
```

O:

```bash
npm start
```

---

## 74. Obtener todos los usuarios

```bash
curl http://localhost:3000/api/users
```

Respuesta inicial:

```json
[]
```

---

## 75. Crear usuario

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Juan Pérez",
    "email": "juan@empresa.com",
    "position": "Developer"
  }'
```

Respuesta:

```json
{
  "name": "Juan Pérez",
  "email": "juan@empresa.com",
  "position": "Developer",
  "id": 1
}
```

---

## 76. Obtener usuario por ID

```bash
curl http://localhost:3000/api/users/1
```

Respuesta:

```json
{
  "name": "Juan Pérez",
  "email": "juan@empresa.com",
  "position": "Developer",
  "id": 1
}
```

---

## 77. Actualizar usuario

```bash
curl -X PUT http://localhost:3000/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{
    "position": "Backend Developer"
  }'
```

Respuesta:

```json
{
  "name": "Juan Pérez",
  "email": "juan@empresa.com",
  "position": "Backend Developer",
  "id": 1
}
```

---

## 78. Eliminar usuario

```bash
curl -X DELETE http://localhost:3000/api/users/1
```

Respuesta:

```json
{
  "name": "Juan Pérez",
  "email": "juan@empresa.com",
  "position": "Backend Developer",
  "id": 1
}
```

---

## 79. Buscar usuario inexistente

```bash
curl http://localhost:3000/api/users/999
```

Respuesta:

```json
{
  "message": "Usuario no encontrado"
}
```

Código HTTP:

```txt
404
```

---

# Parte 14 — Mejoras recomendadas para el proyecto

## 80. Agregar validación de datos

Actualmente, `createUser` acepta cualquier body.

Ejemplo problemático:

```json
{}
```

El servidor igual lo crearía.

Una mejora sería validar:

- `name`,
- `email`,
- `position`.

Ejemplo:

```js
exports.createUser = (req, res) => {
  const { name, email, position } = req.body;

  if (!name || !email || !position) {
    return res.status(400).json({
      message: 'Faltan campos obligatorios'
    });
  }

  const newUser = userModel.create({ name, email, position });
  res.status(201).json(newUser);
};
```

---

## 81. Agregar middleware 404

El proyecto tiene middleware de error, pero no tiene una ruta final para 404.

Se podría agregar antes del `errorHandler`:

```js
app.use((req, res) => {
  res.status(404).json({
    message: 'Ruta no encontrada'
  });
});
```

---

## 82. Usar service entre controller y model

Versión recomendada del controlador:

```js
const userService = require('../services/user.service');

exports.getAllUsers = (req, res) => {
  res.json(userService.getUsers());
};
```

Esto permite que el controlador se concentre en HTTP y el servicio en reglas de negocio.

---

## 83. No mutar directamente el objeto recibido

Actualmente:

```js
user.id = users.length + 1;
users.push(user);
```

Esto modifica el objeto recibido.

Una alternativa más segura:

```js
const newUser = {
  id: nextId++,
  ...user
};

users.push(newUser);
return newUser;
```

---

## 84. Usar `Number()` y validar ID

Actualmente:

```js
parseInt(req.params.id)
```

Sería bueno validar:

```js
const id = Number(req.params.id);

if (Number.isNaN(id)) {
  return res.status(400).json({ message: 'ID inválido' });
}
```

---

## 85. Respuestas más consistentes

Actualmente se responde directamente el usuario o el array.

Ejemplo:

```json
[]
```

En proyectos más grandes puede convenir un formato común:

```json
{
  "ok": true,
  "data": []
}
```

Y para errores:

```json
{
  "ok": false,
  "message": "Usuario no encontrado"
}
```

---

# Parte 15 — Versión mejorada de arquitectura

## 86. Modelo mejorado

```js
// models/user.model.js
let nextId = 1;
const users = [];

exports.getAll = () => users;

exports.create = (data) => {
  const newUser = {
    id: nextId++,
    ...data
  };

  users.push(newUser);
  return newUser;
};

exports.getById = (id) => users.find((user) => user.id === id);

exports.update = (id, data) => {
  const index = users.findIndex((user) => user.id === id);

  if (index === -1) {
    return null;
  }

  users[index] = {
    ...users[index],
    ...data,
    id: users[index].id
  };

  return users[index];
};

exports.delete = (id) => {
  const index = users.findIndex((user) => user.id === id);

  if (index === -1) {
    return null;
  }

  const [deletedUser] = users.splice(index, 1);
  return deletedUser;
};
```

---

## 87. Service mejorado

```js
// services/user.service.js
const userModel = require('../models/user.model');

exports.getUsers = () => {
  return userModel.getAll();
};

exports.createUser = (data) => {
  const { name, email, position } = data;

  if (!name || !email || !position) {
    const error = new Error('Faltan campos obligatorios');
    error.status = 400;
    throw error;
  }

  return userModel.create({ name, email, position });
};

exports.getUserById = (id) => {
  return userModel.getById(id);
};

exports.updateUser = (id, data) => {
  return userModel.update(id, data);
};

exports.deleteUser = (id) => {
  return userModel.delete(id);
};
```

---

## 88. Controlador mejorado

```js
// controllers/user.controller.js
const userService = require('../services/user.service');

const parseId = (idParam) => {
  const id = Number(idParam);

  if (Number.isNaN(id)) {
    const error = new Error('ID inválido');
    error.status = 400;
    throw error;
  }

  return id;
};

exports.getAllUsers = (req, res) => {
  const users = userService.getUsers();
  res.json({ ok: true, data: users });
};

exports.createUser = (req, res, next) => {
  try {
    const newUser = userService.createUser(req.body);
    res.status(201).json({ ok: true, data: newUser });
  } catch (error) {
    next(error);
  }
};

exports.getUserById = (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const user = userService.getUserById(id);

    if (!user) {
      return res.status(404).json({
        ok: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({ ok: true, data: user });
  } catch (error) {
    next(error);
  }
};

exports.updateUser = (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const updatedUser = userService.updateUser(id, req.body);

    if (!updatedUser) {
      return res.status(404).json({
        ok: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({ ok: true, data: updatedUser });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const deletedUser = userService.deleteUser(id);

    if (!deletedUser) {
      return res.status(404).json({
        ok: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({ ok: true, data: deletedUser });
  } catch (error) {
    next(error);
  }
};
```

---

## 89. Middleware de error mejorado

```js
// middlewares/error.middleware.js
module.exports = (err, req, res, next) => {
  console.error(err);

  const status = err.status || 500;

  res.status(status).json({
    ok: false,
    message: err.message || 'Error interno del servidor'
  });
};
```

---

# Parte 16 — Relación con clases anteriores

## 90. Relación con Clase 1

Se aplica Node.js como entorno backend.

Conceptos relacionados:

- servidor,
- backend,
- módulos,
- Event Loop,
- JavaScript fuera del navegador.

---

## 91. Relación con Clase 2

Se usan conceptos de:

- CommonJS,
- `require`,
- `module.exports`,
- módulos,
- estructura por archivos.

---

## 92. Relación con Clase 3

Se aplican:

- arrays,
- objetos,
- métodos `find`, `findIndex`, `splice`,
- funciones,
- arrow functions,
- spread operator.

---

## 93. Relación con Clase 4

Se pasa de HTTP nativo a Express.

Antes:

```js
if (req.method === 'GET' && parsedUrl.pathname === '/productos') {
  ...
}
```

Ahora:

```js
router.get('/', controller.getAllUsers);
```

---

## 94. Relación con Clase 5

Se mantiene el trabajo con:

- rutas,
- headers,
- JSON,
- status HTTP,
- endpoints,
- estructura cliente-servidor.

Pero ahora se organiza con Express Router y controladores.

---

# Parte 17 — Relación con el TP “The Guardian”

Esta clase es muy útil para el TP porque el TP se va a implementar con Express.

## 95. Aplicación directa en el TP

En “The Guardian” se pueden usar estas ideas:

| Clase 6 Backend | TP The Guardian |
|---|---|
| `app.js` | inicializar Express en cada cluster worker |
| `routes/` | definir `/health` y `/ingest` |
| `controllers/` | manejar lógica HTTP de cada endpoint |
| `services/` | coordinar envío de tareas al worker thread |
| `middlewares/` | manejo de errores y validaciones |
| `express.json()` | leer bodies JSON si se usa POST |
| `res.status().json()` | responder estados correctos |
| estructura modular | código más defendible ante el profesor |

---

## 96. Ejemplo de estructura para el TP inspirada en esta clase

```txt
the-guardian/
├── src/
│   ├── primary.js
│   ├── app.js
│   ├── routes/
│   │   ├── health.routes.js
│   │   └── ingest.routes.js
│   ├── controllers/
│   │   ├── health.controller.js
│   │   └── ingest.controller.js
│   ├── services/
│   │   ├── ingest.service.js
│   │   └── worker-thread.service.js
│   ├── workers/
│   │   └── ingest.worker.js
│   ├── middlewares/
│   │   └── error.middleware.js
│   └── utils/
│       └── logger.js
├── docs/
├── tests/
├── package.json
└── README.md
```

---

## 97. `/health` usando estilo Express

```js
exports.getHealth = (req, res) => {
  res.json({
    status: 'ok',
    pid: process.pid
  });
};
```

---

## 98. `/ingest` usando estilo Express

```js
exports.ingest = async (req, res, next) => {
  try {
    const id = Number(req.query.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        ok: false,
        message: 'id inválido'
      });
    }

    // Delegar tarea pesada al service
    ingestService.enqueue(id);

    res.status(202).json({
      ok: true,
      status: 'accepted',
      id,
      pid: process.pid
    });
  } catch (error) {
    next(error);
  }
};
```

---

# Parte 18 — Preguntas posibles para defender la clase

## 99. ¿Qué es Express?

Es un framework de Node.js que simplifica la creación de servidores web y APIs.

---

## 100. ¿Qué ventaja tiene Express frente a HTTP nativo?

Permite definir rutas, middlewares, respuestas JSON y manejo de errores de forma más clara y modular.

---

## 101. ¿Qué hace `express.json()`?

Permite que Express interprete cuerpos JSON y los coloque en `req.body`.

---

## 102. ¿Qué es `express.Router()`?

Es una herramienta de Express para agrupar rutas en archivos separados.

---

## 103. ¿Qué hace `app.use('/api/users', userRoutes)`?

Monta el router de usuarios bajo el prefijo `/api/users`.

---

## 104. ¿Qué es un controlador?

Es una función que recibe la petición, llama a la lógica necesaria y devuelve una respuesta HTTP.

---

## 105. ¿Qué es un modelo?

Es la capa encargada de manejar los datos. En esta clase, el modelo usa un array en memoria.

---

## 106. ¿Qué es un servicio?

Es una capa intermedia donde se ubican reglas de negocio. Ayuda a no poner toda la lógica en el controlador.

---

## 107. ¿Qué es un middleware?

Es una función que se ejecuta entre la petición y la respuesta. Puede validar, transformar, registrar o manejar errores.

---

## 108. ¿Qué diferencia hay entre `req.params` y `req.body`?

- `req.params` contiene parámetros de la URL, como `/api/users/:id`.
- `req.body` contiene datos enviados en el cuerpo de la petición, como en un `POST`.

---

## 109. ¿Qué diferencia hay entre `GET`, `POST`, `PUT` y `DELETE`?

- `GET`: leer datos.
- `POST`: crear datos.
- `PUT`: actualizar datos.
- `DELETE`: eliminar datos.

---

## 110. ¿Qué significa código `201`?

Significa que un recurso fue creado correctamente.

---

## 111. ¿Qué significa código `404`?

Significa que el recurso solicitado no fue encontrado.

---

## 112. ¿Qué significa código `500`?

Significa que ocurrió un error interno del servidor.

---

## 113. ¿Qué es EJS?

Es un motor de plantillas que permite generar HTML dinámico desde Express.

---

## 114. ¿Qué hace `res.render()`?

Renderiza una vista usando el motor de plantillas configurado, como EJS.

---

## 115. ¿Qué hace `express.static()`?

Sirve archivos estáticos como CSS, imágenes o JavaScript desde una carpeta pública.

---

## 116. ¿Qué diferencia hay entre API REST y vista EJS?

Una API REST devuelve datos, normalmente JSON.  
Una vista EJS devuelve HTML renderizado desde el servidor.

---

# Parte 19 — Práctica sugerida

## 117. Ejercicio 1 — Agregar ruta de estado

Agregar en `gestion-usuarios`:

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

## 118. Ejercicio 2 — Validar creación de usuarios

Modificar `createUser` para que rechace usuarios sin:

- `name`,
- `email`,
- `position`.

Respuesta esperada:

```json
{
  "message": "Faltan campos obligatorios"
}
```

Código HTTP:

```txt
400
```

---

## 119. Ejercicio 3 — Agregar búsqueda por email

Crear endpoint:

```txt
GET /api/users/email/:email
```

Debe devolver el usuario con ese email.

---

## 120. Ejercicio 4 — Agregar campo `createdAt`

Cuando se crea un usuario, agregar:

```js
createdAt: new Date().toISOString()
```

---

## 121. Ejercicio 5 — Conectar correctamente service

Modificar el controlador para que use `user.service.js` en vez de llamar directo al modelo.

---

# Parte 20 — Checklist de estudio

- [ ] Entiendo qué es Express.
- [ ] Sé instalar Express.
- [ ] Sé usar `nodemon`.
- [ ] Entiendo los scripts `start` y `dev`.
- [ ] Sé qué hace `express.json()`.
- [ ] Sé qué hace `app.use()`.
- [ ] Sé qué es `express.Router()`.
- [ ] Puedo explicar la ruta `/api/users`.
- [ ] Puedo explicar qué es un CRUD.
- [ ] Sé qué hacen `GET`, `POST`, `PUT`, `DELETE`.
- [ ] Entiendo qué es un controlador.
- [ ] Entiendo qué es un modelo.
- [ ] Entiendo qué es un servicio.
- [ ] Entiendo qué es un middleware.
- [ ] Sé qué hace el middleware de errores.
- [ ] Sé qué es EJS.
- [ ] Sé qué hace `res.render()`.
- [ ] Sé qué hace `res.json()`.
- [ ] Sé usar `req.params.id`.
- [ ] Sé usar `req.body`.
- [ ] Puedo probar endpoints con curl, Postman o REST Client.
- [ ] Puedo explicar los errores detectados en `TestingEndpoints.md`.
- [ ] Puedo explicar por qué `user.service.js` no está conectado correctamente.
- [ ] Puedo relacionar esta clase con el TP “The Guardian”.

---

# Parte 21 — Resumen final

La clase 6 introduce una forma más profesional de construir aplicaciones backend con Node.js.

Los conceptos principales son:

- Express,
- Express Generator,
- EJS,
- rutas,
- routers,
- controladores,
- modelos,
- servicios,
- middlewares,
- API REST,
- CRUD,
- JSON body parser,
- manejo de errores,
- organización por carpetas,
- uso de `nodemon`,
- pruebas de endpoints.

El proyecto `gestion-usuarios` es especialmente importante porque muestra una estructura muy parecida a la que conviene aplicar en proyectos reales y también en el TP “The Guardian”.

La idea más importante para defender esta clase es:

> Express permite organizar el backend por responsabilidades: las rutas definen endpoints, los controladores manejan requests y responses, los modelos administran datos, los servicios concentran reglas de negocio y los middlewares agregan comportamiento transversal como validaciones o manejo de errores.
