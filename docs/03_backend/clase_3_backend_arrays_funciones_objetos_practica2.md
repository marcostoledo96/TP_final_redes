# Clase 3 Backend — Arrays, Métodos, Funciones Avanzadas, Objetos y Closures

**Curso:** Desarrollo Web Backend  
**Tecnología:** JavaScript / Node.js  
**Tema central:** manejo de arrays, métodos de arrays, funciones flecha, funciones de orden superior, objetos, clases y closures.

---

## 1. Objetivo general de la clase

Esta clase profundiza en el uso de **arrays** y **funciones** en JavaScript, dos herramientas fundamentales para cualquier proyecto backend.

En backend, casi siempre trabajamos con colecciones de datos:

- usuarios,
- productos,
- pedidos,
- logs,
- eventos,
- respuestas de una base de datos,
- archivos procesados,
- registros de auditoría,
- métricas del sistema.

Por eso es muy importante saber recorrer, transformar, filtrar y modificar arrays correctamente.

También se trabajan conceptos funcionales como:

- funciones tradicionales,
- arrow functions,
- callbacks,
- Higher Order Functions,
- factory functions,
- clases,
- objetos,
- métodos,
- closures.

Estos temas son la base para entender código backend más avanzado con Express, rutas, middlewares, controladores, servicios y procesamiento de datos.

---

# Parte 1 — Arrays en JavaScript

## 2. ¿Qué es un array?

Un **array** es una estructura de datos que permite guardar varios valores dentro de una sola variable.

Ejemplo:

```js
const productos = ["Sillón", "Silla", "Mesa", "Ropero"];
```

En este caso, `productos` guarda una lista de elementos.

Cada elemento tiene una posición llamada **índice**.

Los índices empiezan desde `0`.

```txt
Índice:     0        1       2       3
Valor:   Sillón   Silla   Mesa   Ropero
```

Por eso:

```js
console.log(productos[0]); // Sillón
console.log(productos[1]); // Silla
```

---

## 3. Declaración de arrays

En la clase se vieron distintos tipos de arrays.

### 3.1. Array de strings

```js
const productos = ["Sillón", "Silla", "Mesa", "Ropero"];
```

Sirve para guardar textos.

---

### 3.2. Array de números

```js
const numeros = [1, 2, 3, 4, 5];
```

Sirve para guardar valores numéricos.

---

### 3.3. Array de booleanos

```js
const booleanos = [true, true, false];
```

Sirve para guardar valores lógicos.

---

### 3.4. Array mixto

```js
const mezcla = ["Sillón", 1, 2, true];
```

JavaScript permite mezclar tipos dentro de un mismo array, aunque en proyectos reales conviene mantener estructuras consistentes.

---

### 3.5. Array de objetos

```js
const usuarios = [
  {
    nombre: "Pepito",
    edad: 27
  },
  {
    nombre: "Pepita",
    edad: 25
  }
];
```

Este formato es muy usado en backend.

Por ejemplo, una API puede devolver usuarios así:

```json
[
  {
    "nombre": "Pepito",
    "edad": 27
  },
  {
    "nombre": "Pepita",
    "edad": 25
  }
]
```

---

## 4. Acceso a elementos de un array

Para acceder a un elemento, usamos su índice.

```js
const productos = ["Sillón", "Silla", "Mesa", "Ropero"];

console.log(productos[0]); // Sillón
console.log(productos[3]); // Ropero
```

Si intentamos acceder a una posición que no existe, obtenemos `undefined`.

```js
console.log(productos[10]); // undefined
```

---

## 5. Recorrido de arrays con `for`

Podemos recorrer un array usando un ciclo `for`.

```js
const productos = ["Sillón", "Silla", "Mesa", "Ropero"];

for (let i = 0; i < productos.length; i++) {
  console.log(productos[i]);
}
```

### Explicación

```js
let i = 0
```

Crea el contador desde cero.

```js
i < productos.length
```

El ciclo se repite mientras `i` sea menor que la cantidad de elementos.

```js
i++
```

Después de cada vuelta, aumenta `i` en 1.

```js
productos[i]
```

Accede al elemento actual del array.

---

# Parte 2 — Métodos básicos de arrays

## 6. Propiedad `length`

`length` devuelve la cantidad de elementos del array.

```js
const productos = ["Sillón", "Silla", "Mesa", "Ropero"];

console.log(productos.length); // 4
```

Es muy útil para recorrer arrays sin escribir manualmente la cantidad de posiciones.

```js
for (let i = 0; i < productos.length; i++) {
  console.log(productos[i]);
}
```

---

## 7. Método `push()`

`push()` agrega un elemento al final del array.

```js
const productos = ["Sillón", "Silla", "Mesa", "Ropero"];

productos.push("Cama");

console.log(productos);
```

Resultado:

```js
["Sillón", "Silla", "Mesa", "Ropero", "Cama"]
```

### Uso típico en backend

Agregar un nuevo dato a una lista temporal:

```js
const logs = [];

logs.push("Usuario conectado");
logs.push("Usuario consultó /health");

console.log(logs);
```

---

## 8. Método `unshift()`

`unshift()` agrega un elemento al comienzo del array.

```js
const productos = ["Sillón", "Silla", "Mesa", "Ropero"];

productos.unshift("Puerta");

console.log(productos);
```

Resultado:

```js
["Puerta", "Sillón", "Silla", "Mesa", "Ropero"]
```

---

## 9. Método `shift()`

`shift()` elimina el primer elemento del array.

```js
const productos = ["Sillón", "Silla", "Mesa", "Ropero"];

productos.shift();

console.log(productos);
```

Resultado:

```js
["Silla", "Mesa", "Ropero"]
```

---

## 10. Método `pop()`

`pop()` elimina el último elemento del array.

```js
const productos = ["Sillón", "Silla", "Mesa", "Ropero"];

productos.pop();

console.log(productos);
```

Resultado:

```js
["Sillón", "Silla", "Mesa"]
```

---

## 11. Método `splice()`

`splice()` permite eliminar, reemplazar o agregar elementos en una posición específica.

Ejemplo para eliminar elementos:

```js
const productos = ["Sillón", "Silla", "Mesa", "Ropero"];

productos.splice(1, 2);

console.log(productos);
```

Resultado:

```js
["Sillón", "Ropero"]
```

### Explicación

```js
productos.splice(1, 2);
```

Significa:

- empezar en el índice `1`,
- eliminar `2` elementos.

En el array original:

```txt
0: Sillón
1: Silla
2: Mesa
3: Ropero
```

Se eliminan `Silla` y `Mesa`.

---

## 12. Método `join()`

`join()` convierte un array en un string, uniendo sus elementos con el separador indicado.

```js
const productos = ["Sillón", "Silla", "Mesa", "Ropero"];

console.log(productos.join(", "));
```

Resultado:

```txt
Sillón, Silla, Mesa, Ropero
```

Otro ejemplo:

```js
console.log(productos.join(" / "));
```

Resultado:

```txt
Sillón / Silla / Mesa / Ropero
```

### Uso típico

Crear textos legibles a partir de listas.

```js
const permisos = ["read", "write", "delete"];

console.log(`Permisos asignados: ${permisos.join(", ")}`);
```

---

## 13. Método `concat()`

`concat()` une dos arrays y devuelve un nuevo array.

```js
const productos = ["Sillón", "Silla", "Mesa", "Ropero"];
const productos2 = ["Puerta", "Ventana", "Cama"];

const productosFinal = productos.concat(productos2);

console.log(productosFinal);
```

Resultado:

```js
["Sillón", "Silla", "Mesa", "Ropero", "Puerta", "Ventana", "Cama"]
```

Importante:

`concat()` no modifica el array original, sino que devuelve uno nuevo.

---

## 14. Método `slice()`

`slice()` genera una copia de una parte del array.

```js
const productos = ["Sillón", "Silla", "Mesa", "Ropero"];

const productosComedor = productos.slice(1, 3);

console.log(productosComedor);
```

Resultado:

```js
["Silla", "Mesa"]
```

### Explicación

```js
productos.slice(1, 3)
```

Toma desde el índice `1` hasta antes del índice `3`.

Incluye:

- índice 1: `"Silla"`
- índice 2: `"Mesa"`

No incluye:

- índice 3: `"Ropero"`

---

## 15. Método `indexOf()`

`indexOf()` devuelve el índice de un elemento.

```js
const productos = ["Sillón", "Silla", "Mesa", "Ropero"];

console.log(productos.indexOf("Ropero"));
```

Resultado:

```txt
3
```

Si el elemento no existe, devuelve `-1`.

```js
console.log(productos.indexOf("Heladera"));
```

Resultado:

```txt
-1
```

---

## 16. Método `includes()`

`includes()` permite saber si un elemento existe dentro del array.

```js
const productos = ["Sillón", "Silla", "Mesa", "Ropero"];

console.log(productos.includes("Cama")); // false
console.log(productos.includes("Mesa")); // true
```

Ejemplo con condicional:

```js
const productos = ["Sillón", "Silla", "Mesa", "Ropero"];

if (productos.includes("Heladera")) {
  console.log(productos.indexOf("Heladera"));
} else {
  console.log("Heladera no se encuentra en el Array");
}
```

Resultado:

```txt
Heladera no se encuentra en el Array
```

### Corrección importante del código de clase

En el código pegado aparece esto:

```js
if (productos.includes("Heladera")) {23
  console.log(productos.indexOf("Silla"));
} else {
  console.log("Heladera no se encuentra en el Array");
}
```

Ese `23` genera error de sintaxis.

La versión corregida es:

```js
if (productos.includes("Heladera")) {
  console.log(productos.indexOf("Heladera"));
} else {
  console.log("Heladera no se encuentra en el Array");
}
```

También conviene que si se pregunta por `"Heladera"`, se busque el índice de `"Heladera"` y no el índice de `"Silla"`.

---

## 17. Método `reverse()`

`reverse()` invierte el orden del array.

```js
const productos = ["Sillón", "Silla", "Mesa", "Ropero"];

productos.reverse();

console.log(productos);
```

Resultado:

```js
["Ropero", "Mesa", "Silla", "Sillón"]
```

Importante:

`reverse()` modifica el array original.

---

# Parte 3 — Métodos funcionales de arrays

## 18. `forEach()`

`forEach()` recorre un array y ejecuta una función por cada elemento.

```js
const productos = ["Sillón", "Silla", "Mesa", "Ropero"];

productos.forEach((producto) => {
  console.log(producto);
});
```

### Cuándo usarlo

Cuando queremos recorrer un array para hacer una acción, pero no necesitamos devolver un nuevo array.

Ejemplo:

```js
const usuarios = ["Ana", "Juan", "Pedro"];

usuarios.forEach((usuario) => {
  console.log(`Enviando email a ${usuario}`);
});
```

---

## 19. `map()`

`map()` recorre un array y devuelve un nuevo array transformado.

```js
const numeros = [1, 2, 3, 4];

const dobles = numeros.map((numero) => numero * 2);

console.log(dobles);
```

Resultado:

```js
[2, 4, 6, 8]
```

### Diferencia entre `forEach()` y `map()`

| Método | Devuelve nuevo array | Uso principal |
|---|---:|---|
| `forEach()` | No | Ejecutar acciones |
| `map()` | Sí | Transformar datos |

---

## 20. `filter()`

`filter()` crea un nuevo array con los elementos que cumplen una condición.

```js
const productos = [
  { nombre: "Celular", precio: 900 },
  { nombre: "Auriculares", precio: 300 },
  { nombre: "Tablet", precio: 600 }
];

const caros = productos.filter((producto) => producto.precio > 500);

console.log(caros);
```

Resultado:

```js
[
  { nombre: "Celular", precio: 900 },
  { nombre: "Tablet", precio: 600 }
]
```

---

## 21. `reduce()`

`reduce()` permite reducir un array a un solo valor.

Ejemplo: sumar precios.

```js
const productos = [
  { nombre: "Celular", precio: 900 },
  { nombre: "Auriculares", precio: 300 },
  { nombre: "Tablet", precio: 600 }
];

const total = productos.reduce((acumulador, producto) => {
  return acumulador + producto.precio;
}, 0);

console.log(total);
```

Resultado:

```txt
1800
```

### Explicación

```js
productos.reduce((acumulador, producto) => {
  return acumulador + producto.precio;
}, 0);
```

- `acumulador`: guarda el resultado parcial.
- `producto`: elemento actual del array.
- `0`: valor inicial del acumulador.

---

# Parte 4 — Funciones

## 22. Funciones tradicionales

Una función tradicional se declara así:

```js
function saludar(nombre) {
  return "Hola " + nombre + "!";
}

console.log(saludar("Marcos"));
```

Resultado:

```txt
Hola Marcos!
```

---

## 23. Arrow functions

Una arrow function es una forma más corta de escribir funciones.

```js
const saludar = (nombre) => {
  return "Hola " + nombre + "!";
};

console.log(saludar("Marcos"));
```

Si tiene una sola línea, puede escribirse con retorno implícito:

```js
const saludar = (nombre) => "Hola " + nombre + "!";
```

También se puede usar template literal:

```js
const saludar = (nombre) => `Hola ${nombre}!`;
```

---

## 24. Callbacks

Un **callback** es una función que se pasa como argumento a otra función.

```js
function ejecutar(callback) {
  callback();
}

ejecutar(() => {
  console.log("Callback ejecutado");
});
```

Los callbacks son importantes porque aparecen en:

- eventos,
- timers,
- manejo de archivos,
- rutas de Express,
- middlewares,
- funciones de orden superior,
- procesamiento asíncrono.

---

## 25. Higher Order Functions

Una **Higher Order Function** o función de orden superior es una función que:

- recibe otra función como argumento, o
- devuelve otra función como resultado.

Ejemplo:

```js
function ejecutarOperacion(a, b, operacion) {
  return operacion(a, b);
}

const suma = (x, y) => x + y;
const multiplicacion = (x, y) => x * y;

console.log(ejecutarOperacion(5, 3, suma)); // 8
console.log(ejecutarOperacion(5, 3, multiplicacion)); // 15
```

Métodos como `map`, `filter`, `reduce` y `forEach` son ejemplos de funciones de orden superior porque reciben funciones como argumento.

---

# Parte 5 — Objetos y clases

## 26. Objetos en JavaScript

Un objeto agrupa propiedades y valores.

```js
const persona = {
  nombre: "Ana",
  edad: 30,
  ciudad: "Rosario"
};
```

Acceso a propiedades:

```js
console.log(persona.nombre);
console.log(persona["edad"]);
```

---

## 27. Métodos dentro de objetos

Un método es una función dentro de un objeto.

```js
const usuario = {
  nombre: "Marcos",
  edad: 29,
  presentarse: function () {
    return `Hola, soy ${this.nombre} y tengo ${this.edad} años.`;
  }
};

console.log(usuario.presentarse());
```

---

## 28. Factory functions

Una **factory function** es una función que crea y devuelve objetos.

```js
function crearUsuario(nombre, edad) {
  return {
    nombre,
    edad,
    presentarse() {
      return `Hola, soy ${this.nombre} y tengo ${this.edad} años.`;
    }
  };
}

const usuario1 = crearUsuario("Ana", 30);
const usuario2 = crearUsuario("Juan", 25);

console.log(usuario1.presentarse());
console.log(usuario2.presentarse());
```

Sirven para evitar repetir estructuras de objetos manualmente.

---

## 29. Clases

Una clase permite crear objetos a partir de una plantilla.

```js
class Rectangulo {
  constructor(ancho, alto) {
    this.ancho = ancho;
    this.alto = alto;
  }

  calcularArea() {
    return this.ancho * this.alto;
  }
}

const rectangulo = new Rectangulo(10, 5);

console.log(rectangulo.calcularArea());
```

Resultado:

```txt
50
```

---

# Parte 6 — Closures

## 30. ¿Qué es un closure?

Un **closure** ocurre cuando una función recuerda variables del contexto donde fue creada, incluso después de que ese contexto terminó.

Ejemplo:

```js
function multiplicador(n) {
  return function (numero) {
    return numero * n;
  };
}

const duplicar = multiplicador(2);
const triplicar = multiplicador(3);

console.log(duplicar(5)); // 10
console.log(triplicar(5)); // 15
```

La función interna recuerda el valor de `n`.

---

## 31. Por qué los closures son importantes en backend

Los closures aparecen en:

- middlewares,
- configuraciones reutilizables,
- validadores,
- controladores,
- funciones que generan funciones,
- autenticación,
- manejo de contexto.

Ejemplo conceptual:

```js
function crearValidadorRol(rolPermitido) {
  return function (usuario) {
    return usuario.rol === rolPermitido;
  };
}

const esAdmin = crearValidadorRol("admin");

console.log(esAdmin({ nombre: "Marcos", rol: "admin" })); // true
console.log(esAdmin({ nombre: "Ana", rol: "user" })); // false
```

---

# Parte 7 — Práctica #2 resuelta

## Ejercicio 1 — Reescribir funciones tradicionales como flechas

### Enunciado

Convertí esta función tradicional a una arrow function:

```js
function saludar(nombre) {
  return "Hola " + nombre + "!";
}
```

### Solución

```js
const saludar = (nombre) => {
  return "Hola " + nombre + "!";
};

console.log(saludar("Marcos"));
```

### Versión simplificada

```js
const saludar = (nombre) => `Hola ${nombre}!`;

console.log(saludar("Marcos"));
```

---

## Ejercicio 2 — Filtrar productos con `filter`

### Enunciado

Dado un array de productos, filtrá solo los que cuestan más de $500.

```js
const productos = [
  { nombre: "Celular", precio: 900 },
  { nombre: "Auriculares", precio: 300 },
  { nombre: "Tablet", precio: 600 }
];
```

### Solución

```js
const productos = [
  { nombre: "Celular", precio: 900 },
  { nombre: "Auriculares", precio: 300 },
  { nombre: "Tablet", precio: 600 }
];

const productosCaros = productos.filter((producto) => producto.precio > 500);

console.log(productosCaros);
```

Resultado esperado:

```js
[
  { nombre: "Celular", precio: 900 },
  { nombre: "Tablet", precio: 600 }
]
```

---

## Ejercicio 3 — Calcular total con `reduce`

### Enunciado

Usá `reduce` para sumar todos los precios del array anterior.

### Solución

```js
const productos = [
  { nombre: "Celular", precio: 900 },
  { nombre: "Auriculares", precio: 300 },
  { nombre: "Tablet", precio: 600 }
];

const total = productos.reduce((acumulador, producto) => {
  return acumulador + producto.precio;
}, 0);

console.log(total);
```

Resultado esperado:

```txt
1800
```

### Versión resumida

```js
const total = productos.reduce((acumulador, producto) => acumulador + producto.precio, 0);
```

---

## Ejercicio 4 — Higher Order Function personalizada

### Enunciado

Creá una función `ejecutarSiEsPar` que reciba un número y una función callback. Si el número es par, que ejecute la callback.

### Solución

```js
function ejecutarSiEsPar(numero, callback) {
  if (numero % 2 === 0) {
    callback(numero);
  }
}

ejecutarSiEsPar(10, (numero) => {
  console.log(`${numero} es par`);
});

ejecutarSiEsPar(7, (numero) => {
  console.log(`${numero} es par`);
});
```

Resultado esperado:

```txt
10 es par
```

El `7` no muestra nada porque no es par.

---

## Ejercicio 5 — Objetos funcionales con factory functions

### Enunciado

Creá una función `crearUsuario(nombre, edad)` que devuelva un objeto con esas propiedades y un método `presentarse()`.

### Solución

```js
function crearUsuario(nombre, edad) {
  return {
    nombre,
    edad,
    presentarse() {
      return `Hola, soy ${this.nombre} y tengo ${this.edad} años.`;
    }
  };
}

const usuario = crearUsuario("Ana", 30);

console.log(usuario.presentarse());
```

Resultado esperado:

```txt
Hola, soy Ana y tengo 30 años.
```

---

## Ejercicio 6 — Clase con métodos

### Enunciado

Creá una clase `Rectangulo` con `ancho` y `alto`, y un método que calcule el área.

### Solución

```js
class Rectangulo {
  constructor(ancho, alto) {
    this.ancho = ancho;
    this.alto = alto;
  }

  calcularArea() {
    return this.ancho * this.alto;
  }
}

const rectangulo = new Rectangulo(10, 5);

console.log(rectangulo.calcularArea());
```

Resultado esperado:

```txt
50
```

---

## Ejercicio 7 — Obtener claves y valores de un objeto

### Enunciado

Dado un objeto:

```js
const persona = { nombre: "Ana", edad: 30, ciudad: "Rosario" };
```

Imprimí todas las claves y valores.

### Solución con `Object.keys`

```js
const persona = { nombre: "Ana", edad: 30, ciudad: "Rosario" };

Object.keys(persona).forEach((clave) => {
  console.log(`${clave}: ${persona[clave]}`);
});
```

Resultado esperado:

```txt
nombre: Ana
edad: 30
ciudad: Rosario
```

### Solución con `Object.entries`

```js
const persona = { nombre: "Ana", edad: 30, ciudad: "Rosario" };

Object.entries(persona).forEach(([clave, valor]) => {
  console.log(`${clave}: ${valor}`);
});
```

---

## Ejercicio 8 — Mapear y transformar arrays de objetos

### Enunciado

Devolvé un array con solo los nombres en mayúsculas de este array:

```js
const usuarios = [
  { nombre: "Lucía" },
  { nombre: "Juan" },
  { nombre: "Pedro" }
];
```

### Solución

```js
const usuarios = [
  { nombre: "Lucía" },
  { nombre: "Juan" },
  { nombre: "Pedro" }
];

const nombresMayuscula = usuarios.map((usuario) => usuario.nombre.toUpperCase());

console.log(nombresMayuscula);
```

Resultado esperado:

```js
["LUCÍA", "JUAN", "PEDRO"]
```

---

## Ejercicio 9 — Agregar propiedades nuevas a objetos

### Enunciado

Dado un array de usuarios, agregales a cada uno una propiedad `activo: true`.

### Solución recomendada con `map`

```js
const usuarios = [
  { nombre: "Lucía" },
  { nombre: "Juan" },
  { nombre: "Pedro" }
];

const usuariosActivos = usuarios.map((usuario) => {
  return {
    ...usuario,
    activo: true
  };
});

console.log(usuariosActivos);
```

Resultado esperado:

```js
[
  { nombre: "Lucía", activo: true },
  { nombre: "Juan", activo: true },
  { nombre: "Pedro", activo: true }
]
```

### Por qué esta solución es buena

Usa el operador spread:

```js
...usuario
```

Eso permite copiar las propiedades existentes y agregar una nueva sin modificar directamente el objeto original.

---

## Ejercicio 10 — Crear función que devuelve otra función

### Enunciado

Creá una función `multiplicador(n)` que devuelva otra función que multiplique cualquier número por `n`.

### Solución

```js
function multiplicador(n) {
  return function (numero) {
    return numero * n;
  };
}

const duplicar = multiplicador(2);
const triplicar = multiplicador(3);

console.log(duplicar(5));
console.log(triplicar(5));
```

Resultado esperado:

```txt
10
15
```

### Versión con arrow functions

```js
const multiplicador = (n) => (numero) => numero * n;

const duplicar = multiplicador(2);

console.log(duplicar(8)); // 16
```

---

# Parte 8 — Archivo sugerido para practicar

Podés crear un archivo llamado:

```txt
clase3-practica.js
```

Y pegar este resumen de ejercicios:

```js
// 1. Arrow function
const saludar = (nombre) => `Hola ${nombre}!`;
console.log(saludar("Marcos"));

// 2 y 3. filter + reduce
const productos = [
  { nombre: "Celular", precio: 900 },
  { nombre: "Auriculares", precio: 300 },
  { nombre: "Tablet", precio: 600 }
];

const productosCaros = productos.filter((producto) => producto.precio > 500);
const total = productos.reduce((acumulador, producto) => acumulador + producto.precio, 0);

console.log(productosCaros);
console.log(total);

// 4. HOF personalizada
function ejecutarSiEsPar(numero, callback) {
  if (numero % 2 === 0) {
    callback(numero);
  }
}

ejecutarSiEsPar(10, (numero) => console.log(`${numero} es par`));

// 5. Factory function
function crearUsuario(nombre, edad) {
  return {
    nombre,
    edad,
    presentarse() {
      return `Hola, soy ${this.nombre} y tengo ${this.edad} años.`;
    }
  };
}

const usuario = crearUsuario("Ana", 30);
console.log(usuario.presentarse());

// 6. Clase
class Rectangulo {
  constructor(ancho, alto) {
    this.ancho = ancho;
    this.alto = alto;
  }

  calcularArea() {
    return this.ancho * this.alto;
  }
}

const rectangulo = new Rectangulo(10, 5);
console.log(rectangulo.calcularArea());

// 7. Object.entries
const persona = { nombre: "Ana", edad: 30, ciudad: "Rosario" };

Object.entries(persona).forEach(([clave, valor]) => {
  console.log(`${clave}: ${valor}`);
});

// 8 y 9. map sobre arrays de objetos
const usuarios = [
  { nombre: "Lucía" },
  { nombre: "Juan" },
  { nombre: "Pedro" }
];

const nombresMayuscula = usuarios.map((usuario) => usuario.nombre.toUpperCase());
const usuariosActivos = usuarios.map((usuario) => ({ ...usuario, activo: true }));

console.log(nombresMayuscula);
console.log(usuariosActivos);

// 10. Closure
const multiplicador = (n) => (numero) => numero * n;

const duplicar = multiplicador(2);
console.log(duplicar(5));
```

---

# Parte 9 — Relación con Backend y Express

Aunque esta clase trabaja con JavaScript básico, estos conceptos aparecen constantemente en backend.

## 32. Arrays en backend

Ejemplo: una API devuelve productos.

```js
app.get("/productos", (req, res) => {
  const productos = [
    { nombre: "Celular", precio: 900 },
    { nombre: "Auriculares", precio: 300 }
  ];

  res.json(productos);
});
```

---

## 33. `filter` en backend

Ejemplo: filtrar productos caros.

```js
app.get("/productos-caros", (req, res) => {
  const productosCaros = productos.filter((producto) => producto.precio > 500);

  res.json(productosCaros);
});
```

---

## 34. `map` en backend

Ejemplo: devolver solo nombres.

```js
app.get("/nombres", (req, res) => {
  const nombres = usuarios.map((usuario) => usuario.nombre);

  res.json(nombres);
});
```

---

## 35. Callbacks y Express

En Express, una ruta recibe una función callback:

```js
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});
```

La función:

```js
(req, res) => { ... }
```

es un callback que Express ejecuta cuando llega una petición a `/health`.

---

## 36. Closures en backend

Los closures se usan para crear middlewares configurables.

```js
function validarToken(tokenEsperado) {
  return function (req, res, next) {
    const token = req.headers.authorization;

    if (token === tokenEsperado) {
      next();
    } else {
      res.status(401).json({ error: "No autorizado" });
    }
  };
}
```

Uso:

```js
app.get("/admin", validarToken("secreto123"), (req, res) => {
  res.json({ mensaje: "Panel admin" });
});
```

---

# Parte 10 — Relación con el TP “The Guardian”

La clase 3 también se puede conectar con el TP de redes.

## 37. Uso de arrays en el TP

En “The Guardian” se pueden usar arrays para:

- guardar workers activos,
- registrar métricas,
- almacenar tiempos de respuesta,
- juntar resultados del script de evaluación,
- listar errores,
- procesar eventos simulados.

Ejemplo:

```js
const latenciasHealth = [];

latenciasHealth.push(5);
latenciasHealth.push(7);
latenciasHealth.push(4);
```

---

## 38. Uso de `map` en el script de evaluación

Para crear muchas peticiones concurrentes:

```js
const requests = Array.from({ length: 500 }, (_, index) => {
  return fetch(`http://localhost:8080/ingest?id=${index + 1}`);
});

await Promise.all(requests);
```

---

## 39. Uso de `reduce` para métricas

Para calcular el promedio de latencias:

```js
const latencias = [5, 7, 4, 6];

const total = latencias.reduce((acc, valor) => acc + valor, 0);
const promedio = total / latencias.length;

console.log(promedio);
```

---

## 40. Uso de closures para crear funciones configurables

Ejemplo: crear un generador de requests con URL base.

```js
function crearCliente(baseUrl) {
  return function (ruta) {
    return fetch(`${baseUrl}${ruta}`);
  };
}

const clienteGuardian = crearCliente("http://localhost:8080");

clienteGuardian("/health");
clienteGuardian("/ingest?id=1");
```

---

# Parte 11 — Preguntas posibles para defender la clase

## 41. Preguntas teóricas

### ¿Qué es un array?

Es una estructura de datos que permite guardar varios valores en una sola variable, accediendo a ellos mediante índices.

---

### ¿Desde qué número empiezan los índices de un array?

Empiezan desde `0`.

---

### ¿Qué diferencia hay entre `push` y `unshift`?

- `push` agrega al final.
- `unshift` agrega al principio.

---

### ¿Qué diferencia hay entre `pop` y `shift`?

- `pop` elimina el último elemento.
- `shift` elimina el primero.

---

### ¿Qué hace `splice`?

Permite eliminar, agregar o reemplazar elementos desde una posición específica del array.

---

### ¿Qué hace `slice`?

Devuelve una copia parcial del array sin modificar el original.

---

### ¿Qué diferencia hay entre `indexOf` e `includes`?

- `indexOf` devuelve la posición del elemento o `-1`.
- `includes` devuelve `true` o `false`.

---

### ¿Qué diferencia hay entre `forEach` y `map`?

- `forEach` recorre y ejecuta una acción.
- `map` recorre y devuelve un nuevo array transformado.

---

### ¿Qué hace `filter`?

Devuelve un nuevo array con los elementos que cumplen una condición.

---

### ¿Qué hace `reduce`?

Reduce un array a un solo valor, como una suma, promedio, total o acumulación.

---

### ¿Qué es un callback?

Es una función que se pasa como argumento a otra función para ser ejecutada después o bajo cierta condición.

---

### ¿Qué es una Higher Order Function?

Es una función que recibe otra función como argumento o devuelve una función.

---

### ¿Qué es una factory function?

Es una función que crea y devuelve objetos.

---

### ¿Qué es una clase?

Es una plantilla para crear objetos con propiedades y métodos.

---

### ¿Qué es un closure?

Es una función que recuerda variables del entorno donde fue creada.

---

# Parte 12 — Buenas prácticas

## 42. Usar nombres claros

Evitar nombres como:

```js
const x = [];
const a = {};
```

Preferir:

```js
const productos = [];
const usuarios = [];
const precios = [];
```

---

## 43. No modificar arrays originales si no es necesario

En lugar de modificar directamente:

```js
usuarios[0].activo = true;
```

Preferir crear una nueva estructura:

```js
const usuariosActivos = usuarios.map((usuario) => ({
  ...usuario,
  activo: true
}));
```

Esto ayuda a mantener código más predecible.

---

## 44. Usar métodos declarativos

En vez de hacer todo con `for`, muchas veces es más claro usar:

- `map`,
- `filter`,
- `reduce`,
- `find`,
- `some`,
- `every`.

Ejemplo:

```js
const mayores = usuarios.filter((usuario) => usuario.edad >= 18);
```

Es más legible que recorrer manualmente y empujar elementos a otro array.

---

## 45. Controlar datos inexistentes

Antes de acceder a propiedades, conviene validar.

```js
const usuario = usuarios.find((u) => u.nombre === "Ana");

if (usuario) {
  console.log(usuario.edad);
} else {
  console.log("Usuario no encontrado");
}
```

---

# Parte 13 — Resumen final

En esta clase se trabajaron conceptos esenciales de JavaScript para backend:

- declaración de arrays,
- acceso por índice,
- recorrido con `for`,
- propiedad `length`,
- métodos básicos de arrays,
- `push`,
- `unshift`,
- `shift`,
- `pop`,
- `splice`,
- `join`,
- `concat`,
- `slice`,
- `indexOf`,
- `includes`,
- `reverse`,
- métodos funcionales como `forEach`, `map`, `filter`, `reduce`,
- funciones tradicionales,
- arrow functions,
- callbacks,
- Higher Order Functions,
- objetos,
- factory functions,
- clases,
- closures.

Estos temas son fundamentales para avanzar hacia backend con Express, APIs REST, manejo de datos, middlewares y arquitectura de aplicaciones.

---

# Parte 14 — Checklist de estudio

- [ ] Puedo declarar un array.
- [ ] Puedo acceder a un elemento por índice.
- [ ] Puedo recorrer un array con `for`.
- [ ] Entiendo qué hace `length`.
- [ ] Sé usar `push`, `pop`, `shift` y `unshift`.
- [ ] Sé diferenciar `splice` y `slice`.
- [ ] Sé usar `join` para convertir arrays en strings.
- [ ] Sé usar `concat` para unir arrays.
- [ ] Sé usar `indexOf` e `includes`.
- [ ] Entiendo que `reverse` modifica el array original.
- [ ] Sé usar `forEach`.
- [ ] Sé usar `map`.
- [ ] Sé usar `filter`.
- [ ] Sé usar `reduce`.
- [ ] Puedo escribir una arrow function.
- [ ] Entiendo qué es un callback.
- [ ] Entiendo qué es una Higher Order Function.
- [ ] Puedo crear objetos con métodos.
- [ ] Puedo crear factory functions.
- [ ] Puedo crear clases.
- [ ] Entiendo qué es un closure.
- [ ] Puedo explicar cómo estos temas se usan en backend.
