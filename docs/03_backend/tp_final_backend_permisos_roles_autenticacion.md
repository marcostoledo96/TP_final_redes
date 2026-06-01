# TP Final Backend — Gestión de Permisos por Rol + Ejemplo de Autenticación

**Curso:** Desarrollo Web Backend  
**Tecnología:** Node.js / Express / SQLite / EJS / Cookies / Autenticación  
**Material base:**  
- `TrabajoPractico-DesarrolloBackend.pdf`
- `autenticacion.zip`

---

## 1. Objetivo general del TP final

El TP final de la cursada propone ampliar el sistema de **gestión de usuarios y roles** trabajado en clases anteriores, agregando una nueva capa de autorización basada en **permisos**.

La idea central es pasar de un sistema donde un usuario solo tiene un rol, a un sistema donde:

```txt
Usuario → tiene un Rol → el Rol tiene Permisos → los Permisos habilitan acciones
```

Esto permite responder preguntas como:

- ¿Qué permisos tiene el rol “Admin”?
- ¿Qué puede hacer el rol “Editor”?
- ¿Un usuario puede crear usuarios?
- ¿Un usuario puede editar roles?
- ¿Un usuario puede acceder a una ruta protegida?
- ¿Qué acciones debería ver habilitadas en la interfaz?

El objetivo del TP no es solamente crear tablas nuevas, sino demostrar dominio de:

- relaciones entre tablas,
- ABM/CRUD,
- vistas dinámicas,
- validaciones,
- asignación de permisos,
- manejo de errores,
- control de acceso,
- organización del código por capas.

---

# Parte 1 — Consigna formal del TP

## 2. Nombre del trabajo

```txt
Tarea Práctica: Gestión de Permisos por Rol
```

---

## 3. Objetivo general según la consigna

El trabajo pide:

> Ampliar el sistema de gestión de usuarios y roles, implementando un sistema de permisos que permita definir qué acciones puede realizar cada rol.

Esto refuerza tres conceptos centrales:

1. **Relaciones entre tablas**.
2. **Validaciones**.
3. **Control de acceso**.

---

## 4. Tareas obligatorias

La consigna se divide en cuatro grandes tareas:

1. Crear nuevas tablas en SQLite.
2. Implementar ABM de permisos.
3. Asignar permisos a roles.
4. Visualizar permisos desde la vista de usuario.

Además, incluye un bonus:

5. Crear un middleware de control de acceso.

---

# Parte 2 — Modelo de datos requerido

## 5. Tablas nuevas obligatorias

La consigna pide crear dos tablas nuevas:

```sql
permisos (
  id INTEGER PRIMARY KEY,
  nombre TEXT UNIQUE NOT NULL
)
```

y:

```sql
rol_permiso (
  rol_id INTEGER,
  permiso_id INTEGER,
  PRIMARY KEY (rol_id, permiso_id)
)
```

---

## 6. Interpretación de las tablas

### 6.1. Tabla `permisos`

La tabla `permisos` representa acciones que el sistema puede habilitar o bloquear.

Ejemplos:

| id | nombre |
|---:|---|
| 1 | crear_usuario |
| 2 | editar_usuario |
| 3 | eliminar_usuario |
| 4 | ver_usuarios |
| 5 | crear_rol |
| 6 | editar_rol |
| 7 | eliminar_rol |
| 8 | asignar_permisos |

Cada permiso representa una acción concreta.

---

### 6.2. Tabla `rol_permiso`

La tabla `rol_permiso` relaciona roles con permisos.

Como un rol puede tener muchos permisos y un permiso puede pertenecer a muchos roles, esta tabla representa una relación **muchos a muchos**.

Ejemplo:

| rol_id | permiso_id |
|---:|---:|
| 1 | 1 |
| 1 | 2 |
| 1 | 3 |
| 2 | 4 |
| 2 | 5 |

Interpretación:

- El rol 1 tiene permisos 1, 2 y 3.
- El rol 2 tiene permisos 4 y 5.

---

## 7. Relación general entre tablas

Si partimos del sistema de la clase 7, ya existían:

```txt
roles
users
```

Ahora se suman:

```txt
permisos
rol_permiso
```

La relación queda así:

```txt
users
  │
  │ role_id
  ▼
roles
  │
  │ rol_permiso
  ▼
permisos
```

Representación:

```txt
users N ---- 1 roles
roles N ---- N permisos
```

O más detallado:

```txt
users.role_id ─────────────► roles.id

rol_permiso.rol_id ────────► roles.id
rol_permiso.permiso_id ────► permisos.id
```

---

## 8. SQL recomendado para el TP

La consigna da una estructura mínima. Para un proyecto más correcto y defendible, conviene agregar claves foráneas y comportamientos de borrado.

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS permisos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS rol_permiso (
  rol_id INTEGER NOT NULL,
  permiso_id INTEGER NOT NULL,
  PRIMARY KEY (rol_id, permiso_id),
  FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permiso_id) REFERENCES permisos(id) ON DELETE CASCADE
);
```

---

## 9. ¿Por qué usar `PRIMARY KEY (rol_id, permiso_id)`?

Esta clave primaria compuesta evita duplicados.

Por ejemplo, impide que pase esto:

```txt
rol_id = 1, permiso_id = 3
rol_id = 1, permiso_id = 3
```

Es decir, un mismo permiso no puede asignarse dos veces al mismo rol.

---

## 10. ¿Por qué usar `UNIQUE` en `permisos.nombre`?

```sql
nombre TEXT UNIQUE NOT NULL
```

Evita permisos duplicados.

Por ejemplo, no debería poder existir dos veces:

```txt
crear_usuario
crear_usuario
```

Esto permite manejar permisos por nombre de forma confiable.

---

## 11. ¿Por qué usar `ON DELETE CASCADE`?

Si se elimina un permiso, también se eliminan automáticamente sus relaciones en `rol_permiso`.

Ejemplo:

```txt
Se elimina permiso 3.
También se eliminan todas las filas rol_permiso donde permiso_id = 3.
```

Lo mismo para roles.

Esto evita relaciones huérfanas.

---

# Parte 3 — ABM de permisos

## 12. Qué significa ABM

ABM significa:

| Letra | Acción |
|---|---|
| A | Alta |
| B | Baja |
| M | Modificación |

En términos REST o CRUD:

| ABM | CRUD | Método HTTP esperado |
|---|---|---|
| Alta | Create | `POST` |
| Baja | Delete | `POST` o `DELETE` |
| Modificación | Update | `POST`, `PUT` o `PATCH` |
| Listado | Read | `GET` |

---

## 13. Rutas requeridas para permisos

La consigna pide:

- listar permisos existentes,
- crear nuevo permiso,
- editar permiso,
- eliminar permiso,
- mostrar errores si se repite el nombre.

Una estructura recomendada de rutas con EJS sería:

| Método | Ruta | Acción |
|---|---|---|
| `GET` | `/permisos` | Listar permisos |
| `GET` | `/permisos/new` | Mostrar formulario de creación |
| `POST` | `/permisos` | Crear permiso |
| `GET` | `/permisos/:id/edit` | Mostrar formulario de edición |
| `POST` | `/permisos/:id` | Actualizar permiso |
| `POST` | `/permisos/:id/delete` | Eliminar permiso |

---

## 14. Por qué usar `POST` para editar/eliminar en EJS

HTML tradicional solo permite formularios con:

```html
method="GET"
method="POST"
```

No permite directamente:

```txt
PUT
DELETE
```

Por eso, en proyectos con EJS y formularios simples, se suele usar `POST` para acciones como editar y eliminar.

---

## 15. Modelo recomendado: `permission.model.js`

Archivo sugerido:

```txt
models/permission.model.js
```

Código recomendado:

```js
const db = require('../config/db');

function getAll() {
  return db.prepare(`
    SELECT *
    FROM permisos
    ORDER BY nombre ASC
  `).all();
}

function getById(id) {
  return db.prepare(`
    SELECT *
    FROM permisos
    WHERE id = ?
  `).get(id);
}

function create({ nombre }) {
  if (!nombre || nombre.trim().length < 3) {
    throw new Error('El nombre del permiso debe tener al menos 3 caracteres');
  }

  const nombreNormalizado = nombre.trim();

  return db.prepare(`
    INSERT INTO permisos (nombre)
    VALUES (?)
  `).run(nombreNormalizado);
}

function update(id, { nombre }) {
  if (!nombre || nombre.trim().length < 3) {
    throw new Error('El nombre del permiso debe tener al menos 3 caracteres');
  }

  const nombreNormalizado = nombre.trim();

  return db.prepare(`
    UPDATE permisos
    SET nombre = ?
    WHERE id = ?
  `).run(nombreNormalizado, id);
}

function remove(id) {
  return db.prepare(`
    DELETE FROM permisos
    WHERE id = ?
  `).run(id);
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};
```

---

## 16. Controlador recomendado: `permission.controller.js`

Archivo sugerido:

```txt
controllers/permission.controller.js
```

Código recomendado:

```js
const Permission = require('../models/permission.model');

function getAllPermissions(req, res) {
  try {
    const permisos = Permission.getAll();
    res.render('permisos/index', { permisos, error: null });
  } catch (error) {
    res.status(500).render('permisos/error', {
      message: 'Error al obtener permisos',
      error
    });
  }
}

function renderNewPermissionForm(req, res) {
  res.render('permisos/new', { error: null });
}

function createPermission(req, res) {
  try {
    Permission.create(req.body);
    res.redirect('/permisos');
  } catch (error) {
    res.status(400).render('permisos/new', {
      error: error.message
    });
  }
}

function renderEditPermissionForm(req, res) {
  try {
    const permiso = Permission.getById(req.params.id);

    if (!permiso) {
      return res.status(404).render('permisos/error', {
        message: 'Permiso no encontrado',
        error: null
      });
    }

    res.render('permisos/edit', { permiso, error: null });
  } catch (error) {
    res.status(500).render('permisos/error', {
      message: 'Error al cargar permiso',
      error
    });
  }
}

function updatePermission(req, res) {
  try {
    Permission.update(req.params.id, req.body);
    res.redirect('/permisos');
  } catch (error) {
    const permiso = Permission.getById(req.params.id);

    res.status(400).render('permisos/edit', {
      permiso,
      error: error.message
    });
  }
}

function deletePermission(req, res) {
  try {
    Permission.remove(req.params.id);
    res.redirect('/permisos');
  } catch (error) {
    res.status(500).render('permisos/error', {
      message: 'Error al eliminar permiso',
      error
    });
  }
}

module.exports = {
  getAllPermissions,
  renderNewPermissionForm,
  createPermission,
  renderEditPermissionForm,
  updatePermission,
  deletePermission
};
```

---

## 17. Ruta recomendada: `permission.routes.js`

Archivo sugerido:

```txt
routes/permission.routes.js
```

Código recomendado:

```js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/permission.controller');

router.get('/', controller.getAllPermissions);
router.get('/new', controller.renderNewPermissionForm);
router.post('/', controller.createPermission);
router.get('/:id/edit', controller.renderEditPermissionForm);
router.post('/:id', controller.updatePermission);
router.post('/:id/delete', controller.deletePermission);

module.exports = router;
```

---

## 18. Montaje de rutas en `app.js`

En `app.js` habría que agregar:

```js
const permissionRoutes = require('./routes/permission.routes');

app.use('/permisos', permissionRoutes);
```

---

# Parte 4 — Vistas EJS para permisos

## 19. Carpeta sugerida

```txt
views/
└── permisos/
    ├── index.ejs
    ├── new.ejs
    ├── edit.ejs
    └── error.ejs
```

---

## 20. Vista `views/permisos/index.ejs`

Ejemplo:

```ejs
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Permisos</title>
</head>
<body>
  <h1>Permisos</h1>

  <a href="/permisos/new">Crear nuevo permiso</a>

  <% if (permisos.length === 0) { %>
    <p>No hay permisos cargados.</p>
  <% } else { %>
    <ul>
      <% permisos.forEach(permiso => { %>
        <li>
          <strong><%= permiso.nombre %></strong>

          <a href="/permisos/<%= permiso.id %>/edit">Editar</a>

          <form action="/permisos/<%= permiso.id %>/delete" method="POST" style="display:inline;">
            <button type="submit">Eliminar</button>
          </form>
        </li>
      <% }) %>
    </ul>
  <% } %>

  <hr>
  <a href="/roles">Volver a roles</a>
</body>
</html>
```

---

## 21. Vista `views/permisos/new.ejs`

```ejs
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Nuevo Permiso</title>
</head>
<body>
  <h1>Nuevo Permiso</h1>

  <% if (error) { %>
    <p style="color:red;"><%= error %></p>
  <% } %>

  <form action="/permisos" method="POST">
    <label>Nombre del permiso:</label>
    <input type="text" name="nombre" required>

    <button type="submit">Crear</button>
  </form>

  <a href="/permisos">Volver</a>
</body>
</html>
```

---

## 22. Vista `views/permisos/edit.ejs`

```ejs
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Editar Permiso</title>
</head>
<body>
  <h1>Editar Permiso</h1>

  <% if (error) { %>
    <p style="color:red;"><%= error %></p>
  <% } %>

  <form action="/permisos/<%= permiso.id %>" method="POST">
    <label>Nombre del permiso:</label>
    <input type="text" name="nombre" value="<%= permiso.nombre %>" required>

    <button type="submit">Guardar cambios</button>
  </form>

  <a href="/permisos">Volver</a>
</body>
</html>
```

---

# Parte 5 — Asignación de permisos a roles

## 23. Qué pide la consigna

La consigna solicita:

> En la vista `/roles/:id/edit`, agregar checkboxes para asignar/desasignar permisos.

Esto significa que cuando se edita un rol, la vista debe mostrar:

- datos del rol,
- lista completa de permisos,
- permisos actualmente asignados,
- checkboxes marcados para los permisos que ya tiene ese rol.

---

## 24. Modelo para relación rol-permiso

Archivo sugerido:

```txt
models/rolePermission.model.js
```

Código recomendado:

```js
const db = require('../config/db');

function getPermissionsByRoleId(roleId) {
  return db.prepare(`
    SELECT permisos.*
    FROM permisos
    INNER JOIN rol_permiso
      ON permisos.id = rol_permiso.permiso_id
    WHERE rol_permiso.rol_id = ?
    ORDER BY permisos.nombre ASC
  `).all(roleId);
}

function getPermissionIdsByRoleId(roleId) {
  const rows = db.prepare(`
    SELECT permiso_id
    FROM rol_permiso
    WHERE rol_id = ?
  `).all(roleId);

  return rows.map(row => row.permiso_id);
}

function replacePermissionsForRole(roleId, permissionIds) {
  const deletePrevious = db.prepare(`
    DELETE FROM rol_permiso
    WHERE rol_id = ?
  `);

  const insertPermission = db.prepare(`
    INSERT INTO rol_permiso (rol_id, permiso_id)
    VALUES (?, ?)
  `);

  const transaction = db.transaction((ids) => {
    deletePrevious.run(roleId);

    ids.forEach((permissionId) => {
      insertPermission.run(roleId, permissionId);
    });
  });

  transaction(permissionIds);
}

function roleHasPermission(roleId, permissionName) {
  const permission = db.prepare(`
    SELECT permisos.*
    FROM permisos
    INNER JOIN rol_permiso
      ON permisos.id = rol_permiso.permiso_id
    WHERE rol_permiso.rol_id = ?
      AND permisos.nombre = ?
  `).get(roleId, permissionName);

  return Boolean(permission);
}

module.exports = {
  getPermissionsByRoleId,
  getPermissionIdsByRoleId,
  replacePermissionsForRole,
  roleHasPermission
};
```

---

## 25. ¿Por qué usar una transacción?

Cuando se actualizan permisos de un rol, conviene hacerlo en dos pasos:

1. Borrar permisos anteriores.
2. Insertar permisos nuevos.

Si algo falla en el medio, el rol podría quedar sin permisos o con datos parciales.

Por eso se usa:

```js
const transaction = db.transaction(...)
```

Una transacción asegura que todo se complete correctamente o nada se aplique.

---

## 26. Actualizar controlador de roles

El controlador de roles debe poder cargar todos los permisos y marcar cuáles están asignados.

Archivo:

```txt
controllers/role.controller.js
```

Ejemplo para renderizar edición:

```js
const Role = require('../models/role.model');
const Permission = require('../models/permission.model');
const RolePermission = require('../models/rolePermission.model');

function renderEditRoleForm(req, res) {
  try {
    const role = Role.getById(req.params.id);

    if (!role) {
      return res.status(404).send('Rol no encontrado');
    }

    const permisos = Permission.getAll();
    const permisosAsignados = RolePermission.getPermissionIdsByRoleId(req.params.id);

    res.render('roles/edit', {
      role,
      permisos,
      permisosAsignados,
      error: null
    });
  } catch (error) {
    res.status(500).send('Error al cargar formulario');
  }
}
```

---

## 27. Actualizar permisos al guardar rol

Cuando se guarda el formulario de edición, también deben guardarse los permisos.

Ejemplo:

```js
function updateRole(req, res) {
  try {
    const { name, permisos } = req.body;

    Role.update(req.params.id, { name });

    const permissionIds = Array.isArray(permisos)
      ? permisos.map(Number)
      : permisos
        ? [Number(permisos)]
        : [];

    RolePermission.replacePermissionsForRole(req.params.id, permissionIds);

    res.redirect(`/roles/${req.params.id}`);
  } catch (error) {
    res.status(400).send('Error al actualizar: ' + error.message);
  }
}
```

---

## 28. ¿Por qué validar `permisos` como array?

Cuando un formulario HTML envía checkboxes:

### Caso 1 — Ningún checkbox seleccionado

```js
req.body.permisos // undefined
```

### Caso 2 — Un solo checkbox seleccionado

```js
req.body.permisos // "3"
```

### Caso 3 — Varios checkboxes seleccionados

```js
req.body.permisos // ["1", "3", "5"]
```

Por eso hay que normalizar el valor.

---

## 29. Vista `roles/edit.ejs` con checkboxes

Ejemplo:

```ejs
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Editar Rol</title>
</head>
<body>
  <h1>Editar Rol</h1>

  <% if (error) { %>
    <p style="color:red;"><%= error %></p>
  <% } %>

  <form action="/roles/<%= role.id %>" method="POST">
    <label>Nombre:</label>
    <input type="text" name="name" value="<%= role.name %>" required>

    <h2>Permisos</h2>

    <% permisos.forEach(permiso => { %>
      <label>
        <input
          type="checkbox"
          name="permisos"
          value="<%= permiso.id %>"
          <%= permisosAsignados.includes(permiso.id) ? 'checked' : '' %>
        >
        <%= permiso.nombre %>
      </label>
      <br>
    <% }) %>

    <button type="submit">Guardar</button>
  </form>

  <a href="/roles">Volver</a>
</body>
</html>
```

---

## 30. Mostrar permisos en `/roles/:id`

La consigna pide:

> Mostrar en `/roles/:id` los permisos asignados.

El controlador de detalle debería hacer:

```js
function getRoleById(req, res) {
  try {
    const role = Role.getById(req.params.id);

    if (!role) {
      return res.status(404).send('Rol no encontrado');
    }

    const permisos = RolePermission.getPermissionsByRoleId(req.params.id);

    res.render('roles/detail', {
      role,
      permisos
    });
  } catch (error) {
    res.status(500).send('Error al buscar el rol');
  }
}
```

---

## 31. Vista `roles/detail.ejs`

Ejemplo:

```ejs
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Detalle del Rol</title>
</head>
<body>
  <h1>Rol: <%= role.name %></h1>

  <p><strong>ID:</strong> <%= role.id %></p>

  <h2>Permisos asignados</h2>

  <% if (permisos.length === 0) { %>
    <p>Este rol no tiene permisos asignados.</p>
  <% } else { %>
    <ul>
      <% permisos.forEach(permiso => { %>
        <li><%= permiso.nombre %></li>
      <% }) %>
    </ul>
  <% } %>

  <a href="/roles/<%= role.id %>/edit">Editar rol</a>
  <a href="/roles">Volver</a>
</body>
</html>
```

---

# Parte 6 — Visualización desde usuario

## 32. Qué pide la consigna

La consigna indica:

> En `/users/:id`, mostrar qué permisos tiene su rol.

Eso significa que el detalle de usuario debe mostrar:

- datos del usuario,
- rol del usuario,
- permisos asignados al rol del usuario.

---

## 33. Consulta recomendada para detalle de usuario

En el modelo de usuarios, conviene traer también el rol.

Ejemplo:

```js
function getById(id) {
  return db.prepare(`
    SELECT
      users.*,
      users.user AS name,
      roles.name AS role_name
    FROM users
    LEFT JOIN roles
      ON users.role_id = roles.id
    WHERE users.id = ?
      AND users.deleted_at IS NULL
  `).get(id);
}
```

---

## 34. Controlador de usuario con permisos

Ejemplo:

```js
const User = require('../models/user.model');
const RolePermission = require('../models/rolePermission.model');

function getUserById(req, res) {
  try {
    const user = User.getById(req.params.id);

    if (!user) {
      return res.status(404).send('Usuario no encontrado');
    }

    const permisos = user.role_id
      ? RolePermission.getPermissionsByRoleId(user.role_id)
      : [];

    res.render('users/detail', {
      user,
      permisos
    });
  } catch (error) {
    res.status(500).send('Error en la búsqueda');
  }
}
```

---

## 35. Vista `users/detail.ejs`

Ejemplo:

```ejs
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Detalle de Usuario</title>
</head>
<body>
  <h1>Detalle de Usuario</h1>

  <p><strong>ID:</strong> <%= user.id %></p>
  <p><strong>Nombre:</strong> <%= user.name || user.user %></p>
  <p><strong>Email:</strong> <%= user.email %></p>
  <p><strong>Rol:</strong> <%= user.role_name || 'Sin rol' %></p>

  <h2>Permisos del rol</h2>

  <% if (permisos.length === 0) { %>
    <p>Este usuario no tiene permisos asignados por rol.</p>
  <% } else { %>
    <ul>
      <% permisos.forEach(permiso => { %>
        <li><%= permiso.nombre %></li>
      <% }) %>
    </ul>
  <% } %>

  <a href="/users">Volver</a>
</body>
</html>
```

---

# Parte 7 — Bonus: middleware de control de acceso

## 36. Qué pide el bonus

La consigna propone:

> Crear un middleware que verifique si un usuario tiene un permiso antes de permitir acceso a una ruta protegida.

Ejemplo de permiso:

```txt
crear_usuario
```

Si el usuario no tiene el permiso, debe mostrarse un mensaje de acceso denegado.

---

## 37. Qué se necesita para que funcione

Para verificar permisos de un usuario, se necesita saber quién es el usuario actual.

Hay dos posibilidades:

1. Usar un usuario fijo para pruebas.
2. Integrar el ejemplo de autenticación del profesor.

El código de `autenticacion.zip` permite trabajar con:

- registro,
- login,
- cookies,
- sesiones,
- logout,
- ruta `/me`.

Ese ejemplo sirve como base para conectar permisos reales con sesión de usuario.

---

## 38. Middleware conceptual

Archivo sugerido:

```txt
middlewares/checkPermission.middleware.js
```

Ejemplo:

```js
const User = require('../models/user.model');
const RolePermission = require('../models/rolePermission.model');

function checkPermission(permissionName) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).send('No autenticado');
      }

      const user = User.getByUsername(req.user.username);

      if (!user) {
        return res.status(401).send('Usuario no encontrado');
      }

      const hasPermission = RolePermission.roleHasPermission(
        user.role_id,
        permissionName
      );

      if (!hasPermission) {
        return res.status(403).send('Acceso denegado');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = checkPermission;
```

---

## 39. Uso del middleware

Ejemplo:

```js
const checkPermission = require('../middlewares/checkPermission.middleware');

router.get('/new', checkPermission('crear_usuario'), controller.renderNewUserForm);
router.post('/', checkPermission('crear_usuario'), controller.createUser);
```

Esto significa:

> Para entrar a `/users/new` o crear un usuario, el usuario logueado debe tener el permiso `crear_usuario`.

---

## 40. Diferencia entre autenticación y autorización

| Concepto | Pregunta que responde |
|---|---|
| Autenticación | ¿Quién sos? |
| Autorización | ¿Qué podés hacer? |

Ejemplo:

- Login con usuario y contraseña: autenticación.
- Verificar permiso `crear_usuario`: autorización.

---

# Parte 8 — Entregables del TP

## 41. Proyecto funcionando

El proyecto debe poder ejecutarse y demostrar:

- ABM de permisos,
- asignación de permisos a roles,
- visualización de permisos en roles,
- visualización de permisos en usuarios,
- manejo de errores,
- estructura ordenada.

---

## 42. Capturas de pantalla requeridas

La consigna pide capturas de:

1. ABM de permisos.
2. Asignación de permisos a roles.
3. Permisos mostrados desde la vista de usuario.

---

## 43. README.md requerido

El `README.md` debe explicar brevemente:

1. Qué permisos se crearon.
2. Cómo se asignan a roles.
3. Cómo se visualizan.

---

## 44. README.md sugerido

```md
# TP Final Backend — Gestión de Permisos por Rol

## Descripción

Este proyecto amplía el sistema de gestión de usuarios y roles, agregando un sistema de permisos por rol.

## Permisos creados

- ver_usuarios
- crear_usuario
- editar_usuario
- eliminar_usuario
- ver_roles
- crear_rol
- editar_rol
- eliminar_rol
- asignar_permisos

## Cómo se asignan permisos

Los permisos se asignan desde la vista de edición de roles:

/roles/:id/edit

Cada permiso aparece como un checkbox. Al guardar, se actualiza la tabla intermedia rol_permiso.

## Cómo se visualizan

Los permisos se pueden visualizar en:

- /roles/:id
- /users/:id

En el detalle de un usuario se muestran los permisos asociados al rol del usuario.

## Tecnologías

- Node.js
- Express
- SQLite
- better-sqlite3
- EJS

## Ejecución

npm install
npm start
```

---

# Parte 9 — Requisitos técnicos

## 45. Requisitos pedidos por la consigna

La consigna exige:

- Node.js con Express.
- SQLite3.
- Motor de vistas EJS.
- Código ordenado por controladores, rutas y modelos.
- Buen manejo de errores.
- Diseño simple pero funcional en las vistas.

---

## 46. Estructura recomendada del proyecto final

```txt
GestionUsuarios/
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
    │   ├── role.model.js
    │   ├── permission.model.js
    │   └── rolePermission.model.js
    ├── controllers/
    │   ├── user.controller.js
    │   ├── role.controller.js
    │   ├── permission.controller.js
    │   └── auth.controller.js
    ├── routes/
    │   ├── user.routes.js
    │   ├── role.routes.js
    │   ├── permission.routes.js
    │   └── auth.routes.js
    ├── middlewares/
    │   ├── session.middleware.js
    │   └── checkPermission.middleware.js
    ├── services/
    │   ├── auth.service.js
    │   └── session.service.js
    ├── data/
    │   └── sessions.json
    ├── views/
    │   ├── general_error.ejs
    │   ├── users/
    │   ├── roles/
    │   ├── permisos/
    │   └── auth/
    └── public/
        └── stylesheets/
            └── style.css
```

---

# Parte 10 — Ejemplo del profesor: autenticación

## 47. Objetivo del ejemplo

El ZIP `autenticacion.zip` contiene un proyecto educativo de autenticación con:

- Node.js,
- Express,
- cookies,
- archivos JSON como almacenamiento plano,
- HTML estático,
- registro,
- login,
- sesiones,
- logout,
- ruta para consultar usuario autenticado.

---

## 48. Estructura del proyecto de autenticación

```txt
autenticacion/
├── README.md
├── package.json
└── src/
    ├── index.js
    ├── controllers/
    │   └── auth.controller.js
    ├── routes/
    │   └── auth.routes.js
    ├── services/
    │   ├── auth.service.js
    │   └── session.service.js
    ├── middleware/
    │   └── session.middleware.js
    ├── data/
    │   ├── users.json
    │   └── sessions.json
    └── public/
        ├── register.html
        ├── login.html
        └── dashboard.html
```

---

## 49. Dependencias del ejemplo

El `package.json` contiene:

```json
{
  "name": "my-auth-app",
  "version": "1.0.0",
  "main": "index.js",
  "type": "commonjs",
  "scripts": {
    "start": "node src/index.js"
  },
  "dependencies": {
    "cookie-parser": "^1.4.6",
    "express": "^4.18.2"
  }
}
```

Dependencias:

| Dependencia | Uso |
|---|---|
| `express` | Crear servidor y rutas |
| `cookie-parser` | Leer y escribir cookies |

---

## 50. Archivo `src/index.js`

```js
const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth.routes');

const app = express();
const PORT = 3000;

app.use(express.static('public'));

app.use((req, res, next) => {
  console.log(`→ ${req.method} ${req.url}`);
  next();
});

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
```

---

## 51. Qué hace `index.js`

1. Crea la app Express.
2. Sirve archivos estáticos.
3. Agrega un middleware de logging.
4. Habilita lectura de JSON.
5. Habilita lectura de cookies.
6. Monta rutas de autenticación en `/api/auth`.
7. Levanta el servidor en puerto `3000`.

---

## 52. Observación importante sobre archivos estáticos

El código usa:

```js
app.use(express.static('public'));
```

Pero en el ZIP la carpeta pública está en:

```txt
src/public/
```

Si se ejecuta desde la raíz del proyecto con:

```bash
npm start
```

puede convenir corregirlo así:

```js
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));
```

Esto asegura que Express sirva la carpeta correcta.

---

# Parte 11 — Rutas de autenticación

## 53. Archivo `auth.routes.js`

```js
const express = require('express');
const router = express.Router();
const { register, login, logout, me } = require('../controllers/auth.controller');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', me);

module.exports = router;
```

---

## 54. Endpoints finales

Como el router se monta en:

```js
app.use('/api/auth', authRoutes);
```

las rutas finales son:

| Método | Ruta final | Acción |
|---|---|---|
| `POST` | `/api/auth/register` | Registrar usuario |
| `POST` | `/api/auth/login` | Iniciar sesión |
| `POST` | `/api/auth/logout` | Cerrar sesión |
| `GET` | `/api/auth/me` | Obtener usuario autenticado |

---

# Parte 12 — Servicio de usuarios

## 55. Archivo `auth.service.js`

```js
const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, '../data/users.json');

const readUsers = () => {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE));
};

const writeUsers = (users) => {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

const registerUser = (username, password) => {
  const users = readUsers();
  if (users.find(u => u.username === username)) {
    throw new Error('Usuario ya existe');
  }
  users.push({ username, password });
  writeUsers(users);
};

const loginUser = (username, password) => {
  const users = readUsers();
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) throw new Error('Credenciales inválidas');
};

module.exports = { registerUser, loginUser };
```

---

## 56. Qué hace `auth.service.js`

Este servicio administra usuarios guardados en:

```txt
src/data/users.json
```

Permite:

- leer usuarios,
- escribir usuarios,
- registrar nuevo usuario,
- validar login.

---

## 57. Registro de usuario

```js
const registerUser = (username, password) => {
  const users = readUsers();

  if (users.find(u => u.username === username)) {
    throw new Error('Usuario ya existe');
  }

  users.push({ username, password });
  writeUsers(users);
};
```

El registro verifica que el usuario no exista.

Si ya existe, lanza error.

Si no existe, lo agrega al JSON.

---

## 58. Login de usuario

```js
const loginUser = (username, password) => {
  const users = readUsers();
  const user = users.find(u => u.username === username && u.password === password);

  if (!user) throw new Error('Credenciales inválidas');
};
```

Busca un usuario con username y password coincidentes.

---

## 59. Observación de seguridad

El ejemplo guarda contraseñas en texto plano:

```json
{
  "username": "alan",
  "password": "clavesegura"
}
```

Esto sirve para una práctica educativa, pero no es seguro para producción.

En un sistema real se debería usar hashing de contraseñas, por ejemplo con `bcrypt`.

---

# Parte 13 — Servicio de sesiones

## 60. Archivo `session.service.js`

```js
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const SESSIONS_FILE = path.join(__dirname, '../data/sessions.json');
```

Este servicio administra sesiones guardadas en:

```txt
src/data/sessions.json
```

---

## 61. Crear sesión

```js
const createSession = (username) => {
  const sessions = readSessions();
  const sessionId = randomUUID();

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);

  sessions[sessionId] = {
    username,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString()
  };

  writeSessions(sessions);
  return sessionId;
};
```

---

## 62. Qué hace `createSession`

1. Lee sesiones actuales.
2. Genera un ID único con `randomUUID`.
3. Calcula fecha de expiración.
4. Guarda la sesión.
5. Devuelve el `sessionId`.

---

## 63. Duración de sesión

```js
const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
```

Eso equivale a:

```txt
1 hora
```

---

## 64. Obtener sesión

```js
const getSession = (sessionId) => {
  const sessions = readSessions();
  const session = sessions[sessionId];

  if (!session) return null;

  const now = new Date();

  if (new Date(session.expiresAt) < now) {
    delete sessions[sessionId];
    writeSessions(sessions);
    return null;
  }

  return session;
};
```

---

## 65. Qué hace `getSession`

1. Busca la sesión por ID.
2. Si no existe, devuelve `null`.
3. Si está vencida, la elimina y devuelve `null`.
4. Si está vigente, devuelve la sesión.

---

## 66. Eliminar sesión

```js
const deleteSession = (sessionId) => {
  const sessions = readSessions();
  delete sessions[sessionId];
  writeSessions(sessions);
};
```

Se usa para logout.

---

# Parte 14 — Controlador de autenticación

## 67. Archivo `auth.controller.js`

```js
const { registerUser, loginUser } = require('../services/auth.service');
const { createSession, deleteSession, getSession } = require('../services/session.service');
```

El controlador usa:

- servicio de usuarios,
- servicio de sesiones.

---

## 68. Registro

```js
const register = (req, res) => {
  const { username, password } = req.body;

  try {
    registerUser(username, password);
    res.status(201).json({ message: 'Usuario registrado' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
```

---

## 69. Login

```js
const login = (req, res) => {
  const { username, password } = req.body;

  try {
    loginUser(username, password);
    const sessionId = createSession(username);

    res.cookie('sessionId', sessionId, { httpOnly: true });
    res.json({ message: 'Login exitoso' });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
};
```

---

## 70. Cookie de sesión

```js
res.cookie('sessionId', sessionId, { httpOnly: true });
```

Esto envía una cookie al navegador.

Nombre:

```txt
sessionId
```

Valor:

```txt
UUID de sesión
```

Opción:

```txt
httpOnly: true
```

Esto evita que JavaScript del navegador lea la cookie directamente, lo cual ayuda a reducir riesgos frente a XSS.

---

## 71. Logout

```js
const logout = (req, res) => {
  const sessionId = req.cookies.sessionId;

  if (sessionId) deleteSession(sessionId);

  res.clearCookie('sessionId');
  res.json({ message: 'Logout exitoso' });
};
```

El logout:

1. lee la cookie,
2. elimina la sesión del archivo,
3. borra la cookie del navegador,
4. responde mensaje exitoso.

---

## 72. Ruta `/me`

```js
const me = (req, res) => {
  const sessionId = req.cookies.sessionId;

  if (!sessionId) {
    return res.status(401).json({ error: 'Sesión no encontrada' });
  }

  const session = getSession(sessionId);

  if (!session) {
    return res.status(401).json({ error: 'Sesión inválida' });
  }

  res.json({ username: session.username });
};
```

Permite consultar qué usuario está autenticado.

---

# Parte 15 — Middleware de sesión

## 73. Archivo `session.middleware.js`

```js
const { getSession } = require('../services/session.service');

const sessionMiddleware = (req, res, next) => {
  const sessionId = req.cookies.sessionId;

  if (!sessionId) {
    return res.status(401).json({ error: 'Sesión no encontrada' });
  }

  const session = getSession(sessionId);

  if (!session) {
    return res.status(401).json({ error: 'Sesión inválida' });
  }

  req.user = { username: session.username };
  next();
};

module.exports = sessionMiddleware;
```

---

## 74. Qué hace este middleware

Este middleware protege rutas.

Si hay sesión válida:

```js
req.user = { username: session.username };
next();
```

Si no hay sesión:

```js
res.status(401).json({ error: 'Sesión no encontrada' });
```

o:

```js
res.status(401).json({ error: 'Sesión inválida' });
```

---

## 75. Observación

El middleware está creado, pero en el router original no se usa.

Una mejora sería usarlo así:

```js
const sessionMiddleware = require('../middleware/session.middleware');

router.get('/me', sessionMiddleware, me);
```

Y simplificar `me`:

```js
const me = (req, res) => {
  res.json({ username: req.user.username });
};
```

---

# Parte 16 — Frontend estático del ejemplo

## 76. `register.html`

Permite registrar usuarios.

Hace una petición:

```js
fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
});
```

---

## 77. `login.html`

Permite iniciar sesión.

Hace una petición:

```js
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ username, password })
});
```

---

## 78. `credentials: 'include'`

Indica que `fetch` debe incluir cookies en la petición.

Esto es importante cuando se trabaja con sesiones basadas en cookies.

---

## 79. `dashboard.html`

Consulta el usuario actual:

```js
fetch('/api/auth/me', {
  credentials: 'include'
});
```

Si hay sesión, muestra:

```txt
Usuario autenticado: alan
```

Si no hay sesión, muestra:

```txt
No hay sesión activa
```

---

# Parte 17 — Cómo integrar autenticación con el TP

## 80. Idea general

El TP pide permisos por rol.

El ejemplo del profesor resuelve autenticación.

La integración ideal sería:

```txt
Login
  ↓
Cookie con sessionId
  ↓
sessionMiddleware
  ↓
req.user
  ↓
Buscar usuario en SQLite
  ↓
Obtener role_id
  ↓
Consultar permisos del rol
  ↓
Permitir o denegar acción
```

---

## 81. Adaptación recomendada

El ejemplo guarda usuarios en JSON.

El proyecto de la clase 7 guarda usuarios en SQLite.

Para el TP final, conviene usar SQLite como fuente principal y dejar JSON solo como referencia de aprendizaje.

---

## 82. Modelo de usuario con búsqueda por username

Para integrar sesiones, conviene agregar algo como:

```js
function getByUsername(username) {
  return db.prepare(`
    SELECT
      users.*,
      users.user AS name,
      roles.name AS role_name
    FROM users
    LEFT JOIN roles ON users.role_id = roles.id
    WHERE users.user = ?
      AND users.deleted_at IS NULL
  `).get(username);
}
```

---

## 83. Registro con SQLite

En vez de guardar en `users.json`, se podría registrar en SQLite.

Ejemplo conceptual:

```js
function registerUser(username, password) {
  const existing = User.getByUsername(username);

  if (existing) {
    throw new Error('Usuario ya existe');
  }

  return User.create({
    name: username,
    email: `${username}@demo.local`,
    password
  });
}
```

---

## 84. Contraseñas en SQLite

Si se integra autenticación real, habría que agregar una columna:

```sql
password TEXT NOT NULL
```

o mejor:

```sql
password_hash TEXT NOT NULL
```

Recomendación:

```txt
Nunca guardar contraseñas reales en texto plano.
```

Para un TP educativo se puede explicar que se mantiene simple por alcance académico, pero que en producción se usaría hashing.

---

## 85. Flujo recomendado de autorización

Middleware:

```txt
sessionMiddleware
  ↓
checkPermission('crear_usuario')
  ↓
controller.createUser
```

Ejemplo:

```js
router.post(
  '/',
  sessionMiddleware,
  checkPermission('crear_usuario'),
  controller.createUser
);
```

---

# Parte 18 — Buenas prácticas para el TP

## 86. Validaciones mínimas

Permisos:

- nombre obligatorio,
- mínimo 3 caracteres,
- único.

Roles:

- nombre obligatorio,
- mínimo 3 caracteres,
- permisos como array normalizado.

Usuarios:

- nombre obligatorio,
- email válido,
- rol existente,
- usuario no eliminado.

---

## 87. Manejo de errores por nombre repetido

SQLite puede lanzar error por `UNIQUE`.

Ejemplo:

```txt
UNIQUE constraint failed: permisos.nombre
```

Conviene atraparlo y mostrar algo más claro:

```js
if (error.message.includes('UNIQUE')) {
  return res.status(400).render('permisos/new', {
    error: 'Ya existe un permiso con ese nombre'
  });
}
```

---

## 88. Nombres de permisos recomendados

Usar nombres técnicos y consistentes:

```txt
ver_usuarios
crear_usuario
editar_usuario
eliminar_usuario
ver_roles
crear_rol
editar_rol
eliminar_rol
ver_permisos
crear_permiso
editar_permiso
eliminar_permiso
asignar_permisos
```

Evitar nombres ambiguos como:

```txt
admin
crear
permiso1
cosas
```

---

## 89. Diseño simple pero funcional

La consigna no exige diseño complejo.

Pero las vistas deberían ser claras:

- títulos visibles,
- botones para crear,
- botones para editar,
- botones para eliminar,
- mensajes de error,
- navegación entre usuarios, roles y permisos,
- checkboxes claros,
- listado de permisos asignados.

---

# Parte 19 — Checklist del TP final

## 90. Checklist funcional

- [ ] Existe tabla `permisos`.
- [ ] Existe tabla `rol_permiso`.
- [ ] `permisos.nombre` es único.
- [ ] Se pueden listar permisos en `/permisos`.
- [ ] Se puede crear permiso.
- [ ] Se puede editar permiso.
- [ ] Se puede eliminar permiso.
- [ ] Si se repite nombre, se muestra error.
- [ ] En `/roles/:id/edit` aparecen checkboxes de permisos.
- [ ] Los permisos ya asignados aparecen marcados.
- [ ] Al guardar rol, se actualiza `rol_permiso`.
- [ ] En `/roles/:id` se ven permisos asignados.
- [ ] En `/users/:id` se ven permisos del rol del usuario.
- [ ] El código está separado en rutas, controladores y modelos.
- [ ] Hay buen manejo de errores.
- [ ] Las vistas son simples pero funcionales.
- [ ] El README explica permisos, asignación y visualización.
- [ ] Se incluyen capturas requeridas.

---

## 91. Checklist bonus

- [ ] Existe `session.middleware.js`.
- [ ] Existe `checkPermission.middleware.js`.
- [ ] Una ruta protegida valida permiso.
- [ ] Si el usuario no tiene permiso, se muestra acceso denegado.
- [ ] Se puede explicar autenticación vs autorización.
- [ ] Se puede explicar cómo la cookie identifica la sesión.
- [ ] Se puede explicar cómo la sesión se vincula con usuario, rol y permisos.

---

# Parte 20 — Preguntas posibles para defender el TP

## 92. ¿Qué problema resuelve el sistema de permisos?

Permite definir qué acciones puede realizar cada rol, evitando que todos los usuarios tengan acceso a todas las funcionalidades.

---

## 93. ¿Qué relación hay entre roles y permisos?

Es una relación muchos a muchos. Un rol puede tener muchos permisos y un permiso puede estar asignado a muchos roles.

---

## 94. ¿Para qué sirve la tabla `rol_permiso`?

Sirve como tabla intermedia para representar la relación muchos a muchos entre roles y permisos.

---

## 95. ¿Por qué `rol_permiso` usa clave primaria compuesta?

Para evitar que el mismo permiso se asigne más de una vez al mismo rol.

---

## 96. ¿Por qué `permisos.nombre` debe ser único?

Porque cada permiso debe identificar una acción única dentro del sistema.

---

## 97. ¿Cómo se asignan permisos a un rol?

Desde la vista de edición de roles, usando checkboxes. Al guardar, se actualiza la tabla `rol_permiso`.

---

## 98. ¿Cómo se muestran los permisos de un usuario?

Se obtiene el usuario, se identifica su `role_id`, y luego se consultan los permisos asignados a ese rol.

---

## 99. ¿Qué diferencia hay entre rol y permiso?

Un rol es una categoría de usuario.  
Un permiso es una acción concreta que ese rol puede realizar.

---

## 100. ¿Qué es autenticación?

Es verificar la identidad del usuario, normalmente con usuario y contraseña.

---

## 101. ¿Qué es autorización?

Es verificar si un usuario autenticado tiene permiso para realizar una acción.

---

## 102. ¿Qué hace una cookie de sesión?

Guarda en el navegador un identificador de sesión que permite reconocer al usuario en futuras peticiones.

---

## 103. ¿Por qué usar `httpOnly` en la cookie?

Para evitar que JavaScript del navegador pueda leer la cookie directamente.

---

## 104. ¿Qué limitación tiene el ejemplo de autenticación?

Guarda contraseñas en texto plano y sesiones en JSON. Sirve para aprender, pero en producción se debería usar hashing y una base de datos.

---

## 105. ¿Qué hace `sessionMiddleware`?

Verifica si existe una cookie `sessionId`, busca la sesión y, si es válida, agrega el usuario a `req.user`.

---

## 106. ¿Qué hace `checkPermission`?

Verifica si el usuario autenticado tiene un permiso específico antes de permitir el acceso a una ruta.

---

# Parte 21 — Relación con clases anteriores

## 107. Clase 6 Backend

El TP usa la estructura por capas vista en la clase 6:

- rutas,
- controladores,
- modelos,
- middlewares,
- Express,
- EJS.

---

## 108. Clase 7 Backend

El TP amplía directamente lo visto en clase 7:

- SQLite,
- roles,
- usuarios,
- EJS,
- `better-sqlite3`,
- relaciones,
- filtros,
- vistas dinámicas,
- soft delete.

---

## 109. Ejemplo de autenticación

El ejemplo del profesor aporta:

- registro,
- login,
- cookies,
- sesiones,
- logout,
- middleware de sesión.

Esto sirve como base para el bonus de control de acceso.

---

# Parte 22 — Relación con el TP “The Guardian”

Aunque este TP pertenece a la cursada de backend anterior, hay ideas útiles para el TP actual de redes.

## 110. Qué se puede reutilizar conceptualmente

| TP Backend | TP The Guardian |
|---|---|
| Express | Endpoints `/health` y `/ingest` |
| Middleware | Validación de requests |
| Roles y permisos | Control de acceso al monitoreo |
| SQLite | Persistir métricas o eventos |
| EJS | Panel visual de monitoreo |
| Cookies/sesiones | Login para acceder al dashboard |
| README | Documentación defendible |
| Capturas | Evidencia de funcionamiento |

---

## 111. Posible mejora para The Guardian

Si se quiere aplicar lo aprendido del cuatrimestre anterior al TP actual, se podría agregar:

- login básico,
- dashboard protegido,
- roles como `admin`, `monitor`, `operador`,
- permisos como `ver_metricas`, `enviar_ingest`, `reiniciar_worker`,
- SQLite para guardar métricas.

No es obligatorio para el TP de redes, pero sería una forma sólida de demostrar integración de conocimientos.

---

# Parte 23 — Resumen final

El TP final de Backend consiste en ampliar un sistema de usuarios y roles agregando permisos.

La estructura conceptual queda así:

```txt
Usuario
  ↓
Rol
  ↓
Permisos
```

El sistema debe permitir:

- crear permisos,
- listar permisos,
- editar permisos,
- eliminar permisos,
- asignar permisos a roles,
- mostrar permisos en el detalle del rol,
- mostrar permisos en el detalle del usuario,
- manejar errores,
- mantener el código ordenado,
- documentar el funcionamiento.

El ejemplo de autenticación del profesor complementa el TP porque muestra cómo identificar al usuario mediante sesiones y cookies. Eso permite implementar el bonus de control de acceso, donde no alcanza con saber qué usuario está logueado, sino también qué permiso tiene para acceder a una ruta.

La frase clave para defender este trabajo podría ser:

> El TP implementa autorización basada en roles y permisos. Los usuarios pertenecen a roles, los roles tienen permisos asociados mediante una tabla intermedia, y esos permisos permiten controlar qué acciones puede realizar cada usuario dentro del sistema.
