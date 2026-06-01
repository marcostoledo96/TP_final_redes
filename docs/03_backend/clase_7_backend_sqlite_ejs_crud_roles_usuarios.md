# Clase 7 Backend — SQLite, better-sqlite3, EJS, CRUD, Roles, Filtros y Soft Delete

**Curso:** Desarrollo Web Backend  
**Tecnología:** Node.js / Express / EJS / SQLite  
**Material base:** `Clase7.zip`  
**Proyecto principal:** `GestionUsuarios/ejs`

---

## 1. Objetivo general de la clase

La clase 7 profundiza el trabajo con backend usando **Express**, pero ahora incorporando una base de datos real con **SQLite** mediante la librería **better-sqlite3**.

En las clases anteriores se trabajó con:

- servidores HTTP nativos,
- rutas manuales,
- respuestas JSON,
- HTML generado desde el servidor,
- `fetch`,
- Express,
- `express.Router`,
- controladores,
- modelos,
- middlewares,
- CRUD en memoria,
- EJS como motor de vistas.

En esta clase se avanza hacia una aplicación más cercana a un sistema real:

- persistencia con SQLite,
- modelos que ejecutan SQL,
- tablas relacionadas,
- claves foráneas,
- CRUD de usuarios,
- CRUD de roles,
- vistas EJS,
- formularios HTML,
- filtros y búsqueda,
- paginación con `LIMIT` y `OFFSET`,
- soft delete,
- logging en consola con `chalk`,
- logging HTTP con `morgan`,
- manejo de errores HTTP con `http-errors`.

La idea principal es:

> Pasar de una API con datos en memoria a una aplicación backend con persistencia, relaciones y vistas renderizadas desde el servidor.

---

# Parte 1 — Índice temático de la clase

El archivo `indiceClase7.txt` resume los temas principales:

- Métodos HTTP.
- Códigos HTTP.
- SQLite.
- `better-sqlite3`.
- CRUD.
- Validaciones.
- Búsqueda y filtros.
- Relaciones en base de datos.
- Logging en consola con `chalk`.
- Logging HTTP con `morgan`.
- Manejo de errores HTTP.
- Express.
- Middleware.
- Express Generator.
- EJS.
- Soft delete.
- Paginación con `LIMIT` y `OFFSET`.
- Relaciones con `LEFT JOIN`.
- Exportación a CSV con `json2csv`.
- Pre-entrega de proyecto final.
- Git, GitHub y Bitbucket.

---

# Parte 2 — Estructura del proyecto

La estructura relevante del ZIP es:

```txt
Clase7/
├── indiceClase7.txt
└── GestionUsuarios/
    └── ejs/
        ├── app.js
        ├── package.json
        ├── usuarios.db
        ├── bin/
        │   └── www
        ├── config/
        │   └── db.js
        ├── models/
        │   ├── user.model.js
        │   └── role.model.js
        ├── controllers/
        │   ├── user.controller.js
        │   └── role.controller.js
        ├── routes/
        │   ├── user.routes.js
        │   └── role.routes.js
        ├── views/
        │   ├── general_error.ejs
        │   ├── users/
        │   │   ├── index.ejs
        │   │   └── error.ejs
        │   └── roles/
        │       ├── index.ejs
        │       ├── detail.ejs
        │       ├── new.ejs
        │       ├── edit.ejs
        │       └── error.ejs
        └── public/
            └── stylesheets/
                └── style.css
```

---

## 2.1. Responsabilidad de cada carpeta

| Carpeta / archivo | Responsabilidad |
|---|---|
| `app.js` | Configura Express, vistas, middlewares y rutas |
| `bin/www` | Levanta el servidor en un puerto |
| `config/db.js` | Crea/conecta la base SQLite y define tablas |
| `models/` | Ejecuta consultas SQL contra la base |
| `controllers/` | Recibe requests y decide qué vista/respuesta enviar |
| `routes/` | Define endpoints y conecta con controladores |
| `views/` | Contiene plantillas EJS |
| `public/` | Contiene archivos estáticos como CSS |
| `usuarios.db` | Base de datos SQLite |
| `package.json` | Dependencias y scripts del proyecto |

---

# Parte 3 — Dependencias del proyecto

El archivo `package.json` contiene:

```json
{
  "name": "ejs",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "start": "node ./bin/www"
  },
  "dependencies": {
    "better-sqlite3": "^11.9.1",
    "chalk": "^4.1.2",
    "cookie-parser": "~1.4.4",
    "debug": "~2.6.9",
    "ejs": "~2.6.1",
    "express": "~4.16.1",
    "http-errors": "~1.6.3",
    "morgan": "~1.9.1"
  }
}
```

---

## 3.1. Para qué sirve cada dependencia

| Dependencia | Uso |
|---|---|
| `express` | Framework backend para rutas, middlewares y servidor web |
| `ejs` | Motor de plantillas para renderizar HTML dinámico |
| `better-sqlite3` | Librería para trabajar con SQLite desde Node.js |
| `chalk` | Permite imprimir mensajes en consola con colores |
| `morgan` | Logger de peticiones HTTP |
| `http-errors` | Permite crear errores HTTP como 404 |
| `cookie-parser` | Permite leer cookies |
| `debug` | Utilidad para depuración |

---

## 3.2. Instalación

Desde la carpeta del proyecto:

```bash
cd Clase7/GestionUsuarios/ejs
npm install
```

---

## 3.3. Ejecución

```bash
npm start
```

Esto ejecuta:

```bash
node ./bin/www
```

El servidor queda disponible en:

```txt
http://localhost:3000
```

---

# Parte 4 — Archivo `bin/www`

## 4. Código

```js
const app = require('../app');
const chalk = require('chalk');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(chalk.green(`Servidor activo en http://localhost:${PORT}`));
});
```

---

## 4.1. Qué hace este archivo

Este archivo es el punto de arranque del servidor.

Hace cuatro cosas:

1. Importa la app de Express desde `app.js`.
2. Importa `chalk` para colorear la salida de consola.
3. Define el puerto.
4. Ejecuta `app.listen`.

---

## 4.2. Uso de `process.env.PORT`

```js
const PORT = process.env.PORT || 3000;
```

Esto permite usar una variable de entorno si existe.

Si no existe, usa el puerto `3000`.

---

## 4.3. Uso de `chalk`

```js
console.log(chalk.green(`Servidor activo en http://localhost:${PORT}`));
```

`chalk.green()` imprime el mensaje en color verde en la consola.

Esto no cambia la lógica del programa, pero mejora la legibilidad de los logs.

---

# Parte 5 — Archivo `app.js`

## 5. Código principal

```js
const express = require('express');
const path = require('path');
const morgan = require('morgan');
const userRoutes = require('./routes/user.routes');
const roleRoutes = require('./routes/role.routes');
const createError = require('http-errors');

// Instancia de la app
const app = express();

// Configuracion de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configuracion de entorno 
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Configuracion de rutas
app.use('/users', userRoutes);
app.use('/roles', roleRoutes);

// Configuracion de redireccion (por defecto)
app.get('/', (req, res) => {
  res.redirect('/users');
});

// Middleware de error 404
app.use((req, res, next) => {
  next(createError(404, 'Ruta no encontrada'));
});

// Manejador de errores
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.render('general_error', { message: err.message, error: app.get('env') === 'development' ? err : {} });
});

module.exports = app;
```

---

## 5.1. Importaciones

```js
const express = require('express');
const path = require('path');
const morgan = require('morgan');
const userRoutes = require('./routes/user.routes');
const roleRoutes = require('./routes/role.routes');
const createError = require('http-errors');
```

| Importación | Uso |
|---|---|
| `express` | Crear la aplicación backend |
| `path` | Construir rutas de archivos |
| `morgan` | Registrar peticiones HTTP |
| `userRoutes` | Rutas de usuarios |
| `roleRoutes` | Rutas de roles |
| `createError` | Crear errores HTTP |

---

## 5.2. Configuración de EJS

```js
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
```

Esto indica:

- el motor de vistas será `ejs`,
- las vistas estarán dentro de la carpeta `views`.

---

## 5.3. Middleware `morgan`

```js
app.use(morgan('dev'));
```

`morgan` muestra en consola información de cada petición.

Ejemplo:

```txt
GET /users 200 12.345 ms
POST /roles 302 8.220 ms
```

Sirve para depurar y observar el comportamiento del servidor.

---

## 5.4. Middleware `express.urlencoded`

```js
app.use(express.urlencoded({ extended: false }));
```

Permite leer datos enviados desde formularios HTML.

Ejemplo de formulario:

```html
<form action="/roles" method="POST">
  <input type="text" name="name">
  <button type="submit">Crear</button>
</form>
```

Cuando se envía, Express coloca los datos en:

```js
req.body
```

---

## 5.5. Middleware `express.json`

```js
app.use(express.json());
```

Permite leer cuerpos JSON.

Es útil para APIs REST, aunque en esta clase muchas operaciones llegan desde formularios HTML.

---

## 5.6. Montaje de rutas

```js
app.use('/users', userRoutes);
app.use('/roles', roleRoutes);
```

Esto significa:

| Prefijo | Router |
|---|---|
| `/users` | `user.routes.js` |
| `/roles` | `role.routes.js` |

---

## 5.7. Redirección raíz

```js
app.get('/', (req, res) => {
  res.redirect('/users');
});
```

Si el usuario entra a:

```txt
http://localhost:3000/
```

el servidor redirige a:

```txt
http://localhost:3000/users
```

---

## 5.8. Middleware 404

```js
app.use((req, res, next) => {
  next(createError(404, 'Ruta no encontrada'));
});
```

Si ninguna ruta anterior responde, se crea un error 404.

---

## 5.9. Manejador de errores

```js
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.render('general_error', { message: err.message, error: app.get('env') === 'development' ? err : {} });
});
```

Este middleware recibe errores y renderiza una vista de error.

Importante:

Un middleware de error en Express tiene cuatro parámetros:

```js
(err, req, res, next)
```

---

# Parte 6 — Base de datos SQLite

## 6. Archivo `config/db.js`

```js
const Database = require('better-sqlite3');
const db = new Database('usuarios.db');

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    FOREIGN KEY (role_id) REFERENCES roles(id)
  );
`);

module.exports = db;
```

---

## 6.1. Qué es SQLite

SQLite es una base de datos relacional liviana.

A diferencia de PostgreSQL o MySQL, no necesita levantar un servidor aparte. La base vive en un archivo.

En este proyecto, el archivo es:

```txt
usuarios.db
```

---

## 6.2. Qué es `better-sqlite3`

`better-sqlite3` es una librería de Node.js para trabajar con SQLite.

Permite ejecutar SQL de forma directa:

```js
db.prepare('SELECT * FROM users').all();
```

---

## 6.3. Conexión a la base

```js
const Database = require('better-sqlite3');
const db = new Database('usuarios.db');
```

Esto abre o crea el archivo `usuarios.db`.

---

## 6.4. Activar claves foráneas

```sql
PRAGMA foreign_keys = ON;
```

En SQLite, las claves foráneas deben activarse explícitamente.

Esto permite que se respeten relaciones como:

```sql
FOREIGN KEY (role_id) REFERENCES roles(id)
```

---

## 6.5. Tabla `roles`

```sql
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);
```

Campos:

| Campo | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Identificador único |
| `name` | TEXT | NOT NULL UNIQUE | Nombre único del rol |

Ejemplos de roles:

- `Admin`
- `Emisor`
- `Procesador`
- `Backend`

---

## 6.6. Tabla `users`

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);
```

Campos:

| Campo | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Identificador único |
| `user` | TEXT | NOT NULL | Nombre del usuario |
| `email` | TEXT | NOT NULL UNIQUE | Email único |
| `role_id` | INTEGER | FOREIGN KEY | Rol asociado |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Fecha de creación |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Fecha de actualización |
| `deleted_at` | DATETIME | Nullable | Fecha de eliminación lógica |

---

## 6.7. Relación entre usuarios y roles

La relación se define con:

```sql
FOREIGN KEY (role_id) REFERENCES roles(id)
```

Esto significa:

> Cada usuario puede tener un rol asociado mediante `role_id`.

Ejemplo:

```txt
users.role_id = 2
roles.id = 2
```

Entonces el usuario pertenece al rol con ID 2.

---

## 6.8. Tipo de relación

La relación es:

```txt
roles 1 ---- N users
```

Un rol puede tener muchos usuarios.

Un usuario puede tener un rol.

---

## 6.9. Datos presentes en la base del ZIP

Al inspeccionar el archivo `usuarios.db`, aparecen datos como:

### Tabla `roles`

| id | name |
|---:|---|
| 2 | Emisor |
| 3 | Procesador |
| 5 | Backend |

### Tabla `users`

| id | user | email | role_id | deleted_at |
|---:|---|---|---:|---|
| 1 | Pepito | pepito@gmail.com | 2 | null |
| 2 | Coraline | coraline@gmail.com | 2 | null |

---

# Parte 7 — Modelo de roles

## 7. Archivo `models/role.model.js`

```js
const db = require('../config/db');
const chalk = require('chalk');
```

Este modelo importa:

- la conexión a SQLite,
- `chalk` para logs en consola.

---

## 7.1. `getAll`

```js
function getAll() {
  const roles = db.prepare('SELECT * FROM roles').all();
  console.log(chalk.blue(`[DB] ${roles.length} roles encontrados`));
  return roles;
}
```

### Qué hace

1. Prepara una consulta SQL.
2. Ejecuta `.all()` para obtener todos los registros.
3. Imprime un log en azul.
4. Devuelve los roles.

---

## 7.2. `.prepare().all()`

```js
db.prepare('SELECT * FROM roles').all();
```

`prepare()` prepara la consulta.

`all()` devuelve todos los registros encontrados.

Se usa para consultas que pueden devolver muchas filas.

---

## 7.3. `getById`

```js
function getById(id) {
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id);
  console.log(role ? chalk.blue(`[DB] Rol ID ${id} encontrado`) : chalk.yellow(`[DB] Rol ID ${id} no encontrado`));
  return role;
}
```

### Qué hace

Busca un rol por ID.

Usa un placeholder:

```sql
?
```

y luego pasa el valor:

```js
.get(id)
```

Esto evita concatenar valores directamente dentro del SQL.

---

## 7.4. `.get()`

```js
db.prepare('SELECT * FROM roles WHERE id = ?').get(id);
```

`get()` devuelve una sola fila.

Si no encuentra nada, devuelve `undefined`.

---

## 7.5. Operador ternario

El código usa operador ternario:

```js
role
  ? chalk.blue(`[DB] Rol ID ${id} encontrado`)
  : chalk.yellow(`[DB] Rol ID ${id} no encontrado`)
```

Equivale a:

```js
if (role) {
  console.log(chalk.blue(`[DB] Rol ID ${id} encontrado`));
} else {
  console.log(chalk.yellow(`[DB] Rol ID ${id} no encontrado`));
}
```

---

## 7.6. `create`

```js
function create({ name }) {
  if (!name || name.length < 3) throw new Error('Nombre del rol inválido');
  const result = db.prepare('INSERT INTO roles (name) VALUES (?)').run(name);
  console.log(chalk.green(`[DB] Rol creado con ID ${result.lastInsertRowid}`));
  return result;
}
```

### Qué hace

1. Valida que el nombre exista y tenga al menos 3 caracteres.
2. Inserta el rol en la tabla `roles`.
3. Imprime el ID creado.
4. Devuelve el resultado.

---

## 7.7. `.run()`

```js
db.prepare('INSERT INTO roles (name) VALUES (?)').run(name);
```

`run()` se usa para consultas que modifican datos:

- `INSERT`,
- `UPDATE`,
- `DELETE`.

Devuelve información como:

```js
result.lastInsertRowid
result.changes
```

---

## 7.8. `update`

```js
function update(id, { name }) {
  if (!name || name.length < 3) throw new Error('Nombre del rol inválido');
  const result = db.prepare('UPDATE roles SET name = ? WHERE id = ?').run(name, id);
  console.log(chalk.cyan(`[DB] Rol ID ${id} actualizado (${result.changes} cambio/s)`));
  return result;
}
```

Actualiza el nombre de un rol.

---

## 7.9. `remove`

```js
function remove(id) {
  const result = db.prepare('DELETE FROM roles WHERE id = ?').run(id);
  console.log(chalk.red(`[DB] Rol ID ${id} eliminado (${result.changes} cambio/s)`));
  return result;
}
```

Elimina un rol físicamente de la base.

Esto es diferente del soft delete usado en usuarios.

---

# Parte 8 — Modelo de usuarios

## 8. Archivo `models/user.model.js`

```js
const db = require('../config/db');
const chalk = require('chalk');
```

Este modelo maneja operaciones SQL sobre la tabla `users`.

---

## 8.1. `getAll`

```js
function getAll({ limit = 10, offset = 0, search = '', role = null }) {
  const baseQuery = `SELECT users.*, roles.name AS role_name FROM users
    LEFT JOIN roles ON users.role_id = roles.id
    WHERE deleted_at IS NULL AND (name LIKE ? OR email LIKE ?) ` +
    (role ? 'AND role_id = ? ' : '') +
    'ORDER BY id LIMIT ? OFFSET ?';

  const params = [`%${search}%`, `%${search}%`];
  if (role) params.push(role);
  params.push(Number(limit), Number(offset));

  const results = db.prepare(baseQuery).all(...params);
  console.log(chalk.blue(`[DB] Listado obtenido (${results.length} resultados)`));
  return results;
}
```

---

## 8.2. Qué intenta hacer `getAll`

La función busca usuarios con soporte para:

- límite de resultados,
- offset,
- búsqueda por texto,
- filtro por rol,
- relación con tabla `roles`,
- exclusión de usuarios eliminados lógicamente.

---

## 8.3. Parámetros de consulta

```js
{ limit = 10, offset = 0, search = '', role = null }
```

| Parámetro | Uso |
|---|---|
| `limit` | Cantidad máxima de resultados |
| `offset` | Cantidad de registros a saltar |
| `search` | Texto de búsqueda |
| `role` | Filtro por rol |

Ejemplo de URL:

```txt
/users?limit=10&offset=0&search=pepi&role=2
```

---

## 8.4. `LEFT JOIN`

```sql
LEFT JOIN roles ON users.role_id = roles.id
```

Permite traer datos del rol asociado.

El resultado incluye:

```sql
roles.name AS role_name
```

Esto genera una propiedad llamada:

```js
role_name
```

---

## 8.5. `LIMIT` y `OFFSET`

```sql
ORDER BY id LIMIT ? OFFSET ?
```

Sirve para paginar resultados.

Ejemplo:

```txt
limit = 10
offset = 0
```

Trae los primeros 10.

```txt
limit = 10
offset = 10
```

Trae la segunda página de 10.

---

## 8.6. Soft delete

```sql
WHERE deleted_at IS NULL
```

Esto excluye usuarios eliminados lógicamente.

No borra físicamente la fila, solo deja de mostrarla en listados normales.

---

## 8.7. Problema importante detectado en `getAll`

La tabla `users` se crea con una columna llamada:

```sql
user TEXT NOT NULL
```

Pero en `getAll` se consulta:

```sql
name LIKE ?
```

El problema es que la columna `name` no existe en la tabla `users`.

La consulta debería usar:

```sql
users.user LIKE ?
```

o cambiar la tabla para que la columna se llame `name`.

Versión corregida manteniendo la tabla actual:

```js
function getAll({ limit = 10, offset = 0, search = '', role = null }) {
  const baseQuery = `SELECT users.*, users.user AS name, roles.name AS role_name FROM users
    LEFT JOIN roles ON users.role_id = roles.id
    WHERE deleted_at IS NULL AND (users.user LIKE ? OR email LIKE ?) ` +
    (role ? 'AND role_id = ? ' : '') +
    'ORDER BY users.id LIMIT ? OFFSET ?';

  const params = [`%${search}%`, `%${search}%`];

  if (role) {
    params.push(role);
  }

  params.push(Number(limit), Number(offset));

  return db.prepare(baseQuery).all(...params);
}
```

Esta corrección también agrega:

```sql
users.user AS name
```

para que las vistas puedan seguir usando:

```ejs
<%= user.name %>
```

---

## 8.8. `getById`

```js
function getById(id) {
  const user = db.prepare(`SELECT * FROM users WHERE id = ? AND deleted_at IS NULL`).get(id);
  console.log(user ? chalk.blue(`[DB] Usuario ID ${id} obtenido`) : chalk.yellow(`[DB] Usuario ID ${id} no encontrado`));
  return user;
}
```

Busca un usuario activo por ID.

---

## 8.9. `create`

```js
function create({ name, email, role_id }) {
  if (!name || name.length < 2) throw new Error('Nombre inválido');
  if (!email || !email.includes('@')) throw new Error('Email inválido');
  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO users (user, email, role_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, email, role_id || null, now, now);
  console.log(chalk.green(`[DB] Usuario creado con ID ${result.lastInsertRowid}`));
  return result;
}
```

### Qué hace

1. Valida `name`.
2. Valida `email`.
3. Genera fecha actual.
4. Inserta en la tabla `users`.
5. Devuelve el resultado.

Aunque el formulario o controller usa `name`, la columna de la base se llama `user`.

Por eso se inserta así:

```sql
INSERT INTO users (user, email, role_id, created_at, updated_at)
```

---

## 8.10. Validaciones

```js
if (!name || name.length < 2) throw new Error('Nombre inválido');
if (!email || !email.includes('@')) throw new Error('Email inválido');
```

Son validaciones básicas.

Una mejora sería usar una librería como `validator`.

---

## 8.11. `update`

```js
function update(id, { name, email, role_id }) {
  if (!name || name.length < 2) throw new Error('Nombre inválido');
  if (!email || !email.includes('@')) throw new Error('Email inválido');
  const now = new Date().toISOString();
  const result = db.prepare(`
    UPDATE users SET name = ?, email = ?, role_id = ?, updated_at = ?
    WHERE id = ? AND deleted_at IS NULL
  `).run(name, email, role_id || null, now, id);
  console.log(chalk.cyan(`[DB] Usuario ID ${id} actualizado (${result.changes} cambio/s)`));
  return result;
}
```

---

## 8.12. Problema importante detectado en `update`

La consulta usa:

```sql
UPDATE users SET name = ?
```

Pero la columna real es:

```sql
user
```

Por lo tanto, debería ser:

```sql
UPDATE users SET user = ?, email = ?, role_id = ?, updated_at = ?
WHERE id = ? AND deleted_at IS NULL
```

Versión corregida:

```js
function update(id, { name, email, role_id }) {
  if (!name || name.length < 2) throw new Error('Nombre inválido');
  if (!email || !email.includes('@')) throw new Error('Email inválido');

  const now = new Date().toISOString();

  const result = db.prepare(`
    UPDATE users
    SET user = ?, email = ?, role_id = ?, updated_at = ?
    WHERE id = ? AND deleted_at IS NULL
  `).run(name, email, role_id || null, now, id);

  return result;
}
```

---

## 8.13. `softDelete`

```js
function softDelete(id) {
  const now = new Date().toISOString();
  const result = db.prepare(`
    UPDATE users SET deleted_at = ? WHERE id = ?
  `).run(now, id);
  console.log(chalk.red(`[DB] Usuario ID ${id} marcado como eliminado`));
  return result;
}
```

---

## 8.14. Qué es soft delete

**Soft delete** significa eliminación lógica.

En vez de borrar la fila con:

```sql
DELETE FROM users WHERE id = ?
```

se marca como eliminada:

```sql
UPDATE users SET deleted_at = ? WHERE id = ?
```

Ventajas:

- permite recuperar datos,
- conserva historial,
- evita pérdida accidental,
- sirve para auditoría,
- mantiene trazabilidad.

Desventajas:

- hay que recordar filtrar `deleted_at IS NULL`,
- la tabla crece con registros eliminados,
- puede complicar índices y consultas.

---

# Parte 9 — Rutas de roles

## 9. Archivo `routes/role.routes.js`

```js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/role.controller');

router.get('/', controller.getAllRoles);
router.get('/new', controller.renderNewRoleForm);
router.get('/:id/edit', controller.renderEditRoleForm);
router.get('/:id', controller.getRoleById);
router.post('/', controller.createRole);
router.post('/:id', controller.updateRole);
router.post('/:id/delete', controller.deleteRole);

module.exports = router;
```

---

## 9.1. Rutas finales

Como en `app.js` se monta así:

```js
app.use('/roles', roleRoutes);
```

las rutas finales son:

| Método | Ruta final | Acción |
|---|---|---|
| `GET` | `/roles` | Listar roles |
| `GET` | `/roles/new` | Mostrar formulario de nuevo rol |
| `GET` | `/roles/:id/edit` | Mostrar formulario de edición |
| `GET` | `/roles/:id` | Ver detalle de rol |
| `POST` | `/roles` | Crear rol |
| `POST` | `/roles/:id` | Actualizar rol |
| `POST` | `/roles/:id/delete` | Eliminar rol |

---

## 9.2. Por qué se usa POST para actualizar y eliminar

HTML tradicional solo soporta directamente:

```html
method="GET"
method="POST"
```

Por eso, cuando se trabaja con formularios EJS sin JavaScript adicional, se suele usar `POST` para acciones de actualización o eliminación.

En una API REST pura sería más correcto usar:

| Acción | Método REST |
|---|---|
| Crear | `POST` |
| Actualizar | `PUT` o `PATCH` |
| Eliminar | `DELETE` |

Pero con formularios HTML simples, `POST` es común.

---

# Parte 10 — Controlador de roles

## 10. Archivo `controllers/role.controller.js`

Este controlador conecta las rutas de roles con el modelo `Role`.

```js
const Role = require('../models/role.model');
```

---

## 10.1. `getAllRoles`

```js
function getAllRoles(req, res) {
  try {
    const roles = Role.getAll();
    res.render('roles/index', { roles });
  } catch (err) {
    console.error('[Error]', err.message);
    res.status(500).send('Error al obtener roles');
  }
}
```

Obtiene todos los roles y renderiza:

```txt
views/roles/index.ejs
```

---

## 10.2. `getRoleById`

```js
function getRoleById(req, res) {
  try {
    const role = Role.getById(req.params.id);
    if (!role) return res.status(404).send('Rol no encontrado');
    res.render('roles/detail', { role });
  } catch (err) {
    console.error('[Error]', err.message);
    res.status(500).send('Error al buscar el rol');
  }
}
```

Busca un rol por ID.

Si no existe, responde 404.

Si existe, renderiza:

```txt
views/roles/detail.ejs
```

---

## 10.3. `renderNewRoleForm`

```js
function renderNewRoleForm(req, res) {
  res.render('roles/new');
}
```

Muestra el formulario para crear un nuevo rol.

---

## 10.4. `renderEditRoleForm`

```js
function renderEditRoleForm(req, res) {
  try {
    const role = Role.getById(req.params.id);
    if (!role) return res.status(404).send('Rol no encontrado');
    res.render('roles/edit', { role });
  } catch (err) {
    console.error('[Error]', err.message);
    res.status(500).send('Error al cargar formulario');
  }
}
```

Busca el rol actual y lo pasa al formulario de edición.

---

## 10.5. `createRole`

```js
function createRole(req, res) {
  try {
    Role.create(req.body);
    res.redirect('/roles');
  } catch (err) {
    console.error('[Error]', err.message);
    res.status(400).send('Error al crear: ' + err.message);
  }
}
```

Crea el rol y redirige al listado.

---

## 10.6. `updateRole`

```js
function updateRole(req, res) {
  try {
    Role.update(req.params.id, req.body);
    res.redirect('/roles');
  } catch (err) {
    console.error('[Error]', err.message);
    res.status(400).send('Error al actualizar: ' + err.message);
  }
}
```

Actualiza el rol y redirige.

---

## 10.7. `deleteRole`

```js
function deleteRole(req, res) {
  try {
    Role.remove(req.params.id);
    res.redirect('/roles');
  } catch (err) {
    console.error('[Error]', err.message);
    res.status(500).send('Error al eliminar');
  }
}
```

Elimina un rol.

---

# Parte 11 — Vistas de roles con EJS

## 11. `views/roles/index.ejs`

Muestra el listado de roles:

```ejs
<% roles.forEach(role => { %>
  <li class="list-group-item d-flex justify-content-between align-items-center">
    <span><%= role.name %></span>
    <div>
      <a href="/roles/<%= role.id %>/edit" class="btn btn-sm btn-warning me-2">Editar</a>
      <form action="/roles/<%= role.id %>/delete" method="POST" style="display:inline;">
        <button type="submit" class="btn btn-sm btn-danger">Eliminar</button>
      </form>
    </div>
  </li>
<% }) %>
```

---

## 11.1. Código EJS

EJS permite mezclar HTML y JavaScript.

### Ejecutar código sin imprimir

```ejs
<% roles.forEach(role => { %>
```

### Imprimir contenido escapado

```ejs
<%= role.name %>
```

---

## 11.2. Formulario para eliminar

```html
<form action="/roles/<%= role.id %>/delete" method="POST">
  <button type="submit">Eliminar</button>
</form>
```

Al presionar el botón, se envía una petición:

```txt
POST /roles/:id/delete
```

---

## 11.3. `views/roles/new.ejs`

```ejs
<h1>Nuevo Rol</h1>
<form action="/roles" method="POST">
  <label>Nombre:</label>
  <input type="text" name="name" required />
  <button type="submit">Crear</button>
</form>
```

Este formulario crea un rol.

El campo:

```html
<input type="text" name="name" required />
```

envía:

```js
req.body.name
```

---

## 11.4. `views/roles/edit.ejs`

```ejs
<h1>Editar Rol</h1>
<form action="/roles/<%= role.id %>" method="POST">
  <label>Nombre:</label>
  <input type="text" name="name" value="<%= role.name %>" required />
  <button type="submit">Actualizar</button>
</form>
```

Este formulario edita un rol existente.

---

## 11.5. `views/roles/detail.ejs`

Muestra los datos de un rol:

```ejs
<p class="card-text"><strong>ID:</strong> <%= role.id %></p>
<p class="card-text"><strong>Nombre:</strong> <%= role.name %></p>
```

---

# Parte 12 — Rutas de usuarios

## 12. Archivo `routes/user.routes.js`

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

## 12.1. Rutas finales

Como en `app.js` se monta así:

```js
app.use('/users', userRoutes);
```

las rutas finales son:

| Método | Ruta final | Acción |
|---|---|---|
| `GET` | `/users` | Listar usuarios |
| `POST` | `/users` | Crear usuario |
| `GET` | `/users/:id` | Ver usuario por ID |
| `PUT` | `/users/:id` | Actualizar usuario |
| `DELETE` | `/users/:id` | Eliminar usuario lógico |

---

## 12.2. Observación importante sobre usuarios y formularios

El router de usuarios define:

```js
router.put('/:id', controller.updateUser);
router.delete('/:id', controller.deleteUser);
```

Eso está bien para una API REST, pero los formularios HTML normales no pueden enviar `PUT` ni `DELETE` directamente.

Si se quiere manejar usuarios desde vistas EJS con formularios, habría que:

- usar `POST` para formularios,
- o instalar `method-override`,
- o usar `fetch` desde el frontend para enviar `PUT` y `DELETE`.

---

# Parte 13 — Controlador de usuarios

## 13. Archivo `controllers/user.controller.js`

```js
const User = require('../models/user.model');
```

Este controlador usa directamente el modelo `User`.

---

## 13.1. `getAllUsers`

```js
function getAllUsers(req, res) {
  try {
    const { limit, offset, search, role } = req.query;
    const users = User.getAll({ limit, offset, search, role });
    res.render('users/index', { users });
  } catch (err) {
    console.error('[Error]', err.message);
    res.status(500).send('Error al obtener usuarios');
  }
}
```

### Qué hace

1. Lee filtros desde `req.query`.
2. Llama al modelo.
3. Renderiza la vista `users/index`.

Ejemplo:

```txt
/users?limit=5&offset=0&search=pepi&role=2
```

---

## 13.2. `req.query`

`req.query` contiene parámetros de consulta.

Ejemplo:

```txt
/users?search=pepi&limit=10
```

Express produce:

```js
req.query
```

```js
{
  search: "pepi",
  limit: "10"
}
```

---

## 13.3. `getUserById`

```js
function getUserById(req, res) {
  try {
    const user = User.getById(req.params.id);
    if (!user) return res.status(404).send('Usuario no encontrado');
    res.render('users/detail', { user });
  } catch (err) {
    console.error('[Error]', err.message);
    res.status(500).send('Error en la búsqueda');
  }
}
```

Busca usuario por ID y renderiza una vista de detalle.

---

## 13.4. Problema detectado

El controlador intenta renderizar:

```js
res.render('users/detail', { user });
```

Pero dentro de las vistas listadas no aparece:

```txt
views/users/detail.ejs
```

Solo aparecen:

```txt
views/users/index.ejs
views/users/error.ejs
```

Por lo tanto, si se llama a:

```txt
GET /users/1
```

puede fallar porque falta la vista `users/detail.ejs`.

---

## 13.5. `createUser`

```js
function createUser(req, res) {
  try {
    User.create(req.body);
    res.redirect('/users');
  } catch (err) {
    console.error('[Error]', err.message);
    res.status(400).send('Error al crear: ' + err.message);
  }
}
```

Crea un usuario usando los datos de `req.body`.

---

## 13.6. `updateUser`

```js
function updateUser(req, res) {
  try {
    User.update(req.params.id, req.body);
    res.redirect('/users');
  } catch (err) {
    console.error('[Error]', err.message);
    res.status(400).send('Error al actualizar: ' + err.message);
  }
}
```

Actualiza usuario.

Pero recordá que el modelo tiene un problema de columna:

```sql
SET name = ?
```

debería ser:

```sql
SET user = ?
```

---

## 13.7. `deleteUser`

```js
function deleteUser(req, res) {
  try {
    User.softDelete(req.params.id);
    res.redirect('/users');
  } catch (err) {
    console.error('[Error]', err.message);
    res.status(500).send('Error al eliminar');
  }
}
```

Realiza soft delete.

---

# Parte 14 — Vista de usuarios

## 14. Archivo `views/users/index.ejs`

```ejs
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Usuarios</title>
</head>
<body>
  <h1>Listado de Usuarios</h1>
  <ul>
    <% users.forEach(user => { %>
      <li><strong><%= user.name %></strong> — <%= user.email %></li>
    <% }) %>
  </ul>
</body>
</html>
```

---

## 14.1. Qué hace

Recorre el array `users` y muestra:

- nombre,
- email.

---

## 14.2. Problema detectado

La vista usa:

```ejs
<%= user.name %>
```

Pero la tabla `users` tiene una columna llamada:

```sql
user
```

Si la consulta no hace alias, debería usarse:

```ejs
<%= user.user %>
```

O mejor: corregir la consulta para devolver alias:

```sql
users.user AS name
```

---

# Parte 15 — Errores y mejoras detectadas

## 15.1. Inconsistencia entre columna `user` y propiedad `name`

La tabla usa:

```sql
user TEXT NOT NULL
```

Pero varias partes del código usan:

```js
name
```

Aparece en:

- `getAll`: `name LIKE ?`
- `update`: `SET name = ?`
- vista: `user.name`

### Solución recomendada A

Cambiar la tabla para usar `name` en vez de `user`.

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);
```

Luego ajustar el `INSERT`:

```sql
INSERT INTO users (name, email, role_id, created_at, updated_at)
```

Esta opción es más clara.

### Solución recomendada B

Mantener la columna `user`, pero usar alias:

```sql
SELECT users.*, users.user AS name, roles.name AS role_name
```

Y corregir:

```sql
WHERE users.user LIKE ?
UPDATE users SET user = ?
```

---

## 15.2. Falta vista `users/detail.ejs`

El controlador usa:

```js
res.render('users/detail', { user });
```

Pero la vista no está incluida.

Solución:

Crear:

```txt
views/users/detail.ejs
```

Ejemplo:

```ejs
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Detalle de Usuario</title>
  <link rel="stylesheet" href="/stylesheets/style.css">
</head>
<body class="container mt-5">
  <h1>Detalle de Usuario</h1>

  <p><strong>ID:</strong> <%= user.id %></p>
  <p><strong>Nombre:</strong> <%= user.name || user.user %></p>
  <p><strong>Email:</strong> <%= user.email %></p>
  <p><strong>Rol:</strong> <%= user.role_name || user.role_id || 'Sin rol' %></p>

  <a href="/users" class="btn btn-secondary">Volver</a>
</body>
</html>
```

---

## 15.3. Falta formulario para crear usuario

El controlador soporta:

```js
createUser
```

Pero no hay una vista:

```txt
views/users/new.ejs
```

ni ruta:

```js
router.get('/new', controller.renderNewUserForm);
```

Para manejar usuarios desde HTML, convendría agregarlo.

---

## 15.4. Rutas REST mezcladas con formularios HTML

Roles usa rutas de formulario:

```txt
POST /roles/:id/delete
```

Usuarios usa rutas REST:

```txt
PUT /users/:id
DELETE /users/:id
```

Esto no está mal si se usan clientes distintos, pero para una aplicación EJS con formularios conviene mantener consistencia.

Opciones:

1. Usar REST para ambos y consumir con `fetch`.
2. Usar formularios `POST` para ambos.
3. Usar `method-override`.

---

## 15.5. Eliminación física de roles

Roles usa:

```sql
DELETE FROM roles WHERE id = ?
```

Usuarios usa soft delete.

Si el proyecto necesita trazabilidad, convendría usar soft delete también para roles.

---

## 15.6. Foreign key y eliminación de roles

Como `users.role_id` referencia `roles.id`, eliminar un rol que está en uso puede fallar o dejar relaciones problemáticas según la configuración.

Una opción sería impedir eliminar roles usados.

Ejemplo:

```js
function roleHasUsers(id) {
  return db.prepare('SELECT COUNT(*) AS total FROM users WHERE role_id = ? AND deleted_at IS NULL').get(id).total > 0;
}
```

---

# Parte 16 — Versión corregida sugerida de `user.model.js`

Esta versión mantiene la tabla con columna `user`, pero devuelve alias `name` para que las vistas funcionen.

```js
const db = require('../config/db');
const chalk = require('chalk');

function getAll({ limit = 10, offset = 0, search = '', role = null }) {
  const baseQuery = `
    SELECT
      users.*,
      users.user AS name,
      roles.name AS role_name
    FROM users
    LEFT JOIN roles ON users.role_id = roles.id
    WHERE users.deleted_at IS NULL
      AND (users.user LIKE ? OR users.email LIKE ?)
      ${role ? 'AND users.role_id = ?' : ''}
    ORDER BY users.id
    LIMIT ?
    OFFSET ?
  `;

  const params = [`%${search}%`, `%${search}%`];

  if (role) {
    params.push(Number(role));
  }

  params.push(Number(limit), Number(offset));

  const results = db.prepare(baseQuery).all(...params);

  console.log(chalk.blue(`[DB] Listado obtenido (${results.length} resultados)`));

  return results;
}

function getById(id) {
  const user = db.prepare(`
    SELECT
      users.*,
      users.user AS name,
      roles.name AS role_name
    FROM users
    LEFT JOIN roles ON users.role_id = roles.id
    WHERE users.id = ?
      AND users.deleted_at IS NULL
  `).get(id);

  console.log(
    user
      ? chalk.blue(`[DB] Usuario ID ${id} obtenido`)
      : chalk.yellow(`[DB] Usuario ID ${id} no encontrado`)
  );

  return user;
}

function create({ name, email, role_id }) {
  if (!name || name.length < 2) {
    throw new Error('Nombre inválido');
  }

  if (!email || !email.includes('@')) {
    throw new Error('Email inválido');
  }

  const now = new Date().toISOString();

  const result = db.prepare(`
    INSERT INTO users (user, email, role_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, email, role_id || null, now, now);

  console.log(chalk.green(`[DB] Usuario creado con ID ${result.lastInsertRowid}`));

  return result;
}

function update(id, { name, email, role_id }) {
  if (!name || name.length < 2) {
    throw new Error('Nombre inválido');
  }

  if (!email || !email.includes('@')) {
    throw new Error('Email inválido');
  }

  const now = new Date().toISOString();

  const result = db.prepare(`
    UPDATE users
    SET user = ?, email = ?, role_id = ?, updated_at = ?
    WHERE id = ? AND deleted_at IS NULL
  `).run(name, email, role_id || null, now, id);

  console.log(chalk.cyan(`[DB] Usuario ID ${id} actualizado (${result.changes} cambio/s)`));

  return result;
}

function softDelete(id) {
  const now = new Date().toISOString();

  const result = db.prepare(`
    UPDATE users
    SET deleted_at = ?
    WHERE id = ? AND deleted_at IS NULL
  `).run(now, id);

  console.log(chalk.red(`[DB] Usuario ID ${id} marcado como eliminado`));

  return result;
}

module.exports = { getAll, getById, create, update, softDelete };
```

---

# Parte 17 — SQL trabajado en la clase

## 17.1. Crear tabla

```sql
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);
```

---

## 17.2. Insertar datos

```sql
INSERT INTO roles (name) VALUES (?);
```

---

## 17.3. Listar datos

```sql
SELECT * FROM roles;
```

---

## 17.4. Buscar por ID

```sql
SELECT * FROM roles WHERE id = ?;
```

---

## 17.5. Actualizar

```sql
UPDATE roles SET name = ? WHERE id = ?;
```

---

## 17.6. Eliminar físicamente

```sql
DELETE FROM roles WHERE id = ?;
```

---

## 17.7. Eliminación lógica

```sql
UPDATE users SET deleted_at = ? WHERE id = ?;
```

---

## 17.8. Relación con LEFT JOIN

```sql
SELECT users.*, roles.name AS role_name
FROM users
LEFT JOIN roles ON users.role_id = roles.id;
```

---

## 17.9. Filtros con LIKE

```sql
WHERE users.user LIKE ? OR users.email LIKE ?
```

Ejemplo de parámetro:

```js
`%${search}%`
```

---

## 17.10. Paginación

```sql
LIMIT ? OFFSET ?
```

---

# Parte 18 — EJS: conceptos clave

## 18.1. Renderizar vista desde controlador

```js
res.render('roles/index', { roles });
```

Esto busca:

```txt
views/roles/index.ejs
```

y le pasa la variable:

```js
roles
```

---

## 18.2. Imprimir valor

```ejs
<%= role.name %>
```

---

## 18.3. Ejecutar JavaScript

```ejs
<% roles.forEach(role => { %>
  <li><%= role.name %></li>
<% }) %>
```

---

## 18.4. Usar formularios

```ejs
<form action="/roles" method="POST">
  <input type="text" name="name" required />
  <button type="submit">Crear</button>
</form>
```

Express recibe:

```js
req.body.name
```

gracias a:

```js
app.use(express.urlencoded({ extended: false }));
```

---

# Parte 19 — Logging

## 19.1. Logging HTTP con Morgan

```js
app.use(morgan('dev'));
```

Muestra cada request entrante.

Sirve para ver:

- método HTTP,
- ruta,
- status,
- tiempo de respuesta.

---

## 19.2. Logging de base con Chalk

Ejemplo:

```js
console.log(chalk.green(`[DB] Rol creado con ID ${result.lastInsertRowid}`));
```

Colores usados:

| Color | Uso |
|---|---|
| `green` | Creación exitosa |
| `blue` | Lecturas/listados |
| `yellow` | No encontrado o advertencia |
| `cyan` | Actualización |
| `red` | Eliminación |

---

# Parte 20 — Manejo de errores

## 20.1. Error 404

```js
app.use((req, res, next) => {
  next(createError(404, 'Ruta no encontrada'));
});
```

Si ninguna ruta coincide, se genera un error 404.

---

## 20.2. Vista de error general

```ejs
<h1><%= message %></h1>
<h2><%= error.status %></h2>
<pre><%= error.stack %></pre>
```

---

## 20.3. Error handler

```js
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.render('general_error', {
    message: err.message,
    error: app.get('env') === 'development' ? err : {}
  });
});
```

En desarrollo muestra más detalle del error.

En producción debería mostrar menos información.

---

# Parte 21 — Métodos HTTP en esta clase

| Método | Uso en el proyecto |
|---|---|
| `GET` | Mostrar listados, formularios y detalles |
| `POST` | Crear roles, actualizar roles, eliminar roles vía formulario |
| `PUT` | Actualizar usuarios en estilo REST |
| `DELETE` | Eliminar usuarios en estilo REST |

---

# Parte 22 — Códigos HTTP usados o esperados

| Código | Significado | Uso |
|---:|---|---|
| `200` | OK | Vista o recurso encontrado |
| `302` | Redirect | Redirecciones con `res.redirect` |
| `400` | Bad Request | Datos inválidos en formularios |
| `404` | Not Found | Ruta, usuario o rol no encontrado |
| `500` | Internal Server Error | Error interno del servidor |

---

# Parte 23 — Relación con clases anteriores

## 23.1. Relación con Clase 1

Se aplica Node.js como entorno backend.

---

## 23.2. Relación con Clase 2

Se usan módulos CommonJS:

```js
require()
module.exports
```

---

## 23.3. Relación con Clase 3

Se usan arrays, objetos y métodos como:

- `forEach`,
- destructuring,
- parámetros por defecto,
- template literals.

---

## 23.4. Relación con Clase 4

Se mantiene la idea de servidor HTTP, endpoints y respuestas.

---

## 23.5. Relación con Clase 5

Se conecta con:

- HTML desde servidor,
- headers,
- vistas,
- formularios,
- `Content-Type`,
- rutas.

---

## 23.6. Relación con Clase 6

Se profundiza la estructura Express vista antes:

- rutas,
- controladores,
- modelos,
- middlewares,
- EJS.

La diferencia principal es que ahora los modelos ya no trabajan con arrays en memoria, sino con SQLite.

---

# Parte 24 — Relación con el TP “The Guardian”

Aunque el TP de redes se centra en concurrencia, cluster, Worker Threads y Atomics, esta clase aporta aprendizajes importantes de backend para mejorar la entrega.

## 24.1. Qué se puede aplicar al TP

| Clase 7 Backend | Aplicación en The Guardian |
|---|---|
| Express | Crear endpoints `/health` y `/ingest` |
| Morgan | Loggear tráfico durante pruebas |
| Chalk | Logs claros por tipo de evento |
| Estructura por capas | Separar routes, controllers, services y workers |
| SQLite | Guardar métricas o eventos procesados |
| Soft delete | Marcar evidencia como descartada sin borrarla |
| Validaciones | Validar `id` en `/ingest` |
| Manejo de errores | Responder errores HTTP correctamente |
| Filtros | Consultar métricas por worker, PID o fecha |
| Paginación | Listar eventos sin traer todo junto |

---

## 24.2. Ejemplo conceptual para el TP

Si se decide persistir eventos del TP, podría existir una tabla:

```sql
CREATE TABLE IF NOT EXISTS ingest_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  worker_pid INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Y un modelo:

```js
function createEvent({ event_id, worker_pid, status }) {
  return db.prepare(`
    INSERT INTO ingest_events (event_id, worker_pid, status)
    VALUES (?, ?, ?)
  `).run(event_id, worker_pid, status);
}
```

Esto no es obligatorio en la consigna original, pero sería una mejora defendible si se quiere aplicar backend del cuatrimestre anterior.

---

# Parte 25 — Práctica sugerida

## 25.1. Ejercicio 1 — Corregir modelo de usuarios

Corregir las consultas que usan `name` para que usen `user` o alias.

---

## 25.2. Ejercicio 2 — Crear vista `users/detail.ejs`

Agregar una vista de detalle de usuario.

---

## 25.3. Ejercicio 3 — Agregar formulario de nuevo usuario

Crear:

```txt
GET /users/new
POST /users
```

Vista sugerida:

```txt
views/users/new.ejs
```

---

## 25.4. Ejercicio 4 — Agregar selector de roles al formulario de usuario

El formulario de usuario debería permitir elegir un rol.

Para eso el controlador debe pedir los roles:

```js
const roles = Role.getAll();
```

y enviarlos a la vista:

```js
res.render('users/new', { roles });
```

---

## 25.5. Ejercicio 5 — Evitar eliminar roles en uso

Antes de borrar un rol, validar si hay usuarios activos con ese rol.

---

## 25.6. Ejercicio 6 — Agregar búsqueda en vista

Agregar un formulario:

```html
<form method="GET" action="/users">
  <input type="text" name="search">
  <button type="submit">Buscar</button>
</form>
```

---

## 25.7. Ejercicio 7 — Agregar paginación

Agregar links:

```txt
/users?limit=10&offset=0
/users?limit=10&offset=10
/users?limit=10&offset=20
```

---

## 25.8. Ejercicio 8 — Agregar endpoint JSON

Además de vistas EJS, crear:

```txt
GET /users/json
```

Respuesta:

```json
{
  "ok": true,
  "data": []
}
```

---

# Parte 26 — Preguntas posibles para defender la clase

## 26.1. ¿Qué es SQLite?

SQLite es una base de datos relacional liviana que guarda los datos en un archivo local.

---

## 26.2. ¿Qué es `better-sqlite3`?

Es una librería de Node.js para conectarse y ejecutar consultas SQL sobre SQLite.

---

## 26.3. ¿Qué hace `db.prepare()`?

Prepara una sentencia SQL para ejecutarla.

---

## 26.4. ¿Qué diferencia hay entre `.all()`, `.get()` y `.run()`?

| Método | Uso |
|---|---|
| `.all()` | Devuelve muchas filas |
| `.get()` | Devuelve una fila |
| `.run()` | Ejecuta cambios como INSERT, UPDATE o DELETE |

---

## 26.5. ¿Qué es una clave primaria?

Es un campo que identifica de forma única a cada fila de una tabla.

---

## 26.6. ¿Qué es una clave foránea?

Es un campo que referencia la clave primaria de otra tabla.

---

## 26.7. ¿Qué relación hay entre `users` y `roles`?

Un usuario puede tener un rol mediante `role_id`, y ese `role_id` referencia a `roles.id`.

---

## 26.8. ¿Qué es `LEFT JOIN`?

Es una consulta que trae registros de una tabla principal y, si existe coincidencia, datos relacionados de otra tabla.

---

## 26.9. ¿Qué es `soft delete`?

Es una eliminación lógica. No se borra la fila físicamente, sino que se marca como eliminada usando un campo como `deleted_at`.

---

## 26.10. ¿Por qué se usa `deleted_at IS NULL`?

Para listar solo los registros que no fueron eliminados lógicamente.

---

## 26.11. ¿Qué hace `LIMIT`?

Limita la cantidad de registros devueltos.

---

## 26.12. ¿Qué hace `OFFSET`?

Salta una cantidad de registros. Se usa para paginar.

---

## 26.13. ¿Qué hace `LIKE`?

Permite buscar coincidencias parciales en texto.

---

## 26.14. ¿Qué significa `UNIQUE`?

Indica que un campo no puede repetirse.

---

## 26.15. ¿Qué hace `PRAGMA foreign_keys = ON`?

Activa el control de claves foráneas en SQLite.

---

## 26.16. ¿Qué es EJS?

Es un motor de plantillas que permite generar HTML dinámico desde el servidor.

---

## 26.17. ¿Qué hace `res.render()`?

Renderiza una vista EJS y le pasa datos.

---

## 26.18. ¿Qué hace `express.urlencoded()`?

Permite leer datos enviados desde formularios HTML.

---

## 26.19. ¿Qué hace `morgan`?

Registra las peticiones HTTP en consola.

---

## 26.20. ¿Qué hace `chalk`?

Permite colorear mensajes en consola.

---

## 26.21. ¿Qué problema hay entre `user` y `name` en el código?

La tabla `users` define una columna `user`, pero varias consultas y vistas usan `name`. Eso puede romper consultas y renderizados. Hay que unificar el nombre o usar alias.

---

## 26.22. ¿Qué diferencia hay entre eliminar un rol y eliminar un usuario?

Los roles se eliminan físicamente con `DELETE`.  
Los usuarios se eliminan lógicamente con `softDelete`, actualizando `deleted_at`.

---

# Parte 27 — Checklist de estudio

- [ ] Entiendo qué es SQLite.
- [ ] Entiendo qué es `better-sqlite3`.
- [ ] Sé dónde se crea la base `usuarios.db`.
- [ ] Sé explicar la tabla `roles`.
- [ ] Sé explicar la tabla `users`.
- [ ] Entiendo la relación `users.role_id → roles.id`.
- [ ] Entiendo qué hace `PRAGMA foreign_keys = ON`.
- [ ] Sé qué hacen `.all()`, `.get()` y `.run()`.
- [ ] Sé explicar `LEFT JOIN`.
- [ ] Sé explicar `LIMIT` y `OFFSET`.
- [ ] Sé explicar `LIKE`.
- [ ] Sé explicar soft delete.
- [ ] Sé explicar `deleted_at IS NULL`.
- [ ] Entiendo cómo se renderizan vistas EJS.
- [ ] Sé qué hace `express.urlencoded`.
- [ ] Sé qué hace `morgan`.
- [ ] Sé qué hace `chalk`.
- [ ] Puedo explicar la estructura del proyecto.
- [ ] Puedo explicar el flujo ruta → controlador → modelo → vista.
- [ ] Identifico el problema `user` vs `name`.
- [ ] Identifico que falta `users/detail.ejs`.
- [ ] Puedo relacionar esta clase con el TP “The Guardian”.

---

# Parte 28 — Resumen final

La clase 7 lleva el backend a un nivel más realista porque incorpora persistencia con SQLite.

Los conceptos más importantes son:

- Express como framework backend.
- EJS como motor de vistas.
- SQLite como base de datos relacional local.
- `better-sqlite3` para ejecutar SQL desde Node.js.
- Tablas relacionadas mediante claves foráneas.
- CRUD de roles.
- CRUD parcial de usuarios.
- Soft delete para usuarios.
- Búsqueda y filtros con query params.
- Paginación con `LIMIT` y `OFFSET`.
- `LEFT JOIN` para unir usuarios con roles.
- Validaciones simples.
- Logging con `chalk` y `morgan`.
- Manejo de errores con `http-errors`.
- Separación por rutas, controladores, modelos y vistas.

La idea más importante para defender es:

> Esta clase muestra cómo una aplicación Express deja de depender de arrays en memoria y empieza a trabajar con una base de datos relacional, manteniendo una estructura modular donde las rutas reciben la petición, los controladores coordinan la respuesta, los modelos ejecutan SQL y las vistas EJS muestran los datos al usuario.
